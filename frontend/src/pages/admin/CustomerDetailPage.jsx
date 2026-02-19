import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, Grid, Divider, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import { getCustomer, updateCustomer, getVisitHistory } from '../../services/customerService';

const topicMap = {
  body: '身體', fate: '運途', karma: '因果', family: '家運/祖先',
  career: '事業', relationship: '婚姻感情', study: '學業',
  blessing: '收驚/加持', other: '其他'
};

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [customer, setCustomer] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cust, visitData] = await Promise.all([
          getCustomer(token, id),
          getVisitHistory(token, id)
        ]);
        setCustomer(cust);
        setEditData({ name: cust.name, phone: cust.phone || '', notes: cust.notes || '', tags: (cust.tags || []).join(', ') });
        setVisits(visitData.visits || []);
      } catch (error) {
        console.error('載入客戶資料失敗:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, id]);

  const handleSave = async () => {
    try {
      const data = {
        ...editData,
        tags: editData.tags ? editData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      const updated = await updateCustomer(token, id, data);
      setCustomer(updated);
      setEditing(false);
      setSaveMsg('已儲存');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (error) {
      console.error('儲存失敗:', error);
      setSaveMsg('儲存失敗');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!customer) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">查無此客戶</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/admin/customers')}>返回列表</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/customers')}>
          返回列表
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {customer.name}
        </Typography>
        {!editing ? (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            編輯
          </Button>
        ) : (
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            儲存
          </Button>
        )}
      </Box>

      {saveMsg && <Alert severity={saveMsg === '已儲存' ? 'success' : 'error'} sx={{ mb: 2 }}>{saveMsg}</Alert>}

      {/* 基本資料 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>基本資料</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">姓名</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            ) : (
              <Typography>{customer.name}</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">電話</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            ) : (
              <Typography>{customer.phone || '未提供'}</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">性別</Typography>
            <Typography>{customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : '未設定'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">累計來訪</Typography>
            <Typography>{customer.totalVisits || 0} 次</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">標籤</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.tags} onChange={(e) => setEditData({ ...editData, tags: e.target.value })} helperText="用逗號分隔" />
            ) : (
              <Box sx={{ mt: 0.5 }}>
                {(customer.tags || []).length > 0 ? customer.tags.map(tag => (
                  <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                )) : <Typography color="text.secondary">無</Typography>}
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* 備註 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>備註</Typography>
        <Divider sx={{ mb: 2 }} />
        {editing ? (
          <TextField
            multiline rows={4} fullWidth
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
          />
        ) : (
          <Typography sx={{ whiteSpace: 'pre-line' }}>{customer.notes || '無'}</Typography>
        )}
      </Paper>

      {/* 歷史來訪記錄 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>歷史來訪記錄</Typography>
        <Divider sx={{ mb: 2 }} />
        {visits.length === 0 ? (
          <Typography color="text.secondary">尚無來訪記錄</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell>候位號碼</TableCell>
                  <TableCell>諮詢主題</TableCell>
                  <TableCell>備註</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit._id}>
                    <TableCell>{new Date(visit.sessionDate).toLocaleDateString('zh-TW')}</TableCell>
                    <TableCell>{visit.queueNumber || '-'}</TableCell>
                    <TableCell>
                      {(visit.consultationTopics || []).map(t => topicMap[t] || t).join('、') || '-'}
                    </TableCell>
                    <TableCell>{visit.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default CustomerDetailPage;
