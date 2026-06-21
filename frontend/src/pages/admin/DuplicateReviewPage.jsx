import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { MergeType as MergeIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { showAlert } from '../../redux/slices/uiSlice';
import { getDuplicateCustomers, mergeCustomer, dismissDuplicate } from '../../services/customerService';

const DuplicateReviewPage = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "merge-<id>-<targetId>" or "dismiss-<id>"

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDuplicateCustomers(token);
      setCustomers(result.customers || []);
    } catch (error) {
      console.error('載入疑似重複客戶失敗:', error);
      dispatch(showAlert({ message: '載入失敗，請稍後再試', severity: 'error' }));
    } finally {
      setLoading(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleMerge = async (customerId, targetId) => {
    const key = `merge-${customerId}-${targetId}`;
    setActionLoading(key);
    try {
      await mergeCustomer(token, customerId, targetId);
      setCustomers((prev) => prev.filter((c) => c._id !== customerId));
      dispatch(showAlert({ message: '已確認同人並完成合併', severity: 'success' }));
    } catch (error) {
      console.error('合併客戶失敗:', error);
      const msg = error.response?.data?.message || '合併失敗，請稍後再試';
      dispatch(showAlert({ message: msg, severity: 'error' }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (customerId) => {
    const key = `dismiss-${customerId}`;
    setActionLoading(key);
    try {
      await dismissDuplicate(token, customerId);
      setCustomers((prev) => prev.filter((c) => c._id !== customerId));
      dispatch(showAlert({ message: '已確認非同人，已移除複核標記', severity: 'success' }));
    } catch (error) {
      console.error('移除複核標記失敗:', error);
      const msg = error.response?.data?.message || '操作失敗，請稍後再試';
      dispatch(showAlert({ message: msg, severity: 'error' }));
    } finally {
      setActionLoading(null);
    }
  };

  const renderBirthInfo = (customer) => {
    if (customer.lunarBirthYear) {
      return `農曆 ${customer.lunarBirthYear}/${customer.lunarBirthMonth || '?'}/${customer.lunarBirthDay || '?'}`;
    }
    if (customer.gregorianBirthYear) {
      return `國曆 ${customer.gregorianBirthYear}/${customer.gregorianBirthMonth || '?'}/${customer.gregorianBirthDay || '?'}`;
    }
    return '-';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          疑似重複客戶複核
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          以下客戶與系統內現有客戶疑似重複，請逐筆確認是否為同一人。
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : customers.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">目前沒有待複核的疑似重複客戶</Typography>
        </Paper>
      ) : (
        customers.map((customer) => (
          <Paper key={customer._id} sx={{ mb: 3, p: 3 }}>
            {/* 待複核客戶基本資料 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" component="div">
                待複核：{customer.name}
                {customer.needsReview && (
                  <Chip label="待複核" color="warning" size="small" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                電話：{customer.phone || '-'} ／ 來訪次數：{customer.totalVisits || 0} ／ 生日：{renderBirthInfo(customer)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 疑似對象列表 */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              疑似重複對象（共 {(customer.possibleDuplicateOf || []).length} 筆）：
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>姓名</TableCell>
                    <TableCell>電話</TableCell>
                    <TableCell align="center">來訪次數</TableCell>
                    <TableCell>相似度</TableCell>
                    <TableCell>相似原因</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(customer.possibleDuplicateOf || []).map((dup) => {
                    const mergeKey = `merge-${customer._id}-${dup.customerId}`;
                    const dismissKey = `dismiss-${customer._id}`;
                    const isMerging = actionLoading === mergeKey;
                    const isDismissing = actionLoading === dismissKey;
                    const isAnyAction = actionLoading !== null;

                    return (
                      <TableRow key={dup.customerId}>
                        <TableCell>{dup.name || '-'}</TableCell>
                        <TableCell>{dup.phone || '-'}</TableCell>
                        <TableCell align="center">{dup.totalVisits != null ? dup.totalVisits : '-'}</TableCell>
                        <TableCell>
                          {dup.score != null ? (
                            <Chip
                              label={`${Math.round(dup.score * 100)}%`}
                              size="small"
                              color={dup.score >= 0.8 ? 'error' : 'warning'}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>{dup.reason || '-'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={isMerging ? <CircularProgress size={14} color="inherit" /> : <MergeIcon />}
                              disabled={isAnyAction}
                              onClick={() => handleMerge(customer._id, dup.customerId)}
                            >
                              確認同人，合併
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              startIcon={isDismissing ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
                              disabled={isAnyAction}
                              onClick={() => handleDismiss(customer._id)}
                            >
                              確認不同人
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}
    </Container>
  );
};

export default DuplicateReviewPage;
