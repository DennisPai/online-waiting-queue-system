# PDF 修玄宮問事單實作指南

## 🎯 目標
實作修玄宮問事單的 PDF 生成功能，A4 橫式頁面包含兩張 A5 直式問事單，支援預覽和下載。

## 📄 PDF 規格詳細

### 頁面規格
- **頁面格式**: A4 橫式 (297×210mm)
- **問事單尺寸**: A5 直式 (148×210mm) 
- **佈局**: 左右排列，每頁兩張問事單
- **裁切線**: 中間 1mm 虛線
- **邊距**: 四周各 5mm

### 問事單設計結構
```
┌─────────────────────────────────────────────┐ 148mm寬
│              修玄宮玄請示單               │
├──────────────┬────────────┬───────────────┤
│              │   地址：    │               │
│              │            │     姓名      │ 50mm高
│   請示內容    │ (客戶地址)  │  (客戶姓名)    │
│              │            │               │
│ (諮詢主題)    ├────────────┼───────────────┤
│              │            │     性別      │ 25mm高
│              │            │  (客戶性別)    │
│              │   年  年   ├───────────────┤
├──────────────┤            │     年齡      │ 25mm高
│   電話：      │   月  月   │  (客戶虛歲)    │
│              │            │               │
│ (客戶電話)    ├────────────┼───────────────┤
├──────────────┤            │   農曆出生     │ 40mm高
│   年 月 日   │   日  日   │  年 月 日 時   │
│              │            │  (客戶農曆)    │
├──────────────┤            ├───────────────┤
│   編號：      │   時  時   │               │ 25mm高
│ (候位號碼)    │            │               │
└──────────────┴────────────┴───────────────┘
```

## 🔧 技術實作

### 安裝必要套件
```bash
npm install jspdf html2canvas
```

### 1. pdfGenerator.js 核心邏輯

```javascript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 生成修玄宮問事單 PDF
 * @param {Array} customers - 客戶資料陣列
 * @param {string} filename - 檔案名稱
 */
export const generateFormsPDF = async (customers, filename = '修玄宮問事單') => {
  try {
    // 篩選等待中和處理中的客戶
    const activeCustomers = customers.filter(customer => 
      customer.status === 'waiting' || customer.status === 'processing'
    );

    if (activeCustomers.length === 0) {
      throw new Error('沒有符合條件的客戶資料');
    }

    // 創建 PDF，A4 橫式 (297mm x 210mm)
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // 計算需要的頁數，每頁兩張問事單
    const formsPerPage = 2;
    const totalPages = Math.ceil(activeCustomers.length / formsPerPage);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage('a4', 'landscape');
      }
      
      // 獲取當前頁要處理的客戶
      const startIndex = pageIndex * formsPerPage;
      const pageCustomers = activeCustomers.slice(startIndex, startIndex + formsPerPage);
      
      // 生成當前頁的問事單
      await generatePageForms(pdf, pageCustomers, pageIndex);
    }
    
    // 下載 PDF
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    pdf.save(`${filename}_${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('生成PDF時發生錯誤:', error);
    throw new Error(`生成PDF檔案失敗: ${error.message}`);
  }
};

/**
 * 生成單頁的問事單內容
 */
const generatePageForms = async (pdf, customers, pageIndex) => {
  const pageWidth = 297; // A4 橫式寬度
  const pageHeight = 210; // A4 橫式高度
  const formWidth = 148; // A5 直式寬度
  const formHeight = 200; // 問事單高度（留邊距）
  const margin = 5;
  
  for (let i = 0; i < customers.length && i < 2; i++) {
    const customer = customers[i];
    const xOffset = margin + (i * (formWidth + 1)); // 左邊問事單或右邊問事單
    const yOffset = margin;
    
    // 生成單張問事單
    await generateSingleForm(pdf, customer, xOffset, yOffset, formWidth, formHeight);
  }
  
  // 添加中間裁切線
  if (customers.length === 2) {
    const cutLineX = margin + formWidth + 0.5;
    pdf.setLineDash([2, 2]); // 虛線
    pdf.setDrawColor(128, 128, 128); // 灰色
    pdf.line(cutLineX, margin, cutLineX, pageHeight - margin);
    pdf.setLineDash([]); // 重置線條樣式
  }
};

/**
 * 生成單張問事單
 */
