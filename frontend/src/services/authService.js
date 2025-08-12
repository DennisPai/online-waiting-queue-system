import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// 用戶登入
const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_ENDPOINTS.AUTH}/login`, credentials);
    return response.data?.data; // { user, token }
  } catch (error) {
    console.error('登入錯誤:', error);
    throw error;
  }
};

// 獲取當前用戶資訊
const getMe = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.get(`${API_ENDPOINTS.AUTH}/me`, config);
    return response.data?.data; // user
  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    throw error;
  }
};

// 創建新用戶（僅限管理員）
const register = async (userData, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.post(`${API_ENDPOINTS.AUTH}/register`, userData, config);
    return response.data?.data; // new user
  } catch (error) {
    console.error('註冊錯誤:', error);
    throw error;
  }
};

// 登入後修改密碼
const changePassword = async (oldPassword, newPassword, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.put(`${API_ENDPOINTS.AUTH}/change-password`, { oldPassword, newPassword }, config);
  return response.data?.data; // { updatedAt }
};

const authService = {
  login,
  getMe,
  register,
  changePassword
};

export default authService; 