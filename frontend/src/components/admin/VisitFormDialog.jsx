/**
 * VisitFormDialog.jsx
 * 新增 / 編輯來訪記錄的共用 Dialog
 *
 * Props:
 *   open         — boolean
 *   mode         — 'create' | 'edit'
 *   initialData  — 編輯時傳入的來訪記錄資料
 *   onClose      — 關閉 callback
 *   onSubmit(data) — 確認 callback，data = { sessionDate, consultationTopics, remarks, queueNumber, otherDetails, familyMembers }
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormGroup, FormControlLabel, Checkbox,
  Grid, Typography, IconButton, Box, FormControl, InputLabel
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

const TOPIC_OPTIONS = [
  { value: 'body', label: '身體' },
  { value: 'fate', label: '運途' },
  { value: 'karma', label: '因果' },
  { value: 'family', label: '家運/祖先' },
  { value: 'career', label: '事業' },
  { value: 'relationship', label: '婚姻感情' },
  { value: 'study', label: '學業' },
  { value: 'blessing', label: '收驚/加持' },
  { value: 'other', label: '其他' }
];

const defaultForm = {
  sessionDate: '',
  consultationTopics: [],
  queueNumber: '',
  otherDetails: '',
  remarks: '',
  familyMembers: []
};

const toDateInputValue = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const VisitFormDialog = ({ open, mode = 'create', initialData = null, onClose, onSubmit }) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setForm({
          sessionDate: toDateInputValue(initialData.sessionDate),
          consultationTopics: initialData.consultationTopics || [],
          queueNumber: initialData.queueNumber ?? '',
          otherDetails: initialData.otherDetails || '',
          remarks: initialData.remarks || '',
          familyMembers: initialData.familyMembers ? JSON.parse(JSON.stringify(initialData.familyMembers)) : []
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [open, mode, initialData]);

  const validate = () => {
    const e = {};
    if (!form.sessionDate) e.sessionDate = '來訪日期為必填';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      sessionDate: form.sessionDate,
      consultationTopics: form.consultationTopics,
      remarks: form.remarks,
      otherDetails: form.otherDetails,
      familyMembers: form.familyMembers.filter(m => m.name),
    };
    if (form.queueNumber !== '') data.queueNumber = parseInt(form.queueNumber) || null;
    onSubmit && onSubmit(data);
  };

  const toggleTopic = (value) => {
    setForm(prev => ({
      ...prev,
      consultationTopics: prev.consultationTopics.includes(value)
        ? prev.consultationTopics.filter(t => t !== value)
        : [...prev.consultationTopics, value]
    }));
  };

  const addFamilyMember = () => {
    setForm(prev => ({ ...prev, familyMembers: [...prev.familyMembers, { name: '', zodiac: '' }] }));
  };

  const updateFamilyMember = (index, field, value) => {
    setForm(prev => {
      const members = [...prev.familyMembers];
      members[index] = { ...members[index], [field]: value };
      return { ...prev, familyMembers: members };
    });
  };

  const removeFamilyMember = (index) => {
    setForm(prev => ({ ...prev, familyMembers: prev.familyMembers.filter((_, i) => i !== index) }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'edit' ? '編輯來訪記錄' : '新增來訪記錄'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {/* 來訪日期 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="來訪日期 *"
              type="date"
              value={form.sessionDate}
              onChange={(e) => setForm(prev => ({ ...prev, sessionDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.sessionDate)}
              helperText={errors.sessionDate}
              size="small"
            />
          </Grid>

          {/* 候位號碼 */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="候位號碼"
              type="number"
              value={form.queueNumber}
              onChange={(e) => setForm(prev => ({ ...prev, queueNumber: e.target.value }))}
              size="small"
              inputProps={{ min: 1 }}
            />
          </Grid>

          {/* 諮詢主題 */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>諮詢主題</Typography>
            <FormGroup row>
              {TOPIC_OPTIONS.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={form.consultationTopics.includes(opt.value)}
                      onChange={() => toggleTopic(opt.value)}
                      size="small"
                    />
                  }
                  label={opt.label}
                  sx={{ mr: 1 }}
                />
              ))}
            </FormGroup>
          </Grid>

          {/* 其他詳情 */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="其他詳情"
              value={form.otherDetails}
              onChange={(e) => setForm(prev => ({ ...prev, otherDetails: e.target.value }))}
              size="small"
            />
          </Grid>

          {/* 備註 */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="備註"
              multiline
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm(prev => ({ ...prev, remarks: e.target.value }))}
              size="small"
            />
          </Grid>

          {/* 隨行家人 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>隨行家人</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addFamilyMember}>新增家人</Button>
            </Box>
            {form.familyMembers.map((member, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="姓名"
                  value={member.name}
                  onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                  size="small"
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="生肖"
                  value={member.zodiac || ''}
                  onChange={(e) => updateFamilyMember(index, 'zodiac', e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" color="error" onClick={() => removeFamilyMember(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {mode === 'edit' ? '儲存' : '新增'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VisitFormDialog;
