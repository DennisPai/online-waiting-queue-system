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
    try {
      const { token } = getState().auth;
      
      console.log('Redux setNextSessionDate 開始:', {
        nextSessionDate,
        token: token ? '存在' : '不存在',
        timestamp: new Date().toISOString()
      });
      
      const response = await queueService.setNextSessionDate(nextSessionDate, token);
      
      console.log('Redux setNextSessionDate 成功:', {
        response,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error('Redux setNextSessionDate 錯誤:', {
        error: {
          message: error.message,
          stack: error.stack,
          response: error.response?.data
        },
        timestamp: new Date().toISOString()
      });
      
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        '設置下次辦事時間失敗'
      );
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
        
        if (action.payload.isOpen) {
          state.currentQueue = action.payload.currentQueueNumber;
          state.waitingCount = action.payload.waitingCount;
          state.estimatedWaitTime = action.payload.estimatedWaitTime;
          state.estimatedEndTime = action.payload.estimatedEndTime;
          state.nextSessionDate = action.payload.nextSessionDate;
        } else {
          state.nextSessionDate = action.payload.nextSessionDate;
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
        
        console.log('Redux setNextSessionDate fulfilled:', {
          payload: action.payload,
          timestamp: new Date().toISOString()
        });
        
        // 處理不同的響應數據結構
        let nextSessionDate = null;
        
        if (action.payload?.data?.nextSessionDate) {
          nextSessionDate = action.payload.data.nextSessionDate;
        } else if (action.payload?.nextSessionDate) {
          nextSessionDate = action.payload.nextSessionDate;
        } else if (action.payload?.data?.data?.nextSessionDate) {
          nextSessionDate = action.payload.data.data.nextSessionDate;
        }
        
        console.log('Redux: 提取的 nextSessionDate:', nextSessionDate);
        
        if (nextSessionDate) {
          state.nextSessionDate = nextSessionDate;
          
          // 更新queueStatus中的nextSessionDate
          if (state.queueStatus) {
            state.queueStatus = {
              ...state.queueStatus,
              nextSessionDate: nextSessionDate
            };
          }
          
          console.log('Redux: nextSessionDate 更新成功');
        } else {
          console.warn('Redux: 無法從響應中提取 nextSessionDate');
        }
      })
      .addCase(setNextSessionDate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        console.error('Redux setNextSessionDate rejected:', {
          error: action.payload,
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