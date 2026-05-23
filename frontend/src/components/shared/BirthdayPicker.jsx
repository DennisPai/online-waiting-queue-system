/**
 * BirthdayPicker.jsx
 * 共用生日選擇元件：年月日下拉 + 國農曆切換 + 閏月 checkbox
 *
 * Props:
 *   year, month, day        — 目前選取值（西元年）
 *   isLeapMonth             — 是否閏月（農曆時用）
 *   calendarType            — 'gregorian' | 'lunar'（lunarOnly=true 時會被內部強制覆蓋成 'lunar'）
 *   lunarOnly               — boolean，default true（全系統 lunar-only）。true 時隱藏切換按鈕、強制 calendarType='lunar'
 *   onChange({ year, month, day, isLeapMonth, calendarType }) — 有任何值改變時呼叫
 *   disabled                — boolean
 *   size                    — 'small' | 'medium'（傳給 Select）
 *   required                — boolean（顯示 * 標記用，驗證由外部處理）
 *   errors                  — { year, month, day } 錯誤訊息
 *
 *   Follow-up patch #5（OpenSpec 2026-05-23-followup-patches D6）：
 *   title       — string，default「農曆生日」（取代舊版「出生日期」）。
 *                  全系統 5+ 處呼叫點不傳即用 default、UI 標題一致。
 *   helperText  — string，default「請先自行查好農曆生日」。淺色 FormHelperText。
 *   showTitle   — boolean，default true。某些 callsite 自行 render 標題時可設 false 不重複。
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
  // Change C / 階段 2.1：lunarOnly default true 對應全系統 lunar-only
  // 隱藏「國曆/農曆」切換、強制內部 effective calendarType='lunar'
  // 顯式傳 lunarOnly={false} 時行為 100% 不變（雙模式邏輯保留作未來特殊需求彈性）
  lunarOnly = true,
  onChange,
  disabled = false,
  size = 'small',
  errors = {},
  // Follow-up patch #5（OpenSpec 2026-05-23-followup-patches D6）：
  // 內建 default 標題「農曆生日」+ 備註「請先自行查好農曆生日」，
  // 全系統 5+ 處呼叫點不傳即可一致顯示
  title = '農曆生日',
  helperText = '請先自行查好農曆生日',
  showTitle = true
}) => {
  // Change C / 階段 2.1：lunarOnly=true 時內部 effective calendarType 永遠為 'lunar'
  // 不論外部 props 傳什麼 calendarType 都被覆蓋
  const effectiveCalendarType = lunarOnly ? 'lunar' : calendarType;

  // 年份選項（民國 1~115）
  const yearOptions = useMemo(() => getBirthYearOptions(), []);
  // 月份選項（1~12）
  const monthOptions = useMemo(() => getMonthOptions(), []);
  // 日期選項（依年月動態，effective 曆法）
  const dayOptions = useMemo(
    () => getDayOptions(year || null, month || null, effectiveCalendarType, isLeapMonth),
    [year, month, effectiveCalendarType, isLeapMonth]
  );

  // 是否有閏月可選
  const leapMonthAvailable = useMemo(() => {
    if (effectiveCalendarType !== 'lunar' || !year || !month) return false;
    return hasLeapMonth(year, month);
  }, [effectiveCalendarType, year, month]);

  const emit = (patch) => {
    // Change C / 階段 2.1：lunarOnly=true 時 onChange 永遠帶 calendarType: 'lunar'
    onChange && onChange({ year, month, day, isLeapMonth, calendarType: effectiveCalendarType, ...patch });
  };

  const handleCalendarChange = (_, newType) => {
    if (!newType) return; // 不允許取消選取
    if (lunarOnly) return; // Change C：lunarOnly 模式不允許切換（雖然按鈕已隱藏，多一層防呆）
    // 切換曆法時清除日期（避免不合法值殘留）
    onChange && onChange({ year: '', month: '', day: '', isLeapMonth: false, calendarType: newType });
  };

  const handleYear = (e) => emit({ year: e.target.value, month: '', day: '' });
  const handleMonth = (e) => emit({ month: e.target.value, day: '' });
  const handleDay = (e) => emit({ day: e.target.value });
  const handleLeap = (e) => emit({ isLeapMonth: e.target.checked, day: '' });

  return (
    <Box>
      {/* Follow-up patch #5（D6）：default 標題「農曆生日」+ helper text「請先自行查好農曆生日」
          callsite 不傳即用 default；showTitle=false 時讓 callsite 自行 render 不重複 */}
      {showTitle && title && (
        <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 500 }}>
          {title}
        </Typography>
      )}
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {helperText}
        </Typography>
      )}

      {/* 國曆 / 農曆 切換（Change C / 階段 2.1：lunarOnly=true 時隱藏，保留 lunarOnly=false 雙模式） */}
      {!lunarOnly && (
        <ToggleButtonGroup
          value={effectiveCalendarType}
          exclusive
          onChange={handleCalendarChange}
          size="small"
          disabled={disabled}
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="gregorian">國曆</ToggleButton>
          <ToggleButton value="lunar">農曆</ToggleButton>
        </ToggleButtonGroup>
      )}

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

        {/* 閏月 checkbox（農曆時才顯示；lunarOnly=true 時恆顯示） */}
        {effectiveCalendarType === 'lunar' && (
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
