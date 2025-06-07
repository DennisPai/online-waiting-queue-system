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
  Description as DescriptionIcon
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
      // 格式化資料
      const formattedData = formatCustomerDataForExport(customers);
      
      if (exportFormat === 'excel') {
        await exportToExcel(formattedData, '線上候位系統客戶資料');
      } else if (exportFormat === 'csv') {
        await exportToCSV(formattedData, '線上候位系統客戶資料');
      }
      
      // 成功匯出後關閉對話框
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileDownloadIcon color="primary" />
          匯出客戶資料
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          將會匯出 <strong>{customers.length}</strong> 筆客戶資料
        </Typography>
        
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            選擇匯出格式
          </FormLabel>
          <RadioGroup
            value={exportFormat}
            onChange={handleFormatChange}
            sx={{ gap: 1 }}
          >
            <FormControlLabel
              value="excel"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TableChartIcon color="success" />
                  <Box>
                    <Typography variant="body1">
                      Excel 檔案 (.xlsx)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      適合資料分析和列印，支援欄位格式化
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 1,
                m: 0,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            />
            <FormControlLabel
              value="csv"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon color="info" />
                  <Box>
                    <Typography variant="body1">
                      CSV 檔案 (.csv)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      通用格式，可以在任何試算表軟體中開啟
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ 
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 1,
                m: 0,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            />
          </RadioGroup>
        </FormControl>
        
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
          <Typography variant="body2" color="primary">
            <strong>匯出內容包含最詳細的客戶資料：</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
            • <strong>基本資料</strong>：候位號碼、姓名、電話、電子郵件、性別<br/>
            • <strong>出生日期</strong>：國曆和農曆完整出生年月日（包含閏月資訊）<br/>
            • <strong>地址資訊</strong>：最多3個地址及其類型<br/>
            • <strong>家庭成員</strong>：每位家人的完整資料（姓名、出生日期、地址）<br/>
            • <strong>其他資訊</strong>：諮詢主題、虛歲、狀態、登記時間等<br/>
            • <strong>匯出格式</strong>：主客戶和家人分別為獨立行，便於詳細分析
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={exporting}
        >
          取消
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          color="primary"
          disabled={exporting || loading || customers.length === 0}
          startIcon={exporting ? <CircularProgress size={20} /> : <FileDownloadIcon />}
        >
          {exporting ? '匯出中...' : '開始匯出'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog; 