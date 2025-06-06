// API 配置
const getApiBaseUrl = () => {
  // 在生產環境中，優先使用環境變數
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl) {
      console.log('使用環境變數API URL:', apiUrl);
      return apiUrl;
    }
    console.log('未設定REACT_APP_API_URL環境變數，使用相對路徑');
    return '';
  }
  
  // 開發環境
  console.log('開發環境，使用localhost');
  return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

// 添加詳細的調試資訊
console.log('=== API 配置資訊 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('最終API Base URL:', API_BASE_URL);
console.log('==================');

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