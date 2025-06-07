import axios from 'axios';

// 根據環境決定API基礎URL
const getApiBaseUrl = () => {
  // 在生產環境中使用後端服務的完整URL
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = process.env.REACT_APP_API_URL;
    console.log('生產環境 API URL:', apiUrl);
    if (apiUrl) {
      return apiUrl;
    }
    // 如果沒有設定REACT_APP_API_URL，則嘗試使用當前網域
    console.warn('未設定 REACT_APP_API_URL，使用當前網域');
    return window.location.origin;
  }
  // 開發環境使用代理
  console.log('開發環境，使用空字串（代理）');
  return '';
};

const API_BASE_URL = getApiBaseUrl();
const API_URL = `${API_BASE_URL}/api/queue`;
const ADMIN_API_URL = `${API_BASE_URL}/api/admin`;

console.log('API配置:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  API_BASE_URL,
  API_URL,
  ADMIN_API_URL
});

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
  try {
    console.log('API調用 - 設置下次辦事時間:', { nextSessionDate, token: token ? '存在' : '不存在' });
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const response = await axios.put(
      `${ADMIN_API_URL}/settings/nextSession`,
      { nextSessionDate },
      config
    );
    
    console.log('API回應 - 設置下次辦事時間:', response.data);
    return response.data;
  } catch (error) {
    console.error('API錯誤 - 設置下次辦事時間:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error.response?.data || error;
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