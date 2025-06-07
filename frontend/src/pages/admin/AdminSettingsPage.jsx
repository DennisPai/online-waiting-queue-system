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

  // 安全的日期驗證和轉換函數
  const safeDateConversion = (dateValue, context = 'unknown') => {
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    try {
      // 檢查是否為null或undefined
      if (dateValue === null || dateValue === undefined) {
        safeLog('debug', `${context}: 日期值為null/undefined，返回null`);
        return null;
      }

      // 檢查是否為空字符串
      if (dateValue === '') {
        safeLog('debug', `${context}: 日期值為空字符串，返回null`);
        return null;
      }

      // 嘗試轉換為Date對象
      let dateObj;
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else {
        dateObj = new Date(dateValue);
      }

      // 檢查轉換後的Date對象是否有效
      if (isNaN(dateObj.getTime())) {
        safeLog('warn', `${context}: 無效的日期值`, { 
          originalValue: dateValue,
          type: typeof dateValue,
          dateObj: dateObj.toString()
        });
        return null;
      }

      // 檢查是否為合理的日期範圍（例如1900年到2100年之間）
      const year = dateObj.getFullYear();
      if (year < 1900 || year > 2100) {
        safeLog('warn', `${context}: 日期年份超出合理範圍`, { 
          year,
          originalValue: dateValue,
          isoString: dateObj.toISOString()
        });
        return null;
      }

      safeLog('debug', `${context}: 日期轉換成功`, {
        originalValue: dateValue,
        convertedDate: dateObj.toISOString()
      });

      return dateObj;
    } catch (error) {
      safeLog('error', `${context}: 日期轉換過程中發生錯誤`, {
        originalValue: dateValue,
        error: {
          message: error.message,
          stack: error.stack
        }
      });
      return null;
    }
  };

  // 加載系統設置
  useEffect(() => {
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    safeLog('info', '開始載入系統設定');
    
    dispatch(getQueueStatus())
      .unwrap()
      .then((result) => {
        safeLog('info', '系統設定載入成功', {
          isOpen: result.isOpen,
          nextSessionDate: result.nextSessionDate,
          maxQueueNumber: result.maxQueueNumber,
          minutesPerCustomer: result.minutesPerCustomer
        });
        
        // 設置候位系統狀態
        setIsQueueOpen(result.isOpen);
        
        // 使用安全的日期轉換處理下次辦事時間
        const convertedDate = safeDateConversion(result.nextSessionDate, 'useEffect-系統設定載入');
        setNextSessionDate(convertedDate);
        
        // 設置最大候位上限
        if (result.maxQueueNumber) {
          setMaxQueueNumberLocal(result.maxQueueNumber);
        }
        
        // 設置每位客戶預估處理時間
        if (result.minutesPerCustomer) {
          setMinutesPerCustomerLocal(result.minutesPerCustomer);
        }
      })
      .catch((error) => {
        safeLog('error', '系統設定載入失敗', { error });
        
        // 載入失敗時，確保狀態為安全的預設值
        setNextSessionDate(null);
        setIsQueueOpen(false);
        setMaxQueueNumberLocal(100);
        setMinutesPerCustomerLocal(13);
        
        dispatch(
          showAlert({
            message: error.message || error || '系統設定載入失敗',
            severity: 'error'
          })
        );
      });
  }, [dispatch]);

  // 處理開關候位系統
  const handleToggleQueueStatus = () => {
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    const newStatus = !isQueueOpen;
    
    safeLog('info', '切換候位系統狀態', { 
      oldStatus: isQueueOpen, 
      newStatus 
    });
    
    dispatch(toggleQueueStatus(newStatus))
      .unwrap()
      .then(() => {
        setIsQueueOpen(newStatus);
        safeLog('info', '候位系統狀態切換成功', { newStatus });
        dispatch(
          showAlert({
            message: newStatus ? '候位系統已開啟' : '候位系統已關閉',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        safeLog('error', '候位系統狀態切換失敗', { error, newStatus });
        dispatch(
          showAlert({
            message: error.message || error || '切換候位系統狀態失敗',
            severity: 'error'
          })
        );
      });
  };

  // 處理設置下次辦事時間
  const handleSetNextSessionDate = () => {
    try {
      // 使用安全的日誌記錄
      const logUserAction = (message, data) => {
        if (window.logger) {
          window.logger.userAction(message, data, 'AdminSettingsPage');
        } else {
          console.log(`[AdminSettingsPage] ${message}`, data);
        }
      };

      const logInfo = (message, data) => {
        if (window.logger) {
          window.logger.info(message, data, 'AdminSettingsPage');
        } else {
          console.log(`[AdminSettingsPage] ${message}`, data);
        }
      };

      const logError = (message, data) => {
        if (window.logger) {
          window.logger.error(message, data, 'AdminSettingsPage');
        } else {
          console.error(`[AdminSettingsPage] ${message}`, data);
        }
      };

      // 安全地記錄用戶操作
      try {
        logUserAction('點擊設定下次辦事時間按鈕', {
          nextSessionDate: nextSessionDate ? nextSessionDate.toISOString() : null,
          hasValidDate: nextSessionDate instanceof Date && !isNaN(nextSessionDate.getTime())
        });
      } catch (logError) {
        console.warn('日誌記錄失敗，但繼續執行:', logError.message);
      }

      // 參數驗證
      if (!nextSessionDate) {
        logError('設定下次辦事時間失敗：日期為空', null);
        dispatch(
          showAlert({
            message: '請選擇有效的日期和時間',
            severity: 'warning'
          })
        );
        return;
      }

      // 日期有效性檢查
      let testDate;
      let isoDateString;
      
      try {
        // 確保 nextSessionDate 是一個有效的 Date 對象
        if (nextSessionDate instanceof Date) {
          testDate = nextSessionDate;
        } else {
          testDate = new Date(nextSessionDate);
        }
        
        // 檢查日期是否有效
        if (isNaN(testDate.getTime())) {
          throw new Error('無效的日期對象');
        }
        
        // 安全地轉換為 ISO 字符串
        isoDateString = testDate.toISOString();
        
        logInfo('日期驗證通過，準備發送設定下次辦事時間請求', {
          originalDate: nextSessionDate,
          testDate: testDate,
          isoString: isoDateString,
          timestamp: new Date().toISOString()
        });
      } catch (dateError) {
        logError('日期格式錯誤', {
          nextSessionDate,
          dateError: {
            message: dateError.message,
            stack: dateError.stack
          },
          timestamp: new Date().toISOString()
        });
        
        dispatch(
          showAlert({
            message: '日期格式錯誤：' + dateError.message,
            severity: 'error'
          })
        );
        return;
      }

      // 使用 Promise.resolve 包裝整個 dispatch 調用，確保錯誤捕獲
      Promise.resolve()
        .then(() => {
          logInfo('開始 dispatch setNextSessionDate', { isoDateString });
          return dispatch(setNextSessionDate(isoDateString));
        })
        .then((action) => {
          logInfo('dispatch setNextSessionDate 完成', { 
            actionType: action.type,
            actionPayload: action.payload 
          });
          
          // 檢查 action 結果
          if (action.type.endsWith('/fulfilled')) {
            // 成功情況
            logInfo('設定下次辦事時間成功', {
              requestDate: isoDateString,
              actionPayload: action.payload,
              timestamp: new Date().toISOString()
            });
            
            dispatch(
              showAlert({
                message: '下次辦事時間設置成功',
                severity: 'success'
              })
            );
            
            // 強制重新載入系統狀態
            logInfo('重新載入系統狀態');
            dispatch(getQueueStatus());
          } else if (action.type.endsWith('/rejected')) {
            // 失敗情況
            throw new Error(action.payload || '設定失敗');
          }
        })
        .catch((error) => {
          logError('設定下次辦事時間失敗', {
            requestDate: isoDateString || 'N/A',
            error: {
              message: error.message || error,
              stack: error.stack,
              type: typeof error,
              name: error.name
            },
            timestamp: new Date().toISOString()
          });
          
          const errorMessage = error.message || error || '設定下次辦事時間失敗';
          
          dispatch(
            showAlert({
              message: errorMessage,
              severity: 'error'
            })
          );
        });
    } catch (outerError) {
      // 最外層錯誤捕獲
      console.error('handleSetNextSessionDate 最外層錯誤:', outerError);
      
      dispatch(
        showAlert({
          message: '系統錯誤：' + outerError.message,
          severity: 'error'
        })
      );
    }
  };

  // 處理日期選擇變更
  const handleDateChange = (newDate) => {
    try {
      // 安全的日誌記錄
      const logDebug = (message, data) => {
        if (window.logger) {
          window.logger.debug(message, data, 'AdminSettingsPage');
        } else {
          console.log(`[AdminSettingsPage] ${message}`, data);
        }
      };

      // 使用安全的日期轉換
      const convertedDate = safeDateConversion(newDate, 'handleDateChange');
      
      logDebug('日期選擇變更', {
        originalDate: newDate,
        convertedDate: convertedDate ? convertedDate.toISOString() : null,
        isValid: convertedDate !== null
      });
      
      setNextSessionDate(convertedDate);
    } catch (error) {
      console.error('handleDateChange 錯誤:', error);
      // 即使處理失敗，也確保設定安全的值
      setNextSessionDate(null);
    }
  };

  // 處理設定最大候位上限
  const handleSetMaxQueueNumber = () => {
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    safeLog('userAction', '設定最大候位上限', { maxQueueNumber });
    
    if (!maxQueueNumber || maxQueueNumber < 1) {
      safeLog('warn', '設定最大候位上限失敗：數值無效', { maxQueueNumber });
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
        safeLog('info', '設定最大候位上限成功', { maxQueueNumber });
        dispatch(
          showAlert({
            message: '最大候位上限設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        safeLog('error', '設定最大候位上限失敗', { error, maxQueueNumber });
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
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };

    safeLog('userAction', '設定每位客戶預估處理時間', { minutesPerCustomer });
    
    if (!minutesPerCustomer || minutesPerCustomer < 1 || minutesPerCustomer > 120) {
      safeLog('warn', '設定每位客戶預估處理時間失敗：數值無效', { minutesPerCustomer });
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
        safeLog('info', '設定每位客戶預估處理時間成功', { minutesPerCustomer });
        dispatch(
          showAlert({
            message: '每位客戶預估處理時間設定成功',
            severity: 'success'
          })
        );
      })
      .catch((error) => {
        safeLog('error', '設定每位客戶預估處理時間失敗', { error, minutesPerCustomer });
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
      // 安全的日誌記錄函數
      const safeLog = (level, message, data) => {
        try {
          if (window.logger && window.logger[level]) {
            window.logger[level](message, data, 'AdminSettingsPage');
          } else {
            console[level](`[AdminSettingsPage] ${message}`, data);
          }
        } catch (logError) {
          console.warn('日誌記錄失敗:', logError.message);
        }
      };
      
      safeLog('error', 'AdminSettingsPage 檢測到錯誤狀態', { error });
    }
  }, [error]);

  // 監控載入狀態變化
  useEffect(() => {
    // 安全的日誌記錄函數
    const safeLog = (level, message, data) => {
      try {
        if (window.logger && window.logger[level]) {
          window.logger[level](message, data, 'AdminSettingsPage');
        } else {
          console[level](`[AdminSettingsPage] ${message}`, data);
        }
      } catch (logError) {
        console.warn('日誌記錄失敗:', logError.message);
      }
    };
    
    safeLog('debug', '載入狀態變化', { isLoading });
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
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        fullWidth 
                        error={!!params.error}
                        helperText={params.error ? '請選擇有效的日期和時間' : ''}
                      />
                    )}
                    componentsProps={{
                      textField: {
                        onError: (reason, value) => {
                          console.warn('DateTimePicker 錯誤:', { reason, value });
                          if (window.logger) {
                            window.logger.warn('DateTimePicker 錯誤', { reason, value }, 'AdminSettingsPage');
                          }
                        }
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
              {nextSessionDate && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：
                    {(() => {
                      try {
                        if (nextSessionDate instanceof Date && !isNaN(nextSessionDate.getTime())) {
                          return nextSessionDate.toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            weekday: 'long'
                          });
                        } else {
                          return '日期格式異常';
                        }
                      } catch (error) {
                        console.warn('日期顯示錯誤:', error);
                        return '日期顯示錯誤';
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
                        {(() => {
                          try {
                            if (queueStatus.nextSessionDate) {
                              const date = safeDateConversion(queueStatus.nextSessionDate, '系統狀態顯示');
                              if (date) {
                                return date.toLocaleString('zh-TW', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              } else {
                                return '日期格式異常';
                              }
                            } else {
                              return '尚未設置';
                            }
                          } catch (error) {
                            console.warn('系統狀態日期顯示錯誤:', error);
                            return '日期顯示錯誤';
                          }
                        })()}
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