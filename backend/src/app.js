const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

// 載入環境變數
dotenv.config();

// 導入 v1 路由（已完成重構遷移）

// 導入錯誤處理中間件
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');

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

// 添加健康檢查端點
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queue-system-backend'
  });
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

console.log('嘗試連接到MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('成功連接到MongoDB');
    
    // 移除舊的唯一索引（如果存在）
    console.log('檢查並移除queueNumber唯一索引...');
    try {
      const removeUniqueIndex = require('./utils/removeUniqueIndex');
      await removeUniqueIndex();
      console.log('索引檢查完成');
    } catch (error) {
      console.error('索引處理時發生錯誤:', error);
      // 不要因為索引錯誤而停止服務器啟動
    }
    
    // 初始化數據
    console.log('開始執行數據初始化...');
    const initResult = await initializeData();
    console.log('數據初始化結果:', initResult ? '成功' : '失敗');
    
    // 啟動排程系統（在資料庫連接成功後）
    console.log('啟動排程系統...');
    await schedulePublicRegistrationOpening();
    
    // 啟動伺服器
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`伺服器運行在連接埠 ${PORT}`);
      console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3100'}`);
      console.log(`Socket CORS Origin: ${process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3100'}`);
    });
  })
  .catch(err => {
    console.error('無法連接到MongoDB:', err);
    process.exit(1);
  });

// 優雅關閉處理
process.on('SIGTERM', () => {
  console.log('SIGTERM 信號收到，正在關閉服務...');
  cancelAllScheduledJobs();
  server.close(() => {
    console.log('HTTP 伺服器已關閉');
    mongoose.connection.close(false, () => {
      console.log('MongoDB 連接已關閉');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT 信號收到，正在關閉服務...');
  cancelAllScheduledJobs();
  server.close(() => {
    console.log('HTTP 伺服器已關閉');
    mongoose.connection.close(false, () => {
      console.log('MongoDB 連接已關閉');
      process.exit(0);
    });
  });
});

// 導出app以供測試使用
module.exports = app; 