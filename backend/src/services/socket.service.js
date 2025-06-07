const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Socket.io 服務
 * @param {Object} io - Socket.io 實例
 */
module.exports = (io) => {
  // 連接中間件
  io.use(async (socket, next) => {
    try {
      // 獲取token
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      console.log('Socket.io 連接嘗試:', {
        id: socket.id,
        hasToken: !!token,
        origin: socket.handshake.headers.origin
      });
      
      // 如果沒有token，也允許連接（僅限於公開事件）
      if (!token) {
        socket.user = null;
        console.log('Socket.io 公開連接:', socket.id);
        return next();
      }
      
      // 驗證token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 查找用戶
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('無效的用戶'));
      }
      
      // 將用戶信息附加到socket
      socket.user = {
        id: user._id,
        username: user.username,
        role: user.role
      };
      
      next();
    } catch (error) {
      console.error('Socket身份驗證錯誤:', error);
      next(new Error('身份驗證失敗'));
    }
  });

  // 連接處理
  io.on('connection', (socket) => {
    const userInfo = socket.user ? `${socket.user.username}(${socket.user.role})` : '訪客';
    console.log(`✅ Socket.io 用戶連接: ${socket.id} - ${userInfo}`);
    
    // 加入公共候位頻道
    socket.join('queue-updates');
    console.log(`用戶 ${socket.id} 加入候位更新頻道`);
    
    // 如果是管理員，加入管理員頻道
    if (socket.user && socket.user.role === 'admin') {
      socket.join('admin-updates');
      console.log(`管理員 ${socket.id} 加入管理員頻道`);
    }
    
    // 監聽客戶端事件
    socket.on('queue:subscribe', (queueNumber) => {
      // 允許客戶端訂閱特定候位號碼的更新
      if (queueNumber) {
        socket.join(`queue-${queueNumber}`);
      }
    });
    
    // 斷開連接處理
    socket.on('disconnect', () => {
      console.log('用戶斷開連接:', socket.id);
    });
  });
  
  // 暴露一些工具方法，供其他模塊調用
  return {
    /**
     * 廣播候位狀態更新
     * @param {Object} data - 要廣播的數據
     */
    broadcastQueueUpdate(data) {
      io.to('queue-updates').emit('queue:update', data);
    },
    
    /**
     * 發送特定候位號碼的狀態更新
     * @param {Number} queueNumber - 候位號碼
     * @param {Object} data - 要發送的數據
     */
    sendQueueNumberUpdate(queueNumber, data) {
      io.to(`queue-${queueNumber}`).emit('queue:status', data);
    },
    
    /**
     * 向管理員廣播更新
     * @param {Object} data - 要廣播的數據
     */
    broadcastAdminUpdate(data) {
      io.to('admin-updates').emit('admin:update', data);
    }
  };
}; 