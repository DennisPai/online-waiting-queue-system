const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * 客戶資料庫獨立連線
 * 使用與主資料庫相同的 host，但指向 customer_archive database
 */
let customerConnection = null;

function getCustomerConnection() {
  if (customerConnection) return customerConnection;

  const mainUri = process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGO_CONNECTION_STRING;

  // 將主連線 URI 的 database 名稱替換為 customer_archive
  let customerUri;
  try {
    const url = new URL(mainUri);
    // 保留 path 中的 query string（如 ?retryWrites=true）
    const queryIndex = url.pathname.indexOf('?');
    const query = queryIndex > -1 ? url.pathname.substring(queryIndex) : '';
    url.pathname = '/customer_archive' + query;
    customerUri = url.toString();
  } catch {
    // fallback: 簡單替換最後一段路徑
    customerUri = mainUri.replace(/\/[^/?]+(\?|$)/, '/customer_archive$1');
  }

  logger.info('建立客戶資料庫連線...');
  customerConnection = mongoose.createConnection(customerUri);

  customerConnection.on('connected', () => {
    logger.info('客戶資料庫連線成功 (customer_archive)');
  });

  customerConnection.on('error', (err) => {
    logger.error('客戶資料庫連線錯誤:', err);
  });

  return customerConnection;
}

module.exports = { getCustomerConnection };
