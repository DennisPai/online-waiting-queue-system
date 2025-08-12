import { useEffect } from 'react';
import { useQueueData } from './useQueueData';
import { useQueueActions } from './useQueueActions';
import { useQueueUI } from './useQueueUI';
import { useQueueValidation } from './useQueueValidation';

/**
 * 重構後的候位管理主 Hook
 * 組合所有子 hooks，提供統一的接口
 */
export const useQueueManagementRefactored = () => {
  // 數據管理
  const dataHook = useQueueData();
  
  // UI 狀態管理
  const uiHook = useQueueUI();
  
  // 操作邏輯
  const actionsHook = useQueueActions({
    localQueueList: dataHook.localQueueList,
    setLocalQueueList: dataHook.setLocalQueueList,
    loadQueueList: dataHook.loadQueueList
  });
  
  // 驗證邏輯
  const validationHook = useQueueValidation({
    loadQueueList: dataHook.loadQueueList,
    handleCloseDialog: uiHook.handleCloseDialog
  });

  // 初始化加載
  useEffect(() => {
    dataHook.loadQueueList();
  }, [dataHook.currentTab, dataHook.loadQueueList]);

  return {
    // 數據狀態
    ...dataHook,
    
    // UI 狀態
    ...uiHook,
    
    // 操作方法
    ...actionsHook,
    
    // 驗證方法
    ...validationHook
  };
};
