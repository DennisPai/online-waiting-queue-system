import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import queueService from '../../services/queueService';

const initialState = {
  queueStatus: null,
  currentQueue: null,
  registeredQueueNumber: null, // 新增：專門記錄用戶剛登記的號碼
  registeredOrderIndex: null, // 新增：記錄用戶剛登記的叫號順序
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
  maxOrderIndex: 0, // 新增：目前最大的叫號順序
  maxOrderMessage: '', // 新增：最大叫號順序的提醒訊息
  isLoading: false,
  error: null
};

// 獲取候位狀態
export const getQueueStatus = createAsyncThunk(
  'queue/getStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await queueService.getQueueStatus();
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // registerQueue 可能還未完全遷移到 v1，保持原始處理
      return response.data || response;
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
      // getQueueNumberStatus 可能返回 v1 格式，安全處理
      return response.data || response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      const response = await queueService.setNextSessionDate(nextSessionDate, token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設置下次辦事時間失敗');
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
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
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定每位客戶預估處理時間失敗');
    }
  }
);

// 設定簡化模式（管理員）
export const setSimplifiedMode = createAsyncThunk(
  'queue/setSimplifiedMode',
  async (simplifiedMode, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setSimplifiedMode(simplifiedMode, token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定簡化模式失敗');
    }
  }
);

// 設定公開候位登記功能（管理員）
export const setPublicRegistrationEnabled = createAsyncThunk(
  'queue/setPublicRegistrationEnabled',
  async (publicRegistrationEnabled, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setPublicRegistrationEnabled(publicRegistrationEnabled, token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定公開候位登記功能失敗');
    }
  }
);

// 設定客戶總數（管理員）
export const setTotalCustomerCount = createAsyncThunk(
  'queue/setTotalCustomerCount',
  async (totalCustomerCount, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setTotalCustomerCount(totalCustomerCount, token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定客戶總數失敗');
    }
  }
);

// 重設客戶總數（管理員）
export const resetTotalCustomerCount = createAsyncThunk(
  'queue/resetTotalCustomerCount',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.resetTotalCustomerCount(token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '重設客戶總數失敗');
    }
  }
);

// 設定上一位辦完時間（管理員）
export const setLastCompletedTime = createAsyncThunk(
  'queue/setLastCompletedTime',
  async (lastCompletedTime, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.setLastCompletedTime(lastCompletedTime, token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '設定上一位辦完時間失敗');
    }
  }
);

// 重設上一位辦完時間（管理員）
export const resetLastCompletedTime = createAsyncThunk(
  'queue/resetLastCompletedTime',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      const response = await queueService.resetLastCompletedTime(token);
      // queueService 已經處理了 v1 格式，直接回傳
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '重設上一位辦完時間失敗');
    }
  }
);

