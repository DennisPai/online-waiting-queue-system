import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';

const RegistrationSuccess = ({
  registeredQueueNumber,
  waitingCount,
  estimatedWaitTime,
  estimatedEndTime,
  registeredOrderIndex,
  maxOrderMessage,
  onBackToHome,
  embedded = false
}) => {
  const formatEstimatedTime = (timeString) => {
    if (!timeString) return '計算中...';
    
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? '下午' : '上午';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      
      return `${period}${displayHours}點${minutes > 0 ? `${minutes}分` : ''}`;
    } catch (error) {
      console.error('時間格式化錯誤:', error);
      return '計算中...';
    }
  };

  const formatWaitTime = (minutes) => {
    if (!minutes || minutes <= 0) return '約0分鐘';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `約${hours}小時${mins > 0 ? `${mins}分鐘` : ''}`;
    } else {
      return `約${mins}分鐘`;
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* 成功標題 */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 80, 
              color: 'success.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            候位登記成功！
          </Typography>
          <Typography variant="h6" color="text.secondary">
            您的資料已成功登記，請記住您的候位資訊
          </Typography>
        </Box>

        {/* 候位資訊卡片 */}
        <Card>
          <CardContent>
            <Typography variant="h5" component="div" align="center" gutterBottom>
              候位登記成功！
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" color="text.secondary">
                您的候位號碼：
              </Typography>
              <Typography variant="h3" color="primary" sx={{ ml: 2 }}>
                {registeredQueueNumber}
              </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  您的叫號順序
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  第 {registeredOrderIndex || '?'} 號
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  前方等待組數
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {registeredOrderIndex ? `${Math.max(0, registeredOrderIndex - 1)} 組` : '計算中...'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  預估等待時間
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {formatWaitTime(estimatedWaitTime)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  預估叫號時間
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {formatEstimatedTime(estimatedEndTime)}
                </Typography>
              </Grid>
            </Grid>

            {maxOrderMessage && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  💡 {maxOrderMessage}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 重要提醒 */}
        <Card variant="outlined" sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'warning.main' }}>
              ⚠️ 重要提醒
            </Typography>
            <Typography variant="body2" paragraph>
              • 請記住您的候位號碼 <strong>{registeredQueueNumber}</strong>，叫號時會使用此號碼
            </Typography>
            <Typography variant="body2" paragraph>
              • 預估時間僅供參考，實際叫號時間可能因現場狀況而有所調整
            </Typography>
            <Typography variant="body2" paragraph>
              • 建議您在預估時間前 20 分鐘到場等候
            </Typography>
            <Typography variant="body2">
              • 您可以隨時使用首頁的「查詢候位」功能查看最新狀態
            </Typography>
          </CardContent>
        </Card>

        {/* 操作按鈕 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<HomeIcon />}
            onClick={onBackToHome}
            size="large"
          >
            {embedded ? '關閉' : '返回首頁'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default RegistrationSuccess;
