import axios from 'axios';
import { API_ENDPOINTS, HEALTH_CHECK_URL } from '../config/api';

// 根據環境決定API基礎URL
const getApiBaseUrl = () => {
  // 在生產環境中使用後端服務的完整URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || window.location.origin;
  }
  // 開發環境使用代理
  return '';
};

const API_BASE_URL = getApiBaseUrl();
const API_URL = `${API_BASE_URL}/api/queue`;
const ADMIN_API_URL = `${API_BASE_URL}/api/admin`;

// 健康檢查功能
const healthCheck = async () => {
  try {
    console.log('🔍 執行健康檢查，目標:', HEALTH_CHECK_URL || 'relative /health');
    const response = await axios.get(HEALTH_CHECK_URL || '/health', {
      timeout: 10000 // 10秒超時
    });
    console.log('✅ 健康檢查成功:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ 健康檢查失敗:', error);
    console.error('錯誤詳情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      details: error.response?.data
    };
  }
};

// 公共 API

// 獲取候位狀態
const getQueueStatus = async () => {
  try {
    console.log('📊 獲取候位狀態，API:', `${API_ENDPOINTS.QUEUE}/status`);
    const response = await axios.get(`${API_ENDPOINTS.QUEUE}/status`);
    return response.data;
  } catch (error) {
    console.error('❌ 獲取候位狀態錯誤:', error);
    throw error;
  }
};

// 登記候位
const registerQueue = async (queueData) => {
  try {
    const response = await axios.post(`${API_ENDPOINTS.QUEUE}/register`, queueData);
    return response.data;
  } catch (error) {
    console.error('登記候位錯誤:', error);
    throw error;
  }
};

// 獲取特定候位號碼的狀態
const getQueueNumberStatus = async (queueNumber) => {
  try {
    const response = await axios.get(`${API_ENDPOINTS.QUEUE}/status/${queueNumber}`);
    return response.data;
  } catch (error) {
    console.error('獲取候位號碼狀態錯誤:', error);
    throw error;
  }
};

// 通過姓名和電話查詢候位號碼
const searchQueueByNameAndPhone = async (name, phone) => {
  try {
    const response = await axios.get(`${API_ENDPOINTS.QUEUE}/search`, {
      params: { name, phone }
    });
    return response.data;
  } catch (error) {
    console.error('查詢候位號碼錯誤:', error);
    throw error;
  }
};

// 獲取排序的候位號碼（公共API）
const getPublicOrderedNumbers = async () => {
  try {
    const response = await axios.get(`${API_ENDPOINTS.QUEUE}/ordered-numbers`);
    return response.data;
  } catch (error) {
    console.error('獲取公共排序候位號碼錯誤:', error);
    throw error.response?.data || error;
  }
};

// 獲取順序1和順序2的客戶號碼
const getOrderedQueueNumbers = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  try {
    const response = await axios.get(`${API_ENDPOINTS.ADMIN}/queue/ordered-numbers`, config);
    return response.data;
  } catch (error) {
    console.error('獲取順序客戶號碼錯誤:', error);
    throw error.response?.data || error;
  }
};

// 管理員 API

// 獲取候位列表
const getQueueList = async (params = {}, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    };
    const response = await axios.get(`${API_ENDPOINTS.ADMIN}/queue/list`, config);
    return response.data;
  } catch (error) {
    console.error('獲取候位列表錯誤:', error);
    throw error;
  }
};

// 呼叫下一位
const callNextQueue = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(`${API_ENDPOINTS.ADMIN}/queue/next`, {}, config);
    return response.data;
  } catch (error) {
    console.error('呼叫下一位錯誤:', error);
    throw error;
  }
};

// 更新候位狀態
const updateQueueStatus = async (queueId, status, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/queue/${queueId}/status`,
      { status },
      config
    );
    return response.data;
  } catch (error) {
    console.error('更新候位狀態錯誤:', error);
    throw error;
  }
};

// 更新候位順序
const updateQueueOrder = async (queueId, newOrder, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/queue/updateOrder`,
      { queueId, newOrder },
      config
    );
    
    // 檢查回應格式
    if (!response.data || !response.data.success) {
      console.error('API回應格式不正確:', response.data);
      throw new Error('API回應格式不正確');
    }
    
    return response.data;
  } catch (error) {
    console.error('更新順序服務錯誤:', error);
    throw error.response?.data || error;
  }
};

// 設置下次辦事時間
const setNextSessionDate = async (nextSessionDate, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/settings/nextSession`,
      { nextSessionDate },
      config
    );
    return response.data;
  } catch (error) {
    console.error('設置下次辦事時間錯誤:', error);
    throw error;
  }
};

// 開關候位功能
const toggleQueueStatus = async (isOpen, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/settings/queueStatus`,
      { isOpen },
      config
    );
    return response.data;
  } catch (error) {
    console.error('開關候位功能錯誤:', error);
    throw error;
  }
};

// 設定最大候位上限
const setMaxQueueNumber = async (maxQueueNumber, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/settings/maxQueueNumber`,
      { maxQueueNumber },
      config
    );
    return response.data;
  } catch (error) {
    console.error('設定最大候位上限錯誤:', error);
    throw error;
  }
};

// 更新客戶資料
const updateQueueData = async (queueId, customerData, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/queue/${queueId}/update`,
      customerData,
      config
    );
    return response.data;
  } catch (error) {
    console.error('更新客戶資料錯誤:', error);
    throw error;
  }
};

// 刪除客戶資料
const deleteCustomer = async (queueId, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.delete(`${API_ENDPOINTS.ADMIN}/queue/${queueId}/delete`, config);
    return response.data;
  } catch (error) {
    console.error('刪除客戶資料錯誤:', error);
    throw error;
  }
};

// 設定每位客戶預估處理時間
const setMinutesPerCustomer = async (minutesPerCustomer, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.put(
      `${API_ENDPOINTS.ADMIN}/settings/minutesPerCustomer`,
      { minutesPerCustomer },
      config
    );
    return response.data;
  } catch (error) {
    console.error('設定處理時間錯誤:', error);
    throw error;
  }
};

// 清空所有候位
const clearAllQueue = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    const response = await axios.delete(`${API_ENDPOINTS.ADMIN}/queue/clear-all`, config);
    return response.data;
  } catch (error) {
    console.error('清空候位錯誤:', error);
    throw error;
  }
};

const queueService = {
  // 公共 API
  getQueueStatus,
  registerQueue,
  getQueueNumberStatus,
  searchQueueByNameAndPhone,
  getPublicOrderedNumbers,
  
  // 管理員 API
  getQueueList,
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  setNextSessionDate,
  toggleQueueStatus,
  setMaxQueueNumber,
  updateQueueData,
  deleteCustomer,
  setMinutesPerCustomer,
  clearAllQueue,
  getOrderedQueueNumbers,

  // 健康檢查功能
  healthCheck
};

export default queueService; 