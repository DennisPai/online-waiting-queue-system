import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, Grid, Divider, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Alert, List, ListItem,
  ListItemText, ListItemButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { getCustomer, updateCustomer, getVisitHistory } from '../../services/customerService';

const topicMap = {
  body: '身體', fate: '運途', karma: '因果', family: '家運/祖先',
  career: '事業', relationship: '婚姻感情', study: '學業',
  blessing: '收驚/加持', other: '其他'
};

const addressTypeMap = {
  home: '住家', work: '工作', hospital: '醫院', other: '其他'
};

const formatLunarDate = (year, month, day, isLeap) => {
  if (!year && !month && !day) return null;
  const parts = [];
  if (year) parts.push(`${year} 年`);
  if (month) parts.push(`${isLeap ? '閏' : ''}${month} 月`);
  if (day) parts.push(`${day} 日`);
  return parts.join('');
};

const formatGregorianDate = (year, month, day) => {
  if (!year && !month && !day) return null;
  const parts = [];
  if (year) parts.push(`${year} 年`);
  if (month) parts.push(`${month} 月`);
  if (day) parts.push(`${day} 日`);
  return parts.join('');
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
        setEditData({
          name: cust.name,
          phone: cust.phone || '',
          notes: cust.notes || '',
          tags: (cust.tags || []).join(', ')
        });
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
      setCustomer(prev => ({ ...prev, ...updated }));
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

  const isNewCustomer = (customer.totalVisits || 0) <= 1;
  const gregorianDate = formatGregorianDate(customer.gregorianBirthYear, customer.gregorianBirthMonth, customer.gregorianBirthDay);
  const lunarDate = formatLunarDate(customer.lunarBirthYear, customer.lunarBirthMonth, customer.lunarBirthDay, customer.lunarIsLeapMonth);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 頁頭 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/customers')}>
          返回列表
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {customer.name}
        </Typography>
        <Chip
          label={isNewCustomer ? '新客戶' : '回頭客'}
          color={isNewCustomer ? 'success' : 'primary'}
          size="small"
          sx={{ mr: 1 }}
        />
        {!editing ? (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            編輯
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={() => setEditing(false)} sx={{ mr: 1 }}>取消</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              儲存
            </Button>
          </>
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
              <TextField size="small" fullWidth value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            ) : (
              <Typography>{customer.name}</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">電話</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            ) : (
              <Typography>{customer.phone || '未提供'}</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">性別</Typography>
            <Typography>
              {customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : '未設定'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">累計來訪</Typography>
            <Typography>{customer.totalVisits || 0} 次</Typography>
          </Grid>

          {/* 生肖 */}
          {customer.zodiac && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">生肖</Typography>
              <Typography>{customer.zodiac}</Typography>
            </Grid>
          )}

          {/* 出生日期 */}
          {(gregorianDate || lunarDate) && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">出生日期</Typography>
              {gregorianDate && (
                <Typography variant="body2">國曆：{gregorianDate}</Typography>
              )}
              {lunarDate && (
                <Typography variant="body2">農曆：{lunarDate}</Typography>
              )}
            </Grid>
          )}

          {/* 地址 */}
          {customer.addresses && customer.addresses.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">地址</Typography>
              {customer.addresses.map((addr, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <HomeIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {addr.address}
                    <Chip
                      label={addressTypeMap[addr.addressType] || addr.addressType}
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    />
                  </Typography>
                </Box>
              ))}
            </Grid>
          )}

          {/* 標籤 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">標籤</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.tags}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                helperText="用逗號分隔" />
            ) : (
              <Box sx={{ mt: 0.5 }}>
                {(customer.tags || []).length > 0
                  ? customer.tags.map(tag => <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />)
                  : <Typography color="text.secondary" variant="body2">無</Typography>}
              </Box>
            )}
          </Grid>

          {/* 首次 / 最近來訪 */}
          {customer.firstVisitDate && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">首次來訪</Typography>
              <Typography variant="body2">
                {new Date(customer.firstVisitDate).toLocaleDateString('zh-TW')}
              </Typography>
            </Grid>
          )}
          {customer.lastVisitDate && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">最近來訪</Typography>
              <Typography variant="body2">
                {new Date(customer.lastVisitDate).toLocaleDateString('zh-TW')}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* 同住家人（Household） */}
      {customer.householdMembers && customer.householdMembers.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleIcon color="action" />
            <Typography variant="h6">同住家人</Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List dense disablePadding>
            {customer.householdMembers.map((member) => (
              <ListItem key={member._id} disablePadding>
                <ListItemButton onClick={() => navigate(`/admin/customers/${member._id}`)}>
                  <ListItemText
                    primary={member.name}
                    secondary={[
                      member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '',
                      member.zodiac ? `生肖：${member.zodiac}` : '',
                      `來訪 ${member.totalVisits || 0} 次`
                    ].filter(Boolean).join('　')}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* 備註 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>備註</Typography>
        <Divider sx={{ mb: 2 }} />
        {editing ? (
          <TextField multiline rows={4} fullWidth value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
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
                    <TableCell>
                      {new Date(visit.sessionDate).toLocaleDateString('zh-TW')}
                    </TableCell>
                    <TableCell>{visit.queueNumber || '-'}</TableCell>
                    <TableCell>
                      {(visit.consultationTopics || []).length > 0
                        ? (visit.consultationTopics || []).map(t => topicMap[t] || t).join('、')
                        : '-'}
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
