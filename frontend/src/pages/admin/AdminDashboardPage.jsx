import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Checkbox as MuiCheckbox,
  Tabs,
  Tab,
  Menu,
  Popover,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Restore as RestoreIcon,
  FileDownload as FileDownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  ViewColumn as ViewColumnIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  getQueueList,
  callNextQueue,
  updateQueueStatus,
  updateQueueOrder,
  getQueueStatus,
  updateOrderLocal,
  updateQueueData,
  deleteCustomer,
  clearAllQueue
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';
import ExportDialog from '../../components/ExportDialog';
import { 
  autoFillDates, 
  autoFillFamilyMembersDates, 
  formatMinguoYear, 
  formatMinguoDate,
  calculateVirtualAge,
  autoConvertToMinguo,
  convertMinguoForStorage,
  gregorianToLunar,
  lunarToGregorian
} from '../../utils/calendarConverter';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RegisterForm from '../RegisterForm';

// 定義可顯示的欄位配置
const AVAILABLE_COLUMNS = {
  orderIndex: { key: 'orderIndex', label: '叫號順序', defaultVisible: true },
  queueNumber: { key: 'queueNumber', label: '號碼', defaultVisible: true },
  status: { key: 'status', label: '狀態', defaultVisible: true },
  name: { key: 'name', label: '姓名', defaultVisible: true },
  phone: { key: 'phone', label: '電話', defaultVisible: true },
  email: { key: 'email', label: '電子郵件', defaultVisible: true },
  totalPeople: { key: 'totalPeople', label: '人數', defaultVisible: true },
  gender: { key: 'gender', label: '性別', defaultVisible: false },
  birthDate: { key: 'birthDate', label: '出生日期', defaultVisible: false },
  virtualAge: { key: 'virtualAge', label: '虛歲', defaultVisible: false },
  address: { key: 'address', label: '地址', defaultVisible: false },
  addressType: { key: 'addressType', label: '地址類型', defaultVisible: false },
  consultationTopics: { key: 'consultationTopics', label: '諮詢主題', defaultVisible: true },
  createdAt: { key: 'createdAt', label: '登記時間', defaultVisible: true },
  actions: { key: 'actions', label: '操作', defaultVisible: true, alwaysVisible: true }
};

