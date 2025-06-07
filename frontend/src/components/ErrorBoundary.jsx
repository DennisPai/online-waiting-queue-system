import React from 'react';
import {
  Container,
  Typography,
  Button,
  Alert,
  Box
} from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 以顯示降級 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 可以將錯誤記錄到錯誤報告服務
    console.error('ErrorBoundary 捕獲錯誤:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // 可以自定義降級 UI
      return (
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              系統錯誤
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              頁面發生錯誤，請重新整理頁面或聯繫系統管理員
            </Alert>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              重新整理頁面
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  錯誤詳細（開發模式）：
                </Typography>
                <Alert severity="warning">
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo.componentStack}
                  </pre>
                </Alert>
              </Box>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 