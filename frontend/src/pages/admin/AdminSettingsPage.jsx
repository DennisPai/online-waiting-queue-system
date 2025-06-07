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
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);

  // 錯誤邊界處理
  useEffect(() => {
    const handleError = (error) => {
      console.error('頁面錯誤:', error);
      setHasError(true);
      dispatch(showAlert({
        message: '頁面發生錯誤，請重新整理頁面',
        severity: 'error'
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [dispatch]);

  // 加載系統設置
  useEffect(() => {
    dispatch(getQueueStatus())
      .unwrap()
      .then((result) => {
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
        // 重新載入系統設定以確保狀態同步
        dispatch(getQueueStatus());
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
  const handleSetNextSessionDate = async () => {
    console.log('=== 開始設置下次辦事時間 ===');
    console.log('當前日期值:', nextSessionDate);
    console.log('日期類型:', typeof nextSessionDate);
    console.log('日期有效性:', nextSessionDate instanceof Date);
    console.log('日期getTime():', nextSessionDate ? nextSessionDate.getTime() : 'N/A');

    try {
      setLoading(true);
      
      // 詳細的日期驗證邏輯
      if (!nextSessionDate) {
        console.error('日期為空');
        dispatch(showAlert({
          message: '請選擇日期和時間',
          severity: 'error'
        }));
        return;
      }

      // 檢查是否為Date對象
      if (!(nextSessionDate instanceof Date)) {
        console.error('不是有效的Date對象:', nextSessionDate);
        dispatch(showAlert({
          message: '無效的日期格式，請重新選擇日期',
          severity: 'error'
        }));
        return;
      }

      // 檢查日期是否有效
      if (isNaN(nextSessionDate.getTime())) {
        console.error('日期無效，getTime()返回NaN:', nextSessionDate);
        dispatch(showAlert({
          message: '請選擇有效的日期',
          severity: 'error'
        }));
        return;
      }

      // 安全地轉換為ISO字符串
      let isoString;
      try {
        isoString = nextSessionDate.toISOString();
        console.log('成功轉換為ISO字符串:', isoString);
      } catch (error) {
        console.error('日期轉換失敗:', error);
        dispatch(showAlert({
          message: '日期轉換失敗，請重新選擇',
          severity: 'error'
        }));
        return;
      }

      console.log('準備發送到後端的日期:', isoString);
      
      // 調用Redux action
      const result = await dispatch(setNextSessionDate(isoString));
      
      console.log('Redux action 完整結果:', result);
      console.log('Redux action 類型:', result.type);
      console.log('Redux action 載荷:', result.payload);
      
      if (setNextSessionDate.fulfilled.match(result)) {
        console.log('設置成功，開始重新載入系統設定');
        // 設置成功後重新載入系統設定
        try {
          const statusResult = await dispatch(getQueueStatus());
          console.log('系統設定重新載入結果:', statusResult);
        } catch (loadError) {
          console.error('重新載入系統設定失敗:', loadError);
        }
        
        dispatch(showAlert({
          message: '下次辦事時間設置成功',
          severity: 'success'
        }));
      } else {
        console.error('設置失敗');
        console.error('Redux錯誤結果:', result);
        console.error('錯誤載荷:', result.payload);
        console.error('錯誤信息:', result.error);
        
        // 更詳細的錯誤處理
        let errorMessage = '設置失敗，請稍後再試';
        
        if (result.payload) {
          if (typeof result.payload === 'string') {
            errorMessage = result.payload;
          } else if (result.payload.message) {
            errorMessage = result.payload.message;
          } else if (result.payload.error) {
            errorMessage = result.payload.error;
          }
        } else if (result.error && result.error.message) {
          errorMessage = result.error.message;
        }
        
        console.log('最終錯誤信息:', errorMessage);
        
        dispatch(showAlert({
          message: errorMessage,
          severity: 'error'
        }));
      }
    } catch (error) {
      console.error('=== 設置下次辦事時間發生例外 ===');
      console.error('例外詳細:', error);
      console.error('例外堆疊:', error.stack);
      dispatch(showAlert({
        message: '設置失敗，請稍後再試',
        severity: 'error'
      }));
    } finally {
      setLoading(false);
      console.log('=== 設置下次辦事時間結束 ===');
    }
  };

  // 處理日期選擇變更
  const handleDateChange = (newDate) => {
    try {
      console.log('處理日期變更 - 原始值:', newDate);
      console.log('處理日期變更 - 類型:', typeof newDate);
      console.log('處理日期變更 - 是否為Date:', newDate instanceof Date);
      
      // 處理null或undefined
      if (newDate === null || newDate === undefined) {
        console.log('日期為空，設置為null');
        setNextSessionDate(null);
        return;
      }
      
      // 嘗試轉換為Date對象
      let dateObj = newDate;
      
      // 如果不是Date對象，嘗試轉換
      if (!(newDate instanceof Date)) {
        console.log('不是Date對象，嘗試轉換:', newDate);
        if (typeof newDate === 'string') {
          dateObj = new Date(newDate);
        } else if (typeof newDate === 'number') {
          dateObj = new Date(newDate);
        } else {
          console.warn('無法處理的日期類型:', typeof newDate);
          setNextSessionDate(null);
          return;
        }
      }
      
      // 檢查轉換後的日期是否有效
      if (dateObj && !isNaN(dateObj.getTime())) {
        console.log('日期設置成功:', dateObj);
        console.log('日期ISO格式:', dateObj.toISOString());
        setNextSessionDate(dateObj);
      } else {
        console.warn('轉換後的日期無效:', dateObj);
        setNextSessionDate(null);
        dispatch(showAlert({
          message: '選擇的日期格式無效，請重新選擇',
          severity: 'warning'
        }));
      }
    } catch (error) {
      console.error('日期處理錯誤:', error);
      setNextSessionDate(null);
      dispatch(showAlert({
        message: '日期處理發生錯誤，請重新選擇',
        severity: 'error'
      }));
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
        // 重新載入系統設定以確保狀態同步
        dispatch(getQueueStatus());
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
        // 重新載入系統設定以確保狀態同步
        dispatch(getQueueStatus());
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

  // 如果發生錯誤，顯示錯誤頁面
  if (hasError) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom>
          系統設置
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          頁面發生錯誤，請重新整理頁面或聯繫管理員
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          重新整理頁面
        </Button>
      </Container>
    );
  }

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
                    onChange={(newDate) => {
                      console.log('DateTimePicker 日期變更:', newDate);
                      console.log('新日期類型:', typeof newDate);
                      console.log('新日期是否為Date:', newDate instanceof Date);
                      try {
                        handleDateChange(newDate);
                      } catch (error) {
                        console.error('日期變更處理錯誤:', error);
                        dispatch(showAlert({
                          message: '日期處理錯誤，請重新選擇',
                          severity: 'error'
                        }));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        variant="outlined"
                        error={false}
                      />
                    )}
                    ampm={false}
                    inputFormat="yyyy/MM/dd HH:mm"
                  />
                </LocalizationProvider>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetNextSessionDate}
                  disabled={!nextSessionDate || loading}
                >
                  {loading ? '設置中...' : '設置下次辦事時間'}
                </Button>
              </Box>
              {nextSessionDate && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：
                    {nextSessionDate instanceof Date && !isNaN(nextSessionDate.getTime())
                      ? nextSessionDate.toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          weekday: 'long'
                        })
                      : '無效的日期格式'
                    }
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