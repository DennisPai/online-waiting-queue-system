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

const ExcelPreviewTable = ({ data, mergeRanges = [] }) => {
  const headers = ['完成', '序號', '姓名', '人數', '性別', '農曆生日', '虛歲', '地址', '類型', '諮詢主題', '備註'];
  
  // 檢查某個儲存格是否在合併範圍內
  const getMergedStatus = (rowIndex, colIndex) => {
    // 檢查是否在任何合併範圍內
    for (const range of mergeRanges) {
      if (colIndex === range.s.c && 
          rowIndex >= range.s.r && 
          rowIndex <= range.e.r) {
        // 如果是合併範圍的第一行，顯示內容
        return rowIndex === range.s.r ? 'first' : 'merged';
      }
    }
    return 'normal';
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
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header, colIndex) => {
                const mergeStatus = getMergedStatus(rowIndex, colIndex);
                
                // 如果是合併區域的非第一行，不顯示這個儲存格
                if (mergeStatus === 'merged') {
                  return null;
                }
                
                // 計算合併的行數
                let rowSpan = 1;
                if (mergeStatus === 'first') {
                  const range = mergeRanges.find(r => 
                    r.s.c === colIndex && r.s.r === rowIndex
                  );
                  if (range) {
                    rowSpan = range.e.r - range.s.r + 1;
                  }
                }
                
                return (
                  <StyledTableCell 
                    key={header}
                    merged={mergeStatus === 'first'}
                    rowSpan={rowSpan}
                    sx={{
                      backgroundColor: mergeStatus === 'first' ? '#f0f8ff' : 'white'
                    }}
                  >
                    {row[header]}
                  </StyledTableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExcelPreviewTable;
