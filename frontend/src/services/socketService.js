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
      return process.env.REACT_APP_API_URL || window.location.origin;
    }
    return undefined; // 開發環境使用預設（相對路徑）
  };

  // 建立Socket.io連接
  socket = io(getSocketUrl(), {
    auth: {
      token
    }
  });

  // 連接事件
  socket.on('connect', () => {
    console.log('Socket連接成功');
  });

  // 連接錯誤
  socket.on('connect_error', (error) => {
    console.error('Socket連接錯誤:', error);
  });

  // 斷開連接
  socket.on('disconnect', (reason) => {
    console.log('Socket斷開連接:', reason);
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
  if (!socket) return;
  socket.emit('queue:subscribe', queueNumber);

  // 監聽該候位號碼的狀態更新
  socket.on('queue:status', (data) => {
    store.dispatch(
      addNotification({
        message: data.message || `候位號碼 ${queueNumber} 狀態已更新`,
        severity: 'info',
        autoHideDuration: 5000
      })
    );
    store.dispatch(getQueueNumberStatus(queueNumber));
  });
};

// 清除所有事件監聽
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
  initSocket,
  subscribeToQueueNumber,
  clearListeners,
  disconnect,
  getSocket: () => socket
};

export default socketService; 