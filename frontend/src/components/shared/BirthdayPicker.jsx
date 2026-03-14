/**
 * BirthdayPicker.jsx
 * 共用生日選擇元件：年月日下拉 + 國農曆切換 + 閏月 checkbox
 *
 * Props:
 *   year, month, day        — 目前選取值（西元年）
 *   isLeapMonth             — 是否閏月（農曆時用）
 *   calendarType            — 'gregorian' | 'lunar'
 *   onChange({ year, month, day, isLeapMonth, calendarType }) — 有任何值改變時呼叫
 *   disabled                — boolean
 *   size                    — 'small' | 'medium'（傳給 Select）
 *   required                — boolean（顯示 * 標記用，驗證由外部處理）
 *   errors                  — { year, month, day } 錯誤訊息
 */
import React, { useMemo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText,
  Typography
} from '@mui/material';
import {
  getBirthYearOptions,
  getMonthOptions,
  getDayOptions,
  hasLeapMonth
} from '../../utils/lunarDays';

const BirthdayPicker = ({
  year = '',
  month = '',
  day = '',
  isLeapMonth = false,
  calendarType = 'gregorian',
  onChange,
  disabled = false,
  size = 'small',
  errors = {}
}) => {
  // 年份選項（民國 1~115）
  const yearOptions = useMemo(() => getBirthYearOptions(), []);
  // 月份選項（1~12）
  const monthOptions = useMemo(() => getMonthOptions(), []);
  // 日期選項（依年月動態）
  const dayOptions = useMemo(
    () => getDayOptions(year || null, month || null, calendarType, isLeapMonth),
    [year, month, calendarType, isLeapMonth]
  );

  // 是否有閏月可選
  const leapMonthAvailable = useMemo(() => {
    if (calendarType !== 'lunar' || !year || !month) return false;
    return hasLeapMonth(year, month);
  }, [calendarType, year, month]);

  const emit = (patch) => {
    onChange && onChange({ year, month, day, isLeapMonth, calendarType, ...patch });
  };

  const handleCalendarChange = (_, newType) => {
    if (!newType) return; // 不允許取消選取
    // 切換曆法時清除日期（避免不合法值殘留）
    onChange && onChange({ year: '', month: '', day: '', isLeapMonth: false, calendarType: newType });
  };

  const handleYear = (e) => emit({ year: e.target.value, month: '', day: '' });
  const handleMonth = (e) => emit({ month: e.target.value, day: '' });
  const handleDay = (e) => emit({ day: e.target.value });
  const handleLeap = (e) => emit({ isLeapMonth: e.target.checked, day: '' });

  return (
    <Box>
      {/* 國曆 / 農曆 切換 */}
      <ToggleButtonGroup
        value={calendarType}
        exclusive
        onChange={handleCalendarChange}
        size="small"
        disabled={disabled}
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="gregorian">國曆</ToggleButton>
        <ToggleButton value="lunar">農曆</ToggleButton>
      </ToggleButtonGroup>

      {/* 年月日 + 閏月 */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* 年 */}
        <FormControl size={size} sx={{ minWidth: 190 }} error={Boolean(errors.year)} disabled={disabled}>
          <InputLabel>年</InputLabel>
          <Select value={year || ''} onChange={handleYear} label="年">
            <MenuItem value=""><em>請選擇</em></MenuItem>
            {yearOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
          {errors.year && <FormHelperText>{errors.year}</FormHelperText>}
        </FormControl>

        {/* 月 */}
        <FormControl size={size} sx={{ minWidth: 90 }} error={Boolean(errors.month)} disabled={disabled}>
          <InputLabel>月</InputLabel>
          <Select value={month || ''} onChange={handleMonth} label="月">
            <MenuItem value=""><em>請選擇</em></MenuItem>
            {monthOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
          {errors.month && <FormHelperText>{errors.month}</FormHelperText>}
        </FormControl>

        {/* 日 */}
        <FormControl size={size} sx={{ minWidth: 90 }} error={Boolean(errors.day)} disabled={disabled}>
          <InputLabel>日</InputLabel>
          <Select value={day || ''} onChange={handleDay} label="日">
            <MenuItem value=""><em>請選擇</em></MenuItem>
            {dayOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
          {errors.day && <FormHelperText>{errors.day}</FormHelperText>}
        </FormControl>

        {/* 閏月 checkbox（農曆時才顯示） */}
        {calendarType === 'lunar' && (
          <FormControlLabel
            control={
              <Checkbox
                checked={isLeapMonth}
                onChange={handleLeap}
                disabled={disabled || !leapMonthAvailable}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color={leapMonthAvailable ? 'text.primary' : 'text.disabled'}>
                閏月
              </Typography>
            }
            sx={{ mt: 0.5 }}
          />
        )}
      </Box>
    </Box>
  );
};

export default BirthdayPicker;
