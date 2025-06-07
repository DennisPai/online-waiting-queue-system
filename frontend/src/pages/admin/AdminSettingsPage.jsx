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
  const [nextSessionDate, setNextSessionDate] = useState(new Date());
  const [maxQueueNumber, setMaxQueueNumberLocal] = useState(100);
  const [minutesPerCustomer, setMinutesPerCustomerLocal] = useState(13);

  // 加載系統設置
  useEffect(() => {
    dispatch(getQueueStatus())
      .unwrap()
      .then((result) => {
        setIsQueueOpen(result.isOpen);
        if (result.nextSessionDate) {
          try {
            const date = new Date(result.nextSessionDate);
            // 檢查日期是否有效
            if (!isNaN(date.getTime())) {
              setNextSessionDate(date);
            } else {
              console.warn('無效的下次辦事時間:', result.nextSessionDate);
              setNextSessionDate(new Date());
            }
          } catch (error) {
            console.warn('解析下次辦事時間時發生錯誤:', error);
            setNextSessionDate(new Date());
          }
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

      let dateObj;
      let isoString;

      try {
        // 安全地處理Date對象
        dateObj = typeof nextSessionDate === 'string' ? new Date(nextSessionDate) : nextSessionDate;
        
        if (!dateObj || isNaN(dateObj.getTime())) {
          throw new Error('無效的日期');
        }

        // 驗證日期不能是過去的時間
        const now = new Date();
        if (dateObj < now) {
          dispatch(
            showAlert({
              message: '下次辦事時間不能早於現在時間',
              severity: 'warning'
            })
          );
          return;
        }

        isoString = dateObj.toISOString();
        console.log('準備設置時間:', isoString);

      } catch (dateError) {
        console.error('日期處理錯誤:', dateError);
        dispatch(
          showAlert({
            message: '日期格式無效，請重新選擇',
            severity: 'warning'
          })
        );
        return;
      }

      const result = await dispatch(setNextSessionDate(isoString)).unwrap();
      console.log('設置時間成功:', result);
      
      dispatch(
        showAlert({
          message: '下次辦事時間設置成功',
          severity: 'success'
        })
      );
    } catch (error) {
      console.error('設置時間錯誤:', error);
      dispatch(
        showAlert({
          message: typeof error === 'string' ? error : '設置下次辦事時間失敗，請稍後再試',
          severity: 'error'
        })
      );
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
                <TextField
                  label="選擇日期和時間"
                  type="datetime-local"
                  value={nextSessionDate ? (() => {
                    try {
                      const dateObj = typeof nextSessionDate === 'string' ? new Date(nextSessionDate) : nextSessionDate;
                      if (dateObj && !isNaN(dateObj.getTime())) {
                        // 格式化為 datetime-local input 格式 (YYYY-MM-DDTHH:MM)
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const hour = String(dateObj.getHours()).padStart(2, '0');
                        const minute = String(dateObj.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hour}:${minute}`;
                      }
                    } catch (error) {
                      console.warn('格式化日期時發生錯誤:', error);
                    }
                    return '';
                  })() : ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) {
                      try {
                        const dateObj = new Date(value);
                        if (!isNaN(dateObj.getTime())) {
                          setNextSessionDate(dateObj);
                        }
                      } catch (error) {
                        console.warn('解析日期時發生錯誤:', error);
                      }
                    } else {
                      setNextSessionDate(null);
                    }
                  }}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                  helperText="請選擇下次辦事的日期和時間"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetNextSessionDate}
                  disabled={!nextSessionDate || (() => {
                    try {
                      const dateObj = typeof nextSessionDate === 'string' ? new Date(nextSessionDate) : nextSessionDate;
                      return isNaN(dateObj.getTime());
                    } catch {
                      return true;
                    }
                  })()}
                >
                  設置下次辦事時間
                </Button>
              </Box>
              {nextSessionDate && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：
                    {(() => {
                      try {
                        const dateObj = typeof nextSessionDate === 'string' ? new Date(nextSessionDate) : nextSessionDate;
                        if (!isNaN(dateObj.getTime())) {
                          return dateObj.toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            weekday: 'long'
                          });
                        }
                        return '日期格式錯誤';
                      } catch (error) {
                        return '日期格式錯誤';
                      }
                    })()}
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