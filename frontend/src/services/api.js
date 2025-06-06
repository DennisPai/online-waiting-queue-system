import axios from 'axios';

// 設定API基本URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// 創建axios實例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10秒超時
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 可以在這裡添加身份驗證token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除token和重定向到登入頁面
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api; 