// API 配置
const getApiBaseUrl = () => {
  // 在生產環境中，前端和後端會有不同的網域
  if (process.env.NODE_ENV === 'production') {
    // 在Zeabur部署時，可以通過環境變數設定後端URL
    return process.env.REACT_APP_API_URL || window.location.origin;
  }
  
  // 開發環境使用相對路徑
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

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