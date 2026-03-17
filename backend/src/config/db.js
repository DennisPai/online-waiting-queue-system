/**
 * db.js — 雙 DB 連線管理
 *
 * 候位 DB（QUEUE_DB_NAME，預設 'queue'）：
 *   WaitingRecord, SystemSetting, User, LogEntry
 *
 * 客戶 DB（CUSTOMER_DB_NAME，預設 'customer'）：
 *   Customer, VisitRecord, Household
 *
 * 向下相容：兩個 DB name 相同 → 行為與單一 DB 相同
 *
 * 使用方式：
 *   mongoose.connect() 成功後呼叫 initDbConnections()
 *   此後所有 require('../models/customer.model') 等都已綁定正確 DB
 */
const mongoose = require('mongoose');
const path = require('path');
const logger = require('../utils/logger');

const QUEUE_DB_NAME = process.env.QUEUE_DB_NAME || 'queue';
const CUSTOMER_DB_NAME = process.env.CUSTOMER_DB_NAME || 'customer';

let queueConn = null;
let customerConn = null;

/**
 * 初始化雙連線，並將客戶 Model 重新綁定到 customer DB
 * 必須在 mongoose.connect() 成功後呼叫
 */
function initDbConnections() {
  const mainConn = mongoose.connection;

  // 候位 DB：用 useDb 確保綁定到正確 DB
  queueConn = mainConn.useDb(QUEUE_DB_NAME, { useCache: true });

  if (CUSTOMER_DB_NAME === QUEUE_DB_NAME) {
    // 向下相容：單一 DB 模式
    customerConn = queueConn;
    logger.info(`單一 DB 模式：${QUEUE_DB_NAME}`);
  } else {
    customerConn = mainConn.useDb(CUSTOMER_DB_NAME, { useCache: true });
    logger.info(`候位 DB: ${QUEUE_DB_NAME}`);
    logger.info(`客戶 DB: ${CUSTOMER_DB_NAME}`);
    logger.info('兩個 DB 連線正常');
  }

  // 將客戶相關 Model 重新綁定到 customerConn
  // 透過替換 require cache 中的 exports，讓後續所有 require 都拿到正確 model
  _rebindCustomerModels(customerConn);

  // 將候位相關 Model 重新綁定到 queueConn
  _rebindQueueModels(queueConn);

  // 任務 3：log 每個 Model 綁定的 DB name，方便確認 rebind 正確
  logger.info(`[DB Binding] Customer      → ${customerConn.db.databaseName}.customer_profiles`);
  logger.info(`[DB Binding] VisitRecord   → ${customerConn.db.databaseName}.customer_visits`);
  logger.info(`[DB Binding] Household     → ${customerConn.db.databaseName}.customer_households`);
  logger.info(`[DB Binding] WaitingRecord → ${queueConn.db.databaseName}.waitingrecords`);

  // 任務 2：非同步檢查 queue DB 是否有殘留 customer 資料（不阻塞啟動）
  _checkResidualCustomerData().catch(e => logger.error('殘留資料檢查失敗:', e));

  return { queueConn, customerConn };
}

function _rebindModel(conn, modelName, schemaGetter) {
  // 清除各個 connection 的 model 快取
  try { delete mongoose.connection.models[modelName]; } catch(e) {}
  try { delete mongoose.models[modelName]; } catch(e) {}
  try { delete conn.models[modelName]; } catch(e) {}
  // 在指定 connection 上重建 model
  return conn.model(modelName, schemaGetter());
}

function _rebindCustomerModels(conn) {
  const modelsDir = path.join(__dirname, '../models');

  // Customer
  const customerModule = require(path.join(modelsDir, 'customer.model'));
  const CustomerModel = _rebindModel(conn, 'Customer', () => customerModule._schema);
  // 更新 require cache
  require.cache[require.resolve(path.join(modelsDir, 'customer.model'))].exports = CustomerModel;
  CustomerModel._schema = customerModule._schema;

  // VisitRecord
  const visitModule = require(path.join(modelsDir, 'visit-record.model'));
  const VisitModel = _rebindModel(conn, 'VisitRecord', () => visitModule._schema);
  require.cache[require.resolve(path.join(modelsDir, 'visit-record.model'))].exports = VisitModel;
  VisitModel._schema = visitModule._schema;

  // Household
  const householdModule = require(path.join(modelsDir, 'household.model'));
  const HouseholdModel = _rebindModel(conn, 'Household', () => householdModule._schema);
  require.cache[require.resolve(path.join(modelsDir, 'household.model'))].exports = HouseholdModel;
  HouseholdModel._schema = householdModule._schema;
}

function _rebindQueueModels(conn) {
  const modelsDir = path.join(__dirname, '../models');
  const queueModelNames = [
    ['waiting-record.model', 'WaitingRecord'],
    ['system-setting.model', 'SystemSetting'],
    ['user.model', 'User'],
    ['log-entry.model', 'LogEntry'],
  ];
  for (const [file, name] of queueModelNames) {
    try {
      const mod = require(path.join(modelsDir, file));
      const schema = mod._schema || (mod.schema);
      if (!schema) continue;
      const rebuilt = _rebindModel(conn, name, () => schema);
      require.cache[require.resolve(path.join(modelsDir, file))].exports = rebuilt;
      rebuilt._schema = schema;
    } catch(e) {
      logger.warn(`[db.js] rebind ${name} 失敗: ${e.message}`);
    }
  }
}

/**
 * 任務 2：檢查 queue DB 是否有殘留的 customer collection
 * 若 queue DB 出現 customer_profiles / customer_visits / customer_households 且有資料
 * → 發出 warn log，提示需要資料遷移
 */
async function _checkResidualCustomerData() {
  if (CUSTOMER_DB_NAME === QUEUE_DB_NAME) return; // 單 DB 模式不需要檢查

  const queueDb = queueConn.db;
  const collections = await queueDb.listCollections().toArray();
  const customerCollections = ['customer_profiles', 'customer_visits', 'customer_households'];

  for (const colName of customerCollections) {
    const found = collections.find(c => c.name === colName);
    if (found) {
      const count = await queueDb.collection(colName).countDocuments();
      if (count > 0) {
        logger.warn(`⚠️ [DB 錯位警告] queue DB 發現 ${colName} (${count} 筆)，應在 customer DB。請執行資料遷移。`);
      }
    }
  }
}

function getQueueConn() {
  return queueConn || mongoose.connection;
}

function getCustomerConn() {
  return customerConn || mongoose.connection;
}

module.exports = { initDbConnections, getQueueConn, getCustomerConn, QUEUE_DB_NAME, CUSTOMER_DB_NAME };