// 通過姓名和電話查詢候位號碼（支持家人姓名搜尋）
export const searchQueueByNameAndPhone = createAsyncThunk(
  'queue/searchByNameAndPhone',
  async ({ name, phone }, { rejectWithValue }) => {
    try {
      // 參數驗證
      if (!name && !phone) {
        return rejectWithValue('請提供姓名或電話其中一個');
      }

      const response = await queueService.searchQueueByNameAndPhone(name, phone);
      
      // 確保回傳格式正確，包含錯誤處理
      if (!response || (!response.records && !Array.isArray(response))) {
        return rejectWithValue('搜尋結果格式錯誤');
      }
      
      // queueService 已經處理了 v1 格式，回傳結構為 {records: [...], message: "..."}
      return response;
    } catch (error) {
      // 統一錯誤處理，支援多種錯誤類型
      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      } else if (error.message) {
        return rejectWithValue(error.message);
      } else {
        return rejectWithValue('查詢候位號碼失敗，請稍後再試');
      }
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

// 獲取最大叫號順序（公共API）
export const getMaxOrderIndex = createAsyncThunk(
  'queue/getMaxOrderIndex',
  async (_, { rejectWithValue }) => {
    try {
      const response = await queueService.getMaxOrderIndex();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || '獲取最大叫號順序失敗');
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
      state.registeredOrderIndex = null; // 重置用戶登記的叫號順序
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
        state.registeredOrderIndex = action.payload.orderIndex; // 新增：設置叫號順序
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
        // 不在這裡更新 queueList，讓前端重新載入對應分頁的資料
        // 這樣可以確保每個分頁只顯示正確狀態的客戶
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
      })
      .addCase(setNextSessionDate.fulfilled, (state, action) => {
        state.isLoading = false;
        // 確保存儲為字符串，避免Redux序列化錯誤
        const nextSessionDate = action.payload.nextSessionDate;
        state.nextSessionDate = typeof nextSessionDate === 'string' ? nextSessionDate : String(nextSessionDate);
        
        // 同時更新queueStatus中的nextSessionDate
        if (state.queueStatus) {
          state.queueStatus.nextSessionDate = state.nextSessionDate;
        }
      })
      .addCase(setNextSessionDate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
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
      
      // 設定簡化模式（管理員）
      .addCase(setSimplifiedMode.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setSimplifiedMode.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新系統設定中的簡化模式
        state.queueStatus = {
          ...state.queueStatus,
          simplifiedMode: action.payload.simplifiedMode
        };
      })
      .addCase(setSimplifiedMode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設定公開候位登記功能（管理員）
      .addCase(setPublicRegistrationEnabled.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setPublicRegistrationEnabled.fulfilled, (state, action) => {
        state.isLoading = false;
        // 更新系統設定中的公開候位登記功能
        state.queueStatus = {
          ...state.queueStatus,
          publicRegistrationEnabled: action.payload.publicRegistrationEnabled
        };
      })
      .addCase(setPublicRegistrationEnabled.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設定客戶總數（管理員）
      .addCase(setTotalCustomerCount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setTotalCustomerCount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueStatus = {
          ...state.queueStatus,
          totalCustomerCount: action.payload.totalCustomerCount
        };
      })
      .addCase(setTotalCustomerCount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 重設客戶總數（管理員）
      .addCase(resetTotalCustomerCount.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetTotalCustomerCount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueStatus = {
          ...state.queueStatus,
          totalCustomerCount: action.payload.totalCustomerCount
        };
      })
      .addCase(resetTotalCustomerCount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 設定上一位辦完時間（管理員）
      .addCase(setLastCompletedTime.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setLastCompletedTime.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueStatus = {
          ...state.queueStatus,
          lastCompletedTime: action.payload.lastCompletedTime
        };
      })
      .addCase(setLastCompletedTime.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 重設上一位辦完時間（管理員）
      .addCase(resetLastCompletedTime.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetLastCompletedTime.fulfilled, (state, action) => {
        state.isLoading = false;
        state.queueStatus = {
          ...state.queueStatus,
          lastCompletedTime: action.payload.lastCompletedTime
        };
      })
      .addCase(resetLastCompletedTime.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // 通過姓名和電話查詢候位號碼（支持家人姓名搜尋）
      .addCase(searchQueueByNameAndPhone.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // 保留之前的搜尋結果，避免UI閃爍
      })
      .addCase(searchQueueByNameAndPhone.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        
        // 安全地處理搜尋結果
        const payload = action.payload;
        if (payload && payload.records && Array.isArray(payload.records)) {
          if (payload.records.length === 1) {
            // 單筆記錄：直接設為currentQueueStatus
            state.currentQueueStatus = payload.records[0];
          } else if (payload.records.length > 1) {
            // 多筆記錄：設為陣列格式，UI需要處理顯示邏輯
            state.currentQueueStatus = payload.records;
          } else {
            // 空結果
            state.currentQueueStatus = null;
          }
        } else {
          // 格式異常
          state.currentQueueStatus = null;
          state.error = '搜尋結果格式異常';
        }
      })
      .addCase(searchQueueByNameAndPhone.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '搜尋失敗';
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
      
      // 獲取最大叫號順序
      .addCase(getMaxOrderIndex.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMaxOrderIndex.fulfilled, (state, action) => {
        state.isLoading = false;
        state.maxOrderIndex = action.payload.maxOrderIndex;
        state.maxOrderMessage = action.payload.message;
      })
      .addCase(getMaxOrderIndex.rejected, (state, action) => {
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