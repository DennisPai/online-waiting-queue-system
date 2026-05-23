/*
  目的：為 SystemSetting 初始化 orderIndexCounter 欄位（orderIndex 原子發號計數器）
        —— Change A / Phase 3 / Task 3.2（design.md D3 + D14）
        Phase 6.4 補做：原 002_init_issued_count.js 已存在但 orderIndexCounter 缺
        對應的人工 migration script，本檔仿照 002 的格式補上。

  背景：
    orderIndex 分配從非原子的「讀 max + 1 + save」升級成 SystemSetting.orderIndexCounter
    原子發號（`findOneAndUpdate $inc 1`）。每次發號都拿到「保證唯一、單調遞增」的值。
    新部署若 orderIndexCounter 缺失，`$inc` 對缺失欄位視為從 0 起跳 → 第一批發號
    就會與既有 active 記錄的 orderIndex 撞號（partial unique index 直接擋下 → E11000）。
    Phase 6.4 在測試環境實測即觀察到首次恢復報名連續撞號 ~50 次才成功（root cause
    是 `getSettings()` 偵測缺欄位的邏輯被 Mongoose default 遮蔽，已另案修補；本 script
    給「需要主動在部署前初始化」的情境使用）。

  初始化基準（design.md D3 + D14）：
    orderIndexCounter = max(orderIndex) of active records (status ∈ {waiting, processing})
    —— 必須 >= 目前所有 active 記錄的最大 orderIndex，否則新發號值會撞既有記錄。
    沒有任何 active 記錄時初始化為 0（之後第一次 $inc 1 會發 1）。

  冪等性：
    本腳本只在 orderIndexCounter 為 undefined / null 時才初始化。
    已有 orderIndexCounter 值的 SystemSetting 不會被覆寫
    （避免把「歷史累計發號值」打回，那會直接造成新發號值撞號）。
    可安全重複執行。

  使用：
    MONGODB_URI="..." node backend/scripts/migrations/003a_init_order_index_counter.js

  ⚠️ 注意：
    1. 本腳本只應在測試環境驗證；正式環境執行前先手動備份 systemsettings collection。
    2. 執行時機建議在「本期尚無新報名寫入」的安靜窗口，避免初始化基準與並發發號競態。
    3. 模型的 SystemSetting.getSettings() 也內建同樣的自動初始化邏輯（Phase 6.4 hotfix
       後改用底層 collection.findOne 偵測，繞過 Mongoose default 遮蔽問題）；本腳本
       是給「需要在部署前主動初始化」的情境使用。
    4. 必須與 002_init_issued_count.js 一起執行（兩個欄位都缺；它們相互獨立、順序不重要）。
*/
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGO_CONNECTION_STRING ||
    'mongodb://localhost:27017/queue_system';
  console.log('Connecting to', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  await mongoose.connect(mongoUri);

  const SystemSetting = require('../../src/models/system-setting.model');
  const WaitingRecord = require('../../src/models/waiting-record.model');

  // 直接用底層 collection 查，避免 schema 預設值把缺失的 orderIndexCounter 補成 0 而誤判
  const rawSettings = await SystemSetting.collection.findOne({});

  if (!rawSettings) {
    console.log('找不到 SystemSetting 文件，略過初始化（系統首次啟動時 getSettings() 會自動建立並補欄位）。');
    await mongoose.disconnect();
    return;
  }

  if (rawSettings.orderIndexCounter !== undefined && rawSettings.orderIndexCounter !== null) {
    console.log(`SystemSetting.orderIndexCounter 已存在（值 = ${rawSettings.orderIndexCounter}），無需初始化。腳本為冪等，安全結束。`);
    await mongoose.disconnect();
    return;
  }

  // 以「目前所有 active 記錄的最大 orderIndex」為基準（D3）
  // 沒有 active 記錄時為 0（首次發號會是 1）
  const maxRecord = await WaitingRecord.findOne(
    { status: { $in: ['waiting', 'processing'] } },
    { orderIndex: 1 },
    { sort: { orderIndex: -1 } }
  );
  const orderIndexCounter = (maxRecord && typeof maxRecord.orderIndex === 'number')
    ? maxRecord.orderIndex
    : 0;

  // 細項統計，方便人工核對
  const activeCount = await WaitingRecord.countDocuments({
    status: { $in: ['waiting', 'processing'] }
  });
  console.log('候位 active 記錄數（waiting + processing）:', activeCount);
  console.log(`active 記錄中最大 orderIndex: ${maxRecord ? maxRecord.orderIndex : '(無 active 記錄)'}`);
  console.log(`計算得 orderIndexCounter = ${orderIndexCounter}（>= 最大 active orderIndex，下次 $inc 1 發 ${orderIndexCounter + 1}）`);

  await SystemSetting.collection.updateOne(
    { _id: rawSettings._id },
    { $set: { orderIndexCounter } }
  );

  console.log(`已將 SystemSetting.orderIndexCounter 初始化為 ${orderIndexCounter}。`);
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
