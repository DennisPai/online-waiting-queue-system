import { io } from 'socket.io-client';
import { store } from '../redux/store';
import { addNotification } from '../redux/slices/uiSlice';
import { getQueueStatus, getQueueNumberStatus } from '../redux/slices/queueSlice';

let socket;

const initSocket = (token) => {
  if (socket) socket.disconnect();

  // 根據環境決定Socket.io服務器URL
  const getSocketUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      const apiUrl = process.env.REACT_APP_API_URL;
      if (apiUrl) {
        console.log('使用環境變數Socket URL:', apiUrl);
        return apiUrl;
      }
      // 在Zeabur部署時的警告
      const currentHost = window.location.hostname;
      if (currentHost.includes('zeabur.app')) {
        console.warn('警告：Socket.io將使用相對路徑連線，請確保設定REACT_APP_API_URL');
      }
      return undefined; // 使用相對路徑
    }
    // 開發環境使用localhost
    return 'http://localhost:8080';
  };

  // 建立Socket.io連接
  socket = io(getSocketUrl(), {
    auth: {
      token
    },
    transports: ['websocket', 'polling'], // 支援多種傳輸方式
    timeout: 10000, // 連線超時時間
    reconnection: true, // 自動重連
    reconnectionAttempts: 5, // 重連次數
    reconnectionDelay: 1000 // 重連延遲
  });

  // 連接事件
  socket.on('connect', () => {
    console.log('Socket連接成功，ID:', socket.id);
  });

  // 連接錯誤
  socket.on('connect_error', (error) => {
    console.error('Socket連接錯誤:', error);
    store.dispatch(
      addNotification({
        message: '即時通訊連接失敗，請檢查網路連線',
        severity: 'warning',
        autoHideDuration: 5000
      })
    );
  });

  // 斷開連接
  socket.on('disconnect', (reason) => {
    console.log('Socket斷開連接:', reason);
    if (reason === 'io server disconnect') {
      // 服務器主動斷開，需要手動重連
      socket.connect();
    }
  });

  // 重連成功
  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket重連成功，嘗試次數:', attemptNumber);
    store.dispatch(
      addNotification({
        message: '即時通訊連接已恢復',
        severity: 'success',
        autoHideDuration: 3000
      })
    );
  });

  // 監聽候位更新
  socket.on('queue:update', (data) => {
    store.dispatch(
      addNotification({
        message: data.message || '候位狀態已更新',
        severity: 'info',
        autoHideDuration: 5000
      })
    );
    store.dispatch(getQueueStatus());
  });

  return socket;
};

// 訂閱特定候位號碼的更新
const subscribeToQueueNumber = (queueNumber) => {
  if (!socket || !socket.connected) {
    console.warn('Socket未連接，無法訂閱候位號碼更新');
    return;
  }
  
  socket.emit('queue:subscribe', queueNumber);
  
  // 監聽特定號碼的狀態更新
  socket.on('queue:status', (data) => {
    if (data.queueNumber === queueNumber) {
      store.dispatch(getQueueNumberStatus(queueNumber));
    }
  });
};

// 清除事件監聽器
const clearListeners = () => {
  if (!socket) return;
  socket.off('queue:update');
  socket.off('queue:status');
  socket.off('admin:update');
};

// 斷開連接
const disconnect = () => {
  if (socket) {
    clearListeners();
    socket.disconnect();
    socket = null;
  }
};

const socketService = {
  init: initSocket,
  subscribeToQueueNumber,
  clearListeners,
  disconnect,
  getSocket: () => socket,
  isConnected: () => socket && socket.connected
};

export default socketService; 