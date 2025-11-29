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
  Divider,
  Tabs,
  Tab,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';

import {
  toggleQueueStatus,
  setNextSessionDate,
  getQueueStatus,
  setMaxOrderIndex,
  setMinutesPerCustomer,
  setSimplifiedMode,
  setPublicRegistrationEnabled,
  updateEventBanner
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';

const AdminSettingsPage = () => {
  const dispatch = useDispatch();
  const { queueStatus, eventBanner, isLoading, error } = useSelector((state) => state.queue);
  const [tabValue, setTabValue] = useState(0);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [nextSessionDateString, setNextSessionDateString] = useState('');
  const [maxOrderIndex, setMaxOrderIndexLocal] = useState(100);
  const [minutesPerCustomer, setMinutesPerCustomerLocal] = useState(13);
  const [simplifiedMode, setSimplifiedModeLocal] = useState(false);
  const [publicRegistrationEnabled, setPublicRegistrationEnabledLocal] = useState(false);
  // 活動報名區塊設定
  const [eventBannerData, setEventBannerData] = useState({
    enabled: false,
    title: '修玄宮特別活動',
    titleSize: '1.5rem',
    titleColor: '#1976d2',
    titleAlign: 'center',
    buttonText: '點我填寫報名表單',
    buttonUrl: 'https://www.google.com',
    buttonColor: 'primary'
  });

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
        
        if (result.maxOrderIndex) {
          setMaxOrderIndexLocal(result.maxOrderIndex);
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
        
        // 初始化活動報名區塊設定
        if (result.eventBanner) {
          setEventBannerData(result.eventBanner);
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

  // 處理設定最大叫號順序上限
  const handleSetMaxOrderIndex = () => {
    if (!maxOrderIndex || maxOrderIndex < 1) {
      dispatch(
        showAlert({
          message: '請輸入有效的最大叫號順序上限（必須大於0）',
          severity: 'warning'
        })
      );
      return;
    }

    dispatch(setMaxOrderIndex(maxOrderIndex))
      .unwrap()
      .then(() => {
        dispatch(
          showAlert({
            message: '最大叫號順序上限設定成功',
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

  // 處理最大叫號順序上限輸入變更
  const handleMaxOrderIndexChange = (event) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1) {
      setMaxOrderIndexLocal(value);
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

  // 處理儲存活動報名設定
  const handleSaveEventBanner = () => {
    dispatch(updateEventBanner(eventBannerData))
      .unwrap()
      .then(() => {
        dispatch(
          showAlert({
            message: '活動報名區塊設定已更新',
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        系統設置
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs 導航 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="基本設定" />
          <Tab label="候位設定" />
          <Tab label="註冊設定" />
          <Tab label="活動報名" />
        </Tabs>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tab 0: 基本設定 */}
          {tabValue === 0 && (
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
                最大叫號順序上限設置
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="最大叫號順序"
                  type="number"
                  value={maxOrderIndex}
                  onChange={handleMaxOrderIndexChange}
                  fullWidth
                  inputProps={{ min: 1 }}
                  helperText="設定每日候位的最大叫號順序限制"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSetMaxOrderIndex}
                  disabled={!maxOrderIndex || maxOrderIndex < 1}
                >
                  設定最大叫號順序上限
                </Button>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  目前最大叫號順序設定為：{maxOrderIndex} 位
                  <br />
                  當叫號順序達到此上限時，系統將不接受新的候位申請
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

            </Grid>
          )}

          {/* Tab 1: 候位設定 */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    候位設定（請返回程式碼重新組織）
                  </Typography>
                  <Alert severity="info">
                    此Tab尚未完成重構。請保留現有的候位設定內容。
                  </Alert>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tab 2: 註冊設定 */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    註冊設定（請返回程式碼重新組織）
                  </Typography>
                  <Alert severity="info">
                    此Tab尚未完成重構。請保留現有的註冊設定內容。
                  </Alert>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tab 3: 活動報名 */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              {/* 設定區域 */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    活動報名區塊設定
                  </Typography>
                  
                  {/* 啟用開關 */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={eventBannerData.enabled}
                        onChange={(e) => setEventBannerData({...eventBannerData, enabled: e.target.checked})}
                      />
                    }
                    label="啟用活動報名區塊"
                  />
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* 標題設定 */}
                  <TextField
                    fullWidth
                    label="標題文字"
                    multiline
                    rows={2}
                    value={eventBannerData.title}
                    onChange={(e) => setEventBannerData({...eventBannerData, title: e.target.value})}
                    sx={{ mb: 2 }}
                  />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="字體大小"
                        value={eventBannerData.titleSize}
                        onChange={(e) => setEventBannerData({...eventBannerData, titleSize: e.target.value})}
                        helperText="例如: 1.5rem"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="文字顏色"
                        type="color"
                        value={eventBannerData.titleColor}
                        onChange={(e) => setEventBannerData({...eventBannerData, titleColor: e.target.value})}
                      />
                    </Grid>
                  </Grid>
                  
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <FormLabel>文字對齊</FormLabel>
                    <RadioGroup
                      row
                      value={eventBannerData.titleAlign}
                      onChange={(e) => setEventBannerData({...eventBannerData, titleAlign: e.target.value})}
                    >
                      <FormControlLabel value="left" control={<Radio />} label="靠左" />
                      <FormControlLabel value="center" control={<Radio />} label="置中" />
                      <FormControlLabel value="right" control={<Radio />} label="靠右" />
                    </RadioGroup>
                  </FormControl>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* 按鈕設定 */}
                  <TextField
                    fullWidth
                    label="按鈕文字"
                    value={eventBannerData.buttonText}
                    onChange={(e) => setEventBannerData({...eventBannerData, buttonText: e.target.value})}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="超連結網址"
                    value={eventBannerData.buttonUrl}
                    onChange={(e) => setEventBannerData({...eventBannerData, buttonUrl: e.target.value})}
                    helperText="必須包含 http:// 或 https://"
                    sx={{ mb: 2 }}
                  />
                  
                  <FormControl fullWidth>
                    <FormLabel>按鈕顏色</FormLabel>
                    <RadioGroup
                      row
                      value={eventBannerData.buttonColor}
                      onChange={(e) => setEventBannerData({...eventBannerData, buttonColor: e.target.value})}
                    >
                      <FormControlLabel value="primary" control={<Radio />} label="主要" />
                      <FormControlLabel value="secondary" control={<Radio />} label="次要" />
                      <FormControlLabel value="success" control={<Radio />} label="成功" />
                      <FormControlLabel value="error" control={<Radio />} label="錯誤" />
                    </RadioGroup>
                  </FormControl>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    連結將固定以新分頁方式開啟
                  </Alert>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSaveEventBanner}
                    sx={{ mt: 3 }}
                  >
                    儲存設定
                  </Button>
                </Paper>
              </Grid>
              
              {/* 即時預覽區域 */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    即時預覽
                  </Typography>
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h5"
                        align={eventBannerData.titleAlign}
                        sx={{
                          fontSize: eventBannerData.titleSize,
                          color: eventBannerData.titleColor,
                          mb: 2,
                          fontWeight: 'medium'
                        }}
                      >
                        {eventBannerData.title || '（標題文字）'}
                      </Typography>
                      <Button
                        variant="contained"
                        color={eventBannerData.buttonColor}
                        fullWidth
                        size="large"
                        disabled
                      >
                        {eventBannerData.buttonText || '（按鈕文字）'}
                      </Button>
                    </CardContent>
                  </Card>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminSettingsPage; 