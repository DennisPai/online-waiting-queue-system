/*
  目的：為 SystemSetting 初始化 issuedCount 欄位（額滿原子閘門用）
        —— Change A / Phase 2 / Task 2.6（design.md D8）

  背景：
    額滿判斷從非原子的「先查再寫」升級成 SystemSetting.issuedCount 原子閘門。
    issuedCount = 本期累計發出的候位名額數（只增不減）。
    新部署若 issuedCount 缺失或為 0，閘門基準會錯誤（誤判成「還沒收過人」），
    因此上線時必須以「目前 active + cancelled 記錄數」初始化。

  初始化基準（design.md D8 / Risks）：
    issuedCount = count(status ∈ {waiting, processing, cancelled})
    —— cancelled 仍佔名額故計入；completed 為已辦完、本期不再佔位故不計入。

  冪等性：
    本腳本只在 issuedCount 為 undefined / null 時才初始化。
    已有 issuedCount 值的 SystemSetting 不會被覆寫（避免把累計值打回）。
    可安全重複執行。

  使用：
    MONGODB_URI="..." node backend/scripts/migrations/002_init_issued_count.js

  ⚠️ 注意：
    1. 本腳本只應在測試環境驗證；正式環境執行前先手動備份 systemsettings collection。
    2. 執行時機建議在「本期尚無新報名寫入」的安靜窗口，避免初始化基準與並發寫入競態。
    3. 模型的 SystemSetting.getSettings() 也內建同樣的自動初始化邏輯（雲端部署
       首次讀取設定時會自動補欄位）；本腳本是給「需要在部署前主動初始化」的情境用。
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

  // 直接用底層 collection 查，避免 schema 預設值把缺失的 issuedCount 補成 0 而誤判
  const rawSettings = await SystemSetting.collection.findOne({});

  if (!rawSettings) {
    console.log('找不到 SystemSetting 文件，略過初始化（系統首次啟動時 getSettings() 會自動建立並補欄位）。');
    await mongoose.disconnect();
    return;
  }

  if (rawSettings.issuedCount !== undefined && rawSettings.issuedCount !== null) {
    console.log(`SystemSetting.issuedCount 已存在（值 = ${rawSettings.issuedCount}），無需初始化。腳本為冪等，安全結束。`);
    await mongoose.disconnect();
    return;
  }

  // 以「目前 active + cancelled 記錄數」初始化（cancelled 仍佔名額）
  const issuedCount = await WaitingRecord.countDocuments({
    status: { $in: ['waiting', 'processing', 'cancelled'] }
  });

  // 細項統計，方便人工核對
  const breakdown = {};
  for (const s of ['waiting', 'processing', 'cancelled', 'completed']) {
    breakdown[s] = await WaitingRecord.countDocuments({ status: s });
  }
  console.log('候位記錄狀態分布:', breakdown);
  console.log(`計算得 issuedCount（waiting + processing + cancelled）= ${issuedCount}`);

  await SystemSetting.collection.updateOne(
    { _id: rawSettings._id },
    { $set: { issuedCount } }
  );

  console.log(`已將 SystemSetting.issuedCount 初始化為 ${issuedCount}。`);
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
