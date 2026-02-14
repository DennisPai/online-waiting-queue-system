import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';

const RegistrationSuccess = ({
  registeredQueueNumber,
  waitingCount,
  registeredOrderIndex,
  maxOrderMessage,
  onBackToHome,
  embedded = false
}) => {
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
            您的資料已成功登記，我們會在接近開科辦事前公布您的候位資訊
          </Typography>
        </Box>

        {/* 重要提醒 */}
        <Card variant="outlined" sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: 'warning.main' }}>
              ⚠️ 重要提醒
            </Typography>
            <Typography variant="body2" paragraph>
              • 實際叫號時間可能因現場狀況而有所調整，敬請見諒
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
