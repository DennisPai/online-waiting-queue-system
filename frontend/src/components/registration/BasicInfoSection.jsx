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
import { gregorianToMinguo } from '../../utils/lunarDays';

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
            <MenuItem value="other">其他</MenuItem>
          </Select>
          {formErrors.gender && <FormHelperText>{formErrors.gender}</FormHelperText>}
        </FormControl>
      </Grid>

      {/* 出生日期 */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
          出生日期
        </Typography>
        <BirthdayPicker
          calendarType={formData.calendarType || 'gregorian'}
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
