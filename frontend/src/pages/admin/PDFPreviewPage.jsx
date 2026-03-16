import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Button, Box,
  CircularProgress, Alert
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  ArrowBack as BackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import FormTemplate from '../../components/admin/FormTemplate';
import { generatePDFFromDOMPages } from '../../utils/pdfGenerator';

/**
 * 將候位清單轉換為分組陣列
 * 每筆候位記錄（每個 queueNumber）= 一個獨立的組
 * 組內成員：主記錄本人 + familyMembers（依陣列順序）
 * 組間按 queueNumber 升序
 */
function groupByAddress(customers) {
  const sorted = [...customers].sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));
  return sorted.map(c => {
    const addr = (c.addresses?.[0]?.address || '').trim();
    const addrType = c.addresses?.[0]?.addressType || '';
    return buildGroup(c, addr, addrType);
  });
}

function buildPersonRow(c) {
  return {
    name: c.name || '',
    gender: c.gender || '',
    lunarBirthYear: c.lunarBirthYear || null,
    lunarBirthMonth: c.lunarBirthMonth || null,
    lunarBirthDay: c.lunarBirthDay || null,
    lunarIsLeapMonth: c.lunarIsLeapMonth || false,
    virtualAge: c.virtualAge || null,
  };
}

function buildFamilyRow(fm) {
  return {
    name: fm.name || '',
    gender: fm.gender || '',
    lunarBirthYear: fm.lunarBirthYear || null,
    lunarBirthMonth: fm.lunarBirthMonth || null,
    lunarBirthDay: fm.lunarBirthDay || null,
    lunarIsLeapMonth: fm.lunarIsLeapMonth || false,
    virtualAge: fm.virtualAge || null,
  };
}

function buildGroup(c, addr, addrType) {
  const rows = [buildPersonRow(c)];
  for (const fm of (c.familyMembers || [])) {
    rows.push(buildFamilyRow(fm));
  }
  return {
    queueNumber: c.queueNumber,
    address: addr,
    addressType: addrType,
    consultationTopics: c.consultationTopics || [],
    otherDetails: c.otherDetails || '',
    rows,
  };
}

/**
 * 將 groups 按列數分頁（同一群組不拆頁）
 * maxRowsPerPage：每頁最大列數
 */
function paginateGroups(groups, maxRowsPerPage = 12) {
  const pages = [];
  let currentPage = [];
  let currentRowCount = 0;

  for (const group of groups) {
    const groupRows = group.rows.length;

    // 若加入此 group 後超過一頁，且當前頁已有內容 → 換頁
    if (currentRowCount + groupRows > maxRowsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentRowCount = 0;
    }

    currentPage.push(group);
    currentRowCount += groupRows;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

const PDFPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const pageRefs = useRef([]);

  useEffect(() => {
    try {
      const customersData = location.state?.customers ||
        JSON.parse(sessionStorage.getItem('exportCustomers') || '[]');

      if (customersData.length === 0) {
        setError('沒有客戶資料可供預覽');
        setLoading(false);
        return;
      }

      // 篩選 waiting + processing
      const active = customersData.filter(
        c => c.status === 'waiting' || c.status === 'processing'
      );

      if (active.length === 0) {
        setError('沒有等待中或處理中的客戶');
        setLoading(false);
        return;
      }

      // 分組 → 分頁
      const groups = groupByAddress(active);
      const paginated = paginateGroups(groups, 12);
      setPages(paginated);

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
      const validRefs = pageRefs.current.filter(Boolean);
      if (validRefs.length === 0) throw new Error('找不到可截圖的頁面元素');
      await generatePDFFromDOMPages(validRefs, '修玄宮問事單');
    } catch (err) {
      alert(`下載失敗: ${err.message}`);
    } finally {
      setGenerating(false);
    }
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
        <Button onClick={() => navigate('/admin/dashboard')} sx={{ mt: 2 }}>返回</Button>
      </Container>
    );
  }

  const totalGroups = pages.reduce((s, p) => s + p.length, 0);
  const totalRows = pages.reduce((s, p) => s + p.reduce((rs, g) => rs + g.rows.length, 0), 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/admin/dashboard')} sx={{ mb: 2 }}>
          返回管理面板
        </Button>
        <Typography variant="h4" gutterBottom>修玄宮問事單預覽</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          共 {totalGroups} 組 / {totalRows} 列，生成 {pages.length} 頁 PDF（橫式 A4）
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
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
            預覽列印
          </Button>
        </Box>
      </Box>

      {/* PDF 預覽區域 */}
      <Box sx={{ mb: 4 }}>
        {pages.map((pageGroups, pageIndex) => (
          <Paper
            key={pageIndex}
            sx={{
              mb: 3,
              p: 1,
              backgroundColor: '#f5f5f5',
              '@media print': { backgroundColor: 'white', boxShadow: 'none', margin: 0, padding: 0 }
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, '@media print': { display: 'none' } }}>
              第 {pageIndex + 1} 頁（{pageGroups.reduce((s, g) => s + g.rows.length, 0)} 列）
            </Typography>
            <Box
              ref={el => { pageRefs.current[pageIndex] = el; }}
              sx={{
                width: '297mm',
                height: '210mm',
                backgroundColor: 'white',
                margin: '0 auto',
                border: '1px solid #ddd',
                overflow: 'hidden',
                '@media print': { border: 'none', width: '100%', height: '100vh' }
              }}
            >
              <FormTemplate groups={pageGroups} pageIndex={pageIndex} />
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  );
};

export default PDFPreviewPage;
