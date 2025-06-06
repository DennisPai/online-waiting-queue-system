const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');

// 載入環境變數
dotenv.config();

// 導入路由
const authRoutes = require('./routes/auth.routes');
const queueRoutes = require('./routes/queue.routes');
const adminRoutes = require('./routes/admin.routes');

// 導入初始化數據功能
const initializeData = require('./utils/init-data');

// 初始化Express應用
const app = express();
const server = http.createServer(app);

// 設置Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 中間件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 基本路由
app.get('/', (req, res) => {
  res.json({ message: '線上候位系統API服務運行中' });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '伺服器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Socket.io 連接處理
require('./services/socket.service')(io);

// 連接到MongoDB
const mongoUri = process.env.MONGODB_URI || 
                 process.env.DATABASE_URL || 
                 process.env.MONGO_CONNECTION_STRING ||
                 'mongodb://localhost:27017/queue_system';

console.log('嘗試連接到MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('成功連接到MongoDB');
    
    // 初始化數據
    console.log('開始執行數據初始化...');
    const initResult = await initializeData();
    console.log('數據初始化結果:', initResult ? '成功' : '失敗');
    
    // 啟動伺服器
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
      console.log(`伺服器運行在連接埠 ${PORT}`);
    });
  })
  .catch(err => {
    console.error('無法連接到MongoDB:', err);
    process.exit(1);
  });

// 導出app以供測試使用
module.exports = app; 