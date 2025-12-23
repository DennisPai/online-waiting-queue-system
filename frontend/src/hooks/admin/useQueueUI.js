import { useState, useCallback } from 'react';

/**
 * 候位 UI 狀態管理 Hook
 * 負責對話框、表單、欄位顯示等 UI 狀態
 */
export const useQueueUI = () => {
  // 對話框狀態
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // 確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

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

  // 對話框操作
  const handleOpenDetails = useCallback((record) => {
    setSelectedRecord(record);
    setEditedData({ ...record });
    setOpenDialog(true);
    setEditMode(false);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setSelectedRecord(null);
    setEditedData({});
    setEditMode(false);
  }, []);

  const handleEnterEditMode = useCallback(() => {
    setEditMode(true);
  }, []);

  // 處理基本輸入變更
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditedData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // 處理地址變更
  const handleAddressChange = useCallback((index, field, value) => {
    setEditedData(prev => {
      const newAddresses = [...(prev.addresses || [])];
      newAddresses[index] = {
        ...newAddresses[index],
        [field]: value
      };
      return {
        ...prev,
        addresses: newAddresses
      };
    });
  }, []);

  // 新增地址
  const addAddress = useCallback(() => {
    setEditedData(prev => {
      const currentAddresses = prev.addresses || [];
      if (currentAddresses.length < 3) {
        return {
          ...prev,
          addresses: [...currentAddresses, { address: '', addressType: 'home' }]
        };
      }
      return prev;
    });
  }, []);

  // 移除地址
  const removeAddress = useCallback((index) => {
    setEditedData(prev => {
      const currentAddresses = prev.addresses || [];
      if (currentAddresses.length > 1) {
        return {
          ...prev,
          addresses: currentAddresses.filter((_, i) => i !== index)
        };
      }
      return prev;
    });
  }, []);

  // 處理家人資料變更
  const handleFamilyMemberChange = useCallback((index, field, value) => {
    setEditedData(prev => {
      const newFamilyMembers = [...(prev.familyMembers || [])];
      newFamilyMembers[index] = {
        ...newFamilyMembers[index],
        [field]: value
      };
      return {
        ...prev,
        familyMembers: newFamilyMembers
      };
    });
  }, []);

  // 新增家人
  const addFamilyMember = useCallback(() => {
    setEditedData(prev => {
      const currentFamilyMembers = prev.familyMembers || [];
      if (currentFamilyMembers.length < 5) {
        return {
          ...prev,
          familyMembers: [
            ...currentFamilyMembers,
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
              addresses: [{ address: '', addressType: 'home' }]
            }
          ]
        };
      }
      return prev;
    });
  }, []);

  // 移除家人
  const removeFamilyMember = useCallback((index) => {
    setEditedData(prev => {
      const currentFamilyMembers = prev.familyMembers || [];
      return {
        ...prev,
        familyMembers: currentFamilyMembers.filter((_, i) => i !== index)
      };
    });
  }, []);

  // 處理諮詢主題變更
  const handleTopicChange = useCallback((topic) => {
    setEditedData(prev => {
      const currentTopics = [...(prev.consultationTopics || [])];
      const topicIndex = currentTopics.indexOf(topic);
      
      let newEditedData = { ...prev };
      
      if (topicIndex === -1) {
        currentTopics.push(topic);
      } else {
        currentTopics.splice(topicIndex, 1);
        // 如果取消勾選"其他"，清空其他詳細內容
        if (topic === 'other') {
          newEditedData.otherDetails = '';
        }
      }
      
      newEditedData.consultationTopics = currentTopics;
      return newEditedData;
    });
  }, []);

  // 匯出對話框
  const handleOpenExportDialog = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setExportDialogOpen(false);
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
  }, []);

  // 確認對話框
  const handleOpenConfirmDialog = useCallback((title, message, onConfirm) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      onConfirm
    });
  }, []);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog({
      open: false,
      title: '',
      message: '',
      onConfirm: null
    });
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    handleCloseConfirmDialog();
  }, [confirmDialog.onConfirm, handleCloseConfirmDialog]);

  // 欄位顯示控制
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

  const handleColumnMenuOpen = useCallback((event) => {
    setColumnMenuAnchor(event.currentTarget);
    setColumnMenuOpen(true);
  }, []);

  const handleColumnMenuClose = useCallback(() => {
    setColumnMenuAnchor(null);
    setColumnMenuOpen(false);
  }, []);

  return {
    // 對話框狀態
    selectedRecord,
    openDialog,
    editMode,
    editedData,
    exportDialogOpen,
    registerDialogOpen,
    confirmDialog,

    // 欄位控制狀態
    visibleColumns,
    columnMenuAnchor,
    columnMenuOpen,

    // 狀態更新方法
    setSelectedRecord,
    setEditedData,

    // 對話框操作
    handleOpenDetails,
    handleCloseDialog,
    handleEnterEditMode,
    handleOpenExportDialog,
    handleExport: handleOpenExportDialog, // 別名，兼容現有代碼
    handleCloseExportDialog,
    handleOpenRegisterDialog,
    handleCloseRegisterDialog,
    handleRegisterSuccess,

    // 確認對話框
    setConfirmDialog,
    handleOpenConfirmDialog,
    handleCloseConfirmDialog,
    handleConfirmAction,

    // 表單處理函數
    handleInputChange,
    handleAddressChange,
    addAddress,
    removeAddress,
    handleFamilyMemberChange,
    addFamilyMember,
    removeFamilyMember,
    handleTopicChange,

    // 欄位控制
    handleColumnToggle,
    handleResetColumns,
    handleColumnMenuOpen,
    handleColumnMenuClose
  };
};
