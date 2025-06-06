// API 配置
const getApiBaseUrl = () => {
  // 優先使用環境變數中的API URL
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 在生產環境中，如果沒有設定環境變數，嘗試使用相對路徑
  if (process.env.NODE_ENV === 'production') {
    // 在Zeabur等雲平台，通常前後端會在不同的服務中
    // 如果沒有明確設定API URL，使用當前域名
    return window.location.origin;
  }
  
  // 開發環境使用本地後端
  return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL); // 用於調試

// API 端點
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  QUEUE: `${API_BASE_URL}/api/queue`, 
  ADMIN: `${API_BASE_URL}/api/admin`
};

export default {
  API_BASE_URL,
  API_ENDPOINTS
};