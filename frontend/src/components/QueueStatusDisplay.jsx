import React from 'react';
import { 
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import { format, addMinutes } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const QueueStatusDisplay = ({ queueStatus, isLoading }) => {
  // 安全的日期轉換函數
  const safeDateConversion = (dateValue, context = 'unknown') => {
    try {
      if (!dateValue) return null;
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn(`${context}: 無效的日期值`, dateValue);
        return null;
      }
      
      return date;
    } catch (error) {
      console.error(`${context}: 日期轉換錯誤`, error);
      return null;
    }
  };

  // 計算預估結束時間
  const calculateEstimatedEndTime = () => {
    try {
      if (!queueStatus || !queueStatus.nextSessionDate) return null;
      
      // 安全地轉換下次辦事時間
      const nextSessionDate = safeDateConversion(queueStatus.nextSessionDate, 'calculateEstimatedEndTime');
      if (!nextSessionDate) return null;
      
      // 使用estimatedWaitTime（已經是所有客戶總人數 * 每位客戶預估處理時間）
      const waitTimeInMinutes = queueStatus.estimatedWaitTime || 0;
      const endTime = addMinutes(nextSessionDate, waitTimeInMinutes);
      
      // 格式化時間，顯示上下午
      return format(endTime, 'aah點mm分', { locale: zhTW });
    } catch (error) {
      console.error('calculateEstimatedEndTime 錯誤:', error);
      return '計算錯誤';
    }
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!queueStatus) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="text.secondary" align="center">
            無法獲取候位狀態
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // 候位系統關閉時顯示
  if (!queueStatus.isOpen) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom align="center">
            修玄宮天上聖母開科辦事
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
            下次辦事時間:
          </Typography>
          <Typography variant="h4" color="primary" align="center" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
            {(() => {
              try {
                if (queueStatus.nextSessionDate) {
                  const date = safeDateConversion(queueStatus.nextSessionDate, '下次辦事時間顯示');
                  if (date) {
                    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhTW });
                  } else {
                    return '日期格式異常';
                  }
                } else {
                  return '尚未設定';
                }
              } catch (error) {
                console.error('下次辦事時間顯示錯誤:', error);
                return '顯示錯誤';
              }
            })()}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // 候位系統開放時顯示
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom align="center">
          目前狀態
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                目前叫號
              </Typography>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', fontSize: { xs: '2.125rem', md: '2.375rem' } }}>
                {queueStatus.currentQueueNumber || 0}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                等待人數
              </Typography>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', fontSize: { xs: '2.125rem', md: '2.375rem' } }}>
                {queueStatus.waitingCount || 0}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                預估結束時間
              </Typography>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', fontSize: { xs: '2.125rem', md: '2.375rem' } }}>
                {calculateEstimatedEndTime() || '暫無'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {queueStatus.nextWaitingNumber && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              下一個等待號碼
            </Typography>
            <Typography variant="h4" color="secondary" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', md: '2rem' } }}>
              {queueStatus.nextWaitingNumber}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default QueueStatusDisplay; 