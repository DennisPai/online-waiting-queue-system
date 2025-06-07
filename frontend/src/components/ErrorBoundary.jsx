import React from 'react';
import { Alert, Box, Button, Typography, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新狀態以顯示錯誤UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤詳情
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              系統發生錯誤
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              很抱歉，系統遇到了意外錯誤。請嘗試重新整理頁面，如果問題持續存在，請聯繫管理員。
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
                color="primary"
              >
                重新整理頁面
              </Button>
            </Box>
          </Alert>
          
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="warning">
              <Typography variant="h6" gutterBottom>
                開發模式錯誤詳情：
              </Typography>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </Typography>
            </Alert>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 