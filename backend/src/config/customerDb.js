const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * 客戶資料庫獨立連線（lazy init）
 * 使用主資料庫同一個 MongoDB host，指向 customer_archive database
 * 連線失敗時優雅降級，不影響主服務
 */
let customerConnection = null;
let connectionFailed = false;

function getCustomerConnection() {
  if (customerConnection) return customerConnection;
  if (connectionFailed) return null;

  try {
    const mainUri = process.env.MONGODB_URI ||
      process.env.DATABASE_URL ||
      process.env.MONGO_CONNECTION_STRING;

    if (!mainUri) {
      logger.warn('客戶資料庫：無可用的 MongoDB 連線字串，功能停用');
      connectionFailed = true;
      return null;
    }

    // 替換 database 名稱為 customer_archive
    // 支援 mongodb:// 和 mongodb+srv:// 格式
    let customerUri;
    // 匹配 mongodb(+srv)://.../<dbname>?... 中的 dbname 部分
    const dbMatch = mainUri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(.*)$/);
    if (dbMatch) {
      customerUri = dbMatch[1] + 'customer_archive' + dbMatch[3];
    } else {
      // fallback：直接附加 database 名稱
      customerUri = mainUri + '/customer_archive';
    }

    customerConnection = mongoose.createConnection(customerUri);

    customerConnection.on('connected', () => {
      logger.info('客戶資料庫連線成功 (customer_archive)');
    });

    customerConnection.on('error', (err) => {
      logger.error('客戶資料庫連線錯誤:', err.message);
    });

    return customerConnection;
  } catch (err) {
    logger.error('客戶資料庫初始化失敗:', err.message);
    connectionFailed = true;
    return null;
  }
}

module.exports = { getCustomerConnection };
