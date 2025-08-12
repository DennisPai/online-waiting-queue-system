import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getQueueList } from '../../redux/slices/queueSlice';

/**
 * 候位數據管理 Hook
 * 負責候位列表的獲取、本地狀態同步、重複號碼檢測
 */
export const useQueueData = () => {
  const dispatch = useDispatch();
  const { queueList, pagination, currentQueue, isLoading, error } = useSelector(
    (state) => state.queue
  );

  // 本地狀態
  const [localQueueList, setLocalQueueList] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [duplicateNumbers, setDuplicateNumbers] = useState([]);

  // 檢測重複號碼
  const detectDuplicateNumbers = useCallback((records) => {
    const numberCounts = {};
    const duplicates = [];
    
    records.forEach(record => {
      const number = record.queueNumber;
      if (number) {
        if (numberCounts[number]) {
          numberCounts[number]++;
          if (numberCounts[number] === 2) {
            duplicates.push(number);
          }
        } else {
          numberCounts[number] = 1;
        }
      }
    });
    
    return duplicates;
  }, []);

  // 更新本地列表和檢測重複號碼
  useEffect(() => {
    if (queueList) {
      setLocalQueueList(queueList);
      const duplicates = detectDuplicateNumbers(queueList);
      setDuplicateNumbers(duplicates);
    } else {
      setLocalQueueList([]);
      setDuplicateNumbers([]);
    }
  }, [queueList, detectDuplicateNumbers]);

  // 載入候位列表
  const loadQueueList = useCallback(() => {
    const status = currentTab === 0 ? undefined : 'cancelled';
    dispatch(
      getQueueList({
        status,
        page: 1,
        limit: 1000
      })
    );
  }, [dispatch, currentTab]);

  return {
    // 狀態
    localQueueList,
    currentTab,
    duplicateNumbers,
    pagination,
    currentQueue,
    isLoading,
    error,
    
    // 方法
    setLocalQueueList,
    setCurrentTab,
    loadQueueList,
    detectDuplicateNumbers
  };
};
