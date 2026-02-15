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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  FormatListNumbered as FormatListNumberedIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  getQueueNumberStatus,
  searchQueueByNameAndPhone,
  clearQueueSearch,
  getQueueStatus
} from '../redux/slices/queueSlice';
import { showAlert } from '../redux/slices/uiSlice';
import socketService from '../services/socketService';
import { API_ENDPOINTS } from '../config/api';
import { 
  formatMinguoDate
} from '../utils/calendarConverter';

const StatusPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { queueNumber: paramQueueNumber } = useParams();
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const { currentQueueStatus, queueStatus, isLoading, error } = useSelector((state) => state.queue);
  const showQueueNumber = queueStatus?.showQueueNumberInQuery !== false;
  
  // 詳細資料對話框狀態
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    record: null
  });
  
  // 確認對話框狀態
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null
  });

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
    // 檢查是否至少輸入其中一個條件
    if (!searchName.trim() && !searchPhone.trim()) {
      dispatch(showAlert({
        message: '請輸入姓名或電話其中一個進行查詢',
        severity: 'warning'
      }));
      return;
    }
    
    // 執行搜尋，支持姓名、電話或兩者同時查詢
    dispatch(searchQueueByNameAndPhone({ 
      name: searchName.trim() || undefined, 
      phone: searchPhone.trim() || undefined 
    }));
  };

  // 顯示詳細資料
  const handleShowDetails = (record) => {
    setDetailsDialog({
      open: true,
      record: record
    });
  };

  // 取消預約
  const handleCancelQueue = (record) => {
    setConfirmDialog({
      open: true,
      title: '確認取消預約',
      message: `確定要取消編號 ${record.queueNumber} 的預約嗎？此操作無法復原。`,
      onConfirm: () => confirmCancelQueue(record)
    });
  };

  const confirmCancelQueue = async (record) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.QUEUE}/cancel`, {
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
        // 重新查詢狀態以更新顯示
        if (searchName || searchPhone) {
          dispatch(searchQueueByNameAndPhone({ 
            name: searchName.trim() || undefined, 
            phone: searchPhone.trim() || undefined 
          }));
        }
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


  // 格式化諮詢主題顯示
  const formatConsultationTopics = (topics, otherDetails = '') => {
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
    
    if (!topics || topics.length === 0) return '無';
    
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            請輸入姓名或電話其中一個進行查詢（姓名查詢包含家人姓名）
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="姓名（選填）"
                variant="outlined"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="請輸入您或家人的姓名"
                helperText="可查詢本人或家人姓名"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="電話（選填）"
                variant="outlined"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="請輸入您的電話號碼"
                helperText="請輸入登記時的電話"
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
                      {showQueueNumber && (
                        <>
                          <Typography variant="h5" component="div">
                            編號: 
                          </Typography>
                          <Typography variant="h4" color="primary" component="div" sx={{ ml: 2, fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                            {record.queueNumber}
                          </Typography>
                        </>
                      )}
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

                    {record.status === 'waiting' ? (
                      <>
                        <Typography variant="body1" paragraph>
                          您已報名成功，問事號碼會在接近{' '}
                          {queueStatus?.nextSessionDate 
                            ? new Date(queueStatus.nextSessionDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '開科辦事日'}{' '}
                          時公布。
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            color="primary"
                            fullWidth
                            onClick={() => handleShowDetails(record)}
                            sx={{ height: '56px' }}
                          >
                            查看詳細資料
                          </Button>
                        </Box>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            // 顯示單筆記錄（保持向後兼容）
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {showQueueNumber && (
                    <>
                      <Typography variant="h5" component="div">
                        編號: 
                      </Typography>
                      <Typography variant="h4" color="primary" component="div" sx={{ ml: 2, fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {currentQueueStatus.queueNumber}
                      </Typography>
                    </>
                  )}
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

                {currentQueueStatus.status === 'waiting' ? (
                  <>
                    <Typography variant="body1" paragraph>
                      您已報名成功，問事號碼會在接近{' '}
                      {queueStatus?.nextSessionDate 
                        ? new Date(queueStatus.nextSessionDate).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '開科辦事日'}{' '}
                      時公布。
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        onClick={() => handleShowDetails(currentQueueStatus)}
                        sx={{ height: '56px' }}
                      >
                        查看詳細資料
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
              編號 {detailsDialog.record?.queueNumber} 詳細資料
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
                <Typography variant="body2" color="text.secondary">姓名</Typography>
                <Typography variant="body1">{detailsDialog.record.name || '未提供'}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">電話</Typography>
                <Typography variant="body1">{detailsDialog.record.phone || '未提供'}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">電子郵件</Typography>
                <Typography variant="body1">{detailsDialog.record.email || '未提供'}</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">性別</Typography>
                <Typography variant="body1">{detailsDialog.record.gender === 'male' ? '男' : detailsDialog.record.gender === 'female' ? '女' : '未設定'}</Typography>
              </Grid>

              {/* 出生資料 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  出生資料
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>

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

              {/* 諮詢主題 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  諮詢主題
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {formatConsultationTopics(detailsDialog.record.consultationTopics, detailsDialog.record.otherDetails)}
                </Typography>
              </Grid>

              {/* 備註欄位 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  其他備註
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">備註</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {detailsDialog.record.remarks || '無'}
                </Typography>
              </Grid>

              {/* 地址資訊 */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                  地址資訊
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12}>
                {(detailsDialog.record.addresses || []).length > 0 ? (
                  (detailsDialog.record.addresses || []).map((addr, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        地址 {index + 1} ({addr.addressType === 'home' ? '住家' : 
                                      addr.addressType === 'work' ? '工作場所' : 
                                      addr.addressType === 'hospital' ? '醫院' : '其他'})
                      </Typography>
                      <Typography variant="body1">{addr.address}</Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body1">無地址資訊</Typography>
                )}
              </Grid>

              {/* 家人資訊 */}
              {detailsDialog.record.familyMembers && detailsDialog.record.familyMembers.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                      家人資訊
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>
                  
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
                          性別：{member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '未設定'}
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
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {['waiting', 'processing'].includes(detailsDialog.record?.status) && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleCancelQueue(detailsDialog.record)}
            >
              取消預約
            </Button>
          )}
          <Button onClick={() => setDetailsDialog({ open: false, record: null })}>
            關閉
          </Button>
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