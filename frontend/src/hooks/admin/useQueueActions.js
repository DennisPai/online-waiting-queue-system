import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  updateOrderLocal,
  updateQueueData,
  deleteCustomer,
  clearAllQueue
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';

/**
 * 候位操作邏輯 Hook
 * 負責候位的各種操作：叫號、更新狀態、排序、刪除等
 */
export const useQueueActions = ({ localQueueList, setLocalQueueList, loadQueueList }) => {
  const dispatch = useDispatch();

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

      // 批量更新本地狀態
      const updatedList = localQueueList.map(record => {
        const update = updates.find(u => u.id === record._id);
        return update ? { ...record, orderIndex: update.orderIndex } : record;
      });

      setLocalQueueList(updatedList);

      // 發送到後端
      for (const update of updates) {
        await dispatch(updateQueueOrder({
          queueId: update.id,
          newOrder: update.orderIndex
        }));
      }

      dispatch(showAlert({
        message: '候位順序重新排列完成',
        severity: 'success'
      }));

    } catch (error) {
      console.error('重新排序失敗:', error);
      dispatch(showAlert({
        message: '重新排序失敗，請稍後再試',
        severity: 'error'
      }));
    }
  }, [localQueueList, setLocalQueueList, dispatch]);

  // 叫號
  const handleCallNext = useCallback(async () => {
    try {
      await dispatch(callNextQueue());
      loadQueueList();
      dispatch(showAlert({
        message: '叫號成功',
        severity: 'success'
      }));
    } catch (error) {
      console.error('叫號失敗:', error);
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
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const items = Array.from(localQueueList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新本地順序
    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index + 1
    }));

    setLocalQueueList(updatedItems);

    // 批量更新後端
    updatedItems.forEach((item, index) => {
      if (item.orderIndex !== localQueueList[result.source.index + (index - result.source.index)]?.orderIndex) {
        dispatch(updateOrderLocal({
          id: item._id,
          orderIndex: index + 1
        }));
      }
    });
  }, [localQueueList, setLocalQueueList, dispatch]);

  // 清空所有候位
  const handleClearAllQueue = useCallback(async () => {
    try {
      await dispatch(clearAllQueue());
      dispatch(showAlert({
        message: '已清空所有候位記錄',
        severity: 'success'
      }));
      loadQueueList();
    } catch (error) {
      console.error('清空候位失敗:', error);
    }
  }, [dispatch, loadQueueList]);

  // 刪除客戶
  const handleDeleteCustomer = useCallback(async (customerId) => {
    try {
      await dispatch(deleteCustomer(customerId));
      dispatch(showAlert({
        message: '客戶資料已刪除',
        severity: 'success'
      }));
      loadQueueList();
    } catch (error) {
      console.error('刪除客戶失敗:', error);
    }
  }, [dispatch, loadQueueList]);

  return {
    handleReorderQueue,
    handleCallNext,
    handleCompletionChange,
    handleCancelCustomer,
    handleRestoreCustomer,
    handleDragEnd,
    handleClearAllQueue,
    handleDeleteCustomer
  };
};
