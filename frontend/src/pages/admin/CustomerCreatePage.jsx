import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Box, Button, Grid, Divider,
  TextField, Alert, FormControl, InputLabel, Select, MenuItem,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { createCustomer } from '../../services/customerService';
import BirthdayPicker from '../../components/shared/BirthdayPicker';

const CustomerCreatePage = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: '',
    tags: '',
    notes: '',
    birthCalendarType: 'gregorian',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    lunarIsLeapMonth: false,
    addresses: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('姓名為必填');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        name: formData.name.trim(),
        phone: formData.phone,
        email: formData.email,
        gender: formData.gender,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: formData.notes,
        addresses: formData.addresses.filter(a => a.address?.trim())
      };
      if (formData.birthYear && formData.birthMonth && formData.birthDay) {
        if (formData.birthCalendarType === 'gregorian') {
          data.gregorianBirthYear = parseInt(formData.birthYear);
          data.gregorianBirthMonth = parseInt(formData.birthMonth);
          data.gregorianBirthDay = parseInt(formData.birthDay);
        } else {
          data.lunarBirthYear = parseInt(formData.birthYear);
          data.lunarBirthMonth = parseInt(formData.birthMonth);
          data.lunarBirthDay = parseInt(formData.birthDay);
          data.lunarIsLeapMonth = formData.lunarIsLeapMonth || false;
        }
      }
      const created = await createCustomer(token, data);
      const newId = created?._id || created?.id;
      navigate(newId ? `/admin/customers/${newId}` : '/admin/customers');
    } catch (err) {
      setError(err.response?.data?.message || '新增失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/customers')}>
          返回列表
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>新增客戶</Typography>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={saving}>
          {saving ? '儲存中...' : '儲存'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>基本資料</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="姓名 *" value={formData.name}
              onChange={(e) => setField('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="電話" value={formData.phone}
              onChange={(e) => setField('phone', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Email" value={formData.email}
              onChange={(e) => setField('email', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>性別</InputLabel>
              <Select value={formData.gender} label="性別"
                onChange={(e) => setField('gender', e.target.value)}>
                <MenuItem value=""><em>未設定</em></MenuItem>
                <MenuItem value="male">男</MenuItem>
                <MenuItem value="female">女</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 出生日期 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>出生日期</Typography>
            <BirthdayPicker
              calendarType={formData.birthCalendarType}
              year={formData.birthYear}
              month={formData.birthMonth}
              day={formData.birthDay}
              isLeapMonth={formData.lunarIsLeapMonth}
              onChange={({ year, month, day, isLeapMonth, calendarType }) => {
                setFormData(prev => ({
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
          </Grid>

          {/* 地址 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>地址</Typography>
            {formData.addresses.map((addr, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                  <InputLabel>類型</InputLabel>
                  <Select value={addr.addressType || 'home'} label="類型"
                    onChange={(e) => {
                      const addrs = [...formData.addresses];
                      addrs[i] = { ...addrs[i], addressType: e.target.value };
                      setField('addresses', addrs);
                    }}>
                    <MenuItem value="home">住家</MenuItem>
                    <MenuItem value="work">工作</MenuItem>
                    <MenuItem value="hospital">醫院</MenuItem>
                    <MenuItem value="other">其他</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" fullWidth value={addr.address || ''} placeholder="地址"
                  onChange={(e) => {
                    const addrs = [...formData.addresses];
                    addrs[i] = { ...addrs[i], address: e.target.value };
                    setField('addresses', addrs);
                  }} />
                <IconButton size="small" color="error"
                  onClick={() => setField('addresses', formData.addresses.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => setField('addresses', [...formData.addresses, { address: '', addressType: 'home' }])}>
              新增地址
            </Button>
          </Grid>

          {/* 標籤 */}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="標籤" value={formData.tags}
              onChange={(e) => setField('tags', e.target.value)}
              helperText="用逗號分隔" />
          </Grid>

          {/* 備註 */}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="備註" multiline rows={3}
              value={formData.notes} onChange={(e) => setField('notes', e.target.value)} />
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default CustomerCreatePage;
