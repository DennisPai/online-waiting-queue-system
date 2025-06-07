// API 配置
const getApiBaseUrl = () => {
  // 在生產環境中，優先使用環境變數
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl) {
      console.log('✅ 使用環境變數API URL:', apiUrl);
      return apiUrl;
    }
    
    // 在Zeabur部署時，如果沒有設定環境變數，嘗試使用當前域名
    const currentHost = window.location.hostname;
    console.log('🌐 當前域名:', currentHost);
    
    if (currentHost.includes('zeabur.app')) {
      console.log('🔧 檢測到Zeabur環境，但未設定REACT_APP_API_URL');
      console.warn('⚠️ 警告：建議設定REACT_APP_API_URL環境變數指向後端服務');
      console.log('📝 將使用相對路徑連接，確保前後端在同一域名下');
    }
    
    console.log('📍 未設定REACT_APP_API_URL環境變數，使用相對路徑');
    return '';
  }
  
  // 開發環境
  console.log('🛠️ 開發環境，使用localhost:8080');
  return 'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

// 添加詳細的調試資訊
console.log('=== 🔍 API 配置資訊 ===');
console.log('環境模式:', process.env.NODE_ENV);
console.log('API環境變數:', process.env.REACT_APP_API_URL || '未設定');
console.log('當前協議:', window.location.protocol);
console.log('當前域名:', window.location.hostname);
console.log('當前端口:', window.location.port);
console.log('當前完整URL:', window.location.origin);
console.log('最終API Base URL:', API_BASE_URL || 'relative path');
console.log('========================');

// API 端點
export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/api/auth`,
  QUEUE: `${API_BASE_URL}/api/queue`, 
  ADMIN: `${API_BASE_URL}/api/admin`
};

// 健康檢查端點
export const HEALTH_CHECK_URL = `${API_BASE_URL}/health`;

// 添加端點調試信息
console.log('📡 API 端點配置:');
console.log('Auth:', API_ENDPOINTS.AUTH);
console.log('Queue:', API_ENDPOINTS.QUEUE);
console.log('Admin:', API_ENDPOINTS.ADMIN);
console.log('Health:', HEALTH_CHECK_URL);

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  HEALTH_CHECK_URL
};