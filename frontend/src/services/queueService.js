import axios from 'axios';
import logger from '../utils/logger';

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

// 公共 API

// 獲取候位狀態
const getQueueStatus = async () => {
  const response = await axios.get(`${API_URL}/status`);
  return response.data;
};

// 登記候位
const registerQueue = async (queueData) => {
  const response = await axios.post(`${API_URL}/register`, queueData);
  return response.data;
};

// 獲取特定候位號碼的狀態
const getQueueNumberStatus = async (queueNumber) => {
  const response = await axios.get(`${API_URL}/status/${queueNumber}`);
  return response.data;
};

// 通過姓名和電話查詢候位號碼
const searchQueueByNameAndPhone = async (name, phone) => {
  const response = await axios.get(`${API_URL}/search`, {
    params: { name, phone }
  });
  return response.data;
};

// 獲取排序的候位號碼（公共API）
const getPublicOrderedNumbers = async () => {
  try {
    const response = await axios.get(`${API_URL}/ordered-numbers`);
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
    const response = await axios.get(`${ADMIN_API_URL}/queue/ordered-numbers`, config);
    return response.data;
  } catch (error) {
    console.error('獲取順序客戶號碼錯誤:', error);
    throw error.response?.data || error;
  }
};

// 管理員 API

// 獲取候位列表
const getQueueList = async (params = {}, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params
  };
  const response = await axios.get(`${ADMIN_API_URL}/queue/list`, config);
  return response.data;
};

// 呼叫下一位
const callNextQueue = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(`${ADMIN_API_URL}/queue/next`, {}, config);
  return response.data;
};

// 更新候位狀態
const updateQueueStatus = async (queueId, status, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(
    `${ADMIN_API_URL}/queue/${queueId}/status`,
    { status },
    config
  );
  return response.data;
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
      `${ADMIN_API_URL}/queue/updateOrder`,
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
  const method = 'PUT';
  const url = `${ADMIN_API_URL}/settings/nextSession`;
  
  try {
    // 參數驗證
    if (!nextSessionDate) {
      throw new Error('下次辦事時間參數不能為空');
    }
    
    if (!token) {
      throw new Error('認證令牌不能為空');
    }
    
    // 日期格式驗證
    const testDate = new Date(nextSessionDate);
    if (isNaN(testDate.getTime())) {
      throw new Error('無效的日期格式');
    }
    
    const data = { nextSessionDate };
    
    console.log('queueService setNextSessionDate 開始:', {
      nextSessionDate,
      url,
      data,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
    
    logger.apiRequest(method, url, data, 'queueService');
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超時
    };
    
    console.log('queueService: 準備發送請求', {
      url,
      data,
      headers: {
        ...config.headers,
        Authorization: token ? 'Bearer [REDACTED]' : 'missing'
      }
    });
    
    const response = await axios.put(url, data, config);
    
    console.log('queueService setNextSessionDate API 響應:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      timestamp: new Date().toISOString()
    });
    
    // 驗證響應格式
    if (!response.data) {
      throw new Error('API 返回空響應數據');
    }
    
    if (response.data.success === false) {
      throw new Error(response.data.message || 'API 操作失敗');
    }
    
    logger.apiResponse(method, url, response.data, 'queueService');
    
    console.log('queueService setNextSessionDate 成功完成:', {
      responseData: response.data,
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('queueService setNextSessionDate 錯誤:', {
      url,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      },
      timestamp: new Date().toISOString()
    });
    
    logger.apiError(method, url, error, 'queueService');
    
    // 根據不同類型的錯誤提供相應的錯誤訊息
    let errorMessage = '設置下次辦事時間失敗';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '請求超時，請檢查網路連接';
    } else if (error.response) {
      // 服務器響應錯誤
      if (error.response.status === 401) {
        errorMessage = '認證失敗，請重新登入';
      } else if (error.response.status === 403) {
        errorMessage = '權限不足，無法執行此操作';
      } else if (error.response.status >= 500) {
        errorMessage = '服務器內部錯誤，請稍後再試';
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.request) {
      // 網路錯誤
      errorMessage = '網路連接失敗，請檢查網路設定';
    } else if (error.message) {
      // 其他錯誤
      errorMessage = error.message;
    }
    
    // 創建標準化的錯誤對象
    const standardError = new Error(errorMessage);
    standardError.originalError = error;
    standardError.response = error.response;
    
    throw standardError;
  }
};

// 開關候位功能
const toggleQueueStatus = async (isOpen, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(
    `${ADMIN_API_URL}/settings/queueStatus`,
    { isOpen },
    config
  );
  return response.data;
};

// 設定最大候位上限
const setMaxQueueNumber = async (maxQueueNumber, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(
    `${ADMIN_API_URL}/settings/maxQueueNumber`,
    { maxQueueNumber },
    config
  );
  return response.data;
};

// 更新客戶資料
const updateQueueData = async (queueId, customerData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(
    `${ADMIN_API_URL}/queue/${queueId}/update`,
    customerData,
    config
  );
  return response.data;
};

// 刪除客戶資料
const deleteCustomer = async (queueId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.delete(
    `${ADMIN_API_URL}/queue/${queueId}/delete`,
    config
  );
  return response.data;
};

// 設定每位客戶預估處理時間
const setMinutesPerCustomer = async (minutesPerCustomer, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.put(
    `${ADMIN_API_URL}/settings/minutesPerCustomer`,
    { minutesPerCustomer },
    config
  );
  return response.data;
};

// 清除所有候位資料
const clearAllQueue = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.delete(
    `${ADMIN_API_URL}/queue/clear-all`,
    config
  );
  return response.data;
};

const queueService = {
  getQueueStatus,
  registerQueue,
  getQueueNumberStatus,
  searchQueueByNameAndPhone,
  getPublicOrderedNumbers,
  getQueueList,
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  setNextSessionDate,
  toggleQueueStatus,
  setMaxQueueNumber,
  updateQueueData,
  getOrderedQueueNumbers,
  deleteCustomer,
  clearAllQueue,
  setMinutesPerCustomer
};

export default queueService; 