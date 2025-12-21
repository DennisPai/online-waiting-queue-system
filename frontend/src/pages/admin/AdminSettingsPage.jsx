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
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Checkbox
} from '@mui/material';

import {
  toggleQueueStatus,
  setNextSessionDate,
  getQueueStatus,
  setMaxOrderIndex,
  setMinutesPerCustomer,
  setSimplifiedMode,
  setPublicRegistrationEnabled,
  updateEventBanner,
  getEventBanner,
  setScheduledOpenTime,
  getScheduledOpenTime,
  setAutoOpenEnabled
} from '../../redux/slices/queueSlice';
import { showAlert } from '../../redux/slices/uiSlice';
import { getNextRegistrationDate } from '../../utils/dateUtils';

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
  // 下次開科辦事開放報名時間設定
  const [scheduledOpenTime, setScheduledOpenTimeLocal] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  // 定時開放開關
  const [autoOpenEnabled, setAutoOpenEnabledLocal] = useState(false);
  // 活動報名區塊設定
  const [eventBannerData, setEventBannerData] = useState({
    enabled: false,
    title: '修玄宮特別活動',
    titleSize: '1.5rem',
    titleColor: '#1976d2',
    titleAlign: 'center',
    fontWeight: 'normal',
    backgroundColor: '#ffffff',
    buttonText: '點我填寫報名表單',
    buttonUrl: 'https://www.google.com',
    buttonColor: '#1976d2',
    buttonTextColor: '#ffffff'
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
      
      // 明確指定使用台北時區顯示
      return date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
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
        
        // 初始化定時開放開關
        if (typeof result.autoOpenEnabled !== 'undefined') {
          setAutoOpenEnabledLocal(result.autoOpenEnabled);
        }
        
        // 初始化活動報名區塊設定
        if (result.eventBanner) {
          setEventBannerData({
            enabled: result.eventBanner.enabled ?? false,
            title: result.eventBanner.title ?? '修玄宮特別活動',
            titleSize: result.eventBanner.titleSize ?? '1.5rem',
            titleColor: result.eventBanner.titleColor ?? '#1976d2',
            titleAlign: result.eventBanner.titleAlign ?? 'center',
            fontWeight: result.eventBanner.fontWeight ?? 'normal',
            backgroundColor: result.eventBanner.backgroundColor ?? '#ffffff',
            buttonText: result.eventBanner.buttonText ?? '點我填寫報名表單',
            buttonUrl: result.eventBanner.buttonUrl ?? 'https://www.google.com',
            buttonColor: result.eventBanner.buttonColor ?? '#1976d2',
            buttonTextColor: result.eventBanner.buttonTextColor ?? '#ffffff'
          });
        }
        
        // 初始化下次開科辦事開放報名時間設定
        const customValue = result.scheduledOpenTime;
        if (customValue) {
          // 有自訂值（Date 型別）
          setScheduledOpenTimeLocal(formatDateForInput(customValue));
          setUseCustomTime(true);
        } else {
          // 使用預設計算
          if (result.nextSessionDate) {
            const sessionDate = new Date(result.nextSessionDate);
            const nextDay = new Date(sessionDate);
            nextDay.setDate(sessionDate.getDate() + 1);
            nextDay.setHours(12, 0, 0, 0); // 設定為中午12:00
            setScheduledOpenTimeLocal(formatDateForInput(nextDay));
          } else {
            setScheduledOpenTimeLocal('');
          }
          setUseCustomTime(false);
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

  // 同步監聽eventBanner變化
  useEffect(() => {
    if (eventBanner) {
      setEventBannerData({
        enabled: eventBanner.enabled ?? false,
        title: eventBanner.title ?? '修玄宮特別活動',
        titleSize: eventBanner.titleSize ?? '1.5rem',
        titleColor: eventBanner.titleColor ?? '#1976d2',
        titleAlign: eventBanner.titleAlign ?? 'center',
        fontWeight: eventBanner.fontWeight ?? 'normal',
        backgroundColor: eventBanner.backgroundColor ?? '#ffffff',
        buttonText: eventBanner.buttonText ?? '點我填寫報名表單',
        buttonUrl: eventBanner.buttonUrl ?? 'https://www.google.com',
        buttonColor: eventBanner.buttonColor ?? '#1976d2',
        buttonTextColor: eventBanner.buttonTextColor ?? '#ffffff'
      });
    }
  }, [eventBanner]);

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

  // 計算動態預設值的輔助函數
  const getDefaultOpenTime = () => {
    if (queueStatus?.nextSessionDate) {
      const sessionDate = new Date(queueStatus.nextSessionDate);
      const nextDay = new Date(sessionDate);
      nextDay.setDate(sessionDate.getDate() + 1);
      nextDay.setHours(12, 0, 0, 0); // 設定為中午12:00
      return formatDateForInput(nextDay);
    }
    return '';
  };

  // 處理切換自訂/預設
  const handleToggleCustomTime = (event) => {
    const isCustom = event.target.checked;
    setUseCustomTime(isCustom);
    if (!isCustom) {
      // 切換回預設時，顯示計算的值
      setScheduledOpenTimeLocal(getDefaultOpenTime());
    }
  };

  // 處理儲存下次開科辦事開放報名時間設定
  const handleSaveScheduledOpenTime = () => {
    let valueToSave = null;
    
    if (useCustomTime && scheduledOpenTime) {
      // 將 datetime-local 的值視為台北時間，轉換為 ISO 字串
      // datetime-local 格式：2026-01-04T12:00
      // 我們需要明確指定這是台北時區（UTC+8）的時間
      const localDateTime = scheduledOpenTime; // "2026-01-04T12:00"
      // 加上台北時區偏移量 +08:00
      valueToSave = localDateTime + ':00+08:00'; // "2026-01-04T12:00:00+08:00"
    }
    
    dispatch(setScheduledOpenTime(valueToSave))
      .unwrap()
      .then(() => {
        dispatch(
          showAlert({
            message: useCustomTime 
              ? '開放報名時間設定已更新' 
              : '已恢復使用系統自動計算',
            severity: 'success'
          })
        );
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

  // 處理切換定時開放開關
  const handleToggleAutoOpenEnabled = async (event) => {
    const newValue = event.target.checked;
    setAutoOpenEnabledLocal(newValue);
    
    try {
      await dispatch(setAutoOpenEnabled(newValue)).unwrap();
      dispatch(showAlert({
        message: `定時開放已${newValue ? '啟用' : '停用'}`,
        severity: 'success'
      }));
      dispatch(getQueueStatus());
    } catch (error) {
      dispatch(showAlert({
        message: error,
        severity: 'error'
      }));
      setAutoOpenEnabledLocal(!newValue);
    }
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
        // 重新載入最新設定，確保資料同步
        dispatch(getEventBanner());
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
                    下次開科辦事開放報名時間
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    當候位人數達到上限時，系統會顯示此時間提示民眾何時可再次報名。
                  </Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useCustomTime}
                          onChange={handleToggleCustomTime}
                          color="primary"
                        />
                      }
                      label={useCustomTime ? '使用自訂時間' : '使用系統自動計算'}
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {useCustomTime 
                        ? '您可以選擇具體的日期和時間' 
                        : `系統將自動計算為「開科辦事日期 + 1天 + 中午12:00整」`}
                    </Alert>
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      type="datetime-local"
                      label="開放報名時間"
                      value={scheduledOpenTime}
                      onChange={(e) => setScheduledOpenTimeLocal(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      helperText={useCustomTime 
                        ? "選擇具體的日期和時間" 
                        : "預設值（自動計算），切換為「使用自訂時間」可修改"}
                      disabled={!useCustomTime}
                    />
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>預覽效果：</strong><br />
                        本次預約人數已達上限，敬請報名下次開科辦事，下次開科辦事開放報名時間為
                        <strong>
                          {scheduledOpenTime && useCustomTime 
                            ? formatDateForDisplay(scheduledOpenTime)
                            : queueStatus?.nextSessionDate 
                              ? `${getNextRegistrationDate(queueStatus.nextSessionDate)}中午12:00整`
                              : '未設定'}
                        </strong>
                      </Typography>
                    </Alert>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveScheduledOpenTime}
                      disabled={isLoading}
                    >
                      儲存設定
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* 保留現有的公開候位登記設置 */}
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

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>設定定時開放</strong>
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoOpenEnabled}
                          onChange={handleToggleAutoOpenEnabled}
                          color="primary"
                          disabled={!queueStatus?.nextSessionDate && !scheduledOpenTime}
                        />
                      }
                      label={autoOpenEnabled ? '定時開放已啟用' : '定時開放已停用'}
                    />
                    <Alert severity={autoOpenEnabled ? 'success' : 'info'} sx={{ mt: 2 }}>
                      {autoOpenEnabled
                        ? useCustomTime && scheduledOpenTime
                          ? `系統將在 ${formatDateForDisplay(scheduledOpenTime)} 自動開啟公開候位登記`
                          : queueStatus?.nextSessionDate
                            ? `系統將在 ${getNextRegistrationDate(queueStatus.nextSessionDate)}中午12:00整 自動開啟公開候位登記`
                            : '啟用後，系統會在「下次開科辦事開放報名時間」自動開啟公開候位登記功能'
                        : '啟用後，系統會在「下次開科辦事開放報名時間」自動開啟公開候位登記功能'}
                    </Alert>
                    {!queueStatus?.nextSessionDate && !scheduledOpenTime && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        請先設定「下次辦事時間」或「下次開科辦事開放報名時間」，才能啟用定時開放功能
                      </Alert>
                    )}
                  </Box>
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
                    <Grid item xs={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="字體大小"
                        value={parseFloat(eventBannerData.titleSize) || 1.5}
                        onChange={(e) => {
                          const value = e.target.value;
                          const unit = eventBannerData.titleSize.match(/(rem|px|em)/)?.[0] || 'rem';
                          setEventBannerData({...eventBannerData, titleSize: `${value}${unit}`});
                        }}
                        inputProps={{ min: 0.5, max: 5, step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <FormControl fullWidth>
                        <InputLabel>單位</InputLabel>
                        <Select
                          value={eventBannerData.titleSize.match(/(rem|px|em)/)?.[0] || 'rem'}
                          onChange={(e) => {
                            const num = parseFloat(eventBannerData.titleSize) || 1.5;
                            setEventBannerData({...eventBannerData, titleSize: `${num}${e.target.value}`});
                          }}
                        >
                          <MenuItem value="rem">rem</MenuItem>
                          <MenuItem value="px">px</MenuItem>
                          <MenuItem value="em">em</MenuItem>
                        </Select>
                      </FormControl>
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
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={eventBannerData.fontWeight === 'bold'}
                        onChange={(e) => setEventBannerData({
                          ...eventBannerData, 
                          fontWeight: e.target.checked ? 'bold' : 'normal'
                        })}
                      />
                    }
                    label="粗體"
                    sx={{ mt: 1 }}
                  />
                  
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
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="按鈕背景顏色"
                        type="color"
                        value={eventBannerData.buttonColor}
                        onChange={(e) => setEventBannerData({...eventBannerData, buttonColor: e.target.value})}
                        helperText="按鈕的背景顏色"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="按鈕文字顏色"
                        type="color"
                        value={eventBannerData.buttonTextColor}
                        onChange={(e) => setEventBannerData({...eventBannerData, buttonTextColor: e.target.value})}
                        helperText="按鈕上文字的顏色"
                      />
                    </Grid>
                  </Grid>
                  
                  <TextField
                    fullWidth
                    label="背景顏色"
                    type="color"
                    value={eventBannerData.backgroundColor}
                    onChange={(e) => setEventBannerData({...eventBannerData, backgroundColor: e.target.value})}
                    helperText="選擇區塊的背景顏色"
                    sx={{ mb: 2 }}
                  />
                  
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
                  <Card sx={{ 
                    bgcolor: eventBannerData.backgroundColor,
                    border: '2px solid white'
                  }}>
                    <CardContent>
                      <Typography
                        variant="h5"
                        align={eventBannerData.titleAlign}
                        sx={{
                          fontSize: eventBannerData.titleSize,
                          color: eventBannerData.titleColor,
                          fontWeight: eventBannerData.fontWeight,
                          mb: 2
                        }}
                      >
                        {eventBannerData.title || '（標題文字）'}
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled
                        sx={{
                          bgcolor: eventBannerData.buttonColor,
                          color: eventBannerData.buttonTextColor,
                          '&.Mui-disabled': {
                            bgcolor: eventBannerData.buttonColor,
                            color: eventBannerData.buttonTextColor,
                            opacity: 0.8
                          }
                        }}
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