/**
 * migrate-production.js
 * 正式環境資料遷移腳本：把 test DB 的 customer 相關 collections 複製到 customer DB
 *
 * 使用方式：
 *   # 確認資料量（不執行遷移）
 *   MONGODB_URI="mongodb://..." node scripts/migrate-production.js --dry-run
 *
 *   # 實際遷移
 *   MONGODB_URI="mongodb://..." node scripts/migrate-production.js --execute
 *
 * ⛔ 絕對不刪除 test DB 任何資料
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const SOURCE_DB = process.env.SOURCE_DB || 'test';
const TARGET_DB = process.env.TARGET_DB || 'customer';
const COLLECTIONS = ['customer_profiles', 'customer_visits', 'customer_households'];

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.error('❌ 請指定 --dry-run 或 --execute');
  process.exit(1);
}

if (!MONGODB_URI) {
  console.error('❌ 請設定環境變數 MONGODB_URI');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('✅ MongoDB 連線成功\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    console.log(`來源 DB：${SOURCE_DB}`);
    console.log(`目標 DB：${TARGET_DB}`);
    console.log(`Collections：${COLLECTIONS.join(', ')}\n`);

    // Step 1：印出各 collection 的資料量
    console.log('=== 資料量確認 ===');
    const sourceCounts = {};
    for (const colName of COLLECTIONS) {
      const count = await sourceDb.collection(colName).countDocuments();
      sourceCounts[colName] = count;
      console.log(`  ${SOURCE_DB}.${colName}: ${count} 筆`);
    }

    if (isDryRun) {
      console.log('\n[Dry Run] 僅確認資料量，不執行遷移。');
      console.log('如要執行遷移，請改用 --execute 參數。');
      return;
    }

    // Step 2：實際遷移
    console.log('\n=== 開始遷移 ===');
    const results = {};

    for (const colName of COLLECTIONS) {
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      const total = sourceCounts[colName];
      if (total === 0) {
        results[colName] = { total: 0, inserted: 0, skipped: 0 };
        console.log(`  ${colName}: 無資料，跳過`);
        continue;
      }

      const docs = await sourceCol.find().toArray();

      let inserted = 0;
      let skipped = 0;

      try {
        // ordered: false → 遇到 duplicate _id 不中斷，繼續其他文件
        const result = await targetCol.insertMany(docs, { ordered: false });
        inserted = result.insertedCount;
        skipped = total - inserted;
      } catch (err) {
        // BulkWriteError：部分成功（duplicate key 錯誤會在這裡）
        if (err.code === 11000 || err.name === 'MongoBulkWriteError') {
          inserted = err.result?.nInserted || 0;
          skipped = total - inserted;
        } else {
          throw err;
        }
      }

      results[colName] = { total, inserted, skipped };
      console.log(`  ${colName}: 總計 ${total} 筆 → 新增 ${inserted} 筆，跳過（已存在）${skipped} 筆`);
    }

    // Step 3：驗證目標 DB 資料量
    console.log('\n=== 遷移後目標 DB 資料量 ===');
    for (const colName of COLLECTIONS) {
      const count = await targetDb.collection(colName).countDocuments();
      console.log(`  ${TARGET_DB}.${colName}: ${count} 筆`);
    }

    console.log('\n=== 遷移摘要 ===');
    for (const [col, r] of Object.entries(results)) {
      console.log(`  ${col}: 原始 ${r.total}，新增 ${r.inserted}，跳過 ${r.skipped}`);
    }

    console.log('\n✅ 遷移完成。test DB 資料未被修改。');

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('❌ 遷移失敗:', err.message);
  process.exit(1);
});
