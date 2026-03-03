const logger = require('./utils/logger');
// 啟動時檢查必要環境變數（必須最先 require）
require('./config/env');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

// 導入 v1 路由（已完成重構遷移）

// 導入錯誤處理中間件
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');

// 導入 Log middleware
const logMiddleware = require('./utils/logMiddleware');

// 導入雙 DB 管理
const { initDbConnections } = require('./config/db');

// 導入初始化數據功能
const initializeData = require('./utils/init-data');

// 導入排程服務
const { schedulePublicRegistrationOpening, cancelAllScheduledJobs } = require('./services/scheduler.service');

// 初始化Express應用
const app = express();
const server = http.createServer(app);

// 設置Socket.io，優化CORS設定
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3100',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 中間件 - 優化CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3100',
  credentials: true
}));

// 安全與日誌
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 速率限制（登入與登記）
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/auth', authLimiter);
app.use('/api/queue/register', registerLimiter);

// 記錄服務啟動時間
const APP_START_TIME = new Date();

// 健康檢查端點（模組 H 強化版）
app.get('/health', async (req, res) => {
  try {
    const { getQueueConn, getCustomerConn, QUEUE_DB_NAME, CUSTOMER_DB_NAME } = require('./config/db');
    const getDbStatus = (conn) => {
      try { return conn && conn.readyState === 1 ? 'connected' : 'disconnected'; }
      catch { return 'unknown'; }
    };

    let lastBackup = null;
    try {
      const { getLastBackupLog } = require('./services/gdrive-backup.service');
      lastBackup = await getLastBackupLog();
    } catch { /* gdrive service 可能未初始化 */ }

    return res.status(200).json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      startTime: APP_START_TIME.toISOString(),
      timestamp: new Date().toISOString(),
      service: 'queue-system-backend',
      db: {
        queue: { name: QUEUE_DB_NAME, status: getDbStatus(getQueueConn()) },
        customer: { name: CUSTOMER_DB_NAME, status: getDbStatus(getCustomerConn()) }
      },
      lastBackup: lastBackup
        ? { timestamp: lastBackup.timestamp, status: lastBackup.status, dryRun: lastBackup.dryRun }
        : null
    });
  } catch (err) {
    return res.status(200).json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      startTime: APP_START_TIME.toISOString(),
      timestamp: new Date().toISOString(),
      service: 'queue-system-backend'
    });
  }
});

// 就緒檢查端點（簡化版，可擴充檢查 DB 連線狀態）
app.get('/ready', (req, res) => {
  const mongoState = mongoose.connection && mongoose.connection.readyState;
  const ready = mongoState === 1; // 1 = connected
  res.status(ready ? 200 : 503).json({ ready, mongoState, ts: new Date().toISOString() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // 防護 MongoDB operator injection

// 基本路由
app.get('/', (req, res) => {
  res.json({ 
    message: '線上候位系統API服務運行中',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Log middleware（掛在路由之前，記錄所有 API 請求）
app.use(logMiddleware);

// v1 API 路由（重構完成後的統一路由）
app.use('/api/v1', require('./routes/v1'));

// 404 處理 - 未匹配的路由
app.use(notFoundHandler);

// 全局錯誤處理中間件 - 統一處理所有錯誤，保留 ApiError 的錯誤訊息
app.use(globalErrorHandler);

// Socket.io 連接處理
require('./services/socket.service')(io);

// 連接到MongoDB - 優化連接邏輯
const mongoUri = process.env.MONGODB_URI || 
                 process.env.DATABASE_URL || 
                 process.env.MONGO_CONNECTION_STRING ||
                 'mongodb://localhost:27017/queue_system';

// 指定主連線的 DB 名稱
// 雙 DB 模式：主連線用 QUEUE_DB_NAME（預設 'queue'）
// 單一 DB 模式（向下相容）：MONGO_DB_NAME 或 'test'
// 若同時設定 QUEUE_DB_NAME 和 MONGO_DB_NAME，優先用 QUEUE_DB_NAME
const { QUEUE_DB_NAME: QUEUE_DB } = require('./config/db');
const mongoDbName = process.env.MONGO_DB_NAME || QUEUE_DB;

logger.info('嘗試連接到MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
logger.info('目標 DB 名稱:', mongoDbName);

// MongoDB 斷線/重連 log（模組 H）
mongoose.connection.on('disconnected', () => { logger.error('MongoDB 斷線'); });
mongoose.connection.on('reconnected', () => { logger.info('MongoDB 重連成功'); });

// 未捕獲的錯誤寫入 log_entries（模組 H）
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection:', reason);
  try {
    const LogEntry = require('./models/log-entry.model');
    LogEntry.create({
      method: 'SYSTEM', path: 'unhandledRejection',
      tags: ['error', 'system'], error: String(reason)
    }).catch(() => {});
  } catch (e) { /* ignore */ }
});
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException:', err);
  try {
    const LogEntry = require('./models/log-entry.model');
    LogEntry.create({
      method: 'SYSTEM', path: 'uncaughtException',
      tags: ['error', 'system', 'danger'], error: err.message
    }).catch(() => {});
  } catch (e) { /* ignore */ }
});

mongoose.connect(mongoUri, { dbName: mongoDbName })
  .then(async () => {
    logger.info('成功連接到MongoDB');

    // 初始化雙 DB 連線（候位 DB + 客戶 DB）
    // 必須在 mongoose.connect() 成功後、initializeData() 之前呼叫
    initDbConnections();
    
    // 移除舊的唯一索引（如果存在）
    logger.info('檢查並移除queueNumber唯一索引...');
    try {
      const removeUniqueIndex = require('./utils/removeUniqueIndex');
      await removeUniqueIndex();
      logger.debug('索引檢查完成');
    } catch (error) {
      logger.error('索引處理時發生錯誤:', error);
      // 不要因為索引錯誤而停止服務器啟動
    }
    
    // 初始化數據
    logger.info('開始執行數據初始化...');
    const initResult = await initializeData();
    logger.info('數據初始化結果:', initResult ? '成功' : '失敗');
    
    // 啟動排程系統（在資料庫連接成功後）
    logger.info('啟動排程系統...');
    await schedulePublicRegistrationOpening();

    // 啟動 Google Drive 備份排程（模組 C-2）
    const { startGDriveBackupScheduler } = require('./services/gdrive-backup.service');
    startGDriveBackupScheduler();
    
    // 啟動伺服器
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`伺服器運行在連接埠 ${PORT}`);
      logger.info(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3100'}`);
      logger.info(`Socket CORS Origin: ${process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3100'}`);
    });
  })
  .catch(err => {
    logger.error('無法連接到MongoDB:', err);
    process.exit(1);
  });

// 優雅關閉處理
process.on('SIGTERM', () => {
  logger.info('SIGTERM 信號收到，正在關閉服務...');
  cancelAllScheduledJobs();
  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB 連接已關閉');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT 信號收到，正在關閉服務...');
  cancelAllScheduledJobs();
  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB 連接已關閉');
      process.exit(0);
    });
  });
});

// 導出app以供測試使用
module.exports = app; 