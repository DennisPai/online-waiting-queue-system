#!/usr/bin/env node
/**
 * migrate-dual-db.js — 雙 DB 拆分資料遷移腳本
 *
 * 目的：將舊單一 DB（預設 'test'）中的客戶相關 collection
 *       複製到新的客戶 DB（CUSTOMER_DB_NAME，預設 'customer'）
 *
 * 安全順序：先複製 → 驗證筆數一致 → 確認無誤才刪除舊 collection
 *
 * 使用方式：
 *   MONGODB_URI="..." SOURCE_DB="test" CUSTOMER_DB_NAME="customer" node scripts/migrate-dual-db.js
 *
 * ⚠️ 執行前確認：
 *   1. 測試環境先跑過，確認無誤
 *   2. 正式環境執行前先手動備份整個 SOURCE_DB
 *   3. 執行時服務暫停（或確認無寫入操作）
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_CONNECTION_STRING;
const SOURCE_DB = process.env.SOURCE_DB || process.env.MONGO_DB_NAME || 'test';
const CUSTOMER_DB_NAME = process.env.CUSTOMER_DB_NAME || 'customer';

// 要遷移的 collection
const COLLECTIONS_TO_MIGRATE = ['customer_profiles', 'customer_visits', 'customer_households'];

async function migrate() {
  if (!MONGODB_URI) {
    console.error('❌ 缺少 MONGODB_URI 環境變數');
    process.exit(1);
  }

  if (SOURCE_DB === CUSTOMER_DB_NAME) {
    console.log(`⚠️  SOURCE_DB (${SOURCE_DB}) = CUSTOMER_DB_NAME (${CUSTOMER_DB_NAME})，無需遷移`);
    process.exit(0);
  }

  console.log(`🔗 連線到 MongoDB...`);
  await mongoose.connect(MONGODB_URI);

  const mainConn = mongoose.connection;
  const sourceDb = mainConn.useDb(SOURCE_DB);
  const targetDb = mainConn.useDb(CUSTOMER_DB_NAME);

  console.log(`📦 來源 DB: ${SOURCE_DB}`);
  console.log(`📦 目標 DB: ${CUSTOMER_DB_NAME}`);
  console.log('');

  const results = [];

  for (const collName of COLLECTIONS_TO_MIGRATE) {
    try {
      const sourceCol = sourceDb.collection(collName);
      const targetCol = targetDb.collection(collName);

      const sourceDocs = await sourceCol.find({}).toArray();
      const sourceCount = sourceDocs.length;

      if (sourceCount === 0) {
        console.log(`⏭️  ${collName}: 來源為空，跳過`);
        results.push({ collection: collName, status: 'skipped', count: 0 });
        continue;
      }

      console.log(`📋 ${collName}: 來源 ${sourceCount} 筆，開始複製...`);

      // 先檢查目標是否已有資料
      const targetExistingCount = await targetCol.countDocuments();
      if (targetExistingCount > 0) {
        console.log(`  ⚠️  目標已有 ${targetExistingCount} 筆，將額外插入（不刪除既有資料）`);
      }

      // 複製到目標
      await targetCol.insertMany(sourceDocs, { ordered: false });

      // 驗證
      const targetCount = await targetCol.countDocuments();
      const expectedCount = targetExistingCount + sourceCount;

      if (targetCount >= expectedCount) {
        console.log(`  ✅ 複製成功：目標現有 ${targetCount} 筆`);
        results.push({ collection: collName, status: 'copied', source: sourceCount, target: targetCount });
      } else {
        console.log(`  ❌ 驗證失敗：期望 ${expectedCount} 筆，實際 ${targetCount} 筆`);
        results.push({ collection: collName, status: 'failed', source: sourceCount, target: targetCount });
      }
    } catch (err) {
      console.error(`  ❌ ${collName} 遷移失敗:`, err.message);
      results.push({ collection: collName, status: 'error', error: err.message });
    }
  }

  console.log('');
  console.log('=== 遷移結果 ===');
  const allOk = results.every(r => r.status === 'copied' || r.status === 'skipped');

  results.forEach(r => {
    const icon = r.status === 'copied' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${r.collection}: ${r.status}`, r.count !== undefined ? `(${r.count} 筆)` : '');
  });

  if (allOk) {
    console.log('');
    console.log('✅ 所有 collection 複製成功');
    console.log('');
    console.log('⚠️  下一步（請手動確認後執行）：');
    console.log('   刪除來源 DB 的客戶 collection：');
    COLLECTIONS_TO_MIGRATE.forEach(c => {
      console.log(`   db.getSiblingDB("${SOURCE_DB}").${c}.drop()`);
    });
  } else {
    console.log('');
    console.log('❌ 部分 collection 遷移失敗，請檢查錯誤訊息後重試');
    console.log('   來源 DB 的 collection 未被刪除，資料安全');
    process.exitCode = 1;
  }

  await mongoose.connection.close();
  console.log('🔌 MongoDB 連線已關閉');
}

migrate().catch(err => {
  console.error('❌ 遷移腳本發生意外錯誤:', err);
  process.exitCode = 1;
  mongoose.connection.close().catch(() => {});
});
