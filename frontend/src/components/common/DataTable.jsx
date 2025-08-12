import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Typography,
  Box,
  Chip
} from '@mui/material';

/**
 * 通用數據表格組件
 * 支持分頁、排序、自定義渲染、載入狀態等
 */
const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  pagination = null,
  onPageChange,
  onRowsPerPageChange,
  emptyMessage = '暫無數據',
  stickyHeader = false,
  size = 'medium',
  onRowClick,
  selectedRows = [],
  customRowProps,
  ...props
}) => {
  // 渲染單元格內容
  const renderCellContent = (column, row, rowIndex) => {
    const { key, render, type = 'text' } = column;
    const value = row[key];

    // 如果有自定義渲染函數
    if (render && typeof render === 'function') {
      return render(value, row, rowIndex);
    }

    // 根據類型渲染不同內容
    switch (type) {
      case 'chip':
        if (Array.isArray(value)) {
          return value.map((item, index) => (
            <Chip key={index} label={item} size="small" sx={{ mr: 0.5 }} />
          ));
        }
        return <Chip label={value} size="small" />;

      case 'date':
        return value ? new Date(value).toLocaleDateString('zh-TW') : '';

      case 'datetime':
        return value ? new Date(value).toLocaleString('zh-TW') : '';

      case 'currency':
        return value ? `$${Number(value).toLocaleString()}` : '';

      case 'number':
        return value ? Number(value).toLocaleString() : '';

      case 'boolean':
        return value ? '是' : '否';

      case 'array':
        return Array.isArray(value) ? value.join(', ') : '';

      default:
        return value || '';
    }
  };

  // 處理行點擊
  const handleRowClick = (row, index) => {
    if (onRowClick) {
      onRowClick(row, index);
    }
  };

  // 獲取行的自定義屬性
  const getRowProps = (row, index) => {
    const isSelected = selectedRows.includes(row.id || row._id);
    const defaultProps = {
      hover: !!onRowClick,
      onClick: onRowClick ? () => handleRowClick(row, index) : undefined,
      sx: {
        cursor: onRowClick ? 'pointer' : 'default',
        ...(isSelected && {
          backgroundColor: 'rgba(25, 118, 210, 0.08)'
        })
      }
    };

    if (customRowProps && typeof customRowProps === 'function') {
      return { ...defaultProps, ...customRowProps(row, index) };
    }

    return defaultProps;
  };

  return (
    <Paper {...props}>
      <TableContainer>
        <Table stickyHeader={stickyHeader} size={size}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  style={{
                    minWidth: column.minWidth,
                    width: column.width,
                    fontWeight: 'bold',
                    ...column.headerStyle
                  }}
                >
                  {column.title || column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={row.id || row._id || index} {...getRowProps(row, index)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      style={column.cellStyle}
                    >
                      {renderCellContent(column, row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total || 0}
          page={(pagination.page || 1) - 1}
          rowsPerPage={pagination.limit || 10}
          onPageChange={(event, newPage) => {
            if (onPageChange) onPageChange(newPage + 1);
          }}
          onRowsPerPageChange={(event) => {
            if (onRowsPerPageChange) onRowsPerPageChange(parseInt(event.target.value, 10));
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="每頁顯示"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / 共 ${count !== -1 ? count : `超過 ${to}`} 項`
          }
        />
      )}
    </Paper>
  );
};

export default DataTable;
