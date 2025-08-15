import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import ExcelPreviewTable from '../../components/admin/ExcelPreviewTable';
import { formatCustomerDataForTemplate, exportToTemplateExcel } from '../../utils/exportUtils';

const ExcelPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    try {
      // 從 sessionStorage 或 location.state 獲取客戶資料
      const customersData = location.state?.customers || 
                           JSON.parse(sessionStorage.getItem('exportCustomers') || '[]');
      
      if (customersData.length === 0) {
        setError('沒有客戶資料可供預覽');
        setLoading(false);
        return;
      }

      const { tableData: formattedData } = formatCustomerDataForTemplate(customersData);
      setTableData(formattedData);
      
      // 清理 sessionStorage
      sessionStorage.removeItem('exportCustomers');
    } catch (err) {
      setError(`資料處理失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  const handleDownload = async () => {
    try {
      // 重新獲取原始客戶資料進行下載
      const customersData = location.state?.customers || 
                           JSON.parse(sessionStorage.getItem('exportCustomers') || '[]');
      await exportToTemplateExcel(customersData, '客戶資料表格範本');
    } catch (error) {
      alert(`下載失敗: ${error.message}`);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>處理資料中...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          返回
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          返回管理面板
        </Button>
        
        <Typography variant="h4" gutterBottom>
          客戶資料表格範本預覽
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          預覽下方表格格式，確認無誤後點擊下載 Excel 檔案
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{ mb: 3 }}
        >
          下載 Excel 檔案
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <ExcelPreviewTable data={tableData} />
      </Paper>
    </Container>
  );
};

export default ExcelPreviewPage;