const AdminDashboardPage = () => {
  const dispatch = useDispatch();
  const { queueList, pagination, currentQueue, isLoading, error } = useSelector(
    (state) => state.queue
  );
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  // 維護本地排序狀態
  const [localQueueList, setLocalQueueList] = useState([]);
  // 添加編輯模式狀態
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  // 添加分頁狀態
  const [currentTab, setCurrentTab] = useState(0);
  // 添加確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  // 添加匯出對話框狀態
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  
  // 添加欄位顯示控制狀態
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // 從localStorage載入保存的設定，否則使用預設值
    const saved = localStorage.getItem('queueTableColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved columns:', e);
      }
    }
    // 預設顯示的欄位
    return Object.keys(AVAILABLE_COLUMNS).filter(key => 
      AVAILABLE_COLUMNS[key].defaultVisible
    );
  });
  
  // 欄位選擇器相關狀態
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  // 初始加載候位列表和當前候位狀態
  useEffect(() => {
    loadQueueList();
    dispatch(getQueueStatus());
  }, [dispatch, currentTab]);

  // 當queueList變更時更新本地狀態
  useEffect(() => {
    // 無論queueList是否為空都要更新localQueueList
    setLocalQueueList(queueList || []);
  }, [queueList]);

  const loadQueueList = useCallback(() => {
    const status = currentTab === 0 ? undefined : 'cancelled';
    dispatch(
      getQueueList({
        status: status
      })
    );
  }, [dispatch, currentTab]);

  // 重新排序功能：按照orderIndex從小到大排列，確保連續性
  const handleReorderQueue = useCallback(async () => {
    try {
      console.log('開始重新排序，原始數據:', localQueueList.map(item => ({ 
        id: item._id, 
        queueNumber: item.queueNumber, 
        orderIndex: item.orderIndex, 
        status: item.status 
      })));

      // 創建一個新的數組並按orderIndex排序
      const sortedList = [...localQueueList].sort((a, b) => {
        const orderA = a.orderIndex || 999;
        const orderB = b.orderIndex || 999;
        return orderA - orderB;
      });
      
      console.log('排序後數據:', sortedList.map(item => ({ 
        id: item._id, 
        queueNumber: item.queueNumber, 
        orderIndex: item.orderIndex, 
        status: item.status 
      })));

      // 重新分配連續的orderIndex（1,2,3...）
      const reorderedList = sortedList.map((record, index) => ({
        ...record,
        orderIndex: index + 1
      }));

      // 立即更新本地狀態顯示排序效果
      setLocalQueueList(reorderedList);

      // 執行所有重新排序請求
      const updatePromises = reorderedList.map((record, index) => {
        const newOrderIndex = index + 1;
        // 只更新那些orderIndex確實改變的記錄
        if (sortedList[index].orderIndex !== newOrderIndex) {
          console.log(`更新記錄 ${record.queueNumber} 的orderIndex從 ${sortedList[index].orderIndex} 到 ${newOrderIndex}`);
          return dispatch(updateQueueOrder({ 
            queueId: record._id, 
            newOrder: newOrderIndex 
          })).unwrap();
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      
      dispatch(
        showAlert({
          message: '叫號順序已重新排列為連續數字 (1,2,3...)',
          severity: 'success'
        })
      );
      
      // 重新加載最新數據確保同步
      loadQueueList();
      
    } catch (error) {
      console.error('重新排序失敗:', error);
      dispatch(
        showAlert({
          message: '重新排序失敗: ' + (error?.message || error || '未知錯誤'),
          severity: 'error'
        })
      );
      // 發生錯誤時重新加載原始數據
      loadQueueList();
    }
  }, [dispatch, localQueueList, loadQueueList]);

  const handleCallNext = useCallback(() => {
    // 先檢查是否有順序為 1 的記錄，如果有，將其標記為已完成
    const currentProcessingRecord = localQueueList.find(
      item => item.orderIndex === 1 && (item.status === 'waiting' || item.status === 'processing')
    );
    
    if (currentProcessingRecord) {
      // 先將目前處理中的記錄標記為已完成，並移至列表末尾
      handleCompletionChange(null, currentProcessingRecord._id, true);
    }
    
    // 延遲一點時間再呼叫下一位，確保上一個操作完成
    setTimeout(() => {
      dispatch(callNextQueue())
        .unwrap()
        .then((data) => {
          dispatch(
            showAlert({
              message: `已呼叫 ${data.queueNumber} 號`,
              severity: 'success'
            })
          );
          loadQueueList();
        })
        .catch((error) => {
          dispatch(
            showAlert({
              message: error,
              severity: 'error'
            })
          );
        });
    }, 500);
  }, [dispatch, loadQueueList, localQueueList]);

  const handleUpdateStatus = useCallback((queueId, status) => {
    dispatch(updateQueueStatus({ queueId, status }))
      .unwrap()
      .then(() => {
        dispatch(
          showAlert({
            message: '候位狀態更新成功',
            severity: 'success'
          })
        );
        loadQueueList();
      })
      .catch((error) => {
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  }, [dispatch, loadQueueList]);

  // 處理拖曳完成 - 完全重構，使用更簡單的邏輯
  const handleDragEnd = useCallback((result) => {
    // 拖曳被取消或無效
    if (!result.destination || !result.draggableId) {
      return;
    }

    console.log('拖曳結果:', JSON.stringify(result));
    
    try {
      const { source, destination } = result;
      const sourceIndex = source.index;
      const destinationIndex = destination.index;
      
      // 如果位置沒變，不做任何事
      if (sourceIndex === destinationIndex) {
        return;
      }
      
      // 找到要移動的記錄
      const recordToMove = localQueueList[sourceIndex];
      if (!recordToMove || !recordToMove._id) {
        console.error('找不到要移動的記錄或記錄ID', sourceIndex);
        return;
      }
      
      const queueId = recordToMove._id;
      const newOrder = destinationIndex + 1; // 因為我們的順序從1開始
      
      console.log(`更新順序: ID=${queueId}, 從${sourceIndex+1}到${newOrder}`);
      
      // 本地UI立即更新，避免白屏
      const newList = Array.from(localQueueList);
      const [removed] = newList.splice(sourceIndex, 1);
      newList.splice(destinationIndex, 0, removed);
      setLocalQueueList(newList);
      
      // 向後端發送更新請求
      dispatch(updateQueueOrder({ queueId, newOrder }))
        .unwrap()
        .then((response) => {
          console.log('更新順序成功', response);
          // 顯示成功提示
          dispatch(
            showAlert({
              message: '候位順序更新成功',
              severity: 'success'
            })
          );
          // 使用後端返回的數據更新狀態 - 修正這裡的存取路徑
          if (response && response.data && Array.isArray(response.data.allRecords)) {
            setLocalQueueList(response.data.allRecords);
          } else if (response && Array.isArray(response.allRecords)) {
            setLocalQueueList(response.allRecords);
          }
          // 不需要做任何事，Redux store 已經通過 extraReducers 更新了
        })
        .catch((error) => {
          console.error('更新順序錯誤:', error);
          // 發生錯誤時恢復原始順序
          loadQueueList();
          dispatch(
            showAlert({
              message: '更新順序失敗: ' + (error || '未知錯誤'),
              severity: 'error'
            })
          );
        });
    } catch (error) {
      console.error('拖曳處理錯誤:', error);
      // 出錯時重新加載列表
      loadQueueList();
      dispatch(
        showAlert({
          message: '拖曳處理錯誤，請刷新頁面重試',
          severity: 'error'
        })
      );
    }
  }, [dispatch, localQueueList, loadQueueList]);

  // 打開詳細資料對話框
  const handleOpenDetails = (record) => {
    setSelectedRecord(record);
    setEditMode(false);
    setEditedData({});
    setOpenDialog(true);
  };

  // 關閉詳細資料對話框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setEditedData({});
  };

  // 切換到編輯模式
  const handleEnterEditMode = () => {
    if (selectedRecord) {
      setEditedData({
        name: selectedRecord.name,
        email: selectedRecord.email,
        phone: selectedRecord.phone,
        gender: selectedRecord.gender,
        // 國曆農曆出生日期欄位
        gregorianBirthYear: selectedRecord.gregorianBirthYear || '',
        gregorianBirthMonth: selectedRecord.gregorianBirthMonth || '',
        gregorianBirthDay: selectedRecord.gregorianBirthDay || '',
        lunarBirthYear: selectedRecord.lunarBirthYear || '',
        lunarBirthMonth: selectedRecord.lunarBirthMonth || '',
        lunarBirthDay: selectedRecord.lunarBirthDay || '',
        lunarIsLeapMonth: selectedRecord.lunarIsLeapMonth || false,
        // 處理多個地址
        addresses: selectedRecord.addresses || [
          {
            address: selectedRecord.address || '',
            addressType: selectedRecord.addressType || 'home'
          }
        ],
        // 處理家庭成員
        familyMembers: selectedRecord.familyMembers || [],
        consultationTopics: [...selectedRecord.consultationTopics]
      });
      setEditMode(true);
    }
  };

  // 處理表單輸入變更
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData({
      ...editedData,
      [name]: value
    });
  };

  // 處理地址變更
  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...editedData.addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value
    };
    setEditedData({
      ...editedData,
      addresses: newAddresses
    });
  };

  // 新增地址
  const addAddress = () => {
    if (editedData.addresses.length < 3) {
      setEditedData({
        ...editedData,
        addresses: [...editedData.addresses, { address: '', addressType: 'home' }]
      });
    }
  };

  // 移除地址
  const removeAddress = (index) => {
    if (editedData.addresses.length > 1) {
      const newAddresses = editedData.addresses.filter((_, i) => i !== index);
      setEditedData({
        ...editedData,
        addresses: newAddresses
      });
    }
  };

  // 處理家庭成員變更
  const handleFamilyMemberChange = (index, field, value) => {
    const newFamilyMembers = [...editedData.familyMembers];
    let updatedMember = {
      ...newFamilyMembers[index],
      [field]: value
    };

    // 當修改年份欄位時，進行西元/民國年份轉換和互相轉換
    if ((field === 'gregorianBirthYear' || field === 'gregorianBirthMonth' || field === 'gregorianBirthDay') && 
        updatedMember.gregorianBirthYear && updatedMember.gregorianBirthMonth && updatedMember.gregorianBirthDay) {
      
      try {
        // 處理年份輸入，自動判斷西元/民國
        let inputYear = parseInt(updatedMember.gregorianBirthYear);
        if (!isNaN(inputYear)) {
          // 判斷是否為西元年，自動轉換
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          // 更新年份為正確的西元年（用於資料庫儲存）
          updatedMember.gregorianBirthYear = gregorianYear;
          
          // 國曆轉農曆
          const month = parseInt(updatedMember.gregorianBirthMonth);
          const day = parseInt(updatedMember.gregorianBirthDay);
          
          if (!isNaN(month) && !isNaN(day)) {
            const lunarDate = gregorianToLunar(gregorianYear, month, day);
            updatedMember.lunarBirthYear = lunarDate.year;
            updatedMember.lunarBirthMonth = lunarDate.month;
            updatedMember.lunarBirthDay = lunarDate.day;
            updatedMember.lunarIsLeapMonth = lunarDate.isLeapMonth;
            
            // 計算虛歲
            updatedMember.virtualAge = calculateVirtualAge(lunarDate.year);
          }
        }
      } catch (error) {
        console.error('國曆轉農曆錯誤:', error);
      }
    }
    
    // 當修改農曆日期欄位時，進行農曆轉國曆
    if ((field === 'lunarBirthYear' || field === 'lunarBirthMonth' || field === 'lunarBirthDay' || field === 'lunarIsLeapMonth') && 
        updatedMember.lunarBirthYear && updatedMember.lunarBirthMonth && updatedMember.lunarBirthDay) {
      
      try {
        // 處理年份輸入，自動判斷西元/民國
        let inputYear = parseInt(updatedMember.lunarBirthYear);
        if (!isNaN(inputYear)) {
          // 判斷是否為西元年，自動轉換
          const { minguoYear } = autoConvertToMinguo(inputYear);
          const gregorianYear = convertMinguoForStorage(minguoYear);
          
          // 更新年份為正確的西元年（用於資料庫儲存）
          updatedMember.lunarBirthYear = gregorianYear;
          
          // 農曆轉國曆
          const month = parseInt(updatedMember.lunarBirthMonth);
          const day = parseInt(updatedMember.lunarBirthDay);
          
          if (!isNaN(month) && !isNaN(day)) {
            const gregorianDate = lunarToGregorian(gregorianYear, month, day, updatedMember.lunarIsLeapMonth);
            updatedMember.gregorianBirthYear = gregorianDate.year;
            updatedMember.gregorianBirthMonth = gregorianDate.month;
            updatedMember.gregorianBirthDay = gregorianDate.day;
            
            // 計算虛歲
            updatedMember.virtualAge = calculateVirtualAge(gregorianYear);
          }
        }
      } catch (error) {
        console.error('農曆轉國曆錯誤:', error);
      }
    }

    newFamilyMembers[index] = updatedMember;

    setEditedData({
      ...editedData,
      familyMembers: newFamilyMembers
    });
  };

  // 新增家庭成員
  const addFamilyMember = () => {
    if (editedData.familyMembers && editedData.familyMembers.length < 5) {
      setEditedData({
        ...editedData,
        familyMembers: [...editedData.familyMembers, {
          name: '',
          gender: 'male',
          // 國曆農曆出生日期欄位
          gregorianBirthYear: '',
          gregorianBirthMonth: '',
          gregorianBirthDay: '',
          lunarBirthYear: '',
          lunarBirthMonth: '',
          lunarBirthDay: '',
          lunarIsLeapMonth: false,
          address: '',
          addressType: 'home'
        }]
      });
    }
  };

  // 移除家庭成員
  const removeFamilyMember = (index) => {
    const newFamilyMembers = editedData.familyMembers.filter((_, i) => i !== index);
    setEditedData({
      ...editedData,
      familyMembers: newFamilyMembers
    });
  };

  // 處理諮詢主題變更
  const handleTopicChange = (topic) => {
    const currentTopics = [...editedData.consultationTopics];
    const topicIndex = currentTopics.indexOf(topic);
    
    if (topicIndex === -1) {
      currentTopics.push(topic);
    } else {
      currentTopics.splice(topicIndex, 1);
    }
    
    setEditedData({
      ...editedData,
      consultationTopics: currentTopics
    });
  };

  // 保存編輯的資料
  const handleSaveData = () => {
    if (selectedRecord && editMode) {
      // 在保存前進行日期自動轉換
      let processedData = autoFillDates(editedData);
      
      // 處理家人資料的日期轉換
      if (processedData.familyMembers && processedData.familyMembers.length > 0) {
        const familyData = autoFillFamilyMembersDates({ familyMembers: processedData.familyMembers });
        processedData.familyMembers = familyData.familyMembers;
      }
      
      dispatch(updateQueueData({
        queueId: selectedRecord._id,
        customerData: processedData
      }))
        .unwrap()
        .then((data) => {
          setSelectedRecord(data);
          setEditMode(false);
          setEditedData({});
          dispatch(
            showAlert({
              message: '客戶資料更新成功',
              severity: 'success'
            })
          );
          loadQueueList();
        })
        .catch((error) => {
          dispatch(
            showAlert({
              message: error,
              severity: 'error'
            })
          );
        });
    }
  };

  // 根據不同狀態顯示對應顏色
  const getStatusChip = (status, orderIndex) => {
    if (status === 'completed') {
      return <Chip label="已完成" color="success" size="small" />;
    } else if (status === 'cancelled') {
      return <Chip label="已取消" color="error" size="small" />;
    } else if (orderIndex === 1) {
      return <Chip label="處理中" color="warning" size="small" />;
    } else {
      return <Chip label="等待中" color="info" size="small" />;
    }
  };

  // 顯示諮詢主題
  const formatConsultationTopics = (topics, otherDetails = '') => {
    if (!topics || topics.length === 0) return '無';
    
    const topicMap = {
      'body': '身體',
      'fate': '運途',
      'karma': '因果',
      'family': '家運/祖先',
      'career': '事業',
      'relationship': '婚姻感情',
      'study': '學業',
      'blessing': '收驚/加持',
      'other': '其他'
    };
    
    const formattedTopics = topics.map(topic => topicMap[topic] || topic);
    
    // 如果包含"其他"且有詳細內容，顯示詳細內容
    if (topics.includes('other') && otherDetails) {
      const otherIndex = formattedTopics.indexOf('其他');
      if (otherIndex !== -1) {
        formattedTopics[otherIndex] = `其他(${otherDetails})`;
      }
    }
    
    return formattedTopics.join('、');
  };

  // 顯示地址類型
  const formatAddressType = (type) => {
    const typeMap = {
      'home': '住家',
      'work': '工作場所',
      'hospital': '醫院',
      'other': '其他'
    };
    return typeMap[type] || type;
  };

  // 顯示多個地址
  const formatAddresses = (addresses) => {
    if (!addresses || addresses.length === 0) return '無';
    
    return addresses.map((addr, index) => (
      `${index + 1}. ${addr.address} (${formatAddressType(addr.addressType)})`
    )).join('\n');
  };

  // 顯示家庭成員（使用民國年，同時顯示國曆和農曆）
  const formatFamilyMembers = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) return '無';
    
    return familyMembers.map((member, index) => {
      let birthInfos = [];
      
      // 顯示國曆出生日期（使用民國年）
      if (member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay) {
        const minguoYear = member.gregorianBirthYear - 1911;
        birthInfos.push(`民國${minguoYear}年${member.gregorianBirthMonth}月${member.gregorianBirthDay}日 (國曆)`);
      }
      
      // 顯示農曆出生日期（使用民國年）
      if (member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay) {
        const minguoYear = member.lunarBirthYear - 1911;
        const leapText = member.lunarIsLeapMonth ? ' 閏月' : '';
        birthInfos.push(`民國${minguoYear}年${member.lunarBirthMonth}月${member.lunarBirthDay}日 (農曆${leapText})`);
      }
      
      const birthInfo = birthInfos.length > 0 ? birthInfos.join(' / ') : '出生日期未設定';
      
      // 添加虛歲顯示
      const ageInfo = member.virtualAge ? ` (虛歲${member.virtualAge}歲)` : '';
      
      // 添加性別顯示
      const genderInfo = member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '未設定';
      
      return `${index + 1}. ${member.name} (${genderInfo}) - ${birthInfo}${ageInfo} - ${member.address} (${formatAddressType(member.addressType)})`;
    }).join('\n');
  };

  // 計算總人數（本人 + 家人）
  const getTotalPeopleCount = (familyMembers) => {
    return 1 + (familyMembers ? familyMembers.length : 0);
  };

  // 新增處理completion checkbox的函數
  const handleCompletionChange = (event, queueId, completed) => {
    if (completed) {
      // 1. 先將狀態更新為已完成
      dispatch(updateQueueStatus({ queueId, status: 'completed' }))
        .unwrap()
        .then(() => {
          // 2. 找到這條記錄
          const record = localQueueList.find(item => item._id === queueId);
          if (record) {
            // 3. 計算列表最大序號
            const maxOrderIndex = localQueueList.length;
            
            // 4. 將這條記錄移動到列表最後
            dispatch(updateQueueOrder({ queueId, newOrder: maxOrderIndex }))
              .unwrap()
              .then(() => {
                dispatch(
                  showAlert({
                    message: '已標記為完成並移至列表末尾',
                    severity: 'success'
                  })
                );
                // 5. 重新加載列表
                loadQueueList();
              })
              .catch((error) => {
                dispatch(
                  showAlert({
                    message: '移動位置失敗: ' + (error || '未知錯誤'),
                    severity: 'error'
                  })
                );
              });
          }
        })
        .catch((error) => {
          dispatch(
            showAlert({
              message: '更新狀態失敗: ' + (error || '未知錯誤'),
              severity: 'error'
            })
          );
        });
    } else {
      // 如果取消勾選，根據順序還原狀態
      const record = localQueueList.find(item => item._id === queueId);
      if (record) {
        const newStatus = record.orderIndex === 1 ? 'processing' : 'waiting';
        handleUpdateStatus(queueId, newStatus);
      }
    }
  };

  // 處理取消客戶預約
  const handleCancelCustomer = (queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '確認取消',
      message: `確定要取消 ${customerName} 的預約嗎？`,
      onConfirm: () => {
        dispatch(updateQueueStatus({ queueId, status: 'cancelled' }))
          .unwrap()
          .then(() => {
            dispatch(
              showAlert({
                message: '客戶預約已取消',
                severity: 'success'
              })
            );
            loadQueueList();
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          })
          .catch((error) => {
            dispatch(
              showAlert({
                message: '取消失敗: ' + (error || '未知錯誤'),
                severity: 'error'
              })
            );
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          });
      }
    });
  };

  // 處理復原客戶
  const handleRestoreCustomer = (queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '確認復原',
      message: `確定要復原 ${customerName} 嗎？`,
      onConfirm: () => {
        dispatch(updateQueueStatus({ queueId, status: 'waiting' }))
          .unwrap()
          .then(() => {
            dispatch(
              showAlert({
                message: '客戶已復原至等待中',
                severity: 'success'
              })
            );
            loadQueueList();
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          })
          .catch((error) => {
            dispatch(
              showAlert({
                message: '復原失敗: ' + (error || '未知錯誤'),
                severity: 'error'
              })
            );
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          });
      }
    });
  };

  // 處理詳細資料對話框中的標記為已完成
  const handleCompleteFromDialog = (queueId) => {
    // 1. 先將狀態更新為已完成
    dispatch(updateQueueStatus({ queueId, status: 'completed' }))
      .unwrap()
      .then(() => {
        // 2. 找到這條記錄
        const record = localQueueList.find(item => item._id === queueId);
        if (record) {
          // 3. 計算列表最大序號
          const maxOrderIndex = localQueueList.length;
          
          // 4. 將這條記錄移動到列表最後
          dispatch(updateQueueOrder({ queueId, newOrder: maxOrderIndex }))
            .unwrap()
            .then(() => {
              dispatch(
                showAlert({
                  message: '已標記為完成並移至列表末尾',
                  severity: 'success'
                })
              );
              // 5. 重新加載列表
              loadQueueList();
            })
            .catch((error) => {
              dispatch(
                showAlert({
                  message: '移動位置失敗: ' + (error || '未知錯誤'),
                  severity: 'error'
                })
              );
            });
        }
      })
      .catch((error) => {
        dispatch(
          showAlert({
            message: '更新狀態失敗: ' + (error || '未知錯誤'),
            severity: 'error'
          })
        );
      });
  };

  // 處理分頁切換
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // 關閉確認對話框
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  };

  // 處理匯出功能 - 獲取所有客戶資料
  const handleExport = () => {
    // 重新獲取所有客戶資料（不限制狀態和分頁）
    dispatch(getQueueList({}))
      .unwrap()
      .then(() => {
        setExportDialogOpen(true);
      })
      .catch((error) => {
        dispatch(
          showAlert({
            message: '獲取匯出資料失敗: ' + (error || '未知錯誤'),
            severity: 'error'
          })
        );
      });
  };

  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };

  // 處理刪除客戶
  const handleDeleteCustomer = (queueId, customerName) => {
    setConfirmDialog({
      open: true,
      title: '刪除客戶',
      message: `確定要永久刪除 ${customerName} 的資料嗎？此操作無法回復！`,
      onConfirm: () => {
        dispatch(deleteCustomer(queueId))
          .unwrap()
          .then((data) => {
            dispatch(
              showAlert({
                message: data.message || '客戶資料已永久刪除',
                severity: 'success'
              })
            );
            loadQueueList();
            handleCloseDialog();
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          })
          .catch((error) => {
            dispatch(
              showAlert({
                message: '刪除失敗: ' + (error || '未知錯誤'),
                severity: 'error'
              })
            );
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          });
      }
    });
  };

  // 處理清除所有候位
  const handleClearAllQueue = () => {
    setConfirmDialog({
      open: true,
      title: '確認清除所有候位',
      message: '此操作將永久刪除所有候位記錄，此動作無法復原。您確定要繼續嗎？',
      onConfirm: () => {
        dispatch(clearAllQueue())
          .unwrap()
          .then(() => {
            dispatch(
              showAlert({
                message: '所有候位記錄已成功清除',
                severity: 'success'
              })
            );
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
            loadQueueList(); // 重新載入列表
          })
          .catch((error) => {
            dispatch(
              showAlert({
                message: error,
                severity: 'error'
              })
            );
            setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
          });
      }
    });
  };

  // 欄位選擇相關處理函數
  const handleColumnMenuOpen = (event) => {
    setColumnMenuAnchor(event.currentTarget);
    setColumnMenuOpen(true);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
    setColumnMenuOpen(false);
  };

  const handleColumnToggle = (columnKey) => {
    // 不允許取消操作欄
    if (AVAILABLE_COLUMNS[columnKey].alwaysVisible) {
      return;
    }

    const newVisibleColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    
    setVisibleColumns(newVisibleColumns);
    
    // 保存到localStorage
    localStorage.setItem('queueTableColumns', JSON.stringify(newVisibleColumns));
  };

  const handleResetColumns = () => {
    const defaultColumns = Object.keys(AVAILABLE_COLUMNS).filter(key => 
      AVAILABLE_COLUMNS[key].defaultVisible
    );
    setVisibleColumns(defaultColumns);
    localStorage.setItem('queueTableColumns', JSON.stringify(defaultColumns));
    handleColumnMenuClose();
  };

  // 格式化性別顯示
  const formatGender = (gender) => {
    switch (gender) {
      case 'male':
        return '男';
      case 'female':
        return '女';
      default:
        return '未設定';
    }
  };

  // 格式化出生日期顯示（使用民國年）
  const formatBirthDateColumn = (row) => {
    // 顯示國曆或農曆出生日期（使用民國年）
    if (row.gregorianBirthYear && row.gregorianBirthMonth && row.gregorianBirthDay) {
      const minguoYear = row.gregorianBirthYear - 1911;
      return `國曆民國${minguoYear}/${row.gregorianBirthMonth}/${row.gregorianBirthDay}`;
    } else if (row.lunarBirthYear && row.lunarBirthMonth && row.lunarBirthDay) {
      const minguoYear = row.lunarBirthYear - 1911;
      const leapText = row.lunarIsLeapMonth ? '閏' : '';
      return `農曆民國${minguoYear}/${leapText}${row.lunarBirthMonth}/${row.lunarBirthDay}`;
    }
    return '未設定';
  };

  // 渲染表格欄位內容
  const renderColumnContent = (column, row, index) => {
    switch (column) {
      case 'orderIndex':
        return (
          <Typography variant="body2" fontWeight="bold">
            {row.orderIndex || index + 1}
          </Typography>
        );
      case 'queueNumber':
        return row.queueNumber;
      case 'status':
        return getStatusChip(row.status, row.orderIndex || index + 1);
      case 'name':
        return row.name;
      case 'phone':
        return row.phone;
      case 'email':
        return row.email;
      case 'totalPeople':
        return getTotalPeopleCount(row.familyMembers);
      case 'gender':
        return formatGender(row.gender);
      case 'birthDate':
        return formatBirthDateColumn(row);
      case 'virtualAge':
        return row.virtualAge ? `${row.virtualAge} 歲` : '未計算';
      case 'address':
        // 支援新的多地址格式，同時向後兼容
        if (row.addresses && row.addresses.length > 0) {
          return row.addresses[0].address;
        }
        return row.address || '未設定';
      case 'addressType':
        // 支援新的多地址格式，同時向後兼容
        if (row.addresses && row.addresses.length > 0) {
          return formatAddressType(row.addresses[0].addressType);
        }
        return formatAddressType(row.addressType);
      case 'consultationTopics':
        return formatConsultationTopics(row.consultationTopics, row.otherDetails).substring(0, 15) + '...';
      case 'createdAt':
        return format(new Date(row.createdAt), 'yyyy/MM/dd HH:mm', { locale: zhTW });
      case 'actions':
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 0.5,
            minWidth: 130,
            maxWidth: 130,
            mx: 'auto'
          }}>
            <Tooltip title="詳細資料">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleOpenDetails(row)}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
            {currentTab === 0 ? (
              <>
                <Tooltip title="標記為已完成">
                  <MuiCheckbox
                    size="small"
                    checked={row.status === 'completed'}
                    onChange={(e) => handleCompletionChange(e, row._id, e.target.checked)}
                    color="success"
                  />
                </Tooltip>
                <Tooltip title="取消預約">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleCancelCustomer(row._id, row.name)}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="復原客戶">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleRestoreCustomer(row._id, row.name)}
                >
                  <RestoreIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      default:
        return '';
    }
  };

  const handleOpenRegisterDialog = () => {
    setRegisterDialogOpen(true);
  };

  const handleCloseRegisterDialog = () => {
    setRegisterDialogOpen(false);
  };

  const handleRegisterSuccess = () => {
    // 登記成功後關閉對話框並重新載入列表
    setRegisterDialogOpen(false);
    loadQueueList();
    dispatch(
      showAlert({
        message: '候位登記成功！',
        severity: 'success'
      })
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          候位管理
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenRegisterDialog}
            sx={{ mr: 1 }}
          >
            登記候位
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={handleColumnMenuOpen}
            sx={{ mr: 1 }}
          >
            欄位設定
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            sx={{ mr: 1 }}
            disabled={isLoading || localQueueList.length === 0}
          >
            匯出資料
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReorderQueue}
            sx={{ mr: 1 }}
          >
            重新排序
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleClearAllQueue}
            sx={{ mr: 1 }}
            disabled={isLoading}
          >
            清除所有候位
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CallIcon />}
            onClick={handleCallNext}
            disabled={isLoading}
          >
            叫號下一位
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 添加分頁標籤 */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="候位管理分頁">
          <Tab label="候位列表" />
          <Tab label="已取消客戶" />
        </Tabs>
      </Paper>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="h6" component="div">
            {currentTab === 0 ? `目前叫號: ${currentQueue || 0}` : '已取消的客戶列表'}
          </Typography>
        </Box>
        <TableContainer>
          <DragDropContext onDragEnd={currentTab === 0 ? handleDragEnd : () => {}}>
            <Table sx={{ minWidth: 650 }} aria-label="候位列表表格">
              <TableHead>
                <TableRow>
                  {currentTab === 0 && visibleColumns.includes('orderIndex') && <TableCell width="50"></TableCell>}
                  {currentTab === 0 && visibleColumns.includes('orderIndex') && <TableCell width="80">叫號順序</TableCell>}
                  {visibleColumns.includes('queueNumber') && <TableCell>號碼</TableCell>}
                  {visibleColumns.includes('status') && <TableCell>狀態</TableCell>}
                  {visibleColumns.includes('name') && <TableCell>姓名</TableCell>}
                  {visibleColumns.includes('phone') && <TableCell>電話</TableCell>}
                  {visibleColumns.includes('email') && <TableCell>電子郵件</TableCell>}
                  {visibleColumns.includes('totalPeople') && <TableCell>人數</TableCell>}
                  {visibleColumns.includes('gender') && <TableCell>性別</TableCell>}
                  {visibleColumns.includes('birthDate') && <TableCell>出生日期</TableCell>}
                  {visibleColumns.includes('virtualAge') && <TableCell>虛歲</TableCell>}
                  {visibleColumns.includes('address') && <TableCell>地址</TableCell>}
                  {visibleColumns.includes('addressType') && <TableCell>地址類型</TableCell>}
                  {visibleColumns.includes('consultationTopics') && <TableCell>諮詢主題</TableCell>}
                  {visibleColumns.includes('createdAt') && <TableCell>登記時間</TableCell>}
                  {visibleColumns.includes('actions') && (
                    <TableCell 
                      align="center" 
                      width="150"
                      sx={{ 
                        minWidth: 150, 
                        maxWidth: 150,
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 1
                      }}
                    >
                      操作
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              {currentTab === 0 ? (
                <Droppable droppableId="queue-list">
                  {(provided) => (
                    <TableBody 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length + (currentTab === 0 ? 1 : 0)} align="center">
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : localQueueList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length + (currentTab === 0 ? 1 : 0)} align="center">
                            目前沒有候位記錄
                          </TableCell>
                        </TableRow>
                      ) : (
                        localQueueList.map((row, index) => (
                          <Draggable 
                            key={row._id} 
                            draggableId={row._id} 
                            index={index}
                            isDragDisabled={false}
                          >
                            {(provided, snapshot) => (
                              <TableRow
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                sx={{
                                  backgroundColor: snapshot.isDragging ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                  }
                                }}
                              >
                                <TableCell {...provided.dragHandleProps}>
                                  <DragIndicatorIcon color="action" />
                                </TableCell>
                                {visibleColumns.includes('orderIndex') && (
                                  <TableCell>
                                    {renderColumnContent('orderIndex', row, index)}
                                  </TableCell>
                                )}
                                {visibleColumns.includes('queueNumber') && (
                                  <TableCell component="th" scope="row">
                                    {renderColumnContent('queueNumber', row, index)}
                                  </TableCell>
                                )}
                                {visibleColumns.includes('status') && (
                                  <TableCell>{renderColumnContent('status', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('name') && (
                                  <TableCell>{renderColumnContent('name', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('phone') && (
                                  <TableCell>{renderColumnContent('phone', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('email') && (
                                  <TableCell>{renderColumnContent('email', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('totalPeople') && (
                                  <TableCell>{renderColumnContent('totalPeople', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('gender') && (
                                  <TableCell>{renderColumnContent('gender', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('birthDate') && (
                                  <TableCell>{renderColumnContent('birthDate', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('virtualAge') && (
                                  <TableCell>{renderColumnContent('virtualAge', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('address') && (
                                  <TableCell>{renderColumnContent('address', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('addressType') && (
                                  <TableCell>{renderColumnContent('addressType', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('consultationTopics') && (
                                  <TableCell>{renderColumnContent('consultationTopics', row, index)}</TableCell>
                                )}
                                {visibleColumns.includes('createdAt') && (
                                  <TableCell>
                                    {renderColumnContent('createdAt', row, index)}
                                  </TableCell>
                                )}
                                {visibleColumns.includes('actions') && (
                                  <TableCell 
                                    align="center"
                                    width="150"
                                    sx={{ 
                                      minWidth: 150, 
                                      maxWidth: 150,
                                      position: 'sticky',
                                      right: 0,
                                      backgroundColor: 'background.paper',
                                      zIndex: 1
                                    }}
                                  >
                                    {renderColumnContent('actions', row, index)}
                                  </TableCell>
                                )}
                              </TableRow>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              ) : (
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : localQueueList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} align="center">
                        目前沒有已取消的客戶
                      </TableCell>
                    </TableRow>
                  ) : (
                    localQueueList.map((row, index) => (
                      <TableRow key={row._id}>
                        {visibleColumns.includes('queueNumber') && (
                          <TableCell component="th" scope="row">
                            {renderColumnContent('queueNumber', row, index)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('status') && (
                          <TableCell>{renderColumnContent('status', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('name') && (
                          <TableCell>{renderColumnContent('name', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('phone') && (
                          <TableCell>{renderColumnContent('phone', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('email') && (
                          <TableCell>{renderColumnContent('email', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('totalPeople') && (
                          <TableCell>{renderColumnContent('totalPeople', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('gender') && (
                          <TableCell>{renderColumnContent('gender', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('birthDate') && (
                          <TableCell>{renderColumnContent('birthDate', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('virtualAge') && (
                          <TableCell>{renderColumnContent('virtualAge', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('address') && (
                          <TableCell>{renderColumnContent('address', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('addressType') && (
                          <TableCell>{renderColumnContent('addressType', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('consultationTopics') && (
                          <TableCell>{renderColumnContent('consultationTopics', row, index)}</TableCell>
                        )}
                        {visibleColumns.includes('createdAt') && (
                          <TableCell>
                            {renderColumnContent('createdAt', row, index)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('actions') && (
                          <TableCell 
                            align="center"
                            width="150"
                            sx={{ 
                              minWidth: 150, 
                              maxWidth: 150,
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1
                            }}
                          >
                            {renderColumnContent('actions', row, index)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              )}
            </Table>
          </DragDropContext>
        </TableContainer>
      </Paper>

      {/* 詳細資料對話框 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedRecord && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>號碼 {selectedRecord.queueNumber} 的詳細資料</span>
              {!editMode ? (
                <Button 
                  startIcon={<EditIcon />}
                  color="primary"
                  onClick={handleEnterEditMode}
                >
                  編輯資料
                </Button>
              ) : (
                <Button 
                  startIcon={<SaveIcon />}
                  color="success"
                  onClick={handleSaveData}
                >
                  保存資料
                </Button>
              )}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">基本資料</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">姓名</Typography>
                  {!editMode ? (
                    <Typography variant="body1">{selectedRecord.name}</Typography>
                  ) : (
                    <TextField
                      fullWidth
                      name="name"
                      value={editedData.name}
                      onChange={handleInputChange}
                      margin="dense"
                      size="small"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">電話</Typography>
                  {!editMode ? (
                    <Typography variant="body1">{selectedRecord.phone}</Typography>
                  ) : (
                    <TextField
                      fullWidth
                      name="phone"
                      value={editedData.phone}
                      onChange={handleInputChange}
                      margin="dense"
                      size="small"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">電子郵件</Typography>
                  {!editMode ? (
                    <Typography variant="body1">{selectedRecord.email}</Typography>
                  ) : (
                    <TextField
                      fullWidth
                      name="email"
                      value={editedData.email}
                      onChange={handleInputChange}
                      margin="dense"
                      size="small"
                      type="email"
                    />
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="text.secondary">性別</Typography>
                  {!editMode ? (
                    <Typography variant="body1">{selectedRecord.gender === 'male' ? '男' : '女'}</Typography>
                  ) : (
                    <FormControl fullWidth margin="dense" size="small">
                      <InputLabel>性別</InputLabel>
                      <Select
                        name="gender"
                        value={editedData.gender}
                        onChange={handleInputChange}
                        label="性別"
                      >
                        <MenuItem value="male">男</MenuItem>
                        <MenuItem value="female">女</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">出生日期</Typography>
                  {!editMode ? (
                    <Box>
                      {/* 顯示國曆出生日期（民國年） */}
                      {selectedRecord.gregorianBirthYear && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          國曆: 民國{selectedRecord.gregorianBirthYear - 1911}年{selectedRecord.gregorianBirthMonth}月{selectedRecord.gregorianBirthDay}日
                        </Typography>
                      )}
                      {/* 顯示農曆出生日期（民國年） */}
                      {selectedRecord.lunarBirthYear && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          農曆: 民國{selectedRecord.lunarBirthYear - 1911}年{selectedRecord.lunarBirthMonth}月{selectedRecord.lunarBirthDay}日
                          {selectedRecord.lunarIsLeapMonth && ' (閏月)'}
                        </Typography>
                      )}
                      {!selectedRecord.gregorianBirthYear && !selectedRecord.lunarBirthYear && (
                        <Typography variant="body2" color="text.secondary">
                          未設定出生日期
                        </Typography>
                      )}
                      {/* 顯示虛歲 */}
                      {selectedRecord.virtualAge && (
                        <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                          虛歲: {selectedRecord.virtualAge} 歲
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box>
                      {/* 國曆出生日期編輯 */}
                      <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                        國曆出生日期:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          label="國曆年"
                          name="gregorianBirthYear"
                          type="number"
                          value={editedData.gregorianBirthYear}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          sx={{ width: '30%' }}
                        />
                        <TextField
                          label="國曆月"
                          name="gregorianBirthMonth"
                          type="number"
                          value={editedData.gregorianBirthMonth}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          inputProps={{ min: 1, max: 12 }}
                          sx={{ width: '30%' }}
                        />
                        <TextField
                          label="國曆日"
                          name="gregorianBirthDay"
                          type="number"
                          value={editedData.gregorianBirthDay}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          inputProps={{ min: 1, max: 31 }}
                          sx={{ width: '30%' }}
                        />
                      </Box>
                      
                      {/* 農曆出生日期編輯 */}
                      <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                        農曆出生日期:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField
                          label="農曆年"
                          name="lunarBirthYear"
                          type="number"
                          value={editedData.lunarBirthYear}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          sx={{ width: '30%' }}
                        />
                        <TextField
                          label="農曆月"
                          name="lunarBirthMonth"
                          type="number"
                          value={editedData.lunarBirthMonth}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          inputProps={{ min: 1, max: 12 }}
                          sx={{ width: '30%' }}
                        />
                        <TextField
                          label="農曆日"
                          name="lunarBirthDay"
                          type="number"
                          value={editedData.lunarBirthDay}
                          onChange={handleInputChange}
                          margin="dense"
                          size="small"
                          inputProps={{ min: 1, max: 31 }}
                          sx={{ width: '30%' }}
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={editedData.lunarIsLeapMonth || false}
                            onChange={(e) => setEditedData({...editedData, lunarIsLeapMonth: e.target.checked})}
                            name="lunarIsLeapMonth"
                          />
                        }
                        label="農曆閏月"
                      />
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>地址資訊</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                {!editMode ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">地址</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {formatAddresses(selectedRecord.addresses || [{
                        address: selectedRecord.address,
                        addressType: selectedRecord.addressType
                      }])}
                    </Typography>
                  </Grid>
                ) : (
                  <>
                    {editedData.addresses && editedData.addresses.map((address, index) => (
                      <Grid item xs={12} key={index}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">地址 {index + 1}</Typography>
                            {editedData.addresses.length > 1 && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeAddress(index)}
                              >
                                <RemoveIcon />
                              </IconButton>
                            )}
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <FormControl fullWidth margin="dense" size="small">
                                <InputLabel>地址類型</InputLabel>
                                <Select
                                  value={address.addressType}
                                  onChange={(e) => handleAddressChange(index, 'addressType', e.target.value)}
                                  label="地址類型"
                                >
                                  <MenuItem value="home">住家</MenuItem>
                                  <MenuItem value="work">工作場所</MenuItem>
                                  <MenuItem value="hospital">醫院</MenuItem>
                                  <MenuItem value="other">其他</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                              <TextField
                                fullWidth
                                label="地址"
                                value={address.address}
                                onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                                margin="dense"
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    ))}
                    {editedData.addresses && editedData.addresses.length < 3 && (
                      <Grid item xs={12}>
                        <Button
                          startIcon={<AddIcon />}
                          onClick={addAddress}
                          variant="outlined"
                          size="small"
                        >
                          新增地址
                        </Button>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>家庭成員</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                {!editMode ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">家庭成員</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {formatFamilyMembers(selectedRecord.familyMembers)}
                    </Typography>
                  </Grid>
                ) : (
                  <>
                    {editedData.familyMembers && editedData.familyMembers.map((member, index) => (
                      <Grid item xs={12} key={index}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">家庭成員 {index + 1}</Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeFamilyMember(index)}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <TextField
                                fullWidth
                                label="姓名"
                                value={member.name}
                                onChange={(e) => handleFamilyMemberChange(index, 'name', e.target.value)}
                                margin="dense"
                                size="small"
                              />
                            </Grid>
                            <Grid item xs={12} sm={2}>
                              <FormControl component="fieldset" margin="dense" size="small">
                                <FormLabel component="legend">性別</FormLabel>
                                <RadioGroup
                                  row
                                  value={member.gender || 'male'}
                                  onChange={(e) => handleFamilyMemberChange(index, 'gender', e.target.value)}
                                >
                                  <FormControlLabel value="male" control={<Radio size="small" />} label="男" />
                                  <FormControlLabel value="female" control={<Radio size="small" />} label="女" />
                                </RadioGroup>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>出生日期</Typography>

                              {/* 國曆出生日期欄位 */}
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  國曆出生日期
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <TextField
                                    label="年"
                                    type="number"
                                    value={member.gregorianBirthYear || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'gregorianBirthYear', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    sx={{ width: '33%' }}
                                  />
                                  <TextField
                                    label="月"
                                    type="number"
                                    value={member.gregorianBirthMonth || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'gregorianBirthMonth', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    inputProps={{ min: 1, max: 12 }}
                                    sx={{ width: '33%' }}
                                  />
                                  <TextField
                                    label="日"
                                    type="number"
                                    value={member.gregorianBirthDay || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'gregorianBirthDay', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    inputProps={{ min: 1, max: 31 }}
                                    sx={{ width: '33%' }}
                                  />
                                </Box>
                              </Box>

                              {/* 農曆出生日期欄位 */}
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  農曆出生日期
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                  <TextField
                                    label="年"
                                    type="number"
                                    value={member.lunarBirthYear || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'lunarBirthYear', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    sx={{ width: '33%' }}
                                  />
                                  <TextField
                                    label="月"
                                    type="number"
                                    value={member.lunarBirthMonth || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'lunarBirthMonth', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    inputProps={{ min: 1, max: 12 }}
                                    sx={{ width: '33%' }}
                                  />
                                  <TextField
                                    label="日"
                                    type="number"
                                    value={member.lunarBirthDay || ''}
                                    onChange={(e) => handleFamilyMemberChange(index, 'lunarBirthDay', e.target.value)}
                                    margin="dense"
                                    size="small"
                                    inputProps={{ min: 1, max: 30 }}
                                    sx={{ width: '33%' }}
                                  />
                                </Box>
                                <FormControlLabel
                                  control={
                                    <MuiCheckbox
                                      checked={member.lunarIsLeapMonth || false}
                                      onChange={(e) => handleFamilyMemberChange(index, 'lunarIsLeapMonth', e.target.checked)}
                                      size="small"
                                    />
                                  }
                                  label="閏月"
                                  sx={{ ml: 0 }}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <FormControl fullWidth margin="dense" size="small">
                                <InputLabel>地址類型</InputLabel>
                                <Select
                                  value={member.addressType}
                                  onChange={(e) => handleFamilyMemberChange(index, 'addressType', e.target.value)}
                                  label="地址類型"
                                >
                                  <MenuItem value="home">住家</MenuItem>
                                  <MenuItem value="work">工作場所</MenuItem>
                                  <MenuItem value="hospital">醫院</MenuItem>
                                  <MenuItem value="other">其他</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                              <TextField
                                fullWidth
                                label="地址"
                                value={member.address}
                                onChange={(e) => handleFamilyMemberChange(index, 'address', e.target.value)}
                                margin="dense"
                                size="small"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    ))}
                    {editedData.familyMembers && editedData.familyMembers.length < 5 && (
                      <Grid item xs={12}>
                        <Button
                          startIcon={<AddIcon />}
                          onClick={addFamilyMember}
                          variant="outlined"
                          size="small"
                        >
                          新增家庭成員
                        </Button>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>諮詢資訊</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">諮詢主題</Typography>
                  {!editMode ? (
                    <Typography variant="body1">{formatConsultationTopics(selectedRecord.consultationTopics, selectedRecord.otherDetails)}</Typography>
                  ) : (
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('body')}
                            onChange={() => handleTopicChange('body')}
                          />
                        }
                        label="身體"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('fate')}
                            onChange={() => handleTopicChange('fate')}
                          />
                        }
                        label="運途"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('karma')}
                            onChange={() => handleTopicChange('karma')}
                          />
                        }
                        label="因果"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('family')}
                            onChange={() => handleTopicChange('family')}
                          />
                        }
                        label="家運/祖先"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('career')}
                            onChange={() => handleTopicChange('career')}
                          />
                        }
                        label="事業"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('relationship')}
                            onChange={() => handleTopicChange('relationship')}
                          />
                        }
                        label="婚姻感情"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('study')}
                            onChange={() => handleTopicChange('study')}
                          />
                        }
                        label="學業"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('blessing')}
                            onChange={() => handleTopicChange('blessing')}
                          />
                        }
                        label="收驚/加持"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={editedData.consultationTopics.includes('other')}
                            onChange={() => handleTopicChange('other')}
                          />
                        }
                        label="其他"
                      />
                    </FormGroup>
                  )}
                </Grid>

                {/* 其他詳細內容 - 只在編輯模式且選擇了"其他"時顯示 */}
                {editMode && editedData.consultationTopics.includes('other') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="其他詳細內容"
                      multiline
                      rows={3}
                      value={editedData.otherDetails || ''}
                      onChange={(e) => setEditedData({ ...editedData, otherDetails: e.target.value })}
                      placeholder="請詳細描述其他問題..."
                      inputProps={{ maxLength: 500 }}
                      helperText="最多500字"
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>候位狀態</Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">號碼</Typography>
                  <Typography variant="body1">{selectedRecord.queueNumber}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                                          <Typography variant="body2" color="text.secondary">目前叫號順序</Typography>
                  <Typography variant="body1">{selectedRecord.orderIndex || '無'}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">候位狀態</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusChip(selectedRecord.status, selectedRecord.orderIndex || 0)}</Box>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="text.secondary">登記時間</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedRecord.createdAt), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                  </Typography>
                </Grid>
                {selectedRecord.completedAt && (
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">完成時間</Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedRecord.completedAt), 'yyyy/MM/dd HH:mm:ss', { locale: zhTW })}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              {editMode ? (
                <>
                  <Button onClick={() => setEditMode(false)} color="inherit">取消編輯</Button>
                  <Button onClick={handleSaveData} color="success">保存資料</Button>
                </>
              ) : (
                <>
                  <Button onClick={handleCloseDialog}>關閉</Button>
                  <Button 
                    onClick={handleEnterEditMode}
                    color="primary"
                  >
                    編輯資料
                  </Button>
                  {(selectedRecord.status === 'waiting' || selectedRecord.status === 'processing') && (
                    <>
                      <Button 
                        onClick={() => {
                          handleCompleteFromDialog(selectedRecord._id);
                          handleCloseDialog();
                        }}
                        color="success"
                      >
                        標記為已完成
                      </Button>
                      <Button 
                        onClick={() => {
                          handleUpdateStatus(selectedRecord._id, 'cancelled');
                          handleCloseDialog();
                        }}
                        color="warning"
                      >
                        標記為已取消
                      </Button>
                    </>
                  )}
                  <Button 
                    onClick={() => {
                      handleDeleteCustomer(selectedRecord._id, selectedRecord.name);
                    }}
                    color="error"
                    variant="outlined"
                  >
                    刪除客戶
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 確認對話框 */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography id="confirm-dialog-description">
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            取消
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 匯出對話框 */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={handleCloseExportDialog}
        customers={localQueueList}
      />

      {/* 欄位選擇器 */}
      <Popover
        open={columnMenuOpen}
        anchorEl={columnMenuAnchor}
        onClose={handleColumnMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Card sx={{ minWidth: 300, maxWidth: 400 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">欄位顯示設定</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleResetColumns}
                startIcon={<SettingsIcon />}
              >
                重置預設
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              請選擇要在表格中顯示的欄位：
            </Typography>
            <FormGroup>
              {Object.entries(AVAILABLE_COLUMNS).map(([key, config]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={visibleColumns.includes(key)}
                      onChange={() => handleColumnToggle(key)}
                      disabled={config.alwaysVisible}
                    />
                  }
                  label={config.label}
                />
              ))}
            </FormGroup>
            <Alert severity="info" sx={{ mt: 2 }}>
              您的設定會自動保存，下次登入時仍會保持相同的欄位配置。
            </Alert>
          </CardContent>
        </Card>
      </Popover>

      {/* 登記候位對話框 */}
      <Dialog
        open={registerDialogOpen}
        onClose={handleCloseRegisterDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          登記候位
        </DialogTitle>
        <DialogContent dividers>
          <RegisterForm onSuccess={handleRegisterSuccess} isDialog={true} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRegisterDialog}>
            取消
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboardPage; 