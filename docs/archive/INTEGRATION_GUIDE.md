# 匯出功能整合指南

## 🎯 目標
將 Excel 表格範本和 PDF 問事單功能整合到現有的候位系統中。

## 📋 整合步驟

### 第一步：安裝必要套件

```bash
cd frontend
npm install jspdf html2canvas
```

### 第二步：新增路由配置

修改 `frontend/src/App.js`：

```javascript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import store from './redux/store';
import theme from './theme';
import { FontSizeProvider } from './contexts/FontSizeContext';

// 現有組件導入
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import StatusPage from './pages/StatusPage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import ConditionalRegistrationRoute from './components/common/ConditionalRegistrationRoute';

// 新增預覽頁面導入
import ExcelPreviewPage from './pages/admin/ExcelPreviewPage';
import PDFPreviewPage from './pages/admin/PDFPreviewPage';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FontSizeProvider>
          <Routes>
            {/* 現有路由 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={
              <ConditionalRegistrationRoute>
                <RegisterPage />
              </ConditionalRegistrationRoute>
            } />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* 管理員路由 */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute>
                <AdminSettingsPage />
              </ProtectedRoute>
            } />
            
            {/* 新增預覽頁面路由 */}
            <Route path="/admin/excel-preview" element={
              <ProtectedRoute>
                <ExcelPreviewPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/pdf-preview" element={
              <ProtectedRoute>
                <PDFPreviewPage />
              </ProtectedRoute>
            } />
            
            {/* 重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FontSizeProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
```

### 第三步：修改 ExportDialog 組件

修改 `frontend/src/components/ExportDialog.jsx`：

