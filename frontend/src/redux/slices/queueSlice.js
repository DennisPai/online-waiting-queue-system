import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import queueService from '../../services/queueService';

const initialState = {
  queueStatus: null,
  currentQueue: null,
  registeredQueueNumber: null, // 新增：專門記錄用戶剛登記的號碼
  waitingCount: 0,
  estimatedWaitTime: 0,
  estimatedEndTime: null,
  isQueueOpen: true,
  nextSessionDate: null,
  queueList: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  currentQueueStatus: null,
  isLoading: false,
  error: null
};

// 獲取候位狀態
export const getQueueStatus = createAsyncThunk(
  'queue/getStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await queueService.getQueueStatus();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '獲取候位狀態失敗');
    }
  }
);

// 登記候位
export const registerQueue = createAsyncThunk(
  'queue/register',
  async (queueData, { rejectWithValue }) => {
    try {
      const response = await queueService.registerQueue(queueData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '候位登記失敗');
    }
  }
);

// 獲取特定候位號碼的狀態
export const getQueueNumberStatus = createAsyncThunk(
  'queue/getNumberStatus',
  async (queueNumber, { rejectWithValue }) => {
    try {
      const response = await queueService.getQueueNumberStatus(queueNumber);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '查詢候位狀態失敗');
    }
  }
);

// 獲取候位列表（管理員）
export const getQueueList = createAsyncThunk(
  'queue/getList',
  async (params, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.getQueueList(params, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '獲取候位列表失敗');
    }
  }
);

// 呼叫下一位（管理員）
export const callNextQueue = createAsyncThunk(
  'queue/callNext',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.callNextQueue(token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '呼叫下一位失敗');
    }
  }
);

// 更新候位狀態（管理員）
export const updateQueueStatus = createAsyncThunk(
  'queue/updateStatus',
  async ({ queueId, status }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.updateQueueStatus(queueId, status, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '更新候位狀態失敗');
    }
  }
);

// 更新候位順序（管理員）
export const updateQueueOrder = createAsyncThunk(
  'queue/updateOrder',
  async ({ queueId, newOrder }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.updateQueueOrder(queueId, newOrder, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '更新候位順序失敗');
    }
  }
);

