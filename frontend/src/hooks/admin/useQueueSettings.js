import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getQueueStatus,
  setTotalCustomerCount,
  resetTotalCustomerCount,
  setLastCompletedTime,
  resetLastCompletedTime
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';

/**
 * 候位系統設定管理 Hook
 * 負責系統設定的顯示和更新（客戶總數、上一位辦完時間等）
 */
export const useQueueSettings = () => {
  const dispatch = useDispatch();
  const { queueStatus, isLoading } = useSelector((state) => state.queue);

  // 本地輸入狀態
  const [totalCustomerCountInput, setTotalCustomerCountInput] = useState('');
  const [lastCompletedTimeInput, setLastCompletedTimeInput] = useState('');

  // 初始化時載入系統狀態
  useEffect(() => {
    dispatch(getQueueStatus());
  }, [dispatch]);

  // 同步 Redux 狀態到本地輸入
  useEffect(() => {
    if (queueStatus) {
      setTotalCustomerCountInput(queueStatus.totalCustomerCount?.toString() || '0');
      
      // 處理時間格式
      if (queueStatus.lastCompletedTime) {
        const date = new Date(queueStatus.lastCompletedTime);
        // 轉換為 datetime-local 格式 (YYYY-MM-DDTHH:mm)
        const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setLastCompletedTimeInput(localDatetime);
      } else {
        setLastCompletedTimeInput('');
      }
    }
  }, [queueStatus]);

  // 處理客戶總數變更
  const handleTotalCustomerCountChange = useCallback((e) => {
    setTotalCustomerCountInput(e.target.value);
  }, []);

  // 設定客戶總數
  const handleSetTotalCustomerCount = useCallback(async () => {
    const count = parseInt(totalCustomerCountInput);
    if (isNaN(count) || count < 0) {
      dispatch(showAlert({
        message: '請輸入有效的客戶總數',
        severity: 'error'
      }));
      return;
    }

    try {
      await dispatch(setTotalCustomerCount(count)).unwrap();
      dispatch(showAlert({
        message: '客戶總數已更新',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showAlert({
        message: `更新失敗: ${error}`,
        severity: 'error'
      }));
    }
  }, [totalCustomerCountInput, dispatch]);

  // 重設客戶總數
  const handleResetTotalCustomerCount = useCallback(async () => {
    try {
      await dispatch(resetTotalCustomerCount()).unwrap();
      dispatch(showAlert({
        message: '客戶總數已重設為0',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showAlert({
        message: `重設失敗: ${error}`,
        severity: 'error'
      }));
    }
  }, [dispatch]);

  // 處理上一位辦完時間變更
  const handleLastCompletedTimeChange = useCallback((e) => {
    setLastCompletedTimeInput(e.target.value);
  }, []);

  // 設定上一位辦完時間
  const handleSetLastCompletedTime = useCallback(async () => {
    if (!lastCompletedTimeInput) {
      dispatch(showAlert({
        message: '請選擇時間',
        severity: 'error'
      }));
      return;
    }

    try {
      // 轉換為 ISO 格式
      const date = new Date(lastCompletedTimeInput);
      const isoString = date.toISOString();
      
      await dispatch(setLastCompletedTime(isoString)).unwrap();
      dispatch(showAlert({
        message: '上一位辦完時間已更新',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showAlert({
        message: `更新失敗: ${error}`,
        severity: 'error'
      }));
    }
  }, [lastCompletedTimeInput, dispatch]);

  // 重設上一位辦完時間
  const handleResetLastCompletedTime = useCallback(async () => {
    try {
      await dispatch(resetLastCompletedTime()).unwrap();
      dispatch(showAlert({
        message: '上一位辦完時間已重設',
        severity: 'success'
      }));
    } catch (error) {
      dispatch(showAlert({
        message: `重設失敗: ${error}`,
        severity: 'error'
      }));
    }
  }, [dispatch]);

  return {
    // 狀態
    queueStatus,
    totalCustomerCountInput,
    lastCompletedTimeInput,
    isLoading,

    // 方法
    handleTotalCustomerCountChange,
    handleSetTotalCustomerCount,
    handleResetTotalCustomerCount,
    handleLastCompletedTimeChange,
    handleSetLastCompletedTime,
    handleResetLastCompletedTime
  };
};

