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

function getQueueConn() {
  return queueConn || mongoose.connection;
}

function getCustomerConn() {
  return customerConn || mongoose.connection;
}

module.exports = { initDbConnections, getQueueConn, getCustomerConn, QUEUE_DB_NAME, CUSTOMER_DB_NAME };
