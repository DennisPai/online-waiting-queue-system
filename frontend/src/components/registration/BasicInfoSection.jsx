import React from 'react';
import {
  Grid,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Box
} from '@mui/material';
import { 
  formatMinguoYear,
  formatMinguoDate 
} from '../../utils/calendarConverter';

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

      {/* 性別 */}
      <Grid item xs={12}>
        <FormControl component="fieldset">
          <FormLabel component="legend">性別</FormLabel>
          <RadioGroup
            row
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            <FormControlLabel value="male" control={<Radio />} label="男" />
            <FormControlLabel value="female" control={<Radio />} label="女" />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* 出生日期 */}
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 2 }}>
          出生日期
        </Typography>
        
        {/* 曆法選擇 */}
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">曆法選擇</FormLabel>
          <RadioGroup
            row
            name="calendarType"
            value={formData.calendarType}
            onChange={handleChange}
          >
            <FormControlLabel value="gregorian" control={<Radio />} label="國曆" />
            <FormControlLabel value="lunar" control={<Radio />} label="農曆" />
          </RadioGroup>
        </FormControl>

        {/* 出生年月日輸入 */}
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              required={!simplified}
              fullWidth
              label={`出生年 (${formData.calendarType === 'gregorian' ? '西元' : '民國'})`}
              name="birthYear"
              type="number"
              value={formData.birthYear}
              onChange={handleChange}
              error={Boolean(formErrors.birthYear)}
              helperText={formErrors.birthYear || "系統會自動判斷民國年或西元年"}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              required={!simplified}
              fullWidth
              label="出生月"
              name="birthMonth"
              type="number"
              value={formData.birthMonth}
              onChange={handleChange}
              error={Boolean(formErrors.birthMonth)}
              helperText={formErrors.birthMonth}
              inputProps={{ min: 1, max: 12 }}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              required={!simplified}
              fullWidth
              label="出生日"
              name="birthDay"
              type="number"
              value={formData.birthDay}
              onChange={handleChange}
              error={Boolean(formErrors.birthDay)}
              helperText={formErrors.birthDay}
              inputProps={{ min: 1, max: 31 }}
            />
          </Grid>
        </Grid>

        {/* 農曆閏月選項 */}
        {formData.calendarType === 'lunar' && (
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.lunarIsLeapMonth || false}
                  onChange={(e) => onChange('lunarIsLeapMonth', e.target.checked)}
                  name="lunarIsLeapMonth"
                />
              }
              label="是閏月"
            />
          </FormControl>
        )}

        {/* 顯示轉換後的日期 */}
        {(formData.convertedLunarYear || formData.convertedGregorianYear) && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 1, 
            border: '1px solid', 
            borderColor: 'divider' 
          }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              自動轉換結果：
            </Typography>
            {formData.convertedLunarYear && (
              <Typography variant="body2">
                農曆：{formatMinguoYear(formData.convertedLunarYear)}{formData.convertedLunarMonth}月{formData.convertedLunarDay}日
                {formData.convertedLunarIsLeapMonth && ' (閏月)'}
              </Typography>
            )}
            {formData.convertedGregorianYear && (
              <Typography variant="body2">
                國曆：{formData.convertedGregorianYear}年{formData.convertedGregorianMonth}月{formData.convertedGregorianDay}日
              </Typography>
            )}
          </Box>
        )}
      </Grid>
    </>
  );
};

export default BasicInfoSection;
