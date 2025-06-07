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

const AdminSettingsPage = () => {
  const dispatch = useDispatch();
  const { queueStatus, isLoading, error } = useSelector((state) => state.queue);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [nextSessionDate, setNextSessionDate] = useState(null);
  const [maxQueueNumber, setMaxQueueNumberLocal] = useState(100);
  const [minutesPerCustomer, setMinutesPerCustomerLocal] = useState(13);

  // 加載系統設置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await dispatch(getQueueStatus()).unwrap();
        console.log('載入系統設定:', result);
        
        setIsQueueOpen(result.isOpen);
        
        // 更安全的日期處理
        if (result.nextSessionDate) {
          try {
            let date;
            if (result.nextSessionDate instanceof Date) {
              date = result.nextSessionDate;
            } else if (typeof result.nextSessionDate === 'string' || typeof result.nextSessionDate === 'number') {
              date = new Date(result.nextSessionDate);
            } else {
              console.warn('無法識別的日期格式:', result.nextSessionDate);
              setNextSessionDate(null);
              return;
            }
            
            // 檢查日期是否有效
            if (date && !isNaN(date.getTime()) && date.getTime() > 0) {
              setNextSessionDate(date);
              console.log('成功設定下次辦事時間:', date);
            } else {
              console.warn('無效的下次辦事時間:', result.nextSessionDate);
              setNextSessionDate(null);
            }
          } catch (dateError) {
            console.error('日期解析錯誤:', dateError, '原始值:', result.nextSessionDate);
            setNextSessionDate(null);
          }
        } else {
          setNextSessionDate(null);
        }
        
        if (result.maxQueueNumber) {
          setMaxQueueNumberLocal(result.maxQueueNumber);
        }
        if (result.minutesPerCustomer) {
          setMinutesPerCustomerLocal(result.minutesPerCustomer);
        }
      } catch (error) {
        console.error('載入系統設定失敗:', error);
        dispatch(
          showAlert({
            message: typeof error === 'string' ? error : error.message || '載入系統設定失敗',
            severity: 'error'
          })
        );
      }
    };
    
    loadSettings();
  }, [dispatch]);

  // 處理開關候位系統
  const handleToggleQueueStatus = () => {
    const newStatus = !isQueueOpen;
    
    dispatch(toggleQueueStatus(newStatus))
      .unwrap()
      .then(() => {
        setIsQueueOpen(newStatus);
        dispatch(
          showAlert({
            message: newStatus ? '候位系統已開啟' : '候位系統已關閉',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  };

  // 處理設置下次辦事時間
  const handleSetNextSessionDate = React.useCallback(async () => {
    console.log('handleSetNextSessionDate 開始執行，nextSessionDate:', nextSessionDate);
    
    // 防止重複執行
    if (isLoading) {
      console.log('已有操作進行中，跳過');
      return;
    }
    
    try {
      if (!nextSessionDate) {
        dispatch(
          showAlert({
            message: '請選擇有效的日期和時間',
            severity: 'warning'
          })
        );
        return;
      }

      // 更強的日期驗證
      let dateToSet;
      try {
        if (nextSessionDate instanceof Date) {
          if (isNaN(nextSessionDate.getTime()) || nextSessionDate.getTime() <= 0) {
            throw new Error('Invalid Date object');
          }
          dateToSet = nextSessionDate;
        } else {
          dateToSet = new Date(nextSessionDate);
          if (isNaN(dateToSet.getTime()) || dateToSet.getTime() <= 0) {
            throw new Error('Cannot convert to valid Date');
          }
        }
      } catch (dateError) {
        console.error('日期驗證失敗:', dateError);
        dispatch(
          showAlert({
            message: '選擇的日期時間無效，請重新選擇',
            severity: 'error'
          })
        );
        // 清空無效日期以防後續問題
        setNextSessionDate(null);
        return;
      }

      const isoString = dateToSet.toISOString();
      console.log('準備設置下次辦事時間:', isoString);
      
      // 使用try-catch來捕獲Redux錯誤
      try {
        const result = await dispatch(setNextSessionDate(isoString)).unwrap();
        console.log('設置下次辦事時間成功，結果:', result);
        
        dispatch(
          showAlert({
            message: '下次辦事時間設置成功',
            severity: 'success'
          })
        );
        
        // 重新載入系統設定以確保顯示最新狀態
        setTimeout(async () => {
          try {
            await dispatch(getQueueStatus()).unwrap();
          } catch (reloadError) {
            console.error('重新載入系統設定失敗:', reloadError);
          }
        }, 500);
        
      } catch (reduxError) {
        console.error('Redux操作失敗:', reduxError);
        throw reduxError; // 重新拋出以便被外層catch捕獲
      }
      
    } catch (error) {
      console.error('設置下次辦事時間失敗，詳細錯誤:', error);
      
      // 清理狀態以防止持續錯誤
      setNextSessionDate(null);
      
      // 處理不同類型的錯誤信息
      let errorMessage = '設置下次辦事時間失敗';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        if (error.message.includes('Redux')) {
          errorMessage = '系統狀態錯誤，請重新載入頁面後再試';
        } else {
          errorMessage = error.message;
        }
      }
      
      dispatch(
        showAlert({
          message: errorMessage,
          severity: 'error'
        })
      );
    }
  }, [nextSessionDate, isLoading, dispatch]);

  // 處理日期選擇變更
  const handleDateChange = (newDate) => {
    console.log('日期選擇變更:', newDate, '類型:', typeof newDate);
    
    try {
      if (newDate === null || newDate === undefined) {
        // 允許清空日期
        setNextSessionDate(null);
        console.log('日期已清空');
        return;
      }
      
      // 嘗試創建有效的Date對象
      let validDate;
      if (newDate instanceof Date) {
        validDate = newDate;
      } else {
        validDate = new Date(newDate);
      }
      
      // 檢查日期是否有效
      if (validDate && !isNaN(validDate.getTime()) && validDate.getTime() > 0) {
        setNextSessionDate(validDate);
        console.log('成功設置日期:', validDate);
      } else {
        console.warn('無效的日期選擇:', newDate);
        // 設置為null而不是保持原有值，避免錯誤狀態
        setNextSessionDate(null);
      }
    } catch (error) {
      console.error('日期處理錯誤:', error);
      setNextSessionDate(null);
    }
  };

  // 處理設定最大候位上限
  const handleSetMaxQueueNumber = () => {
    if (!maxQueueNumber || maxQueueNumber < 1) {
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
        dispatch(
          showAlert({
            message: '最大候位上限設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
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
    if (!minutesPerCustomer || minutesPerCustomer < 1 || minutesPerCustomer > 120) {
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
        dispatch(
          showAlert({
            message: '每位客戶預估處理時間設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        dispatch(
          showAlert({
            message: error,
            severity: 'error'
          })
        );
      });
  };

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
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: nextSessionDate && (!(nextSessionDate instanceof Date) || isNaN(nextSessionDate?.getTime?.() || 0)),
                        helperText: nextSessionDate && (!(nextSessionDate instanceof Date) || isNaN(nextSessionDate?.getTime?.() || 0)) ? '無效的日期格式' : ''
                      }
                    }}
                    onError={(error) => {
                      console.warn('DateTimePicker 錯誤:', error);
                      if (error) {
                        setNextSessionDate(null);
                      }
                    }}
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
              {nextSessionDate && (nextSessionDate instanceof Date) && !isNaN(nextSessionDate?.getTime?.() || 0) && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：
                    {(() => {
                      try {
                        if (nextSessionDate instanceof Date && typeof nextSessionDate.toLocaleString === 'function') {
                          return nextSessionDate.toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            weekday: 'long'
                          });
                        } else {
                          return `日期格式錯誤: ${nextSessionDate}`;
                        }
                      } catch (error) {
                        console.error('日期格式化錯誤:', error);
                        return `日期格式錯誤: ${nextSessionDate}`;
                      }
                    })()}
                  </Alert>
                </Box>
              )}
              
              {nextSessionDate && (!(nextSessionDate instanceof Date) || isNaN(nextSessionDate?.getTime?.() || 0)) && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="error">
                    日期格式無效，請重新選擇日期時間
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
                          ? (() => {
                              try {
                                return new Date(queueStatus.nextSessionDate).toLocaleString('zh-TW', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } catch (error) {
                                console.error('系統狀態日期格式化錯誤:', error);
                                return queueStatus.nextSessionDate.toString();
                              }
                            })()
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