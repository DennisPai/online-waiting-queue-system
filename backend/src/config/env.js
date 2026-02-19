/**
 * 環境變數檢查與預設值
 * 在 server 啟動時最早 require，確保必要變數存在
 */

const dotenv = require('dotenv');
dotenv.config();

// 必要環境變數（缺少任一個就終止啟動）
const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
];

// 非必要環境變數預設值
const DEFAULTS = {
  PORT: '8080',
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:3100',
  SOCKET_CORS_ORIGIN: 'http://localhost:3100',
  JWT_EXPIRES_IN: '7d',
};

// 檢查必要變數
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  missing.forEach((key) => {
    console.error(`[ERROR] Missing required env: ${key}`);
  });
  console.error('[ERROR] 請設定以上環境變數後再啟動服務');
  process.exit(1);
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
