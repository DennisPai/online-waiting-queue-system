/*
  目的：在為 WaitingRecord.orderIndex 加上 partial unique index 之前，
        先掃描既有資料有沒有「active 狀態 orderIndex 撞號」，並可選擇修正。
        —— Change A / Phase 3 / Task 3.4（design.md D3 / Risks）

  背景：
    Phase 3 在 waiting-record.model.js 新增了 partial unique index
      { orderIndex: 1 } unique, partialFilterExpression: { status: { $in: ['waiting','processing'] } }
    若既有資料中 active 記錄已有 orderIndex 撞號 / null，
    MongoDB 建立此 unique index 會直接失敗（E11000），導致部署啟動異常。
    因此「加 index 前」必須先掃描，有撞號先修正。

  本腳本做兩件事：
    1. 掃描：列出所有 active（waiting / processing）記錄中
       (a) orderIndex 重複的群組；(b) orderIndex 為 null / 缺失的記錄。
    2. （可選）修正：以 sort({ orderIndex: 1, _id: 1 }) 的順序，
       用「兩階段 offset 批量寫入」把 active 記錄 orderIndex 壓成連續 1..N
       —— 與 utils/orderIndex.js 的 ensureOrderIndexConsistency() 同演算法，
       避免重寫中間態撞 unique index。

  ⚠️ 安全規範（修玄宮鐵則）：
    - 預設 dry-run，只掃描列印、不改任何資料。
    - 真要修正須明確帶 --fix 參數。
    - 修正前務必先手動備份 waitingrecords collection。
    - 絕不使用 transaction（Zeabur 單節點不支援）。
    - 本 change 的 tasks.md 要求「script 寫好即可，不對 DB 實跑」。

  使用：
    掃描（dry-run，預設）：
      MONGODB_URI="..." node backend/scripts/migrations/003_check_orderindex_collisions.js
    修正（謹慎，先備份）：
      MONGODB_URI="..." node backend/scripts/migrations/003_check_orderindex_collisions.js --fix
*/
const mongoose = require('mongoose');
require('dotenv').config();

const ACTIVE = ['waiting', 'processing'];
const OFFSET = 1000000; // 與 utils/orderIndex.js 一致的安全偏移量

async function run() {
  const doFix = process.argv.includes('--fix');

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGO_CONNECTION_STRING ||
    'mongodb://localhost:27017/queue_system';
  console.log('Connecting to', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  console.log('模式:', doFix ? 'FIX（會修改資料）' : 'DRY-RUN（只掃描，不改資料）');
  await mongoose.connect(mongoUri);

  const WaitingRecord = require('../../src/models/waiting-record.model');

  // === 1. 掃描 active 記錄 orderIndex 撞號 ===
  const dupGroups = await WaitingRecord.aggregate([
    { $match: { status: { $in: ACTIVE } } },
    { $group: { _id: '$orderIndex', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  // 掃描 orderIndex 為 null / 缺失的 active 記錄
  const nullOrderRecords = await WaitingRecord.find({
    status: { $in: ACTIVE },
    $or: [{ orderIndex: null }, { orderIndex: { $exists: false } }]
  }).select('_id queueNumber name orderIndex status').lean();

  const totalActive = await WaitingRecord.countDocuments({ status: { $in: ACTIVE } });

  console.log('\n========== 掃描結果 ==========');
  console.log(`active（waiting/processing）記錄總數: ${totalActive}`);

  if (dupGroups.length === 0) {
    console.log('✓ 沒有 orderIndex 撞號的 active 記錄。');
  } else {
    console.log(`✗ 發現 ${dupGroups.length} 組 orderIndex 撞號:`);
    for (const g of dupGroups) {
      console.log(`  orderIndex=${g._id} → ${g.count} 筆: ${g.ids.map(String).join(', ')}`);
    }
  }

  if (nullOrderRecords.length === 0) {
    console.log('✓ 沒有 orderIndex 為 null/缺失 的 active 記錄。');
  } else {
    console.log(`✗ 發現 ${nullOrderRecords.length} 筆 orderIndex 為 null/缺失 的 active 記錄:`);
    for (const r of nullOrderRecords) {
      console.log(`  _id=${r._id} queueNumber=${r.queueNumber} name=${r.name} orderIndex=${r.orderIndex}`);
    }
  }

  const hasProblem = dupGroups.length > 0 || nullOrderRecords.length > 0;

  if (!hasProblem) {
    console.log('\n結論：資料乾淨，可安全加上 orderIndex partial unique index。');
    await mongoose.disconnect();
    return;
  }

  if (!doFix) {
    console.log('\n結論：偵測到問題。請先手動備份 waitingrecords，再用 --fix 參數重跑本腳本修正。');
    console.log('（dry-run 模式不修改任何資料）');
    await mongoose.disconnect();
    return;
  }

  // === 2. 修正：兩階段 offset 批量壓回連續 1..N（與 ensureOrderIndexConsistency 同演算法）===
  console.log('\n========== 開始修正（兩階段 offset 批量寫入）==========');

  // D7：orderIndex 主鍵、_id 次鍵，撞號時排序仍 deterministic
  const activeRecords = await WaitingRecord.find({ status: { $in: ACTIVE } })
    .sort({ orderIndex: 1, _id: 1 });

  const plan = activeRecords.map((rec, i) => ({
    _id: rec._id,
    targetOrderIndex: i + 1
  }));

  // 第一階段：推到臨時值（targetOrderIndex + OFFSET，彼此唯一、遠離 1..N）
  await WaitingRecord.bulkWrite(
    plan.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { orderIndex: p.targetOrderIndex + OFFSET } }
      }
    })),
    { ordered: false }
  );

  // 第二階段：壓回最終 1..N
  await WaitingRecord.bulkWrite(
    plan.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { orderIndex: p.targetOrderIndex } }
      }
    })),
    { ordered: false }
  );

  // 修正後再掃描一次驗證
  const recheck = await WaitingRecord.aggregate([
    { $match: { status: { $in: ACTIVE } } },
    { $group: { _id: '$orderIndex', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (recheck.length === 0) {
    console.log(`✓ 修正完成，${plan.length} 筆 active 記錄 orderIndex 已壓成連續 1..${plan.length}，無撞號。`);
    console.log('現在可安全加上 orderIndex partial unique index。');
  } else {
    console.error(`✗ 修正後仍有 ${recheck.length} 組撞號，請人工檢查。`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