```javascript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  TableChart as TableChartIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { formatCustomerDataForExport, exportToExcel, exportToCSV } from '../utils/exportUtils';

const ExportDialog = ({ open, onClose, customers = [], loading = false }) => {
  const [exportFormat, setExportFormat] = useState('excel');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!customers || customers.length === 0) {
      alert('沒有資料可以匯出');
      return;
    }

    setExporting(true);
    
    try {
      // 新增預覽功能的處理
      if (exportFormat === 'template') {
        // Excel 表格範本預覽
        sessionStorage.setItem('exportCustomers', JSON.stringify(customers));
        window.open('/admin/excel-preview', '_blank');
        onClose();
        return;
      }
      
      if (exportFormat === 'forms') {
        // PDF 問事單預覽
        sessionStorage.setItem('exportCustomers', JSON.stringify(customers));
        window.open('/admin/pdf-preview', '_blank');
        onClose();
        return;
      }
      
      // 現有匯出功能
      const formattedData = formatCustomerDataForExport(customers);
      
      if (exportFormat === 'excel') {
        await exportToExcel(formattedData, '線上候位系統客戶資料');
      } else if (exportFormat === 'csv') {
        await exportToCSV(formattedData, '線上候位系統客戶資料');
      }
      
      onClose();
    } catch (error) {
      alert(`匯出失敗: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleFormatChange = (event) => {
    setExportFormat(event.target.value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <FileDownloadIcon sx={{ mr: 1 }} />
          匯出客戶資料
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          選擇要匯出的格式類型
        </Typography>
        
        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <FormLabel component="legend">匯出格式</FormLabel>
          <RadioGroup
            value={exportFormat}
            onChange={handleFormatChange}
            sx={{ mt: 1 }}
          >
            {/* 現有選項 */}
            <FormControlLabel 
              value="excel" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center">
                  <TableChartIcon sx={{ mr: 1 }} />
                  詳細客戶資料 (Excel)
                </Box>
              } 
            />
            <FormControlLabel 
              value="csv" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center">
                  <TableChartIcon sx={{ mr: 1 }} />
                  詳細客戶資料 (CSV)
                </Box>
              } 
            />
            
            {/* 新增選項 */}
            <FormControlLabel 
              value="template" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center">
                  <AssignmentIcon sx={{ mr: 1 }} />
                  客戶資料表格範本 (Excel)
                </Box>
              } 
            />
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
          </RadioGroup>
        </FormControl>
        
        {/* 說明文字 */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          {exportFormat === 'excel' && (
            <Typography variant="body2">
              匯出所有客戶的完整詳細資料，包含家人資訊
            </Typography>
          )}
          {exportFormat === 'csv' && (
            <Typography variant="body2">
              匯出所有客戶的完整詳細資料，CSV格式便於處理
            </Typography>
          )}
          {exportFormat === 'template' && (
            <Typography variant="body2">
              匯出標準表格範本格式，包含合併儲存格，只包含等待中和處理中的客戶
            </Typography>
          )}
          {exportFormat === 'forms' && (
            <Typography variant="body2">
              生成修玄宮問事單 PDF，A4頁面包含兩張A5問事單，只包含等待中和處理中的客戶
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          取消
        </Button>
        <Button 
          onClick={handleExport} 
          variant="contained"
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
        >
          {exporting ? '處理中...' : (exportFormat === 'template' || exportFormat === 'forms' ? '預覽' : '匯出')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
```

### 第四步：擴展 exportUtils.js

在 `frontend/src/utils/exportUtils.js` 中新增功能：

```javascript
// 在現有程式碼最後新增以下內容

/**
 * 格式化客戶資料為表格範本格式
 */
export const formatCustomerDataForTemplate = (customers) => {
  const tableData = [];
  const mergeRanges = [];
  let currentRow = 1; // 第 0 行是標題

  // 篩選等待中和處理中的客戶
  const activeCustomers = customers.filter(customer => 
    customer.status === 'waiting' || customer.status === 'processing'
  );

  activeCustomers.forEach(customer => {
    const familyMembers = customer.familyMembers || [];
    const totalMembers = 1 + familyMembers.length;
    const allMembers = [customer, ...familyMembers];

    // 計算合併範圍
    const startRow = currentRow;
    const endRow = currentRow + totalMembers - 1;

    // 記錄需要合併的欄位 (完成、序號、人數、諮詢主題、備註)
    const mergeCols = [0, 1, 3, 9, 10];
    mergeCols.forEach(colIndex => {
      if (totalMembers > 1) { // 只有當有多個成員時才需要合併
        mergeRanges.push({
          s: { r: startRow, c: colIndex },
          e: { r: endRow, c: colIndex }
        });
      }
    });

    // 處理每個成員的資料
    allMembers.forEach((member, memberIndex) => {
      const isMainCustomer = memberIndex === 0;
      
      const rowData = {
        '完成': '', // 空白欄位
        '序號': isMainCustomer ? customer.queueNumber : '',
        '姓名': member.name,
        '人數': isMainCustomer ? totalMembers : '',
        '性別': member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '',
        '農曆生日': formatLunarDateForTemplate(member),
        '虛歲': member.virtualAge ? `${member.virtualAge}歲` : '',
        '地址': getAddressForMember(member, customer),
        '類型': getAddressTypeForMember(member, customer),
        '諮詢主題': isMainCustomer ? formatConsultationTopicsForTemplate(customer.consultationTopics, customer.otherDetails) : '',
        '備註': isMainCustomer ? (customer.remarks || '') : ''
      };

      tableData.push(rowData);
      currentRow++;
    });
  });

  return { tableData, mergeRanges };
};

/**
 * 格式化農曆日期（表格範本用）
 */
const formatLunarDateForTemplate = (person) => {
  if (!person.lunarBirthYear || !person.lunarBirthMonth || !person.lunarBirthDay) {
    return ''; // 無農曆資料則留空
  }
  
  const minguo = person.lunarBirthYear - 1911;
  return `民國${minguo}年${person.lunarBirthMonth}月${person.lunarBirthDay}日`;
};

/**
 * 獲取成員地址
 */
const getAddressForMember = (member, customer) => {
  // 家人有自己的地址就用自己的，否則用主客戶的
  if (member.address && member.address !== '臨時地址') {
    return member.address;
  }
  
  // 使用主客戶的第一個地址
  if (customer.addresses && customer.addresses.length > 0) {
    return customer.addresses[0].address;
  }
  
  return '臨時地址';
};

/**
 * 獲取成員地址類型
 */
const getAddressTypeForMember = (member, customer) => {
  const typeMap = {
    'home': '住家',
    'work': '工作場所', 
    'hospital': '醫院',
    'other': '其他'
  };

  // 家人有自己的地址類型就用自己的
  if (member.addressType) {
    return typeMap[member.addressType] || '住家';
  }
  
  // 使用主客戶的第一個地址類型
  if (customer.addresses && customer.addresses.length > 0) {
    return typeMap[customer.addresses[0].addressType] || '住家';
  }
  
  return '住家';
};

/**
 * 格式化諮詢主題（表格範本用）
 */
const formatConsultationTopicsForTemplate = (topics, otherDetails) => {
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
 * 匯出表格範本 Excel
 */
export const exportToTemplateExcel = (customers, filename = '客戶資料表格範本') => {
  try {
    const { tableData, mergeRanges } = formatCustomerDataForTemplate(customers);
    
    if (tableData.length === 0) {
      throw new Error('沒有符合條件的客戶資料（等待中或處理中）');
    }

    // 創建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData);
    
    // 應用合併儲存格
    ws['!merges'] = mergeRanges;
    
    // 設定欄位寬度
    const colWidths = [
      { wch: 8 },  // 完成
      { wch: 8 },  // 序號
      { wch: 12 }, // 姓名
      { wch: 8 },  // 人數
      { wch: 6 },  // 性別
      { wch: 18 }, // 農曆生日
      { wch: 8 },  // 虛歲
      { wch: 30 }, // 地址
      { wch: 12 }, // 類型
      { wch: 20 }, // 諮詢主題
      { wch: 15 }  // 備註
    ];
    ws['!cols'] = colWidths;
    
    // 設定行高
    const rowHeights = [];
    for (let i = 0; i < tableData.length + 1; i++) {
      rowHeights.push({ hpt: 20 });
    }
    ws['!rows'] = rowHeights;
    
    // 加入工作表
    XLSX.utils.book_append_sheet(wb, ws, '客戶資料表格範本');
    
    // 生成並下載
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('匯出Excel表格範本時發生錯誤:', error);
    throw new Error(`匯出Excel檔案失敗: ${error.message}`);
  }
};
```

### 第五步：建立檔案結構

建立以下新檔案：

1. `frontend/src/pages/admin/ExcelPreviewPage.jsx` - 參考 EXCEL_EXPORT_IMPLEMENTATION.md
2. `frontend/src/pages/admin/PDFPreviewPage.jsx` - 參考 PDF_FORMS_IMPLEMENTATION.md
3. `frontend/src/components/admin/ExcelPreviewTable.jsx` - 參考 EXCEL_EXPORT_IMPLEMENTATION.md
4. `frontend/src/components/admin/FormTemplate.jsx` - 參考 PDF_FORMS_IMPLEMENTATION.md
5. `frontend/src/utils/pdfGenerator.js` - 參考 PDF_FORMS_IMPLEMENTATION.md

### 第六步：更新索引檔案

更新 `frontend/src/components/admin/index.js`：

```javascript
export { default as CustomerDetailDialog } from './CustomerDetailDialog';
export { default as QueueTable } from './QueueTable';
export { default as ExcelPreviewTable } from './ExcelPreviewTable';
export { default as FormTemplate } from './FormTemplate';
```

### 第七步：測試整合

完成整合後，測試以下功能：

1. **匯出對話框**: 確認新增的兩個選項正常顯示
2. **Excel 預覽**: 點擊「客戶資料表格範本」能正常開啟預覽頁面
3. **PDF 預覽**: 點擊「修玄宮問事單」能正常開啟預覽頁面
4. **下載功能**: 在預覽頁面點擊下載能正常生成檔案
5. **資料篩選**: 確認只有等待中和處理中的客戶被處理
6. **路由保護**: 確認預覽頁面有管理員權限保護

## ⚠️ 注意事項

1. **瀏覽器兼容性**: PDF 生成功能在不同瀏覽器可能有差異，建議優先支援 Chrome
2. **性能考量**: 大量客戶時 PDF 生成可能較慢，建議加入載入指示
3. **記憶體管理**: PDF 預覽頁面使用完畢後應清理 sessionStorage
4. **錯誤處理**: 各個階段都需要適當的錯誤處理和用戶提示
5. **響應式設計**: 預覽頁面應考慮不同螢幕尺寸的顯示效果

## 🚀 部署注意事項

1. **套件更新**: 確保 package.json 包含新的依賴
2. **路由配置**: 確認新路由在生產環境正常工作
3. **靜態資源**: 如有使用到圖片或字體，確保正確部署
4. **瀏覽器政策**: 確認 PDF 下載不被瀏覽器阻擋

完成整合後，記得執行完整的功能測試和用戶體驗測試！
