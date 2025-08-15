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
  ArrowBack as BackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import FormTemplate from '../../components/admin/FormTemplate';
import { generateFormsPDF } from '../../utils/pdfGenerator';

const PDFPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

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

      // 篩選等待中和處理中的客戶
      const activeCustomers = customersData.filter(customer => 
        customer.status === 'waiting' || customer.status === 'processing'
      );

      setCustomers(activeCustomers);
      
      // 清理 sessionStorage
      sessionStorage.removeItem('exportCustomers');
    } catch (err) {
      setError(`資料載入失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await generateFormsPDF(customers, '修玄宮問事單');
    } catch (error) {
      alert(`下載失敗: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    // 由於預覽頁面是新開視窗，需要直接跳轉到管理頁面
    navigate('/admin/dashboard');
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>載入資料中...</Typography>
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

  // 計算頁數，每頁兩張問事單
  const formsPerPage = 2;
  const totalPages = Math.ceil(customers.length / formsPerPage);

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
          修玄宮問事單預覽
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          共 {customers.length} 位客戶，將生成 {totalPages} 頁 PDF（每頁 2 張問事單）
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} /> : <DownloadIcon />}
            onClick={handleDownload}
            disabled={generating}
            sx={{ mr: 2 }}
          >
            {generating ? '生成中...' : '下載 PDF'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            預覽列印
          </Button>
        </Box>
      </Box>

      {/* PDF 預覽區域 */}
      <Box sx={{ mb: 4 }}>
        {Array.from({ length: totalPages }, (_, pageIndex) => {
          const startIndex = pageIndex * formsPerPage;
          const pageCustomers = customers.slice(startIndex, startIndex + formsPerPage);
          
          return (
            <Paper 
              key={pageIndex}
              sx={{ 
                mb: 3, 
                p: 1,
                backgroundColor: '#f5f5f5',
                '@media print': {
                  backgroundColor: 'white',
                  boxShadow: 'none',
                  margin: 0,
                  padding: 0
                }
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, '@media print': { display: 'none' } }}>
                第 {pageIndex + 1} 頁
              </Typography>
              
              <Box 
                sx={{ 
                  width: '297mm',
                  height: '210mm',
                  backgroundColor: 'white',
                  display: 'flex',
                  margin: '0 auto',
                  border: '1px solid #ddd',
                  '@media print': {
                    border: 'none',
                    width: '100%',
                    height: '100vh'
                  }
                }}
              >
                {pageCustomers.map((customer, index) => (
                  <React.Fragment key={customer._id || customer.queueNumber || index}>
                    <Box sx={{ width: '148mm', height: '210mm' }}>
                      <FormTemplate customer={customer} />
                    </Box>
                    
                    {/* 裁切線 */}
                    {index < pageCustomers.length - 1 && (
                      <Box 
                        sx={{ 
                          width: '1mm',
                          height: '210mm',
                          borderLeft: '1px dashed #999',
                          '@media print': {
                            borderColor: '#ccc'
                          }
                        }} 
                      />
                    )}
                  </React.Fragment>
                ))}
                
                {/* 如果只有一張問事單，右側留空 */}
                {pageCustomers.length === 1 && (
                  <Box sx={{ width: '148mm', height: '210mm', backgroundColor: '#fafafa' }} />
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Container>
  );
};

export default PDFPreviewPage;
