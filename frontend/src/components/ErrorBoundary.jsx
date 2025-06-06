import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新狀態，以便下一次渲染將顯示失敗的UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 可以將錯誤記錄到錯誤報告服務
    console.error('錯誤邊界捕捉到錯誤:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      // 自定義錯誤UI
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              糟糕！出現了一個錯誤
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              頁面發生了未預期的錯誤，請嘗試重新載入或聯繫技術支援。
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={this.handleReset}
              sx={{ mr: 1 }}
            >
              重試
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
            >
              重新載入頁面
            </Button>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="h6" color="error">
                開發模式錯誤詳情：
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                backgroundColor: '#f5f5f5', 
                p: 2, 
                overflow: 'auto',
                fontSize: '0.8rem'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 