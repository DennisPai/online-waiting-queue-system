import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TextFields as TextFieldsIcon,
  Remove as RemoveIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useFontSize } from '../../contexts/FontSizeContext';

const FontSizeSelector = ({ variant = 'select', showLabel = true }) => {
  const { fontSize, changeFontSize, fontSizeOptions } = useFontSize();

  // 獲取字體大小的按順序排列的鍵值
  const sizeKeys = ['small', 'medium', 'large', 'xlarge'];
  const currentIndex = sizeKeys.indexOf(fontSize);

  const increaseFontSize = () => {
    if (currentIndex < sizeKeys.length - 1) {
      changeFontSize(sizeKeys[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    if (currentIndex > 0) {
      changeFontSize(sizeKeys[currentIndex - 1]);
    }
  };

  if (variant === 'buttons') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showLabel && (
          <Typography variant="body2" sx={{ mr: 1 }}>
            字體大小:
          </Typography>
        )}
        <Tooltip title="縮小字體">
          <span>
            <IconButton
              onClick={decreaseFontSize}
              disabled={currentIndex === 0}
              size="small"
            >
              <RemoveIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="body2" sx={{ minWidth: '24px', textAlign: 'center' }}>
          {fontSizeOptions[fontSize].label}
        </Typography>
        <Tooltip title="放大字體">
          <span>
            <IconButton
              onClick={increaseFontSize}
              disabled={currentIndex === sizeKeys.length - 1}
              size="small"
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      {showLabel && (
        <InputLabel id="font-size-label">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextFieldsIcon fontSize="small" />
            字體大小
          </Box>
        </InputLabel>
      )}
      <Select
        labelId="font-size-label"
        value={fontSize}
        onChange={(e) => changeFontSize(e.target.value)}
        label={showLabel ? "字體大小" : ""}
      >
        {Object.entries(fontSizeOptions).map(([key, option]) => (
          <MenuItem key={key} value={key}>
            <Typography
              sx={{
                fontSize: `${option.multiplier}rem`,
              }}
            >
              {option.label}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default FontSizeSelector; 