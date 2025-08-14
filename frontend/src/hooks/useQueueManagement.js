import { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getQueueList,
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  updateOrderLocal,
  updateQueueData,
  deleteCustomer,
  clearAllQueue,
  setTotalCustomerCount,
  resetTotalCustomerCount,
  setLastCompletedTime,
  resetLastCompletedTime,
  getQueueStatus
} from '../redux/slices/queueSlice';
import { showAlert } from '../redux/slices/uiSlice';
import { 
  autoFillDates, 
  autoFillFamilyMembersDates,
  autoConvertToMinguo,
  convertMinguoForStorage 
} from '../utils/calendarConverter';

export const useQueueManagement = () => {
  const dispatch = useDispatch();
  const { queueList, queueStatus, pagination, currentQueue, isLoading, error } = useSelector(
    (state) => state.queue
  );

  // 本地狀態管理
  const [localQueueList, setLocalQueueList] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [duplicateNumbers, setDuplicateNumbers] = useState([]);
  
  // 系統設定相關狀態
  const [totalCustomerCountInput, setTotalCustomerCountInput] = useState('');
  const [lastCompletedTimeInput, setLastCompletedTimeInput] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // 欄位顯示控制
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('queueTableColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved columns:', e);
      }
    }
    // 預設顯示的欄位
    return ['orderIndex', 'queueNumber', 'status', 'name', 'phone', 'actions'];
  });

  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

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

  // 初始化載入系統設定
  useEffect(() => {
    dispatch(getQueueStatus());
  }, [dispatch]);

  // 當系統設定初次載入時，設定輸入欄位初始值
  
  useEffect(() => {
    if (queueStatus && !hasInitialized) {
      // 只在第一次載入時設定初始值
      if (queueStatus.totalCustomerCount !== undefined && !totalCustomerCountInput) {
        setTotalCustomerCountInput(queueStatus.totalCustomerCount.toString());
      }
      
      if (queueStatus.lastCompletedTime && !lastCompletedTimeInput) {
        // 格式化時間為 datetime-local 格式
        const date = new Date(queueStatus.lastCompletedTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        setLastCompletedTimeInput(`${year}-${month}-${day}T${hour}:${minute}`);
      }
      
      setHasInitialized(true);
    }
  }, [queueStatus, hasInitialized, totalCustomerCountInput, lastCompletedTimeInput]);

  // 載入候位列表
  const loadQueueList = useCallback(() => {
    let status;
    if (currentTab === 0) {
      // 候位列表：顯示 waiting 和 processing 狀態
      status = 'waiting,processing';
    } else if (currentTab === 1) {
      // 已完成客戶：顯示 completed 狀態
      status = 'completed';
    } else if (currentTab === 2) {
      // 已取消客戶：顯示 cancelled 狀態
      status = 'cancelled';
    }
    
    dispatch(
      getQueueList({
        status,
        page: 1,
        limit: 1000
      })
    );
  }, [dispatch, currentTab]);

  // 重新排序
  const handleReorderQueue = useCallback(async () => {
    try {
      const sortedList = [...localQueueList].sort((a, b) => {
        const orderA = a.orderIndex || 999;
        const orderB = b.orderIndex || 999;
        return orderA - orderB;
      });

      const reorderedList = sortedList.map((record, index) => ({
        ...record,
        orderIndex: index + 1
      }));

      const updatePromises = reorderedList.map((record, index) => {
        const newOrderIndex = index + 1;
        if (record.orderIndex !== newOrderIndex) {
          return dispatch(updateQueueOrder({
            queueId: record._id,
            newOrder: newOrderIndex
          })).unwrap();
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises.filter(Boolean));
      
      setLocalQueueList(reorderedList);
      dispatch(showAlert({
        message: '重新排序完成！',
        severity: 'success'
      }));
    } catch (error) {
      console.error('重新排序失敗:', error);
      dispatch(showAlert({
        message: '重新排序失敗，請稍後再試',
        severity: 'error'
      }));
    }
  }, [dispatch, localQueueList]);

  // 叫號下一位（使用新的一鍵完成邏輯）
  const handleCallNext = useCallback(() => {
    dispatch(callNextQueue())
      .unwrap()
      .then((response) => {
        dispatch(showAlert({
          message: response.message || '叫號完成！',
          severity: 'success'
        }));
        // 重新載入列表和系統狀態
        loadQueueList();
        dispatch(getQueueStatus());
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `叫號失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch, loadQueueList]);

  // 更新狀態
  const handleUpdateStatus = useCallback((queueId, status) => {
    dispatch(updateQueueStatus({ queueId, status }))
      .unwrap()
      .then(() => {
        loadQueueList();
        dispatch(showAlert({
          message: '狀態更新成功！',
          severity: 'success'
        }));
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `狀態更新失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch, loadQueueList]);

  // 拖曳處理
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !result.draggableId) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    try {
      const newList = Array.from(localQueueList);
      const [removed] = newList.splice(sourceIndex, 1);
      newList.splice(destinationIndex, 0, removed);
      setLocalQueueList(newList);

      const updatePromises = newList.map((record, index) => {
        const newOrderIndex = index + 1;
        if (record.orderIndex !== newOrderIndex) {
          return dispatch(updateQueueOrder({
            queueId: record._id,
            newOrder: newOrderIndex
          })).unwrap();
        }
        return Promise.resolve();
      });

      Promise.all(updatePromises.filter(Boolean))
        .then(() => {
          const updatedList = newList.map((record, index) => ({
            ...record,
            orderIndex: index + 1
          }));
          setLocalQueueList(updatedList);
        })
        .catch((error) => {
          console.error('拖曳更新失敗:', error);
          loadQueueList();
        });
    } catch (error) {
      console.error('拖曳處理錯誤:', error);
      loadQueueList();
    }
  }, [dispatch, localQueueList, loadQueueList]);

  // 對話框管理
  const handleOpenDetails = useCallback((record) => {
    setSelectedRecord(record);
    setEditMode(false);
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditMode(false);
    setSelectedRecord(null);
    setEditedData({});
  }, []);

  const handleEnterEditMode = useCallback(() => {
    if (selectedRecord) {
      setEditedData({
        ...selectedRecord,
        addresses: selectedRecord.addresses || [{ address: '', type: 'home' }],
        familyMembers: selectedRecord.familyMembers || [],
        consultationTopics: selectedRecord.consultationTopics || []
      });
      setEditMode(true);
    }
  }, [selectedRecord]);

  // 編輯處理函數
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'queueNumber') {
      processedValue = parseInt(value) || value;
    }

    setEditedData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  }, []);

  const handleAddressChange = useCallback((index, field, value) => {
    const newAddresses = [...editedData.addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value
    };
    setEditedData(prev => ({
      ...prev,
      addresses: newAddresses
    }));
  }, [editedData.addresses]);

  const addAddress = useCallback(() => {
    if (editedData.addresses.length < 3) {
      setEditedData(prev => ({
        ...prev,
        addresses: [...prev.addresses, { address: '', type: 'home' }]
      }));
    }
  }, [editedData.addresses]);

  const removeAddress = useCallback((index) => {
    if (editedData.addresses.length > 1) {
      const newAddresses = editedData.addresses.filter((_, i) => i !== index);
      setEditedData(prev => ({
        ...prev,
        addresses: newAddresses
      }));
    }
  }, [editedData.addresses]);

  const handleFamilyMemberChange = useCallback((index, field, value) => {
    const newFamilyMembers = [...editedData.familyMembers];
    newFamilyMembers[index] = {
      ...newFamilyMembers[index],
      [field]: value
    };
    setEditedData(prev => ({
      ...prev,
      familyMembers: newFamilyMembers
    }));
  }, [editedData.familyMembers]);

  const addFamilyMember = useCallback(() => {
    if (editedData.familyMembers && editedData.familyMembers.length < 5) {
      setEditedData(prev => ({
        ...prev,
        familyMembers: [
          ...prev.familyMembers,
          {
            name: '',
            gender: 'male',
            gregorianBirthYear: '',
            gregorianBirthMonth: '',
            gregorianBirthDay: '',
            lunarBirthYear: '',
            lunarBirthMonth: '',
            lunarBirthDay: '',
            lunarIsLeapMonth: false,
            address: '',
            addressType: 'home'
          }
        ]
      }));
    }
  }, [editedData.familyMembers]);

  const removeFamilyMember = useCallback((index) => {
    const newFamilyMembers = editedData.familyMembers.filter((_, i) => i !== index);
    setEditedData(prev => ({
      ...prev,
      familyMembers: newFamilyMembers
    }));
  }, [editedData.familyMembers]);

  const handleTopicChange = useCallback((topic) => {
    const currentTopics = [...editedData.consultationTopics];
    const topicIndex = currentTopics.indexOf(topic);
    
    if (topicIndex === -1) {
      currentTopics.push(topic);
    } else {
      currentTopics.splice(topicIndex, 1);
    }
    
    setEditedData(prev => ({
      ...prev,
      consultationTopics: currentTopics
    }));
  }, [editedData.consultationTopics]);

  // 儲存資料
  const handleSaveData = useCallback(() => {
    if (selectedRecord && editMode) {
      // 處理年份轉換
      const processedData = { ...editedData };

      if (processedData.gregorianBirthYear) {
        const { minguoYear } = autoConvertToMinguo(processedData.gregorianBirthYear);
        processedData.gregorianBirthYear = convertMinguoForStorage(minguoYear);
      }

      if (processedData.lunarBirthYear) {
        const { minguoYear } = autoConvertToMinguo(processedData.lunarBirthYear);
        processedData.lunarBirthYear = convertMinguoForStorage(minguoYear);
      }

      // 處理家人年份轉換
      if (processedData.familyMembers) {
        processedData.familyMembers.forEach(member => {
          // 只有當年份是字串或需要轉換時才進行轉換
          if (member.gregorianBirthYear && typeof member.gregorianBirthYear === 'string') {
            const { minguoYear } = autoConvertToMinguo(parseInt(member.gregorianBirthYear));
            member.gregorianBirthYear = convertMinguoForStorage(minguoYear);
          } else if (member.gregorianBirthYear && typeof member.gregorianBirthYear === 'number') {
            // 確保數值型別
            member.gregorianBirthYear = parseInt(member.gregorianBirthYear);
          }
          
          if (member.lunarBirthYear && typeof member.lunarBirthYear === 'string') {
            const { minguoYear } = autoConvertToMinguo(parseInt(member.lunarBirthYear));
            member.lunarBirthYear = convertMinguoForStorage(minguoYear);
          } else if (member.lunarBirthYear && typeof member.lunarBirthYear === 'number') {
            // 確保數值型別
            member.lunarBirthYear = parseInt(member.lunarBirthYear);
          }

          // 確保月份和日期是數值型別
          if (member.gregorianBirthMonth) {
            member.gregorianBirthMonth = parseInt(member.gregorianBirthMonth);
          }
          if (member.gregorianBirthDay) {
            member.gregorianBirthDay = parseInt(member.gregorianBirthDay);
          }
          if (member.lunarBirthMonth) {
            member.lunarBirthMonth = parseInt(member.lunarBirthMonth);
          }
          if (member.lunarBirthDay) {
            member.lunarBirthDay = parseInt(member.lunarBirthDay);
          }
        });

        const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
        processedData.familyMembers = familyData.familyMembers;
      }

      const updatedData = autoFillDates(processedData);

      dispatch(updateQueueData({ queueId: selectedRecord._id, customerData: updatedData }))
        .unwrap()
        .then(() => {
          handleCloseDialog();
          loadQueueList();
          dispatch(showAlert({
            message: '客戶資料更新成功！',
            severity: 'success'
          }));
        })
        .catch((error) => {
          dispatch(showAlert({
            message: `更新失敗: ${error}`,
            severity: 'error'
          }));
        });
    }
  }, [selectedRecord, editMode, editedData, dispatch, handleCloseDialog, loadQueueList]);

  // 完成狀態處理
  const handleCompletionChange = useCallback((event, queueId, completed) => {
    if (completed) {
      dispatch(updateQueueStatus({ queueId, status: 'completed' }))
        .unwrap()
        .then(() => {
          loadQueueList();
          dispatch(showAlert({
            message: '客戶已標記為完成！已移至「已完成客戶」分頁',
            severity: 'success'
          }));
        })
        .catch((error) => {
          dispatch(showAlert({
            message: `操作失敗: ${error}`,
            severity: 'error'
          }));
        });
    } else {
      const record = localQueueList.find(item => item._id === queueId);
      if (record) {
        const newStatus = record.orderIndex === 1 ? 'processing' : 'waiting';
        handleUpdateStatus(queueId, newStatus);
      }
    }
  }, [dispatch, localQueueList, loadQueueList, handleUpdateStatus]);

  // 客戶操作
  const handleCancelCustomer = useCallback((queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '確認取消預約',
      message: `確定要取消 ${customerName} 的預約嗎？此操作可以復原。`,
      onConfirm: () => {
        dispatch(updateQueueStatus({ queueId, status: 'cancelled' }))
          .unwrap()
          .then(() => {
            loadQueueList();
            dispatch(showAlert({
              message: '客戶預約已取消！',
              severity: 'success'
            }));
          })
          .catch((error) => {
            dispatch(showAlert({
              message: `取消失敗: ${error}`,
              severity: 'error'
            }));
          });
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [dispatch, loadQueueList]);

  const handleRestoreCustomer = useCallback((queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '確認復原客戶',
      message: `確定要復原 ${customerName} 的預約嗎？`,
      onConfirm: () => {
        dispatch(updateQueueStatus({ queueId, status: 'waiting' }))
          .unwrap()
          .then(() => {
            loadQueueList();
            dispatch(showAlert({
              message: '客戶已復原為等待中！',
              severity: 'success'
            }));
          })
          .catch((error) => {
            dispatch(showAlert({
              message: `復原失敗: ${error}`,
              severity: 'error'
            }));
          });
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [dispatch, loadQueueList]);

  const handleCompleteFromDialog = useCallback((queueId) => {
    dispatch(updateQueueStatus({ queueId, status: 'completed' }))
      .unwrap()
      .then(() => {
        handleCloseDialog();
        loadQueueList();
        dispatch(showAlert({
          message: '客戶已標記為完成！已移至「已完成客戶」分頁',
          severity: 'success'
        }));
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `操作失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch, loadQueueList, handleCloseDialog]);

  // Tab 切換
  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  // 確認對話框
  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  }, []);

  // 匯出功能
  const handleExport = useCallback(() => {
    dispatch(getQueueList({}))
      .unwrap()
      .then((allCustomers) => {
        setExportDialogOpen(true);
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `無法獲取客戶資料進行匯出: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch]);

  const handleCloseExportDialog = useCallback(() => {
    setExportDialogOpen(false);
  }, []);

  // 刪除客戶
  const handleDeleteCustomer = useCallback((queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '確認刪除客戶',
      message: `確定要永久刪除 ${customerName} 的資料嗎？此操作無法復原！`,
      onConfirm: () => {
        dispatch(deleteCustomer(queueId))
          .unwrap()
          .then(() => {
            loadQueueList();
            dispatch(showAlert({
              message: '客戶資料已刪除！',
              severity: 'success'
            }));
          })
          .catch((error) => {
            dispatch(showAlert({
              message: `刪除失敗: ${error}`,
              severity: 'error'
            }));
          });
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [dispatch, loadQueueList]);

  // 清除所有候位
  const handleClearAllQueue = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: '確認清除所有候位',
      message: '確定要清除所有候位資料嗎？此操作無法復原！',
      onConfirm: () => {
        dispatch(clearAllQueue())
          .unwrap()
          .then(() => {
            loadQueueList();
            dispatch(showAlert({
              message: '所有候位資料已清除！',
              severity: 'success'
            }));
          })
          .catch((error) => {
            dispatch(showAlert({
              message: `清除失敗: ${error}`,
              severity: 'error'
            }));
          });
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  }, [dispatch, loadQueueList]);

  // 欄位管理
  const handleColumnMenuOpen = useCallback((event) => {
    setColumnMenuAnchor(event.currentTarget);
    setColumnMenuOpen(true);
  }, []);

  const handleColumnMenuClose = useCallback(() => {
    setColumnMenuAnchor(null);
    setColumnMenuOpen(false);
  }, []);

  const handleColumnToggle = useCallback((columnKey, availableColumns) => {
    if (columnKey === 'actions') return; // 操作欄不允許隱藏

    let newVisibleColumns;
    if (visibleColumns.includes(columnKey)) {
      // 隱藏欄位
      newVisibleColumns = visibleColumns.filter(key => key !== columnKey);
    } else {
      // 顯示欄位，需要按照原始順序插入
      const allColumnKeys = Object.keys(availableColumns);
      const tempColumns = [...visibleColumns, columnKey];
      
      // 根據原始欄位定義順序重新排序
      newVisibleColumns = allColumnKeys.filter(key => tempColumns.includes(key));
    }
    
    setVisibleColumns(newVisibleColumns);
    localStorage.setItem('queueTableColumns', JSON.stringify(newVisibleColumns));
  }, [visibleColumns]);

  const handleResetColumns = useCallback(() => {
    const defaultColumns = ['orderIndex', 'queueNumber', 'status', 'name', 'phone', 'actions'];
    setVisibleColumns(defaultColumns);
    localStorage.setItem('queueTableColumns', JSON.stringify(defaultColumns));
  }, []);

  // 註冊對話框
  const handleOpenRegisterDialog = useCallback(() => {
    setRegisterDialogOpen(true);
  }, []);

  const handleCloseRegisterDialog = useCallback(() => {
    setRegisterDialogOpen(false);
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    setRegisterDialogOpen(false);
    loadQueueList();
    
    // 如果系統處於非辦事狀態，自動更新客戶總數
    if (queueStatus && !queueStatus.isQueueOpen) {
      dispatch(resetTotalCustomerCount())
        .unwrap()
        .then((response) => {
          // 直接更新本地輸入值，避免清空
          if (response && response.totalCustomerCount !== undefined) {
            setTotalCustomerCountInput(response.totalCustomerCount.toString());
          }
        })
        .catch((error) => {
          console.error('自動更新客戶總數失敗:', error);
        });
    }
    
    dispatch(showAlert({
      message: '候位登記成功！',
      severity: 'success'
    }));
  }, [dispatch, loadQueueList, queueStatus]);

  // 處理客戶總數輸入變更
  const handleTotalCustomerCountChange = useCallback((event) => {
    setTotalCustomerCountInput(event.target.value);
  }, []);

  // 處理客戶總數設定
  const handleSetTotalCustomerCount = useCallback(() => {
    const count = parseInt(totalCustomerCountInput);
    if (isNaN(count) || count < 0) {
      dispatch(showAlert({
        message: '請輸入有效的客戶總數（大於等於0的整數）',
        severity: 'warning'
      }));
      return;
    }

    dispatch(setTotalCustomerCount(count))
      .unwrap()
      .then(() => {
        dispatch(showAlert({
          message: `客戶總數已設定為 ${count}`,
          severity: 'success'
        }));
        // 不需要重新獲取狀態，保持當前輸入值
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `設定失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch, totalCustomerCountInput]);

  // 處理客戶總數重設
  const handleResetTotalCustomerCount = useCallback(() => {
    dispatch(resetTotalCustomerCount())
      .unwrap()
      .then((response) => {
        dispatch(showAlert({
          message: '客戶總數已重設',
          severity: 'success'
        }));
        // 直接更新本地輸入值
        if (response && response.totalCustomerCount !== undefined) {
          setTotalCustomerCountInput(response.totalCustomerCount.toString());
        }
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `重設失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch]);

  // 處理上一位辦完時間輸入變更
  const handleLastCompletedTimeChange = useCallback((event) => {
    setLastCompletedTimeInput(event.target.value);
  }, []);

  // 處理上一位辦完時間設定
  const handleSetLastCompletedTime = useCallback(() => {
    if (!lastCompletedTimeInput) {
      dispatch(showAlert({
        message: '請輸入有效的時間',
        severity: 'warning'
      }));
      return;
    }

    const timeString = new Date(lastCompletedTimeInput).toISOString();
    
    dispatch(setLastCompletedTime(timeString))
      .unwrap()
      .then(() => {
        dispatch(showAlert({
          message: '上一位辦完時間設置成功',
          severity: 'success'
        }));
        // 不需要重新獲取狀態，保持當前輸入值
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `設定失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch, lastCompletedTimeInput]);

  // 處理上一位辦完時間重設
  const handleResetLastCompletedTime = useCallback(() => {
    dispatch(resetLastCompletedTime())
      .unwrap()
      .then((response) => {
        dispatch(showAlert({
          message: '上一位辦完時間已重設',
          severity: 'success'
        }));
        // 直接更新本地輸入值
        if (response && response.lastCompletedTime) {
          const date = new Date(response.lastCompletedTime);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hour = String(date.getHours()).padStart(2, '0');
          const minute = String(date.getMinutes()).padStart(2, '0');
          setLastCompletedTimeInput(`${year}-${month}-${day}T${hour}:${minute}`);
        } else {
          setLastCompletedTimeInput('');
        }
      })
      .catch((error) => {
        dispatch(showAlert({
          message: `重設失敗: ${error}`,
          severity: 'error'
        }));
      });
  }, [dispatch]);

  return {
    // 狀態
    queueList,
    localQueueList,
    currentQueue,
    isLoading,
    error,
    currentTab,
    selectedRecord,
    openDialog,
    editMode,
    editedData,
    confirmDialog,
    exportDialogOpen,
    registerDialogOpen,
    duplicateNumbers,
    visibleColumns,
    columnMenuAnchor,
    columnMenuOpen,
    queueStatus,
    totalCustomerCountInput,
    lastCompletedTimeInput,

    // 方法
    loadQueueList,
    handleReorderQueue,
    handleCallNext,
    handleUpdateStatus,
    handleDragEnd,
    handleOpenDetails,
    handleCloseDialog,
    handleEnterEditMode,
    handleInputChange,
    handleAddressChange,
    addAddress,
    removeAddress,
    handleFamilyMemberChange,
    addFamilyMember,
    removeFamilyMember,
    handleTopicChange,
    handleSaveData,
    handleCompletionChange,
    handleCancelCustomer,
    handleRestoreCustomer,
    handleCompleteFromDialog,
    handleTabChange,
    handleCloseConfirmDialog,
    handleExport,
    handleCloseExportDialog,
    handleDeleteCustomer,
    handleClearAllQueue,
    handleColumnMenuOpen,
    handleColumnMenuClose,
    handleColumnToggle,
    handleResetColumns,
    handleOpenRegisterDialog,
    handleCloseRegisterDialog,
    handleRegisterSuccess,
    handleTotalCustomerCountChange,
    handleSetTotalCustomerCount,
    handleResetTotalCustomerCount,
    handleLastCompletedTimeChange,
    handleSetLastCompletedTime,
    handleResetLastCompletedTime
  };
};
