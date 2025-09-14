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
  setMinutesPerCustomer,
  setSimplifiedMode,
  setPublicRegistrationEnabled
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';

const AdminSettingsPage = () => {
  const dispatch = useDispatch();
  const { queueStatus, isLoading, error } = useSelector((state) => state.queue);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [nextSessionDateString, setNextSessionDateString] = useState('');
  const [maxQueueNumber, setMaxQueueNumberLocal] = useState(100);
  const [minutesPerCustomer, setMinutesPerCustomerLocal] = useState(13);
  const [simplifiedMode, setSimplifiedModeLocal] = useState(false);
  const [publicRegistrationEnabled, setPublicRegistrationEnabledLocal] = useState(false);

  // 安全的日期格式化函數
  const formatDateForInput = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // 格式化為 datetime-local input 所需的 YYYY-MM-DDTHH:MM 格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    } catch (error) {
      console.warn('格式化日期時發生錯誤:', error);
      return '';
    }
  };

  // 安全的日期顯示函數
  const formatDateForDisplay = (dateString) => {
    try {
      if (!dateString) return '未設定';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '日期格式錯誤';
      
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      });
    } catch (error) {
      console.warn('顯示日期時發生錯誤:', error);
      return '日期格式錯誤';
    }
  };

  // 安全的日期驗證函數
  const isValidFutureDate = (dateString) => {
    try {
      if (!dateString) return false;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      return date > now;
    } catch (error) {
      console.warn('驗證日期時發生錯誤:', error);
      return false;
    }
  };

  // 加載系統設置
  useEffect(() => {
    dispatch(getQueueStatus())
      .unwrap()
      .then((result) => {
        setIsQueueOpen(result.isOpen);
        
        // 安全處理下次辦事時間
        if (result.nextSessionDate) {
          setNextSessionDateString(result.nextSessionDate);
        }
        
        if (result.maxQueueNumber) {
          setMaxQueueNumberLocal(result.maxQueueNumber);
        }
        
        if (result.minutesPerCustomer) {
          setMinutesPerCustomerLocal(result.minutesPerCustomer);
        }
        
        if (typeof result.simplifiedMode !== 'undefined') {
          setSimplifiedModeLocal(result.simplifiedMode);
        }
        
        if (typeof result.publicRegistrationEnabled !== 'undefined') {
          setPublicRegistrationEnabledLocal(result.publicRegistrationEnabled);
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
      if (!nextSessionDateString) {
        dispatch(
          showAlert({
            message: '請選擇有效的日期和時間',
            severity: 'warning'
          })
        );
        return;
      }

      // 多層驗證確保日期有效性
      if (!isValidFutureDate(nextSessionDateString)) {
        dispatch(
          showAlert({
            message: '下次辦事時間必須晚於現在時間',
            severity: 'warning'
          })
        );
        return;
      }

      // 轉換為ISO字符串用於API調用
      let isoString;
      try {
        const dateObj = new Date(nextSessionDateString);
        if (isNaN(dateObj.getTime())) {
          throw new Error('無效的日期格式');
        }
        isoString = dateObj.toISOString();
        console.log('準備設置時間:', isoString);
      } catch (dateError) {
        console.error('日期轉換錯誤:', dateError);
        dispatch(
          showAlert({
            message: '日期格式無效，請重新選擇',
            severity: 'warning'
          })
        );
        return;
      }

      // 調用API設置時間
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

  // 處理日期時間輸入變更
  const handleDateTimeChange = (event) => {
    const value = event.target.value;
    console.log('日期時間變更:', value);
    
    if (value) {
      try {
        // 驗證輸入的日期時間格式
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          setNextSessionDateString(dateObj.toISOString());
        } else {
          console.warn('無效的日期時間:', value);
        }
      } catch (error) {
        console.error('解析日期時間錯誤:', error);
      }
    } else {
      setNextSessionDateString('');
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

  // 處理簡化模式開關
  const handleToggleSimplifiedMode = () => {
    const newMode = !simplifiedMode;
    
    dispatch(setSimplifiedMode(newMode))
      .unwrap()
      .then(() => {
        setSimplifiedModeLocal(newMode);
        dispatch(
          showAlert({
            message: newMode ? '簡化模式已開啟' : '簡化模式已關閉',
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

  // 處理公開候位登記開關
  const handleTogglePublicRegistrationEnabled = () => {
    const newStatus = !publicRegistrationEnabled;
    
    dispatch(setPublicRegistrationEnabled(newStatus))
      .unwrap()
      .then(() => {
        setPublicRegistrationEnabledLocal(newStatus);
        dispatch(
          showAlert({
            message: newStatus ? '公開候位登記已開啟' : '公開候位登記已關閉',
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
                辦事狀態
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
                  label={isQueueOpen ? '開始辦事' : '停止辦事'}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity={isQueueOpen ? 'success' : 'info'}>
                  {isQueueOpen
                    ? '目前正在進行辦事服務，候位叫號正常運作'
                    : '目前停止辦事服務，候位叫號已暫停'}
                </Alert>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2" component="div">
                    <strong>辦事狀態說明：</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                      <li>開始辦事：正在進行辦事服務，系統會顯示目前叫號和候位狀態</li>
                      <li>停止辦事：暫停辦事服務，但民眾仍可登記候位（需開啟公開候位登記功能）</li>
                      <li>此設定不影響候位登記功能，候位登記由「公開候位登記設置」控制</li>
                    </ul>
                  </Typography>
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
                  value={formatDateForInput(nextSessionDateString)}
                  onChange={handleDateTimeChange}
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
                  disabled={!nextSessionDateString || !isValidFutureDate(nextSessionDateString)}
                >
                  設置下次辦事時間
                </Button>
              </Box>
              {nextSessionDateString && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    您設置的下次辦事時間是：{formatDateForDisplay(nextSessionDateString)}
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
                  helperText="設定候位總數的最大數量限制（不包含已取消的候位）"
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
                  當候位總數（活躍候位人數）達到此上限時，系統將不接受新的候位申請
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

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                簡化模式設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={simplifiedMode}
                      onChange={handleToggleSimplifiedMode}
                      color="primary"
                    />
                  }
                  label={simplifiedMode ? '簡化模式已開啟' : '簡化模式已關閉'}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity={simplifiedMode ? 'warning' : 'info'}>
                  {simplifiedMode
                    ? '簡化模式已開啟：登記資料時允許資料不齊全，表單驗證已被關閉'
                    : '簡化模式已關閉：登記資料時需要填寫完整資料，表單驗證正常運作'}
                </Alert>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2" component="div">
                    <strong>簡化模式說明：</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                      <li>開啟時：僅需要填寫客戶姓名，其他欄位可以留空</li>
                      <li>關閉時：需要填寫完整的客戶資料，包含電話、電子郵件、地址、出生日期等</li>
                      <li>適用於快速登記或緊急情況使用</li>
                    </ul>
                  </Typography>
                </Alert>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                公開候位登記設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={publicRegistrationEnabled}
                      onChange={handleTogglePublicRegistrationEnabled}
                      color="primary"
                    />
                  }
                  label={publicRegistrationEnabled ? '公開候位登記已開啟' : '公開候位登記已關閉'}
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity={publicRegistrationEnabled ? 'success' : 'warning'}>
                  {publicRegistrationEnabled
                    ? '公開候位登記已開啟：一般民眾可以在首頁直接進行候位登記'
                    : '公開候位登記已關閉：只有管理員登入後才能進行候位登記'}
                </Alert>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2" component="div">
                    <strong>公開候位登記說明：</strong>
                    <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                      <li>開啟時：首頁顯示「我要候位」按鈕，民眾可直接登記</li>
                      <li>關閉時：首頁隱藏「我要候位」按鈕，僅管理員可登記</li>
                      <li>適用於需要控制候位開放時間或特殊情況</li>
                    </ul>
                  </Typography>
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
                        目前叫號
                      </Typography>
                      <Typography variant="h6">
                        {queueStatus.currentQueueNumber || queueStatus.currentNumber || '無'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        等待組數
                      </Typography>
                      <Typography variant="h6">
                        {queueStatus.waitingCount || 0} 組
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        下次辦事時間
                      </Typography>
                      <Typography variant="h6">
                        {formatDateForDisplay(queueStatus.nextSessionDate)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        系統狀態
                      </Typography>
                      <Typography variant="h6" color={queueStatus.isOpen ? 'success.main' : 'error.main'}>
                        {queueStatus.isOpen ? '開啟' : '關閉'}
                      </Typography>
                    </Grid>
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