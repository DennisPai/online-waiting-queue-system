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
