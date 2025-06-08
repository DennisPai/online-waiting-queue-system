import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  IconButton
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  FormatListNumbered as FormatListNumberedIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import {
  getQueueNumberStatus,
  searchQueueByNameAndPhone,
  clearQueueSearch,
  getQueueStatus
} from '../redux/slices/queueSlice';
import { showAlert } from '../redux/slices/uiSlice';
import socketService from '../services/socketService';
import { 
  autoFillDates, 
  autoFillFamilyMembersDates, 
  formatMinguoYear, 
  formatMinguoDate,
  autoConvertToMinguo,
  convertMinguoForStorage
} from '../utils/calendarConverter';

const StatusPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { queueNumber: paramQueueNumber } = useParams();
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const { currentQueueStatus, queueStatus, isLoading, error } = useSelector((state) => state.queue);
  
  // 詳細資料對話框狀態
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    record: null,
    mode: 'view' // 'view', 'edit'
  });
  
  // 確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });
  
  // 編輯資料狀態
  const [editData, setEditData] = useState({});

  // 獲取系統設定以獲取每位客戶預估處理時間
  useEffect(() => {
    dispatch(getQueueStatus());
  }, [dispatch]);

  // 格式化時間顯示（包含上下午）
  const formatTimeWithAmPm = (date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // 組件初始化時清除錯誤狀態和查詢結果
  useEffect(() => {
    dispatch(clearQueueSearch());
  }, [dispatch]);

  // 初始化頁面，如果URL中有候位號碼，則查詢該號碼的狀態
  useEffect(() => {
    if (paramQueueNumber && paramQueueNumber !== 'search') {
      dispatch(getQueueNumberStatus(paramQueueNumber));
      
      // 訂閱該候位號碼的實時更新
      socketService.subscribeToQueueNumber(paramQueueNumber);
    }
    
    return () => {
      // 清除Socket監聽器
      socketService.clearListeners();
    };
  }, [dispatch, paramQueueNumber]);

  const handleSearch = () => {
    if (!searchName.trim() || !searchPhone.trim()) {
      dispatch(showAlert({
        message: '請輸入姓名和電話',
        severity: 'warning'
      }));
      return;
    }
    
    dispatch(searchQueueByNameAndPhone({ name: searchName, phone: searchPhone }));
  };

  // 顯示詳細資料
  const handleShowDetails = (record) => {
    setDetailsDialog({
      open: true,
      record: record,
      mode: 'view'
    });
    // 初始化編輯資料，確保地址和家人資料結構正確
    setEditData({
      ...record,
      addresses: record.addresses || [],
      familyMembers: record.familyMembers || [],
      consultationTopics: record.consultationTopics || []
    });
  };

  // 取消預約
  const handleCancelQueue = (record) => {
    setConfirmDialog({
      open: true,
      title: '確認取消預約',
      message: `確定要取消候位號碼 ${record.queueNumber} 的預約嗎？此操作無法復原。`,
      onConfirm: () => confirmCancelQueue(record)
    });
  };

  const confirmCancelQueue = async (record) => {
    try {
      const response = await fetch('/api/queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueNumber: record.queueNumber,
          name: record.name,
          phone: record.phone
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch(showAlert({
          message: '預約取消成功',
          severity: 'success'
        }));
        setDetailsDialog({ open: false, record: null, mode: 'view' });
        // 重新查詢狀態
        dispatch(searchQueueByNameAndPhone({ name: record.name, phone: record.phone }));
      } else {
        dispatch(showAlert({
          message: data.message || '取消預約失敗',
          severity: 'error'
        }));
      }
    } catch (error) {
      dispatch(showAlert({
        message: '取消預約時發生錯誤',
        severity: 'error'
      }));
    }
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
  };

  // 修改資料
  const handleEditData = () => {
    setDetailsDialog(prev => ({ ...prev, mode: 'edit' }));
  };

  const handleSaveData = async () => {
    try {
      // 在保存前進行日期自動轉換
      let processedData = autoFillDates(editData);
      
      // 處理家人資料的日期轉換
      if (processedData.familyMembers && processedData.familyMembers.length > 0) {
        processedData.familyMembers = autoFillFamilyMembersDates(processedData.familyMembers);
      }
      
      const response = await fetch('/api/queue/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueNumber: detailsDialog.record.queueNumber,
          name: detailsDialog.record.name,
          phone: detailsDialog.record.phone,
          ...processedData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch(showAlert({
          message: '資料修改成功',
          severity: 'success'
        }));
        setDetailsDialog({ open: false, record: null, mode: 'view' });
        // 重新查詢狀態
        dispatch(searchQueueByNameAndPhone({ name: editData.name, phone: editData.phone }));
      } else {
        dispatch(showAlert({
          message: data.message || '修改資料失敗',
          severity: 'error'
        }));
      }
    } catch (error) {
      dispatch(showAlert({
        message: '修改資料時發生錯誤',
        severity: 'error'
      }));
    }
  };

  // 處理地址變更
  const handleAddressChange = (index, field, value) => {
    const newAddresses = [...editData.addresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value
    };
    setEditData({
      ...editData,
      addresses: newAddresses
    });
  };

  // 新增地址
  const addAddress = () => {
    if (editData.addresses.length < 3) {
      setEditData({
        ...editData,
        addresses: [...editData.addresses, { address: '', addressType: 'home' }]
      });
    }
  };

  // 移除地址
  const removeAddress = (index) => {
    if (editData.addresses.length > 1) {
      const newAddresses = editData.addresses.filter((_, i) => i !== index);
      setEditData({
        ...editData,
        addresses: newAddresses
      });
    }
  };

  // 處理家庭成員變更
  const handleFamilyMemberChange = (index, field, value) => {
    const newFamilyMembers = [...editData.familyMembers];
    newFamilyMembers[index] = {
      ...newFamilyMembers[index],
      [field]: value
    };



    setEditData({
      ...editData,
      familyMembers: newFamilyMembers
    });
  };

  // 新增家庭成員
  const addFamilyMember = () => {
    if (editData.familyMembers.length < 5) {
      setEditData({
        ...editData,
        familyMembers: [
          ...editData.familyMembers,
          {
            name: '',
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
          }
        ]
      });
    }
  };

  // 移除家庭成員
  const removeFamilyMember = (index) => {
    const newFamilyMembers = editData.familyMembers.filter((_, i) => i !== index);
    setEditData({
      ...editData,
      familyMembers: newFamilyMembers
    });
  };

  // 處理諮詢主題變更
  const handleTopicChange = (topic) => {
    const currentTopics = [...(editData.consultationTopics || [])];
    const topicIndex = currentTopics.indexOf(topic);
    
    if (topicIndex === -1) {
      currentTopics.push(topic);
    } else {
      currentTopics.splice(topicIndex, 1);
    }
    
    setEditData({
      ...editData,
      consultationTopics: currentTopics
    });
  };

  // 格式化諮詢主題顯示
  const formatConsultationTopics = (topics) => {
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
    
    return topics?.map(topic => topicMap[topic] || topic).join('、') || '無';
  };

  // 根據不同狀態顯示對應顏色和圖標
  const getStatusInfo = (status) => {
    switch (status) {
      case 'waiting':
        return {
          color: 'info',
          icon: <HourglassEmptyIcon />,
          text: '等待中'
        };
      case 'processing':
        return {
          color: 'warning',
          icon: <AccessTimeIcon />,
          text: '處理中'
        };
      case 'completed':
        return {
          color: 'success',
          icon: <CheckCircleIcon />,
          text: '已完成'
        };
      case 'cancelled':
        return {
          color: 'error',
          icon: <CancelIcon />,
          text: '已取消'
        };
      default:
        return {
          color: 'default',
          icon: <FormatListNumberedIcon />,
          text: '未知'
        };
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom align="center">
        候位狀態查詢
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="姓名"
                variant="outlined"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="請輸入您的姓名"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="電話"
                variant="outlined"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="請輸入您的電話"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                disabled={isLoading}
                size="large"
                fullWidth
                startIcon={<SearchIcon />}
              >
                查詢候位狀態
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!isLoading && currentQueueStatus && (
        <>
          {Array.isArray(currentQueueStatus) ? (
            // 顯示多筆記錄
            <>
              <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                找到 {currentQueueStatus.length} 筆候位記錄
              </Typography>
              {currentQueueStatus.map((record, index) => (
                <Card key={record.queueNumber} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" component="div">
                        候位號碼: 
                      </Typography>
                      <Typography variant="h4" color="primary" component="div" sx={{ ml: 2, fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {record.queueNumber}
                      </Typography>
                      <Box sx={{ ml: 'auto' }}>
                        {record.status && (
                          <Chip
                            icon={getStatusInfo(record.status).icon}
                            label={getStatusInfo(record.status).text}
                            color={getStatusInfo(record.status).color}
                            variant="filled"
                            size="medium"
                          />
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body1" paragraph>
                      {record.statusMessage}
                    </Typography>

                    <Grid container spacing={3} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          目前叫號
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                          {record.currentQueueNumber || 0}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          前面還有人數
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                          {record.peopleAhead || 0} 人
                        </Typography>
                      </Grid>
                      {record.status === 'waiting' && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            預估開始時間
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                            {record.estimatedStartTime ? 
                              formatTimeWithAmPm(new Date(record.estimatedStartTime)) : 
                              '無法計算'}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12} sm={6}>
                        <Button
                          variant="outlined"
                          color="primary"
                          fullWidth
                          onClick={() => handleShowDetails(record)}
                          sx={{ height: '56px' }}
                        >
                          查看詳細資料
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            // 顯示單筆記錄（保持向後兼容）
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="div">
                    候位號碼: 
                  </Typography>
                  <Typography variant="h4" color="primary" component="div" sx={{ ml: 2, fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                    {currentQueueStatus.queueNumber}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    {currentQueueStatus.status && (
                      <Chip
                        icon={getStatusInfo(currentQueueStatus.status).icon}
                        label={getStatusInfo(currentQueueStatus.status).text}
                        color={getStatusInfo(currentQueueStatus.status).color}
                        variant="filled"
                        size="medium"
                      />
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body1" paragraph>
                  {currentQueueStatus.statusMessage}
                </Typography>

                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      目前叫號
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                      {currentQueueStatus.currentQueueNumber || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      前面還有人數
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                      {currentQueueStatus.peopleAhead || 0} 人
                    </Typography>
                  </Grid>
                  {currentQueueStatus.status === 'waiting' && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        預估開始時間
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.375rem', md: '1.5rem' } }}>
                        {currentQueueStatus.estimatedStartTime ? 
                          formatTimeWithAmPm(new Date(currentQueueStatus.estimatedStartTime)) : 
                          '無法計算'}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={() => handleShowDetails(currentQueueStatus)}
                      sx={{ height: '56px' }}
                    >
                      查看詳細資料
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isLoading && paramQueueNumber === 'search' && !currentQueueStatus && !error && (
        <Box sx={{ textAlign: 'center', my: 4 }}>
          <Typography variant="body1" color="text.secondary">
            請輸入您的姓名和電話進行查詢
          </Typography>
        </Box>
      )}

      {!isLoading && error && (
        <Box sx={{ textAlign: 'center', my: 4, p: 2, border: '1px solid #f44336', borderRadius: 1 }}>
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            dispatch(clearQueueSearch());
            navigate('/');
          }}
        >
          返回首頁
        </Button>
      </Box>

      {/* 詳細資料對話框 */}
      <Dialog 
        open={detailsDialog.open} 
        onClose={() => setDetailsDialog({ open: false, record: null, mode: 'view' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1 }} />
              候位號碼 {detailsDialog.record?.queueNumber} 詳細資料
            </Box>
            <Button
              onClick={() => setDetailsDialog({ open: false, record: null, mode: 'view' })}
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {detailsDialog.record && (
            <Grid container spacing={2}>
              {/* 基本資料 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary">
                  基本資料
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="姓名"
                  value={detailsDialog.mode === 'edit' ? editData.name || '' : detailsDialog.record.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  disabled={detailsDialog.mode === 'view'}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="電話"
                  value={detailsDialog.mode === 'edit' ? editData.phone || '' : detailsDialog.record.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  disabled={detailsDialog.mode === 'view'}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="電子郵件"
                  value={detailsDialog.mode === 'edit' ? editData.email || '' : detailsDialog.record.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  disabled={detailsDialog.mode === 'view'}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={detailsDialog.mode === 'view'}>
                  <InputLabel>性別</InputLabel>
                  <Select
                    value={detailsDialog.mode === 'edit' ? editData.gender || '' : detailsDialog.record.gender || ''}
                    onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                    label="性別"
                  >
                    <MenuItem value="male">男</MenuItem>
                    <MenuItem value="female">女</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 出生資料 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  出生資料
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

              {detailsDialog.mode === 'view' ? (
                <Grid item xs={12}>
                  {(() => {
                    const record = detailsDialog.record;
                    const hasGregorian = record.gregorianBirthYear && record.gregorianBirthMonth && record.gregorianBirthDay;
                    const hasLunar = record.lunarBirthYear && record.lunarBirthMonth && record.lunarBirthDay;
                    
                    if (!hasGregorian && !hasLunar) {
                      return (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          出生日期：出生日期未設定
                        </Typography>
                      );
                    }
                    
                    return (
                      <>
                        {hasGregorian && (
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            國曆出生日期：{formatMinguoDate(record.gregorianBirthYear, record.gregorianBirthMonth, record.gregorianBirthDay)}
                          </Typography>
                        )}
                        {hasLunar && (
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            農曆出生日期：{formatMinguoDate(record.lunarBirthYear, record.lunarBirthMonth, record.lunarBirthDay)}{record.lunarIsLeapMonth ? ' (閏月)' : ''}
                          </Typography>
                        )}
                      </>
                    );
                  })()}
                  {detailsDialog.record.virtualAge && (
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                      虛歲：{detailsDialog.record.virtualAge} 歲
                    </Typography>
                  )}
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>出生日期設定</Typography>
                  
                  {/* 國曆出生日期欄位 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      國曆出生日期
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        label="年"
                        type="number"
                        value={editData.gregorianBirthYear || ''}
                        onChange={(e) => setEditData({ ...editData, gregorianBirthYear: e.target.value })}
                        size="small"
                        sx={{ width: '33%' }}
                      />
                      <TextField
                        label="月"
                        type="number"
                        value={editData.gregorianBirthMonth || ''}
                        onChange={(e) => setEditData({ ...editData, gregorianBirthMonth: e.target.value })}
                        size="small"
                        inputProps={{ min: 1, max: 12 }}
                        sx={{ width: '33%' }}
                      />
                      <TextField
                        label="日"
                        type="number"
                        value={editData.gregorianBirthDay || ''}
                        onChange={(e) => setEditData({ ...editData, gregorianBirthDay: e.target.value })}
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
                        value={editData.lunarBirthYear || ''}
                        onChange={(e) => setEditData({ ...editData, lunarBirthYear: e.target.value })}
                        size="small"
                        sx={{ width: '33%' }}
                      />
                      <TextField
                        label="月"
                        type="number"
                        value={editData.lunarBirthMonth || ''}
                        onChange={(e) => setEditData({ ...editData, lunarBirthMonth: e.target.value })}
                        size="small"
                        inputProps={{ min: 1, max: 12 }}
                        sx={{ width: '33%' }}
                      />
                      <TextField
                        label="日"
                        type="number"
                        value={editData.lunarBirthDay || ''}
                        onChange={(e) => setEditData({ ...editData, lunarBirthDay: e.target.value })}
                        size="small"
                        inputProps={{ min: 1, max: 30 }}
                        sx={{ width: '33%' }}
                      />
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={editData.lunarIsLeapMonth || false}
                          onChange={(e) => setEditData({ ...editData, lunarIsLeapMonth: e.target.checked })}
                          size="small"
                        />
                      }
                      label="閏月"
                      sx={{ ml: 0 }}
                    />
                  </Box>
                </Grid>
              )}

              {/* 諮詢主題 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  諮詢主題
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {detailsDialog.mode === 'view' ? (
                  <Typography variant="body1">
                    {formatConsultationTopics(detailsDialog.record.consultationTopics)}
                  </Typography>
                ) : (
                  <FormGroup row>
                    {['身體', '運途', '因果', '家運/祖先', '事業', '婚姻感情', '學業', '收驚/加持', '其他'].map((topicLabel) => {
                      const topicValue = {
                        '身體': 'body',
                        '運途': 'fate',
                        '因果': 'karma',
                        '家運/祖先': 'family',
                        '事業': 'career',
                        '婚姻感情': 'relationship',
                        '學業': 'study',
                        '收驚/加持': 'blessing',
                        '其他': 'other'
                      }[topicLabel];
                      
                      return (
                        <FormControlLabel
                          key={topicValue}
                          control={
                            <Checkbox
                              checked={(editData.consultationTopics || []).includes(topicValue)}
                              onChange={() => handleTopicChange(topicValue)}
                            />
                          }
                          label={topicLabel}
                        />
                      );
                    })}
                  </FormGroup>
                )}
              </Grid>

              {/* 地址資訊 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  地址資訊
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              {detailsDialog.mode === 'view' ? (
                <Grid item xs={12}>
                  {(detailsDialog.record.addresses || []).map((addr, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        地址 {index + 1} ({addr.addressType === 'home' ? '住家' : 
                                      addr.addressType === 'work' ? '工作場所' : 
                                      addr.addressType === 'hospital' ? '醫院' : '其他'})
                      </Typography>
                      <Typography variant="body1">{addr.address}</Typography>
                    </Box>
                  ))}
                </Grid>
              ) : (
                <>
                  {(editData.addresses || []).map((address, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="subtitle2">地址 {index + 1}</Typography>
                          {editData.addresses.length > 1 && (
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
                            <FormControl fullWidth>
                              <InputLabel>地址類型</InputLabel>
                              <Select
                                value={address.addressType || 'home'}
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
                              value={address.address || ''}
                              onChange={(e) => handleAddressChange(index, 'address', e.target.value)}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  ))}
                  {editData.addresses && editData.addresses.length < 3 && (
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

              {/* 家人資訊 */}
              {((detailsDialog.mode === 'view' && detailsDialog.record.familyMembers && detailsDialog.record.familyMembers.length > 0) || 
                (detailsDialog.mode === 'edit')) && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      家人資訊
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  
                  {detailsDialog.mode === 'view' ? (
                    <Grid item xs={12}>
                      {(detailsDialog.record.familyMembers || []).map((member, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            家人 {index + 1}
                          </Typography>
                          <Typography variant="body2">
                            姓名：{member.name}
                          </Typography>
                          <Typography variant="body2">
                            生日：{(() => {
                              // 顯示國曆或農曆出生日期（使用民國年）
                              if (member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay) {
                                return `${formatMinguoDate(member.gregorianBirthYear, member.gregorianBirthMonth, member.gregorianBirthDay)} (國曆)`;
                              } else if (member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay) {
                                const leapText = member.lunarIsLeapMonth ? ' 閏月' : '';
                                return `${formatMinguoDate(member.lunarBirthYear, member.lunarBirthMonth, member.lunarBirthDay)} (農曆${leapText})`;
                              } else {
                                return '出生日期未設定';
                              }
                            })()}
                          </Typography>
                          {member.virtualAge && (
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                              虛歲：{member.virtualAge} 歲
                            </Typography>
                          )}
                          <Typography variant="body2">
                            地址：{member.address} 
                            ({member.addressType === 'home' ? '住家' : 
                              member.addressType === 'work' ? '工作場所' : 
                              member.addressType === 'hospital' ? '醫院' : '其他'})
                          </Typography>
                        </Box>
                      ))}
                    </Grid>
                  ) : (
                    <>
                      {(editData.familyMembers || []).map((member, index) => (
                        <Grid item xs={12} key={index}>
                          <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="subtitle2">家人 {index + 1}</Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeFamilyMember(index)}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </Box>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="姓名"
                                  value={member.name || ''}
                                  onChange={(e) => handleFamilyMemberChange(index, 'name', e.target.value)}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>出生日期設定</Typography>
                                
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
                                      size="small"
                                      sx={{ width: '33%' }}
                                    />
                                    <TextField
                                      label="月"
                                      type="number"
                                      value={member.gregorianBirthMonth || ''}
                                      onChange={(e) => handleFamilyMemberChange(index, 'gregorianBirthMonth', e.target.value)}
                                      size="small"
                                      inputProps={{ min: 1, max: 12 }}
                                      sx={{ width: '33%' }}
                                    />
                                    <TextField
                                      label="日"
                                      type="number"
                                      value={member.gregorianBirthDay || ''}
                                      onChange={(e) => handleFamilyMemberChange(index, 'gregorianBirthDay', e.target.value)}
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
                                      size="small"
                                      sx={{ width: '33%' }}
                                    />
                                    <TextField
                                      label="月"
                                      type="number"
                                      value={member.lunarBirthMonth || ''}
                                      onChange={(e) => handleFamilyMemberChange(index, 'lunarBirthMonth', e.target.value)}
                                      size="small"
                                      inputProps={{ min: 1, max: 12 }}
                                      sx={{ width: '33%' }}
                                    />
                                    <TextField
                                      label="日"
                                      type="number"
                                      value={member.lunarBirthDay || ''}
                                      onChange={(e) => handleFamilyMemberChange(index, 'lunarBirthDay', e.target.value)}
                                      size="small"
                                      inputProps={{ min: 1, max: 30 }}
                                      sx={{ width: '33%' }}
                                    />
                                  </Box>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
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
                                <FormControl fullWidth>
                                  <InputLabel>地址類型</InputLabel>
                                  <Select
                                    value={member.addressType || 'home'}
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
                                  value={member.address || ''}
                                  onChange={(e) => handleFamilyMemberChange(index, 'address', e.target.value)}
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>
                      ))}
                      {editData.familyMembers && editData.familyMembers.length < 5 && (
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
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {detailsDialog.mode === 'view' ? (
            <>
              {['waiting', 'processing'].includes(detailsDialog.record?.status) && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleCancelQueue(detailsDialog.record)}
                  >
                    取消預約
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={handleEditData}
                  >
                    修改資料
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailsDialog({ open: false, record: null, mode: 'view' })}>
                關閉
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => setDetailsDialog(prev => ({ ...prev, mode: 'view' }))}
              >
                取消編輯
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSaveData}
              >
                儲存修改
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* 確認對話框 */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}
          >
            取消
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={confirmDialog.onConfirm}
          >
            確認
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StatusPage; 