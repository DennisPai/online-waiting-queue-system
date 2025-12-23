import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { getNextRegistrationDate } from '../utils/dateUtils';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import QueueStatusDisplay from '../components/QueueStatusDisplay';
import EventBanner from '../components/EventBanner';
import { getQueueStatus, getOrderedQueueNumbers, getPublicOrderedNumbers } from '../redux/slices/queueSlice';
import { API_ENDPOINTS } from '../config/api';

// 獲取下一個等待的人
const getNextWaitingNumber = async (currentNumber) => {
  try {
    // 檢查是否使用 v1 API，如果是則使用新端點路徑
    const apiUrl = API_ENDPOINTS.QUEUE.includes('/v1/') 
      ? `${API_ENDPOINTS.QUEUE}/next-waiting?currentNumber=${currentNumber}`
      : `/api/queue/next-waiting?currentNumber=${currentNumber}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    // 處理 v1 格式回應
    return data.success ? (data.data?.nextWaitingNumber || data.data) : null;
  } catch (error) {
    console.error('獲取下一個等待號碼錯誤:', error);
    return null;
  }
};

const HomePage = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { queueStatus, eventBanner, isLoading, currentQueue, isQueueOpen, isFull } = useSelector((state) => state.queue);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // 計算顯示的時間：優先使用自訂值，否則使用動態計算
  const getDisplayDateTime = () => {
    // 如果有自訂值，格式化顯示
    if (queueStatus?.scheduledOpenTime) {
      try {
        const date = new Date(queueStatus.scheduledOpenTime);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch (error) {
        console.error('格式化日期錯誤:', error);
      }
    }
    // 否則使用動態計算
    if (queueStatus?.nextSessionDate) {
      const dateStr = getNextRegistrationDate(queueStatus.nextSessionDate);
      return `${dateStr}中午12:00整`;
    }
    return '未設定';
  };

  const displayDateTime = getDisplayDateTime();

  useEffect(() => {
    // 初始載入（總是執行）
    dispatch(getQueueStatus()); // 已包含 eventBanner，無需單獨調用
    
    // 根據登入狀態選擇適當的API獲取排序候位號碼
    if (isAuthenticated) {
      dispatch(getOrderedQueueNumbers());
    } else {
      dispatch(getPublicOrderedNumbers());
    }
    
    // 定期更新資料（僅在開始辦事時）
    let intervalId;
    if (isQueueOpen) {
      intervalId = setInterval(() => {
      dispatch(getQueueStatus());
      if (isAuthenticated) {
        dispatch(getOrderedQueueNumbers());
      } else {
        dispatch(getPublicOrderedNumbers());
      }
      }, 300000); // 每5分鐘更新一次（300秒 = 300,000毫秒）
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [dispatch, isAuthenticated, isQueueOpen]);
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        my: { xs: 2, md: 4 }, 
        p: { xs: 2, md: 3 }, 
        border: '1px solid #f0f0f0', 
        borderRadius: 2 
      }}>
        {isQueueOpen ? (
          <>
            <Typography 
              variant="h3" 
              component="h1" 
              align="center" 
              gutterBottom
              sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}
            >
              目前叫號
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              my: { xs: 1, md: 2 },
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <Typography 
                variant="h1" 
                color="primary" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '3rem', sm: '4rem', md: '6rem' }
                }}
              >
                {queueStatus?.currentQueueNumber || 0}
              </Typography>
              <Typography 
                variant="h3" 
                sx={{ 
                  ml: { xs: 0, sm: 2 },
                  fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
                }}
              >
                號
              </Typography>
            </Box>
            {queueStatus?.nextWaitingNumber && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" align="center" sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                  下一位等待號碼: <strong style={{ fontWeight: 'bold', fontSize: '1.375rem' }}>{queueStatus.nextWaitingNumber}</strong>
                </Typography>
              </>
            )}
          </>
        ) : (
          <>
            <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
              修玄宮天上聖母開科辦事
            </Typography>
            <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              透過網路輕鬆登記候位，不必排隊等待，隨時掌握最新狀態
            </Typography>
          </>
        )}
      </Box>

      <Grid container spacing={4} sx={{ my: 2 }}>
        <Grid item xs={12}>
          <QueueStatusDisplay queueStatus={queueStatus} isLoading={isLoading} />
          
          {/* 活動報名區塊 */}
          {eventBanner?.enabled && <EventBanner eventBanner={eventBanner} />}
        </Grid>

        {/* 當公開候位登記開啟時或管理員登入時才顯示候位登記功能，且未額滿 */}
        {(queueStatus?.publicRegistrationEnabled || isAuthenticated) && !isFull && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h4" component="div" gutterBottom sx={{ fontSize: { xs: '1.4rem', md: '1.6rem' } }}>
                  我要登記候位
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                  填寫基本資料進行候位登記，系統會自動為您安排候位號碼，省去現場排隊時間。
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                >
                  立即候位
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        {/* 當候位已額滿時顯示額滿提示卡片 */}
        {((queueStatus?.publicRegistrationEnabled || isAuthenticated) && isFull) && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h4" component="div" gutterBottom sx={{ fontSize: { xs: '1.4rem', md: '1.6rem' } }}>
                  本次報名已額滿
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                  本次預約人數已達上限，敬請報名下次開科辦事，下次開科辦事開放報名時間為{displayDateTime}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled
                  sx={{ 
                    bgcolor: 'grey.400',
                    color: 'white',
                    '&.Mui-disabled': {
                      bgcolor: 'grey.400',
                      color: 'white'
                    }
                  }}
                >
                  報名已額滿
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={(queueStatus?.publicRegistrationEnabled || isAuthenticated) ? 6 : 12}>
          <Card>
            <CardContent>
              <Typography variant="h4" component="div" gutterBottom sx={{ fontSize: { xs: '1.4rem', md: '1.6rem' } }}>
                查詢候位狀態
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                已登記候位？輸入您的姓名和電話查詢目前狀態和預估等待時間。
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/status/search"
                variant="outlined" 
                color="primary" 
                size="large"
                fullWidth
              >
                查詢候位
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
          使用步驟
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' } }}>
                1. 線上登記
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                在網站上填寫基本資料並提交，系統會為您安排候位號碼。
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' } }}>
                2. 預計時間
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                系統會顯示您的候位號碼與預估叫號時間，您可以隨時查詢候位狀態。
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' } }}>
                3. 提早10分鐘到現場
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
                接近您的號碼時，您可以前往現場準備，避免過號導致等待時間增加。
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage; 