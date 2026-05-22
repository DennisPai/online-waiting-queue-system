import { useEffect, useCallback } from 'react';
import { useQueueData } from './useQueueData';
import { useQueueActions } from './useQueueActions';
import { useQueueUI } from './useQueueUI';
import { useQueueValidation } from './useQueueValidation';
import { useQueueSettings } from './useQueueSettings';

/**
 * 重構後的候位管理主 Hook
 * 組合所有子 hooks，提供統一的接口
 */
export const useQueueManagementRefactored = () => {
  // 數據管理
  const dataHook = useQueueData();
  
  // UI 狀態管理
  const uiHook = useQueueUI();
  
  // 系統設定管理
  const settingsHook = useQueueSettings();
  
  // 操作邏輯
  const actionsHook = useQueueActions({
    localQueueList: dataHook.localQueueList,
    setLocalQueueList: dataHook.setLocalQueueList,
    loadQueueList: dataHook.loadQueueList,
    setConfirmDialog: uiHook.setConfirmDialog,
    handleCloseConfirmDialog: uiHook.handleCloseConfirmDialog
  });
  
  // 驗證邏輯
  const validationHook = useQueueValidation({
    loadQueueList: dataHook.loadQueueList,
    handleCloseDialog: uiHook.handleCloseDialog
  });

  // dataHook 內常用成員先解構，供下方 useEffect / useCallback 精確列入依賴，
  // 避免將整個 dataHook 物件列為依賴（每次 render 都是新物件，會造成無限觸發）。
  const currentTab = dataHook.currentTab;
  const loadQueueList = dataHook.loadQueueList;

  // 初始化加載
  useEffect(() => {
    loadQueueList();
  }, [currentTab, loadQueueList]);

  // === Phase 4 / Task 4.8（兵推 4-Q2 新 bug）：後台「新增候位」成功後刷新候位列表 ===
  // 舊版 useQueueUI.handleRegisterSuccess 只關閉對話框，漏呼叫 loadQueueList()
  // → 新客戶不會立即出現在候位列表上，管理員需手動重整才看得到。
  // useQueueUI 本身拿不到 loadQueueList（屬於 useQueueData），因此在這層
  // （兩者都可見）組合：先關對話框、再刷新列表。
  // 與 4.1a 協調：4.1a 是「拖動排序」場景移除競態覆蓋；4.8 是「新增候位」
  // 場景要正確刷新。兩者不衝突 —— 新增候位沒有「reorder API 回傳列表」這個
  // 權威來源，唯一能拿到新客戶的方式就是重拉列表，因此這裡呼叫 loadQueueList()
  // 是正確的。順序：先 handleRegisterSuccess()（關對話框，同步）、後
  // loadQueueList()（觸發非同步 GET），不交錯。
  const uiHandleRegisterSuccess = uiHook.handleRegisterSuccess;
  const handleRegisterSuccess = useCallback(() => {
    uiHandleRegisterSuccess();
    loadQueueList();
  }, [uiHandleRegisterSuccess, loadQueueList]);

  return {
    // 數據狀態
    ...dataHook,

    // UI 狀態
    ...uiHook,

    // 系統設定
    ...settingsHook,

    // 操作方法
    ...actionsHook,

    // 驗證方法
    ...validationHook,

    // Task 4.8：覆蓋 uiHook 的 handleRegisterSuccess，附帶列表刷新
    handleRegisterSuccess
  };
};
