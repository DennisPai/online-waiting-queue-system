import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, Grid, Divider, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Alert, List, ListItem,
  ListItemText, ListItemButton, Select, MenuItem, FormControl,
  InputLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import {
  getCustomer, updateCustomer, getVisitHistory,
  createVisit, updateVisit, deleteVisit, deleteCustomer
} from '../../services/customerService';
import BirthdayPicker from '../../components/shared/BirthdayPicker';
import VisitFormDialog from '../../components/admin/VisitFormDialog';

const topicMap = {
  body: '身體', fate: '運途', karma: '因果', family: '家運/祖先',
  career: '事業', relationship: '婚姻感情', study: '學業',
  blessing: '收驚/加持', other: '其他'
};

const addressTypeMap = {
  home: '住家', work: '工作', hospital: '醫院', other: '其他'
};

const genderMap = { male: '男', female: '女', other: '其他' };

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

  // 來訪記錄 CRUD 狀態
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [visitDialogMode, setVisitDialogMode] = useState('create');
  const [editingVisit, setEditingVisit] = useState(null);
  const [deleteVisitConfirm, setDeleteVisitConfirm] = useState({ open: false, visitId: null });
  const [visitActionMsg, setVisitActionMsg] = useState('');

  // 刪除客戶確認
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cust, visitData] = await Promise.all([
        getCustomer(token, id),
        getVisitHistory(token, id)
      ]);
      setCustomer(cust);
      initEditData(cust);
      setVisits(visitData.visits || []);
    } catch (error) {
      console.error('載入客戶資料失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const initEditData = (cust) => {
    // 決定初始曆法：優先以 gregorian 有值為準
    const hasGregorian = cust.gregorianBirthYear || cust.gregorianBirthMonth || cust.gregorianBirthDay;
    const hasLunar = cust.lunarBirthYear || cust.lunarBirthMonth || cust.lunarBirthDay;
    let birthCalendarType = 'gregorian';
    let birthYear = '', birthMonth = '', birthDay = '';
    if (hasGregorian) {
      birthCalendarType = 'gregorian';
      birthYear = cust.gregorianBirthYear || '';
      birthMonth = cust.gregorianBirthMonth || '';
      birthDay = cust.gregorianBirthDay || '';
    } else if (hasLunar) {
      birthCalendarType = 'lunar';
      birthYear = cust.lunarBirthYear || '';
      birthMonth = cust.lunarBirthMonth || '';
      birthDay = cust.lunarBirthDay || '';
    }

    setEditData({
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      gender: cust.gender || '',
      tags: (cust.tags || []).join(', '),
      notes: cust.notes || '',
      birthCalendarType,
      birthYear,
      birthMonth,
      birthDay,
      lunarIsLeapMonth: cust.lunarIsLeapMonth || false,
      addresses: cust.addresses ? JSON.parse(JSON.stringify(cust.addresses)) : []
    });
  };

  useEffect(() => { fetchData(); }, [token, id]);

  const handleSave = async () => {
    try {
      const data = {
        name: editData.name,
        phone: editData.phone,
        email: editData.email,
        gender: editData.gender,
        tags: editData.tags ? editData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: editData.notes,
        addresses: editData.addresses
      };

      // 生日：轉換為 gregorian/lunar 欄位傳送
      if (editData.birthYear && editData.birthMonth && editData.birthDay) {
        if (editData.birthCalendarType === 'gregorian') {
          data.gregorianBirthYear = parseInt(editData.birthYear);
          data.gregorianBirthMonth = parseInt(editData.birthMonth);
          data.gregorianBirthDay = parseInt(editData.birthDay);
        } else {
          data.lunarBirthYear = parseInt(editData.birthYear);
          data.lunarBirthMonth = parseInt(editData.birthMonth);
          data.lunarBirthDay = parseInt(editData.birthDay);
          data.lunarIsLeapMonth = editData.lunarIsLeapMonth || false;
        }
      }

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

  // --- 來訪記錄操作 ---
  const handleOpenCreateVisit = () => {
    setVisitDialogMode('create');
    setEditingVisit(null);
    setVisitDialogOpen(true);
  };

  const handleOpenEditVisit = (visit) => {
    setVisitDialogMode('edit');
    setEditingVisit(visit);
    setVisitDialogOpen(true);
  };

  const handleVisitSubmit = async (data) => {
    try {
      if (visitDialogMode === 'create') {
        await createVisit(token, id, data);
        setVisitActionMsg('來訪記錄已新增');
      } else {
        await updateVisit(token, id, editingVisit._id, data);
        setVisitActionMsg('來訪記錄已更新');
      }
      setVisitDialogOpen(false);
      await fetchData(); // 重載資料（包含 totalVisits / firstVisitDate / lastVisitDate 更新）
      setTimeout(() => setVisitActionMsg(''), 3000);
    } catch (error) {
      console.error('來訪記錄操作失敗:', error);
      setVisitActionMsg('操作失敗');
    }
  };

  const handleDeleteVisitConfirm = (visitId) => {
    setDeleteVisitConfirm({ open: true, visitId });
  };

  const handleDeleteVisit = async () => {
    try {
      await deleteVisit(token, id, deleteVisitConfirm.visitId);
      setDeleteVisitConfirm({ open: false, visitId: null });
      setVisitActionMsg('來訪記錄已刪除');
      await fetchData();
      setTimeout(() => setVisitActionMsg(''), 3000);
    } catch (error) {
      console.error('刪除來訪記錄失敗:', error);
      setVisitActionMsg('刪除失敗');
    }
  };

  // --- 刪除客戶 ---
  const handleDeleteCustomer = async () => {
    setDeleteLoading(true);
    try {
      await deleteCustomer(token, id);
      navigate('/admin/customers');
    } catch (error) {
      console.error('刪除客戶失敗:', error);
      setDeleteCustomerConfirm(false);
      setSaveMsg('刪除客戶失敗');
    } finally {
      setDeleteLoading(false);
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1, flexWrap: 'wrap' }}>
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
        />
        {!editing ? (
          <>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              編輯
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteCustomerConfirm(true)}
            >
              刪除客戶
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" onClick={() => { setEditing(false); initEditData(customer); }}>取消</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>儲存</Button>
          </>
        )}
      </Box>

      {saveMsg && <Alert severity={saveMsg === '已儲存' ? 'success' : 'error'} sx={{ mb: 2 }}>{saveMsg}</Alert>}

      {/* 基本資料 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>基本資料</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {/* 姓名 */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">姓名</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))} />
            ) : (
              <Typography>{customer.name}</Typography>
            )}
          </Grid>

          {/* 電話 */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">電話</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.phone}
                onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} />
            ) : (
              <Typography>{customer.phone || '未提供'}</Typography>
            )}
          </Grid>

          {/* Email */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Email</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.email}
                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))} />
            ) : (
              <Typography>{customer.email || '未提供'}</Typography>
            )}
          </Grid>

          {/* 性別 */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">性別</Typography>
            {editing ? (
              <FormControl fullWidth size="small">
                <Select value={editData.gender || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, gender: e.target.value }))}>
                  <MenuItem value=""><em>未設定</em></MenuItem>
                  <MenuItem value="male">男</MenuItem>
                  <MenuItem value="female">女</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Typography>{genderMap[customer.gender] || '未設定'}</Typography>
            )}
          </Grid>

          {/* 累計來訪 */}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">累計來訪</Typography>
            <Typography>{customer.totalVisits || 0} 次</Typography>
          </Grid>

          {/* 生肖（唯讀） */}
          {customer.zodiac && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">生肖</Typography>
              <Typography>{customer.zodiac}</Typography>
            </Grid>
          )}

          {/* 虛歲（唯讀） */}
          {customer.virtualAge && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">虛歲</Typography>
              <Typography>{customer.virtualAge} 歲</Typography>
            </Grid>
          )}

          {/* 出生日期 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>出生日期</Typography>
            {editing ? (
              <BirthdayPicker
                calendarType={editData.birthCalendarType || 'gregorian'}
                year={editData.birthYear || ''}
                month={editData.birthMonth || ''}
                day={editData.birthDay || ''}
                isLeapMonth={editData.lunarIsLeapMonth || false}
                onChange={({ year, month, day, isLeapMonth, calendarType }) => {
                  setEditData(prev => ({
                    ...prev,
                    birthCalendarType: calendarType,
                    birthYear: year,
                    birthMonth: month,
                    birthDay: day,
                    lunarIsLeapMonth: isLeapMonth
                  }));
                }}
                size="small"
              />
            ) : (
              <>
                {gregorianDate && <Typography variant="body2">國曆：{gregorianDate}</Typography>}
                {lunarDate && <Typography variant="body2">農曆：{lunarDate}</Typography>}
                {!gregorianDate && !lunarDate && <Typography color="text.secondary" variant="body2">未提供</Typography>}
              </>
            )}
          </Grid>

          {/* 地址 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>地址</Typography>
            {editing ? (
              <Box>
                {editData.addresses.map((addr, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <InputLabel>類型</InputLabel>
                      <Select
                        value={addr.addressType || 'home'}
                        label="類型"
                        onChange={(e) => {
                          const addrs = [...editData.addresses];
                          addrs[i] = { ...addrs[i], addressType: e.target.value };
                          setEditData(prev => ({ ...prev, addresses: addrs }));
                        }}
                      >
                        <MenuItem value="home">住家</MenuItem>
                        <MenuItem value="work">工作</MenuItem>
                        <MenuItem value="hospital">醫院</MenuItem>
                        <MenuItem value="other">其他</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      fullWidth
                      value={addr.address || ''}
                      placeholder="地址"
                      onChange={(e) => {
                        const addrs = [...editData.addresses];
                        addrs[i] = { ...addrs[i], address: e.target.value };
                        setEditData(prev => ({ ...prev, addresses: addrs }));
                      }}
                    />
                    <IconButton size="small" color="error" onClick={() => {
                      setEditData(prev => ({ ...prev, addresses: prev.addresses.filter((_, idx) => idx !== i) }));
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setEditData(prev => ({
                    ...prev,
                    addresses: [...prev.addresses, { address: '', addressType: 'home' }]
                  }))}
                >
                  新增地址
                </Button>
              </Box>
            ) : (
              customer.addresses && customer.addresses.length > 0 ? (
                customer.addresses.map((addr, i) => (
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
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">無</Typography>
              )
            )}
          </Grid>

          {/* 標籤 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">標籤</Typography>
            {editing ? (
              <TextField size="small" fullWidth value={editData.tags}
                onChange={(e) => setEditData(prev => ({ ...prev, tags: e.target.value }))}
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
                      genderMap[member.gender] || '',
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
            onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))} />
        ) : (
          <Typography sx={{ whiteSpace: 'pre-line' }}>{customer.notes || '無'}</Typography>
        )}
      </Paper>

      {/* 歷史來訪記錄 */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>歷史來訪記錄</Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleOpenCreateVisit}>
            新增來訪記錄
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {visitActionMsg && (
          <Alert severity={visitActionMsg.includes('失敗') ? 'error' : 'success'} sx={{ mb: 2 }}>
            {visitActionMsg}
          </Alert>
        )}

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
                  <TableCell align="right">操作</TableCell>
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
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEditVisit(visit)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteVisitConfirm(visit._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 來訪記錄 Dialog */}
      <VisitFormDialog
        open={visitDialogOpen}
        mode={visitDialogMode}
        initialData={editingVisit}
        onClose={() => setVisitDialogOpen(false)}
        onSubmit={handleVisitSubmit}
      />

      {/* 刪除來訪記錄確認 */}
      <Dialog open={deleteVisitConfirm.open} onClose={() => setDeleteVisitConfirm({ open: false, visitId: null })}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>確定要刪除此來訪記錄？此操作可透過備份還原。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteVisitConfirm({ open: false, visitId: null })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteVisit}>確認刪除</Button>
        </DialogActions>
      </Dialog>

      {/* 刪除客戶確認 */}
      <Dialog open={deleteCustomerConfirm} onClose={() => setDeleteCustomerConfirm(false)}>
        <DialogTitle>確認刪除客戶</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除客戶【{customer.name}】嗎？此操作將同時刪除該客戶的所有來訪記錄（共 {customer.totalVisits || 0} 筆）。此操作可透過備份還原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCustomerConfirm(false)} disabled={deleteLoading}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteCustomer}
            disabled={deleteLoading}
          >
            {deleteLoading ? '刪除中...' : '確認刪除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CustomerDetailPage;
