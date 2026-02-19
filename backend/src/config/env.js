/**
 * 環境變數檢查與預設值
 * 在 server 啟動時最早 require，確保必要變數存在
 */

const dotenv = require('dotenv');
dotenv.config();

// 非必要環境變數預設值
const DEFAULTS = {
  PORT: '8080',
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:3100',
  SOCKET_CORS_ORIGIN: 'http://localhost:3100',
  JWT_EXPIRES_IN: '7d',
  JWT_SECRET: 'default-jwt-secret-please-change',
};

// 檢查 MongoDB 連線字串（支援多種環境變數名稱）
if (!process.env.MONGODB_URI && !process.env.DATABASE_URL && !process.env.MONGO_CONNECTION_STRING) {
  console.error('[ERROR] Missing required env: MONGODB_URI (or DATABASE_URL / MONGO_CONNECTION_STRING)');
  console.error('[ERROR] 請設定資料庫連線字串後再啟動服務');
  process.exit(1);
}

// JWT_SECRET 未設定時給預設值並警告
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET 未設定，使用預設值。正式環境請務必設定！');
}

// 套用預設值
Object.entries(DEFAULTS).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN,
};
