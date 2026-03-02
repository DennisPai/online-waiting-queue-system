# Excel 表格範本匯出實作指南

## 🎯 目標
實作客戶資料表格範本的 Excel 匯出功能，支援合併儲存格和預覽機制。

## 📊 詳細資料結構

### 輸入資料篩選
```javascript
// 只處理等待中和處理中的客戶
const activeCustomers = customers.filter(customer => 
  customer.status === 'waiting' || customer.status === 'processing'
);
```

### 輸出表格結構
```javascript
const tableColumns = [
  { key: 'complete', label: '完成', merge: true },
  { key: 'queueNumber', label: '序號', merge: true },
  { key: 'name', label: '姓名', merge: false },
  { key: 'totalMembers', label: '人數', merge: true },
  { key: 'gender', label: '性別', merge: false },
  { key: 'lunarBirth', label: '農曆生日', merge: false },
  { key: 'virtualAge', label: '虛歲', merge: false },
  { key: 'address', label: '地址', merge: false },
  { key: 'addressType', label: '類型', merge: false },
  { key: 'consultationTopics', label: '諮詢主題', merge: true },
  { key: 'remarks', label: '備註', merge: true }
];
```

## 🔧 核心實作函數

### 1. formatCustomerDataForTemplate()
```javascript
export const formatCustomerDataForTemplate = (customers) => {
  const tableData = [];
  const mergeRanges = [];
  let currentRow = 1; // 第 0 行是標題

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

    // 記錄需要合併的欄位
    const mergeCols = [0, 1, 3, 9, 10]; // 完成、序號、人數、諮詢主題、備註
    mergeCols.forEach(colIndex => {
      mergeRanges.push({
        s: { r: startRow, c: colIndex },
        e: { r: endRow, c: colIndex }
      });
    });

    // 處理每個成員的資料
    allMembers.forEach((member, memberIndex) => {
      const isMainCustomer = memberIndex === 0;
      
      const rowData = {
        '完成': '', // 空白
        '序號': isMainCustomer ? customer.queueNumber : '',
        '姓名': member.name,
        '人數': isMainCustomer ? totalMembers : '',
        '性別': member.gender === 'male' ? '男' : '女',
        '農曆生日': formatLunarDate(member),
        '虛歲': member.virtualAge ? `${member.virtualAge}歲` : '',
        '地址': getAddressForMember(member, customer),
        '類型': getAddressTypeForMember(member, customer),
        '諮詢主題': isMainCustomer ? formatConsultationTopics(customer.consultationTopics, customer.otherDetails) : '',
        '備註': isMainCustomer ? (customer.remarks || '') : ''
      };

      tableData.push(rowData);
      currentRow++;
    });
  });

  return { tableData, mergeRanges };
};
```

### 2. formatLunarDate()
```javascript
const formatLunarDate = (person) => {
  if (!person.lunarBirthYear || !person.lunarBirthMonth || !person.lunarBirthDay) {
    return ''; // 無農曆資料則留空
  }
  
  const minguo = person.lunarBirthYear - 1911;
  return `民國${minguo}年${person.lunarBirthMonth}月${person.lunarBirthDay}日`;
};
```

### 3. getAddressForMember()
```javascript
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
```

### 4. getAddressTypeForMember()
```javascript
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
```

### 5. formatConsultationTopics()
```javascript
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
```

### 6. exportToTemplateExcel()
```javascript
export const exportToTemplateExcel = (customers, filename = '客戶資料表格範本') => {
  try {
    const { tableData, mergeRanges } = formatCustomerDataForTemplate(customers);
    
    if (tableData.length === 0) {
      throw new Error('沒有符合條件的客戶資料');
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
    
    // 設定行高（合併儲存格需要適當行高）
    const rowHeights = [];
    for (let i = 0; i < tableData.length + 1; i++) {
      rowHeights.push({ hpt: 20 }); // 20 像素高度
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

## 🖥️ 預覽頁面實作

### ExcelPreviewPage.jsx
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
  Alert
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import ExcelPreviewTable from '../components/admin/ExcelPreviewTable';
import { formatCustomerDataForTemplate, exportToTemplateExcel } from '../utils/exportUtils';

const ExcelPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const customers = location.state?.customers || [];

  useEffect(() => {
    try {
      if (customers.length === 0) {
        setError('沒有客戶資料可供預覽');
        setLoading(false);
        return;
      }

      const { tableData: formattedData } = formatCustomerDataForTemplate(customers);
      setTableData(formattedData);
    } catch (err) {
      setError(`資料處理失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [customers]);

  const handleDownload = async () => {
    try {
      await exportToTemplateExcel(customers, '客戶資料表格範本');
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
```

### ExcelPreviewTable.jsx
```javascript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  styled
} from '@mui/material';

const StyledTableCell = styled(TableCell)(({ theme, merged }) => ({
  border: '1px solid #ddd',
  padding: '8px',
  fontSize: '12px',
  backgroundColor: merged ? '#f5f5f5' : 'white',
  textAlign: 'center',
  verticalAlign: 'middle'
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  border: '1px solid #ddd',
  padding: '8px',
  fontSize: '13px',
  fontWeight: 'bold',
  backgroundColor: '#e0e0e0',
  textAlign: 'center'
}));

const ExcelPreviewTable = ({ data }) => {
  const headers = ['完成', '序號', '姓名', '人數', '性別', '農曆生日', '虛歲', '地址', '類型', '諮詢主題', '備註'];
  
  // 標記合併儲存格的邏輯
  const getMergedStatus = (rowIndex, colKey) => {
    const mergeCols = ['完成', '序號', '人數', '諮詢主題', '備註'];
    if (!mergeCols.includes(colKey)) return false;
    
    // 簡化版：如果該欄位為空，表示是合併的下半部
    return data[rowIndex][colKey] === '';
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <StyledHeaderCell key={header}>
                {header}
              </StyledHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <StyledTableCell 
                  key={header}
                  merged={getMergedStatus(index, header)}
                >
                  {row[header]}
                </StyledTableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExcelPreviewTable;
```

## 🔄 修改 ExportDialog.jsx

在現有的 ExportDialog 中新增選項：

```javascript
// 在 RadioGroup 中新增
<FormControlLabel 
  value="template" 
  control={<Radio />} 
  label={
    <Box display="flex" alignItems="center">
      <TableChartIcon sx={{ mr: 1 }} />
      客戶資料表格範本 (Excel)
    </Box>
  } 
/>
```

並修改 handleExport 函數：

```javascript
const handleExport = async () => {
  // ... 現有邏輯 ...
  
  if (exportFormat === 'template') {
    // 新開頁面預覽
    const newWindow = window.open('/admin/excel-preview', '_blank');
    if (newWindow) {
      // 通過 postMessage 傳遞資料，或存儲到 sessionStorage
      sessionStorage.setItem('exportCustomers', JSON.stringify(formattedData));
    }
    onClose();
    return;
  }
  
  // ... 其他格式的處理 ...
};
```

## ✅ 測試檢查點

1. **資料篩選**: 確認只有 waiting 和 processing 狀態的客戶被匯出
2. **合併儲存格**: 驗證完成、序號、人數、諮詢主題、備註欄位正確合併
3. **農曆日期**: 測試各種日期格式和空值情況
4. **預覽功能**: 確認預覽頁面正確顯示表格格式
5. **下載功能**: 驗證生成的 Excel 檔案格式正確