const generateSingleForm = async (pdf, customer, x, y, width, height) => {
  // 設定字體 (使用 PDF 內建字體)
  pdf.setFont('helvetica', 'normal');
  pdf.setDrawColor(0, 0, 0); // 黑色邊框
  pdf.setTextColor(0, 0, 0); // 黑色文字
  
  // 外框
  pdf.rect(x, y, width, height);
  
  // 標題區域
  const titleHeight = 15;
  pdf.rect(x, y, width, titleHeight);
  pdf.setFontSize(16);
  pdf.text('修玄宮玄請示單', x + width/2, y + titleHeight/2 + 3, { align: 'center' });
  
  // 主要內容區域分割
  const contentY = y + titleHeight;
  const contentHeight = height - titleHeight;
  
  // 左側請示內容區域
  const leftWidth = width * 0.4;
  const middleWidth = width * 0.25;  
  const rightWidth = width * 0.35;
  
  // 左側區域
  pdf.rect(x, contentY, leftWidth, contentHeight);
  pdf.setFontSize(12);
  pdf.text('請示內容', x + leftWidth/2, contentY + 15, { align: 'center' });
  
  // 填入諮詢主題
  const consultationText = formatConsultationTopics(customer.consultationTopics, customer.otherDetails);
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(consultationText, leftWidth - 10);
  pdf.text(lines, x + 5, contentY + 25);
  
  // 中間區域 (地址和時間)
  pdf.rect(x + leftWidth, contentY, middleWidth, contentHeight);
  
  // 地址區域
  const addressHeight = contentHeight * 0.3;
  pdf.rect(x + leftWidth, contentY, middleWidth, addressHeight);
  pdf.setFontSize(10);
  pdf.text('地址：', x + leftWidth + 2, contentY + 10);
  
  const address = getCustomerAddress(customer);
  const addressLines = pdf.splitTextToSize(address, middleWidth - 4);
  pdf.text(addressLines, x + leftWidth + 2, contentY + 18);
  
  // 時間區域
  const timeY = contentY + addressHeight;
  const timeHeight = contentHeight - addressHeight;
  pdf.rect(x + leftWidth, timeY, middleWidth, timeHeight);
  
  // 年月日時的格子
  const cellHeight = timeHeight / 4;
  const cellWidth = middleWidth / 2;
  
  ['年', '月', '日', '時'].forEach((label, index) => {
    const cellY = timeY + (index * cellHeight);
    pdf.rect(x + leftWidth, cellY, cellWidth, cellHeight);
    pdf.rect(x + leftWidth + cellWidth, cellY, cellWidth, cellHeight);
    pdf.setFontSize(10);
    pdf.text(label, x + leftWidth + cellWidth + cellWidth/2, cellY + cellHeight/2 + 2, { align: 'center' });
  });
  
  // 右側區域 (個人資料)
  pdf.rect(x + leftWidth + middleWidth, contentY, rightWidth, contentHeight);
  
  // 姓名
  const nameHeight = contentHeight * 0.25;
  pdf.rect(x + leftWidth + middleWidth, contentY, rightWidth, nameHeight);
  pdf.setFontSize(12);
  pdf.text('姓名', x + leftWidth + middleWidth + rightWidth/2, contentY + 8, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(customer.name, x + leftWidth + middleWidth + rightWidth/2, contentY + nameHeight - 5, { align: 'center' });
  
  // 性別
  const genderY = contentY + nameHeight;
  const genderHeight = contentHeight * 0.15;
  pdf.rect(x + leftWidth + middleWidth, genderY, rightWidth, genderHeight);
  pdf.setFontSize(10);
  pdf.text('性別', x + leftWidth + middleWidth + 5, genderY + 8);
  pdf.text(customer.gender === 'male' ? '男' : '女', x + leftWidth + middleWidth + rightWidth - 15, genderY + 8);
  
  // 年齡
  const ageY = genderY + genderHeight;
  const ageHeight = contentHeight * 0.15;
  pdf.rect(x + leftWidth + middleWidth, ageY, rightWidth, ageHeight);
  pdf.text('年齡', x + leftWidth + middleWidth + 5, ageY + 8);
  pdf.text(customer.virtualAge ? `${customer.virtualAge}歲` : '', x + leftWidth + middleWidth + rightWidth - 25, ageY + 8);
  
  // 農曆出生
  const birthY = ageY + ageHeight;
  const birthHeight = contentHeight * 0.25;
  pdf.rect(x + leftWidth + middleWidth, birthY, rightWidth, birthHeight);
  pdf.text('農曆出生', x + leftWidth + middleWidth + rightWidth/2, birthY + 8, { align: 'center' });
  pdf.text('年 月 日 時', x + leftWidth + middleWidth + rightWidth/2, birthY + 16, { align: 'center' });
  
  const lunarDate = formatLunarDate(customer);
  pdf.setFontSize(9);
  pdf.text(lunarDate, x + leftWidth + middleWidth + rightWidth/2, birthY + birthHeight - 8, { align: 'center' });
  
  // 底部電話和編號區域
  const bottomY = contentY + contentHeight * 0.8;
  const bottomHeight = contentHeight * 0.2;
  
  // 電話區域
  pdf.rect(x, bottomY, leftWidth, bottomHeight);
  pdf.setFontSize(10);
  pdf.text('電話：', x + 5, bottomY + 8);
  pdf.text(customer.phone || '', x + 20, bottomY + 8);
  
  // 年月日區域
  pdf.rect(x, bottomY + bottomHeight/2, leftWidth, bottomHeight/2);
  pdf.text('年    月    日', x + leftWidth/2, bottomY + bottomHeight/2 + 8, { align: 'center' });
  
  // 編號區域  
  pdf.rect(x, bottomY + bottomHeight, leftWidth, bottomHeight);
  pdf.text('編號：', x + 5, bottomY + bottomHeight + 8);
  pdf.text(customer.queueNumber.toString(), x + 25, bottomY + bottomHeight + 8);
};

/**
 * 格式化諮詢主題
 */
const formatConsultationTopics = (topics, otherDetails) => {
  if (!topics || topics.length === 0) return '';
  
  const topicMap = {
    'body': '身體',
    'fate': '運途', 
    'karma': '因果',
    'family': '家運/祖先',
    'career': '事業',
    'relationship': '婚姻感情',
    'study': '學業',
    'blessing': '收驚/加持',
    'other': '其他'
  };
  
  const translatedTopics = topics.map(topic => {
    if (topic === 'other' && otherDetails) {
      return `其他(${otherDetails})`;
    }
    return topicMap[topic] || topic;
  });
  
  return translatedTopics.join('、');
};

/**
 * 格式化農曆日期
 */
const formatLunarDate = (customer) => {
  if (!customer.lunarBirthYear || !customer.lunarBirthMonth || !customer.lunarBirthDay) {
    return '';
  }
  
  const minguo = customer.lunarBirthYear - 1911;
  return `民國${minguo}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日`;
};

/**
 * 獲取客戶地址
 */
const getCustomerAddress = (customer) => {
  if (customer.addresses && customer.addresses.length > 0) {
    return customer.addresses[0].address;
  }
  return '臨時地址';
};
```

### 2. PDFPreviewPage.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  ArrowBack as BackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import FormTemplate from '../components/admin/FormTemplate';
import { generateFormsPDF } from '../utils/pdfGenerator';

const PDFPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    try {
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
    navigate(-1);
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
                  <React.Fragment key={customer._id || index}>
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
```

### 3. FormTemplate.jsx

```javascript
import React from 'react';
import { Box, Typography, styled } from '@mui/material';

const FormContainer = styled(Box)({
  width: '148mm',
  height: '210mm',
  border: '2px solid black',
  backgroundColor: 'white',
  fontFamily: 'Arial, sans-serif',
  position: 'relative',
  padding: 0,
  margin: 0
});

const FormTitle = styled(Box)({
  height: '15mm',
  borderBottom: '2px solid black',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: 'bold'
});

const ContentArea = styled(Box)({
  height: 'calc(210mm - 15mm)',
  display: 'flex'
});

const LeftSection = styled(Box)({
  width: '40%',
  borderRight: '2px solid black',
  padding: '5mm',
  fontSize: '10px'
});

const MiddleSection = styled(Box)({
  width: '25%',
  borderRight: '2px solid black',
  display: 'flex',
  flexDirection: 'column'
});

const RightSection = styled(Box)({
  width: '35%',
  display: 'flex',
  flexDirection: 'column'
});

const Cell = styled(Box)(({ borderBottom = true }) => ({
  borderBottom: borderBottom ? '1px solid black' : 'none',
  padding: '2mm',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const FormTemplate = ({ customer }) => {
  const formatConsultationTopics = (topics, otherDetails) => {
    if (!topics || topics.length === 0) return '';
    
    const topicMap = {
      'body': '身體',
      'fate': '運途',
      'karma': '因果', 
      'family': '家運/祖先',
      'career': '事業',
      'relationship': '婚姻感情',
      'study': '學業',
      'blessing': '收驚/加持',
      'other': '其他'
    };
    
    const translatedTopics = topics.map(topic => {
      if (topic === 'other' && otherDetails) {
        return `其他(${otherDetails})`;
      }
      return topicMap[topic] || topic;
    });
    
    return translatedTopics.join('、');
  };

  const formatLunarDate = () => {
    if (!customer.lunarBirthYear || !customer.lunarBirthMonth || !customer.lunarBirthDay) {
      return '';
    }
    
    const minguo = customer.lunarBirthYear - 1911;
    return `民國${minguo}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日`;
  };

  const getAddress = () => {
    if (customer.addresses && customer.addresses.length > 0) {
      return customer.addresses[0].address;
    }
    return '臨時地址';
  };

  return (
    <FormContainer>
      <FormTitle>
        修玄宮玄請示單
      </FormTitle>
      
      <ContentArea>
        {/* 左側請示內容區域 */}
        <LeftSection>
          <Box sx={{ textAlign: 'center', mb: 1, fontWeight: 'bold' }}>
            請示內容
          </Box>
          <Box sx={{ fontSize: '9px', lineHeight: 1.4 }}>
            {formatConsultationTopics(customer.consultationTopics, customer.otherDetails)}
          </Box>
          
          {/* 底部電話和編號 */}
          <Box sx={{ position: 'absolute', bottom: '30mm', left: '5mm', right: '60%' }}>
            <Box sx={{ borderTop: '1px solid black', pt: 1, mb: 1 }}>
              電話：{customer.phone || ''}
            </Box>
            <Box sx={{ borderTop: '1px solid black', pt: 1, mb: 1 }}>
              年　　月　　日
            </Box>
            <Box sx={{ borderTop: '1px solid black', pt: 1 }}>
              編號：{customer.queueNumber}
            </Box>
          </Box>
        </LeftSection>

        {/* 中間區域 */}
        <MiddleSection>
          {/* 地址區域 */}
          <Box sx={{ height: '30%', borderBottom: '1px solid black', p: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '8px' }}>
              地址：
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '8px', display: 'block', mt: 0.5 }}>
              {getAddress()}
            </Typography>
          </Box>
          
          {/* 年月日時格子 */}
          <Box sx={{ height: '70%' }}>
            {['年', '月', '日', '時'].map((label, index) => (
              <Box key={label} sx={{ height: '25%', display: 'flex' }}>
                <Cell sx={{ width: '50%', borderRight: '1px solid black' }}>
                  {label}
                </Cell>
                <Cell sx={{ width: '50%' }}>
                  {label}
                </Cell>
              </Box>
            ))}
          </Box>
        </MiddleSection>

        {/* 右側個人資料區域 */}
        <RightSection>
          {/* 姓名 */}
          <Cell sx={{ height: '25%', fontSize: '12px', fontWeight: 'bold' }}>
            <Box>
              <Typography variant="caption" sx={{ fontSize: '10px' }}>姓名</Typography>
              <Typography sx={{ fontSize: '14px', mt: 0.5 }}>{customer.name}</Typography>
            </Box>
          </Cell>
          
          {/* 性別 */}
          <Cell sx={{ height: '15%' }}>
            性別：{customer.gender === 'male' ? '男' : '女'}
          </Cell>
          
          {/* 年齡 */}
          <Cell sx={{ height: '15%' }}>
            年齡：{customer.virtualAge ? `${customer.virtualAge}歲` : ''}
          </Cell>
          
          {/* 農曆出生 */}
          <Cell sx={{ height: '25%', flexDirection: 'column', borderBottom: false }}>
            <Typography variant="caption" sx={{ fontSize: '9px' }}>
              農曆出生年月日時
            </Typography>
            <Typography sx={{ fontSize: '8px', mt: 0.5 }}>
              {formatLunarDate()}
            </Typography>
          </Cell>
          
          {/* 空白區域 */}
          <Box sx={{ height: '20%' }} />
        </RightSection>
      </ContentArea>
    </FormContainer>
  );
};

export default FormTemplate;
```

## 🔄 整合到 ExportDialog

在 ExportDialog.jsx 中新增 PDF 選項：

```javascript
<FormControlLabel 
  value="forms" 
  control={<Radio />} 
  label={
    <Box display="flex" alignItems="center">
      <DescriptionIcon sx={{ mr: 1 }} />
      修玄宮問事單 (PDF)
    </Box>
  } 
/>
```

並在 handleExport 中加入：

```javascript
if (exportFormat === 'forms') {
  // 新開頁面預覽
  window.open('/admin/pdf-preview', '_blank');
  sessionStorage.setItem('exportCustomers', JSON.stringify(customers));
  onClose();
  return;
}
```

## ✅ 測試檢查點

1. **PDF 佈局**: 確認 A4 橫式包含兩張 A5 直式問事單
2. **裁切線**: 驗證中間虛線正確顯示
3. **資料填入**: 檢查所有客戶資料正確對應到問事單欄位
4. **農曆日期**: 測試各種日期格式和空值處理
5. **列印測試**: 實際列印測試確認尺寸和佈局正確
6. **預覽功能**: 確認預覽頁面正確顯示所有問事單
