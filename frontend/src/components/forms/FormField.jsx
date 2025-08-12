import React from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  FormHelperText,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Box
} from '@mui/material';

/**
 * 統一的表單欄位組件
 * 支持多種輸入類型，統一錯誤處理和樣式
 */
const FormField = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  options = [],
  multiple = false,
  fullWidth = true,
  ...props
}) => {
  const handleChange = (event) => {
    const newValue = event.target.value;
    if (onChange) {
      onChange(name, newValue);
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur(name);
    }
  };

  // 渲染不同類型的輸入組件
  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <TextField
            name={name}
            label={label}
            type={type}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!error}
            helperText={error || helperText}
            required={required}
            disabled={disabled}
            fullWidth={fullWidth}
            {...props}
          />
        );

      case 'textarea':
        return (
          <TextField
            name={name}
            label={label}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!error}
            helperText={error || helperText}
            required={required}
            disabled={disabled}
            fullWidth={fullWidth}
            multiline
            rows={4}
            {...props}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth={fullWidth} error={!!error} required={required}>
            <InputLabel>{label}</InputLabel>
            <Select
              name={name}
              value={value || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              label={label}
              {...props}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl component="fieldset" error={!!error} required={required}>
            <FormLabel component="legend">{label}</FormLabel>
            <RadioGroup
              name={name}
              value={value || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              row={props.row}
            >
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio disabled={disabled} />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'checkbox':
        if (multiple) {
          // 多選 checkbox
          return (
            <FormControl component="fieldset" error={!!error} required={required}>
              <FormLabel component="legend">{label}</FormLabel>
              <FormGroup>
                {options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={(value || []).includes(option.value)}
                        onChange={(e) => {
                          const currentValues = value || [];
                          const newValues = e.target.checked
                            ? [...currentValues, option.value]
                            : currentValues.filter(v => v !== option.value);
                          if (onChange) onChange(name, newValues);
                        }}
                        onBlur={handleBlur}
                        disabled={disabled}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </FormGroup>
              {(error || helperText) && (
                <FormHelperText>{error || helperText}</FormHelperText>
              )}
            </FormControl>
          );
        } else {
          // 單個 checkbox
          return (
            <FormControl error={!!error}>
              <FormControlLabel
                control={
                  <Checkbox
                    name={name}
                    checked={!!value}
                    onChange={(e) => {
                      if (onChange) onChange(name, e.target.checked);
                    }}
                    onBlur={handleBlur}
                    disabled={disabled}
                  />
                }
                label={label}
              />
              {(error || helperText) && (
                <FormHelperText>{error || helperText}</FormHelperText>
              )}
            </FormControl>
          );
        }

      case 'chips':
        // 顯示已選擇的值作為 chips
        return (
          <FormControl fullWidth={fullWidth} error={!!error}>
            <FormLabel>{label}</FormLabel>
            <Box sx={{ mt: 1 }}>
              {(value || []).map((item, index) => (
                <Chip
                  key={index}
                  label={
                    options.find(opt => opt.value === item)?.label || item
                  }
                  onDelete={
                    !disabled
                      ? () => {
                          const newValues = (value || []).filter((_, i) => i !== index);
                          if (onChange) onChange(name, newValues);
                        }
                      : undefined
                  }
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
            {(error || helperText) && (
              <FormHelperText>{error || helperText}</FormHelperText>
            )}
          </FormControl>
        );

      default:
        return (
          <TextField
            name={name}
            label={label}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!error}
            helperText={error || helperText}
            required={required}
            disabled={disabled}
            fullWidth={fullWidth}
            {...props}
          />
        );
    }
  };

  return renderInput();
};

export default FormField;
