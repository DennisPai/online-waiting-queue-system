import React from 'react';
import {
  Grid,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import BirthdayPicker from '../shared/BirthdayPicker';

const BasicInfoSection = ({
  formData,
  formErrors,
  onChange,
  simplified = false
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  // BirthdayPicker onChange — 一次傳 patch object，避免多次 setState 的 stale closure
  const handleBirthdayChange = ({ year, month, day, isLeapMonth, calendarType }) => {
    onChange({
      calendarType,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      lunarIsLeapMonth: isLeapMonth
    });
  };

  return (
    <>
      {/* 標題 */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          基本資料
        </Typography>
      </Grid>

      {/* 姓名 */}
      <Grid item xs={12} sm={6}>
        <TextField
          required={!simplified}
          fullWidth
          id="name"
          name="name"
          label="姓名"
          value={formData.name}
          onChange={handleChange}
          error={Boolean(formErrors.name)}
          helperText={formErrors.name}
        />
      </Grid>

      {/* 聯絡手機 */}
      <Grid item xs={12} sm={6}>
        <TextField
          required={!simplified}
          fullWidth
          id="phone"
          name="phone"
          label="聯絡手機"
          value={formData.phone}
          onChange={handleChange}
          error={Boolean(formErrors.phone)}
          helperText={formErrors.phone}
        />
      </Grid>

      {/* 電子郵件 */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          id="email"
          name="email"
          label="電子郵件 (選填)"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={Boolean(formErrors.email)}
          helperText={formErrors.email}
        />
      </Grid>

      {/* 性別（下拉） */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={Boolean(formErrors.gender)}>
          <InputLabel>性別</InputLabel>
          <Select
            name="gender"
            value={formData.gender || ''}
            onChange={handleChange}
            label="性別"
          >
            <MenuItem value="male">男</MenuItem>
            <MenuItem value="female">女</MenuItem>
            {/* 2026-06-24（WS5 D6）：移除「其他」選項——other 用途已改為系統補的「待填」標記，
                前台不應讓使用者選到「待填」；前台性別只提供男/女（懷特裁示放棄真正其他性別選項）*/}
          </Select>
          {formErrors.gender && <FormHelperText>{formErrors.gender}</FormHelperText>}
        </FormControl>
      </Grid>

      {/* 農曆生日（Follow-up patch #5 D6：移除外部標題，BirthdayPicker 內部 default 接手） */}
      <Grid item xs={12} sx={{ mt: 1 }}>
        <BirthdayPicker
          // Change C / 階段 5 sub-agent 審閱 NICE-TO-HAVE：fallback 改 'lunar' 對齊 D2 全系統 lunar-only
          calendarType={formData.calendarType || 'lunar'}
          year={formData.birthYear || ''}
          month={formData.birthMonth || ''}
          day={formData.birthDay || ''}
          isLeapMonth={formData.lunarIsLeapMonth || false}
          onChange={handleBirthdayChange}
          errors={{
            year: formErrors.birthYear,
            month: formErrors.birthMonth,
            day: formErrors.birthDay
          }}
        />
      </Grid>
    </>
  );
};

export default BasicInfoSection;