// 設置下次辦事時間（管理員）
export const setNextSessionDate = createAsyncThunk(
  'queue/setNextSessionDate',
  async (nextSessionDate, { rejectWithValue, getState }) => {
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'queueSlice');
        } else {
          console[level](`[queueSlice] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    try {
      // 參數驗證
      if (!nextSessionDate) {
        safeLog('error', 'nextSessionDate 參數為空');
        return rejectWithValue('下次辦事時間不能為空');
      }

      // 日期格式驗證
      let dateString;
      try {
        if (typeof nextSessionDate === 'string') {
          // 確保字符串是有效的ISO日期格式
          const testDate = new Date(nextSessionDate);
          if (isNaN(testDate.getTime())) {
            throw new Error('無效的日期字符串');
          }
          dateString = nextSessionDate;
        } else if (nextSessionDate instanceof Date) {
          if (isNaN(nextSessionDate.getTime())) {
            throw new Error('無效的Date對象');
          }
          dateString = nextSessionDate.toISOString();
        } else {
          throw new Error('不支持的日期格式');
        }
      } catch (dateError) {
        safeLog('error', '日期格式驗證失敗', { nextSessionDate, error: dateError.message });
        return rejectWithValue('日期格式錯誤: ' + dateError.message);
      }

      const { token } = getState().auth;
      
      if (!token) {
        safeLog('error', '認證令牌不存在');
        return rejectWithValue('認證令牌不存在，請重新登入');
      }
      
      safeLog('info', 'setNextSessionDate 開始', {
        dateString,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
      
      const response = await queueService.setNextSessionDate(dateString, token);
      
      safeLog('info', 'setNextSessionDate 成功', {
        response,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      safeLog('error', 'setNextSessionDate 錯誤', {
        error: {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        },
        timestamp: new Date().toISOString()
      });
      
      // 確保錯誤訊息是字符串
      const errorMessage = error.message || error.toString() || '設置下次辦事時間失敗';
      return rejectWithValue(errorMessage);
    }
  }
);

// 開關候位功能（管理員）
export const toggleQueueStatus = createAsyncThunk(
  'queue/toggleStatus',
  async (isOpen, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.toggleQueueStatus(isOpen, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '開關候位功能失敗');
    }
  }
);

// 設定最大候位上限（管理員）
export const setMaxQueueNumber = createAsyncThunk(
  'queue/setMaxQueueNumber',
  async (maxQueueNumber, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setMaxQueueNumber(maxQueueNumber, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定最大候位上限失敗');
    }
  }
);

// 設定每位客戶預估處理時間（管理員）
export const setMinutesPerCustomer = createAsyncThunk(
  'queue/setMinutesPerCustomer',
  async (minutesPerCustomer, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setMinutesPerCustomer(minutesPerCustomer, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定每位客戶預估處理時間失敗');
    }
  }
);

// 通過姓名和電話查詢候位號碼
export const searchQueueByNameAndPhone = createAsyncThunk(
  'queue/searchByNameAndPhone',
  async ({ name, phone }, { rejectWithValue }) => {
    try {
      const response = await queueService.searchQueueByNameAndPhone(name, phone);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '查詢候位號碼失敗');
    }
  }
);

// 更新客戶資料（管理員）
export const updateQueueData = createAsyncThunk(
  'queue/updateData',
  async ({ queueId, customerData }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.updateQueueData(queueId, customerData, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '更新客戶資料失敗');
    }
  }
);

// 刪除客戶資料（管理員）
export const deleteCustomer = createAsyncThunk(
  'queue/deleteCustomer',
  async (queueId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.deleteCustomer(queueId, token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '刪除客戶資料失敗');
    }
  }
);

// 清除所有候位資料（管理員）
export const clearAllQueue = createAsyncThunk(
  'queue/clearAllQueue',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.clearAllQueue(token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '清除所有候位失敗');
    }
  }
);

// 獲取順序1和順序2的客戶號碼（管理員）
export const getOrderedQueueNumbers = createAsyncThunk(
  'queue/getOrderedNumbers',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.getOrderedQueueNumbers(token);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '獲取排序候位號碼失敗');
    }
  }
);

// 獲取排序候位號碼（公共API）
export const getPublicOrderedNumbers = createAsyncThunk(
  'queue/getPublicOrderedNumbers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await queueService.getPublicOrderedNumbers();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '獲取公共排序候位號碼失敗');
    }
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    clearQueueError: (state) => {
      state.error = null;
    },
    resetRegistration: (state) => {
      state.registeredQueueNumber = null; // 重置用戶登記的號碼
      state.error = null;
      state.waitingCount = 0;
      state.estimatedWaitTime = 0;
      state.estimatedEndTime = null;
    },
    clearQueueSearch: (state) => {
      state.currentQueueStatus = null;
      state.error = null;
    },
    updateOrderLocal: (state, action) => {
      state.queueList = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // 獲取候位狀態
      .addCase(getQueueStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getQueueStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueStatus = action.payload;
        state.isQueueOpen = action.payload.isOpen;
        
        // 安全的日期處理
        const safeDateAssignment = (dateValue) => {
          try {
            if (!dateValue) return null;
            if (typeof dateValue === 'string') {
              const testDate = new Date(dateValue);
              return !isNaN(testDate.getTime()) ? dateValue : null;
            }
            return null;
          } catch (error) {
            console.warn('getQueueStatus 日期處理錯誤:', error);
            return null;
          }
        };
        
        if (action.payload.isOpen) {
          state.currentQueue = action.payload.currentQueueNumber;
          state.waitingCount = action.payload.waitingCount;
          state.estimatedWaitTime = action.payload.estimatedWaitTime;
          state.estimatedEndTime = action.payload.estimatedEndTime;
          state.nextSessionDate = safeDateAssignment(action.payload.nextSessionDate);
        } else {
          state.nextSessionDate = safeDateAssignment(action.payload.nextSessionDate);
        }
      })
      .addCase(getQueueStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 登記候位
      .addCase(registerQueue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(registerQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registeredQueueNumber = action.payload.queueNumber; // 使用新的狀態
        state.waitingCount = action.payload.waitingCount;
        state.estimatedWaitTime = action.payload.estimatedWaitTime;
        state.estimatedEndTime = action.payload.estimatedEndTime;
      })
      .addCase(registerQueue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 獲取特定候位號碼的狀態
      .addCase(getQueueNumberStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getQueueNumberStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQueueStatus = action.payload;
      })
      .addCase(getQueueNumberStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 獲取候位列表（管理員）
      .addCase(getQueueList.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getQueueList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueList = action.payload.records;
        state.pagination = action.payload.pagination;
      })
      .addCase(getQueueList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 呼叫下一位（管理員）
      .addCase(callNextQueue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(callNextQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQueue = action.payload.queueNumber;
        // 更新列表中的狀態
        state.queueList = state.queueList.map(item => {
          if (item._id === action.payload.record._id) {
            return action.payload.record;
          }
          return item;
        });
      })
      .addCase(callNextQueue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 更新候位狀態（管理員）
      .addCase(updateQueueStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateQueueStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新列表中的狀態
        state.queueList = state.queueList.map(item => {
          if (item._id === action.payload._id) {
            return action.payload;
          }
          return item;
        });
      })
      .addCase(updateQueueStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 更新候位順序（管理員）
      .addCase(updateQueueOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateQueueOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        // 安全地訪問allRecords路徑，考慮不同的回應結構可能性
        if (action.payload && action.payload.data && Array.isArray(action.payload.data.allRecords)) {
          state.queueList = action.payload.data.allRecords;
        } else if (action.payload && Array.isArray(action.payload.allRecords)) {
          state.queueList = action.payload.allRecords;
        }
        // 如果沒有allRecords，保持現有狀態不變
      })
      .addCase(updateQueueOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設置下次辦事時間（管理員）
      .addCase(setNextSessionDate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        console.log('Redux: setNextSessionDate pending');
      })
      .addCase(setNextSessionDate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        
        // 安全的日誌記錄
        const safeLog = (level, message, data) => {
          try {
            if (window.logger && window.logger[level]) {
              window.logger[level](message, data, 'queueSlice');
            } else {
              console[level](`[queueSlice] ${message}`, data);
            }
          } catch (logError) {
            console.warn('日誌記錄失敗:', logError.message);
          }
        };
        
        safeLog('info', 'setNextSessionDate fulfilled 開始', {
          payload: action.payload,
          payloadType: typeof action.payload,
          timestamp: new Date().toISOString()
        });
        
        // 安全地檢查和提取響應數據
        let nextSessionDate = null;
        
        try {
          // 多層級檢查響應數據結構
          if (action.payload) {
            if (action.payload.data?.nextSessionDate) {
              nextSessionDate = action.payload.data.nextSessionDate;
              safeLog('debug', '從 payload.data.nextSessionDate 提取日期');
            } else if (action.payload.nextSessionDate) {
              nextSessionDate = action.payload.nextSessionDate;
              safeLog('debug', '從 payload.nextSessionDate 提取日期');
            } else if (action.payload.data?.data?.nextSessionDate) {
              nextSessionDate = action.payload.data.data.nextSessionDate;
              safeLog('debug', '從 payload.data.data.nextSessionDate 提取日期');
            }
          }
          
          if (nextSessionDate) {
            // 安全地處理日期對象
            let dateToStore = null;
            
            if (typeof nextSessionDate === 'string') {
              // 驗證字符串是否為有效的ISO日期
              const testDate = new Date(nextSessionDate);
              if (!isNaN(testDate.getTime())) {
                dateToStore = nextSessionDate;
              } else {
                throw new Error('無效的日期字符串格式');
              }
            } else if (nextSessionDate instanceof Date) {
              // 驗證 Date 對象是否有效
              if (!isNaN(nextSessionDate.getTime())) {
                dateToStore = nextSessionDate.toISOString();
              } else {
                throw new Error('無效的 Date 對象');
              }
            } else {
              throw new Error('不支持的日期數據類型');
            }
            
            // 更新狀態
            state.systemSettings = {
              ...state.systemSettings,
              nextSessionDate: dateToStore
            };
            
            safeLog('info', 'setNextSessionDate 狀態更新成功', {
              oldDate: state.systemSettings?.nextSessionDate,
              newDate: dateToStore,
              timestamp: new Date().toISOString()
            });
          } else {
            safeLog('warn', '響應中未找到 nextSessionDate', {
              payload: action.payload
            });
          }
        } catch (error) {
          safeLog('error', 'setNextSessionDate fulfilled 處理錯誤', {
            error: {
              message: error.message,
              stack: error.stack
            },
            payload: action.payload,
            timestamp: new Date().toISOString()
          });
          
          // 即使處理失敗，也要確保狀態的一致性
          state.error = error.message || '日期處理錯誤';
        }
      })
      .addCase(setNextSessionDate.rejected, (state, action) => {
        state.isLoading = false;
        
        // 安全的日誌記錄
        const safeLog = (level, message, data) => {
          try {
            if (window.logger && window.logger[level]) {
              window.logger[level](message, data, 'queueSlice');
            } else {
              console[level](`[queueSlice] ${message}`, data);
            }
          } catch (logError) {
            console.warn('日誌記錄失敗:', logError.message);
          }
        };
        
        const errorMessage = action.payload || action.error?.message || '設置下次辦事時間失敗';
        state.error = errorMessage;
        
        safeLog('error', 'setNextSessionDate rejected', {
          payload: action.payload,
          error: action.error,
          errorMessage,
          timestamp: new Date().toISOString()
        });
      })
      
      // 開關候位功能（管理員）
      .addCase(toggleQueueStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(toggleQueueStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isQueueOpen = action.payload.isQueueOpen;
      })
      .addCase(toggleQueueStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設定最大候位上限（管理員）
      .addCase(setMaxQueueNumber.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setMaxQueueNumber.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新系統設定中的最大候位上限
        state.queueStatus = {
          ...state.queueStatus,
          maxQueueNumber: action.payload.maxQueueNumber
        };
      })
      .addCase(setMaxQueueNumber.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設定每位客戶預估處理時間（管理員）
      .addCase(setMinutesPerCustomer.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setMinutesPerCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新系統設定中的每位客戶預估處理時間
        state.queueStatus = {
          ...state.queueStatus,
          minutesPerCustomer: action.payload.minutesPerCustomer
        };
      })
      .addCase(setMinutesPerCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 通過姓名和電話查詢候位號碼
      .addCase(searchQueueByNameAndPhone.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchQueueByNameAndPhone.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQueueStatus = action.payload;
        state.error = null;
      })
      .addCase(searchQueueByNameAndPhone.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.currentQueueStatus = null;
      })

      // 更新客戶資料
      .addCase(updateQueueData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateQueueData.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新當前選中的記錄
        if (state.queueList) {
          const index = state.queueList.findIndex(item => item._id === action.payload._id);
          if (index !== -1) {
            state.queueList[index] = action.payload;
          }
        }
      })
      .addCase(updateQueueData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 獲取排序候位號碼（管理員）
      .addCase(getOrderedQueueNumbers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOrderedQueueNumbers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQueue = action.payload.currentProcessingNumber || state.currentQueue;
        // 存儲下一個等待號碼，供前端顯示使用
        state.queueStatus = {
          ...state.queueStatus,
          currentQueueNumber: action.payload.currentProcessingNumber || state.currentQueue,
          nextWaitingNumber: action.payload.nextWaitingNumber
        };
      })
      .addCase(getOrderedQueueNumbers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 獲取公共排序候位號碼
      .addCase(getPublicOrderedNumbers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPublicOrderedNumbers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQueue = action.payload.currentProcessingNumber || state.currentQueue;
        // 存儲下一個等待號碼，供前端顯示使用
        state.queueStatus = {
          ...state.queueStatus,
          currentQueueNumber: action.payload.currentProcessingNumber || state.currentQueue,
          nextWaitingNumber: action.payload.nextWaitingNumber
        };
      })
      .addCase(getPublicOrderedNumbers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 清除所有候位資料（管理員）
      .addCase(clearAllQueue.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(clearAllQueue.fulfilled, (state, action) => {
        state.isLoading = false;
        // 清除所有候位相關的狀態
        state.queueList = [];
        state.currentQueue = 0;
        state.waitingCount = 0;
        state.registeredQueueNumber = null;
        state.currentQueueStatus = null;
        state.queueStatus = {
          ...state.queueStatus,
          currentQueueNumber: 0,
          nextWaitingNumber: null
        };
        state.pagination = {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        };
      })
      .addCase(clearAllQueue.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { clearQueueError, resetRegistration, clearQueueSearch, updateOrderLocal } = queueSlice.actions;

export default queueSlice.reducer; 