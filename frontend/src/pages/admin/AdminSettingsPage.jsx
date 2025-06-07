import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { zhTW } from 'date-fns/locale';
import {
  toggleQueueStatus,
  setNextSessionDate,
  getQueueStatus,
  setMaxQueueNumber,
  setMinutesPerCustomer
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';
import logger from '../../utils/logger';

const AdminSettingsPage = () => {
  const dispatch = useDispatch();
  const { queueStatus, isLoading, error } = useSelector((state) => state.queue);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [nextSessionDate, setNextSessionDate] = useState(null);
  const [maxQueueNumber, setMaxQueueNumberLocal] = useState(100);
  const [minutesPerCustomer, setMinutesPerCustomerLocal] = useState(13);

  // 加載系統設置
  useEffect(() => {
    logger.info('AdminSettingsPage 組件已掛載，開始載入系統設定', null, 'AdminSettingsPage');
    
    dispatch(getQueueStatus())
      .unwrap()
      .then((result) => {
        logger.info('系統設定載入成功', {
          isOpen: result.isOpen,
          nextSessionDate: result.nextSessionDate,
          maxQueueNumber: result.maxQueueNumber,
          minutesPerCustomer: result.minutesPerCustomer
        }, 'AdminSettingsPage');
        
        setIsQueueOpen(result.isOpen);
        if (result.nextSessionDate) {
          setNextSessionDate(new Date(result.nextSessionDate));
        }
        if (result.maxQueueNumber) {
          setMaxQueueNumberLocal(result.maxQueueNumber);
        }
        if (result.minutesPerCustomer) {
          setMinutesPerCustomerLocal(result.minutesPerCustomer);
        }
      })
      .catch((error) => {
        logger.error('系統設定載入失敗', { error }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  }, [dispatch]);

  // 處理開關候位系統
  const handleToggleQueueStatus = () => {
    const newStatus = !isQueueOpen;
    
    logger.userAction('切換候位系統狀態', { 
      oldStatus: isQueueOpen, 
      newStatus 
    }, 'AdminSettingsPage');
    
    dispatch(toggleQueueStatus(newStatus))
      .unwrap()
      .then(() => {
        setIsQueueOpen(newStatus);
        logger.info('候位系統狀態切換成功', { newStatus }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: newStatus ? '候位系統已開啟' : '候位系統已關閉',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        logger.error('候位系統狀態切換失敗', { error, newStatus }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  };

  // 處理設置下次辦事時間
  const handleSetNextSessionDate = () => {
    logger.userAction('點擊設定下次辦事時間按鈕', {
      nextSessionDate: nextSessionDate ? nextSessionDate.toISOString() : null
    }, 'AdminSettingsPage');

    if (!nextSessionDate) {
      logger.warn('設定下次辦事時間失敗：日期為空', null, 'AdminSettingsPage');
      dispatch(
        showAlert({
          message: '請選擇有效的日期和時間',
          severity: 'warning'
        })
      );
      return;
    }

    const isoDateString = nextSessionDate.toISOString();
    logger.info('準備發送設定下次辦事時間請求', {
      originalDate: nextSessionDate,
      isoString: isoDateString,
      timestamp: new Date().toISOString()
    }, 'AdminSettingsPage');

    // 添加 try-catch 包裝 dispatch 調用
    try {
      dispatch(setNextSessionDate(isoDateString))
        .unwrap()
        .then((result) => {
          logger.info('設定下次辦事時間成功', {
            requestDate: isoDateString,
            responseData: result,
            timestamp: new Date().toISOString()
          }, 'AdminSettingsPage');
          
          dispatch(
            showAlert({
              message: '下次辦事時間設置成功',
              severity: 'success'
            })
          );
          
          // 強制重新載入系統狀態
          dispatch(getQueueStatus());
        })
        .catch((error) => {
          logger.error('設定下次辦事時間失敗', {
            requestDate: isoDateString,
            error: {
              message: error.message || error,
              stack: error.stack,
              type: typeof error
            },
            timestamp: new Date().toISOString()
          }, 'AdminSettingsPage');
          
          dispatch(
            showAlert({
              message: error.message || error || '設定下次辦事時間失敗',
              severity: 'error'
            })
          );
        });
    } catch (syncError) {
      // 捕獲同步錯誤（如果有的話）
      logger.error('設定下次辦事時間同步錯誤', {
        requestDate: isoDateString,
        syncError: {
          message: syncError.message,
          stack: syncError.stack
        },
        timestamp: new Date().toISOString()
      }, 'AdminSettingsPage');
      
      dispatch(
        showAlert({
          message: '設定失敗：' + syncError.message,
          severity: 'error'
        })
      );
    }
  };

  // 處理日期選擇變更
  const handleDateChange = (newDate) => {
    logger.debug('日期選擇變更', {
      oldDate: nextSessionDate ? nextSessionDate.toISOString() : null,
      newDate: newDate ? newDate.toISOString() : null
    }, 'AdminSettingsPage');
    
    setNextSessionDate(newDate);
  };

  // 處理設定最大候位上限
  const handleSetMaxQueueNumber = () => {
    logger.userAction('設定最大候位上限', { maxQueueNumber }, 'AdminSettingsPage');
    
    if (!maxQueueNumber || maxQueueNumber < 1) {
      logger.warn('設定最大候位上限失敗：數值無效', { maxQueueNumber }, 'AdminSettingsPage');
      dispatch(
        showAlert({
          message: '請輸入有效的最大候位上限（必須大於0）',
          severity: 'warning'
        })
      );
      return;
    }

    dispatch(setMaxQueueNumber(maxQueueNumber))
      .unwrap()
      .then(() => {
        logger.info('設定最大候位上限成功', { maxQueueNumber }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: '最大候位上限設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        logger.error('設定最大候位上限失敗', { error, maxQueueNumber }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  };

  // 處理最大候位上限輸入變更
  const handleMaxQueueNumberChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1) {
      setMaxQueueNumberLocal(value);
    }
  };

  // 處理每位客戶預估處理時間輸入變更
  const handleMinutesPerCustomerChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1 && value <= 120) {
      setMinutesPerCustomerLocal(value);
    }
  };

  // 處理設定每位客戶預估處理時間
  const handleSetMinutesPerCustomer = () => {
    logger.userAction('設定每位客戶預估處理時間', { minutesPerCustomer }, 'AdminSettingsPage');
    
    if (!minutesPerCustomer || minutesPerCustomer < 1 || minutesPerCustomer > 120) {
      logger.warn('設定每位客戶預估處理時間失敗：數值無效', { minutesPerCustomer }, 'AdminSettingsPage');
      dispatch(
        showAlert({
          message: '請輸入有效的每位客戶預估處理時間（1-120分鐘）',
          severity: 'warning'
        })
      );
      return;
    }

    dispatch(setMinutesPerCustomer(minutesPerCustomer))
      .unwrap()
      .then(() => {
        logger.info('設定每位客戶預估處理時間成功', { minutesPerCustomer }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: '每位客戶預估處理時間設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        logger.error('設定每位客戶預估處理時間失敗', { error, minutesPerCustomer }, 'AdminSettingsPage');
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  };

  // 監控錯誤狀態變化
  useEffect(() => {
    if (error) {
      logger.error('AdminSettingsPage 檢測到錯誤狀態', { error }, 'AdminSettingsPage');
    }
  }, [error]);

  // 監控載入狀態變化
  useEffect(() => {
    logger.debug('載入狀態變化', { isLoading }, 'AdminSettingsPage');
  }, [isLoading]);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        系統設置
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                候位系統狀態
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isQueueOpen}
                      onChange={handleToggleQueueStatus}
                      color="primary"
                    />
                  }
                  label={isQueueOpen ? '候位系統開啟中' : '候位系統關閉中'}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity={isQueueOpen ? 'success' : 'info'}>
                  {isQueueOpen
                    ? '目前候位系統已開啟，民眾可以線上登記候位'
                    : '目前候位系統已關閉，民眾無法線上登記候位'}
                </Alert>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                下次辦事時間設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
                  <DateTimePicker
                    label="選擇日期和時間"
                    value={nextSessionDate}
                    onChange={handleDateChange}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetNextSessionDate}
                  disabled={!nextSessionDate}
                >
                  設置下次辦事時間
                </Button>
              </Box>
              {nextSessionDate && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：
                    {nextSessionDate.toLocaleString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      weekday: 'long'
                    })}
                  </Alert>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                最大候位上限設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="最大候位上限"
                  type="number"
                  value={maxQueueNumber}
                  onChange={handleMaxQueueNumberChange}
                  fullWidth
                  inputProps={{ min: 1 }}
                  helperText="設定每日候位的最大數量限制"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetMaxQueueNumber}
                  disabled={!maxQueueNumber || maxQueueNumber < 1}
                >
                  設定最大候位上限
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  目前最大候位上限設定為：{maxQueueNumber} 人
                  <br />
                  當候位號碼達到此上限時，系統將不接受新的候位申請
                </Alert>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                每位客戶預估處理時間設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="每位客戶預估處理時間"
                  type="number"
                  value={minutesPerCustomer}
                  onChange={handleMinutesPerCustomerChange}
                  fullWidth
                  inputProps={{ min: 1, max: 120 }}
                  helperText="設定每位客戶預估處理時間（1-120分鐘）"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetMinutesPerCustomer}
                  disabled={!minutesPerCustomer || minutesPerCustomer < 1 || minutesPerCustomer > 120}
                >
                  設定每位客戶預估處理時間
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  目前每位客戶預估處理時間設定為：{minutesPerCustomer} 分鐘
                </Alert>
              </Box>
            </Paper>
          </Grid>

          {queueStatus && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    當前系統狀態
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        候位系統狀態
                      </Typography>
                      <Typography variant="body1">
                        {queueStatus.isOpen ? '開啟' : '關閉'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        下次辦事時間
                      </Typography>
                      <Typography variant="body1">
                        {queueStatus.nextSessionDate
                          ? new Date(queueStatus.nextSessionDate).toLocaleString('zh-TW', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '尚未設置'}
                      </Typography>
                    </Grid>
                    {queueStatus.isOpen && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            目前叫號
                          </Typography>
                          <Typography variant="body1">
                            {queueStatus.currentQueueNumber || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            等待人數
                          </Typography>
                          <Typography variant="body1">
                            {queueStatus.waitingCount || 0} 人
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            最大候位上限
                          </Typography>
                          <Typography variant="body1">
                            {queueStatus.maxQueueNumber || 100} 人
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            每位客戶預估處理時間
                          </Typography>
                          <Typography variant="body1">
                            {queueStatus.minutesPerCustomer || 13} 分鐘
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default AdminSettingsPage; 