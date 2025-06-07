import React from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使得下一次渲染能夠顯示錯誤UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤到日誌系統
    logger.error('React 錯誤邊界捕獲到錯誤', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString()
    }, 'ErrorBoundary');

    // 保存錯誤詳情到state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    console.error('錯誤邊界捕獲到錯誤:', error, errorInfo);
  }

  handleReload = () => {
    logger.userAction('用戶點擊重新載入按鈕', null, 'ErrorBoundary');
    window.location.reload();
  };

  handleGoBack = () => {
    logger.userAction('用戶點擊返回按鈕', null, 'ErrorBoundary');
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      // 自定義的錯誤UI
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                哎呀！出現了一個錯誤
              </Typography>
              <Typography variant="body1" paragraph>
                應用程式遇到了意外錯誤。我們已經記錄了這個問題，將會盡快修復。
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={this.handleReload}
                sx={{ mr: 2 }}
              >
                重新載入頁面
              </Button>
              <Button 
                variant="outlined" 
                onClick={this.handleGoBack}
              >
                返回上一頁
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    開發模式錯誤詳情：
                  </Typography>
                </Alert>
                
                <Box 
                  component="pre" 
                  sx={{ 
                    backgroundColor: '#f5f5f5', 
                    p: 2, 
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem',
                    maxHeight: '300px'
                  }}
                >
                  <Typography variant="body2" color="error" gutterBottom>
                    <strong>錯誤訊息:</strong>
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {this.state.error.toString()}
                  </Typography>
                  
                  <Typography variant="body2" color="error" gutterBottom sx={{ mt: 2 }}>
                    <strong>組件堆疊:</strong>
                  </Typography>
                  <Typography variant="body2" component="div">
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="text" 
                    size="small"
                    onClick={() => {
                      logger.userAction('導出錯誤日誌', null, 'ErrorBoundary');
                      logger.exportLogs();
                    }}
                  >
                    導出錯誤日誌
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 4 }}>
              <Typography variant="body2" color="text.secondary">
                如果問題持續發生，請聯繫系統管理員。
                <br />
                您可以開啟瀏覽器開發者工具查看詳細日誌，或使用 logger.showLogViewer() 查看系統日誌。
              </Typography>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 