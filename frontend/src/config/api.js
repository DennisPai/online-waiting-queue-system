// API 配置
const getApiBaseUrl = () => {
  // 在生產環境中，優先使用環境變數
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl) {
      console.log('使用環境變數API URL:', apiUrl);
      return apiUrl;
    }
    // 在Zeabur部署時，如果沒有設定環境變數，嘗試使用當前域名
    const currentHost = window.location.hostname;
    if (currentHost.includes('zeabur.app')) {
      console.log('檢測到Zeabur環境，但未設定REACT_APP_API_URL');
      console.warn('警告：請設定REACT_APP_API_URL環境變數指向後端服務');
    }
    console.log('未設定REACT_APP_API_URL環境變數，使用相對路徑');
    return '';
  }
  
  // 開發環境
  console.log('開發環境，使用localhost:8080');
  return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

// 版本前綴（預設 v1；可透過 REACT_APP_API_VERSION 控制，若要用舊端點可設空字串）
export const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
export const API_PREFIX = API_VERSION ? `/api/${API_VERSION}` : '/api';

// 添加詳細的調試資訊
console.log('=== API 配置資訊 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('當前域名:', window.location.hostname);
console.log('最終API Base URL:', API_BASE_URL);
console.log('REACT_APP_API_VERSION:', process.env.REACT_APP_API_VERSION);
console.log('API Prefix:', API_PREFIX);
console.log('==================');

// API 端點
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}${API_PREFIX}/auth`,
  QUEUE: `${API_BASE_URL}${API_PREFIX}/queue`, 
  ADMIN: `${API_BASE_URL}${API_PREFIX}/admin`,
  CUSTOMERS: `${API_BASE_URL}${API_PREFIX}/customers`
};

// 健康檢查端點
export const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  HEALTH_CHECK_URL
};