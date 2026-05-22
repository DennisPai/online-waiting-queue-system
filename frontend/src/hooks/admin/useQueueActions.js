import React, { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  reorderQueue,
  updateQueueData,
  deleteCustomer,
  clearAllQueue,
  endSession
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';

/**
 * 候位操作邏輯 Hook
 * 負責候位的各種操作：叫號、更新狀態、排序、刪除等
 */
export const useQueueActions = ({ localQueueList, setLocalQueueList, loadQueueList, setConfirmDialog, handleCloseConfirmDialog }) => {
  const dispatch = useDispatch();
  const isQueueOpen = useSelector(state => state.queue.isQueueOpen);

  // === Phase 4 / Task 4.1（design.md D6）：拖動排序鎖 ===
  // 跨拖動競態：第一次拖動的 reorder 還沒回，使用者就拖第二筆 → 拖到的是
  // 尚未刷新的 stale 列表 → 後端被餵錯順序。解法：拖動送出後鎖住拖動，
  // reorder API 回來（不論成功失敗）才解鎖。
  // 用 ref 做即時同步判斷（避免 state 非同步更新造成的判斷空窗），
  // 另用 state 讓 UI 能據此 disable 拖動。
  const reorderingRef = useRef(false);
  const [isReordering, setIsReordering] = useState(false);

  // 重新排序
  const handleReorderQueue = useCallback(async () => {
    try {
      // 獲取所有 waiting 和 processing 狀態的記錄，按 queueNumber 排序
      const activeRecords = localQueueList
        .filter(record => ['waiting', 'processing'].includes(record.status))
        .sort((a, b) => a.queueNumber - b.queueNumber);

      // 重新分配 orderIndex（1, 2, 3...）
      const updates = activeRecords.map((record, index) => ({
        id: record._id,
        orderIndex: index + 1
      }));

      // 批量更新本地狀態（即時反饋）
      const updatedList = localQueueList.map(record => {
        const update = updates.find(u => u.id === record._id);
        return update ? { ...record, orderIndex: update.orderIndex } : record;
      });

      setLocalQueueList(updatedList);

      // 使用 Promise.all 並行發送請求，提升性能
      await Promise.all(
        updates.map(update =>
          dispatch(updateQueueOrder({
          queueId: update.id,
          newOrder: update.orderIndex
          })).unwrap()
        )
      );

      // 成功後重新載入列表，確保數據一致性
      loadQueueList();

      dispatch(showAlert({
        message: '候位順序重新排列完成',
        severity: 'success'
      }));

    } catch (error) {
      console.error('重新排序失敗:', error);
      // 失敗時也重新載入，恢復到後端的正確狀態
      loadQueueList();
      dispatch(showAlert({
        message: '重新排序失敗，請稍後再試',
        severity: 'error'
      }));
    }
  }, [localQueueList, setLocalQueueList, dispatch, loadQueueList]);

  // 叫號
  const handleCallNext = useCallback(async () => {
    try {
      const result = await dispatch(callNextQueue()).unwrap();
      // 立即重新載入列表
      loadQueueList();
      dispatch(showAlert({
        message: result.message || '叫號成功',
        severity: 'success'
      }));
    } catch (error) {
      console.error('叫號失敗:', error);
      // 顯示錯誤訊息給用戶
      dispatch(showAlert({
        message: error || '叫號失敗',
        severity: 'error'
      }));
    }
  }, [dispatch, loadQueueList]);

  // 更新客戶狀態
  const handleCompletionChange = useCallback(async (recordId, completed) => {
    try {
      const newStatus = completed ? 'completed' : 'waiting';
      const completedAt = completed ? new Date().toISOString() : null;

      await dispatch(updateQueueStatus({
        id: recordId,
        status: newStatus,
        completedAt
      }));

      loadQueueList();
    } catch (error) {
      console.error('更新狀態失敗:', error);
    }
  }, [dispatch, loadQueueList]);

  // 取消客戶
  const handleCancelCustomer = useCallback(async (customerId, customerName) => {
    try {
      await dispatch(updateQueueStatus({
        id: customerId,
        status: 'cancelled'
      }));

      dispatch(showAlert({
        message: `已取消 ${customerName} 的候位`,
        severity: 'success'
      }));

      loadQueueList();
    } catch (error) {
      console.error('取消候位失敗:', error);
    }
  }, [dispatch, loadQueueList]);

  // 復原客戶
  const handleRestoreCustomer = useCallback(async (customerId, customerName) => {
    try {
      await dispatch(updateQueueStatus({
        id: customerId,
        status: 'waiting'
      }));

      dispatch(showAlert({
        message: `已復原 ${customerName} 的候位`,
        severity: 'success'
      }));

      loadQueueList();
    } catch (error) {
      console.error('復原候位失敗:', error);
    }
  }, [dispatch, loadQueueList]);

  // 拖曳結束處理
  //
  // === Phase 4 / Task 4.1 + 4.1a（design.md D6 / G12）===
  // 4.1：拖動送出後鎖住拖動 UI，reorder API 回來才解鎖 —— 防跨拖動競態。
  // 4.1a：徹底移除「拖動後呼叫非同步 loadQueueList() 覆蓋 queueList」的路徑。
  //       舊版在 reorder 成功/失敗後都呼叫 loadQueueList()，那個非同步 GET
  //       回來的列表會覆蓋 reorder API 已寫進 queueList 的權威結果 ——
  //       競態的根源。改以「reorder API 回傳的 allRecords」為唯一更新來源：
  //       reorderQueue.fulfilled 已用 allRecords 更新 state.queueList，
  //       localQueueList 透過 useQueueData 的 useEffect 自動同步。
  //       失敗時也不再 loadQueueList，而是用 reorder.rejected 後重拉一次
  //       —— 但這是「失敗復原」不是「成功覆蓋」，不構成競態（鎖已擋住
  //       後續拖動，且失敗本來就需要拉回後端正確狀態）。
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    // 4.1：上一次拖動的 reorder 還沒回來 → 直接擋掉這次拖動。
    if (reorderingRef.current) {
      dispatch(showAlert({ message: '排序更新中，請稍候再拖動', severity: 'warning' }));
      return;
    }
    reorderingRef.current = true;
    setIsReordering(true);

    const items = Array.from(localQueueList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新本地顯示（isOpen=false 時同步 queueNumber = orderIndex）
    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index + 1,
      ...(isQueueOpen ? {} : { queueNumber: index + 1 })
    }));
    setLocalQueueList(updatedItems);

    // 一次 API 傳完整 orderedIds，後端依序設定 orderIndex
    try {
      const orderedIds = updatedItems.map(item => item._id);
      // reorderQueue.fulfilled 會用 API 回傳的 allRecords 更新 state.queueList，
      // 即「唯一更新來源」—— 不再 loadQueueList() 覆蓋。
      await dispatch(reorderQueue({ orderedIds })).unwrap();
      dispatch(showAlert({ message: '排序已更新', severity: 'success' }));
    } catch (error) {
      // 失敗復原：後端拒絕（如列表已變動）→ 拉回後端的正確狀態。
      // 此時鎖尚未解開，不會與後續拖動競態。
      dispatch(showAlert({ message: `更新排序失敗：${error}`, severity: 'error' }));
      loadQueueList();
    } finally {
      // reorder 流程結束（成功或失敗復原都已處理）才解鎖。
      reorderingRef.current = false;
      setIsReordering(false);
    }
  }, [localQueueList, setLocalQueueList, dispatch, loadQueueList, isQueueOpen]);

  // 清空所有候位
  const handleClearAllQueue = useCallback(() => {
    // 顯示確認對話框
    setConfirmDialog({
      open: true,
      title: '確認清除所有候位',
      message: '此操作將清空所有候位記錄（包括等待中、已完成、已取消），且無法復原。確定要繼續嗎？',
      onConfirm: async () => {
        handleCloseConfirmDialog();
    try {
          await dispatch(clearAllQueue()).unwrap();
      dispatch(showAlert({
        message: '已清空所有候位記錄',
        severity: 'success'
      }));
      loadQueueList();
    } catch (error) {
      console.error('清空候位失敗:', error);
          dispatch(showAlert({
            message: '清空候位失敗',
            severity: 'error'
          }));
        }
    }
    });
  }, [dispatch, loadQueueList, setConfirmDialog, handleCloseConfirmDialog]);

  // 結束本期（歸檔 + 清空）
  const [endSessionResult, setEndSessionResult] = React.useState(null);
  const handleEndSession = useCallback((waitingCount) => {
    setConfirmDialog({
      open: true,
      title: '結束本期',
      message: `確定要結束本期嗎？本期 ${waitingCount || 0} 位客戶（不含已取消）的資料將歸檔至永久客戶資料庫。此操作不可撤銷。`,
      onConfirm: async () => {
        handleCloseConfirmDialog();
        try {
          const result = await dispatch(endSession()).unwrap();
          setEndSessionResult(result);
          dispatch(showAlert({
            message: `本期結束！已歸檔 ${result.totalProcessed} 位客戶（新客 ${result.newCustomers}，回頭客 ${result.returningCustomers}，新建家庭 ${result.newHouseholds} 組）`,
            severity: 'success'
          }));
          loadQueueList();
        } catch (error) {
          dispatch(showAlert({ message: '結束本期失敗', severity: 'error' }));
        }
      }
    });
  }, [dispatch, loadQueueList, setConfirmDialog, handleCloseConfirmDialog]);

  // 刪除客戶
  const handleDeleteCustomer = useCallback((customerId, customerName) => {
    // 顯示確認對話框
    setConfirmDialog({
      open: true,
      title: '確認刪除客戶',
      message: `確定要刪除 ${customerName || '此客戶'} 的資料嗎？此操作無法復原。`,
      onConfirm: async () => {
        handleCloseConfirmDialog();
        try {
          await dispatch(deleteCustomer(customerId)).unwrap();
          dispatch(showAlert({
            message: '客戶資料已刪除',
            severity: 'success'
          }));
          loadQueueList();
        } catch (error) {
          console.error('刪除客戶失敗:', error);
          dispatch(showAlert({
            message: '刪除失敗，請稍後再試',
            severity: 'error'
          }));
        }
      }
    });
  }, [dispatch, loadQueueList, setConfirmDialog, handleCloseConfirmDialog]);

  return {
    handleReorderQueue,
    handleCallNext,
    handleCompletionChange,
    handleCancelCustomer,
    handleRestoreCustomer,
    handleDragEnd,
    handleClearAllQueue,
    handleEndSession,
    handleDeleteCustomer,
    // Task 4.1：拖動排序鎖狀態，供 UI disable 拖動時使用
    isReordering
  };
};
