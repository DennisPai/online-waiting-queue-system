import api from './api';

// 用戶登入
const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

// 獲取當前用戶資訊
const getMe = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await api.get('/auth/me', config);
  return response.data;
};

// 創建新用戶（僅限管理員）
const register = async (userData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await api.post('/auth/register', userData, config);
  return response.data;
};

const authService = {
  login,
  getMe,
  register
};

export default authService; 