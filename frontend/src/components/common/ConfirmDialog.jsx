import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  IconButton,
  Box
} from '@mui/material';
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

/**
 * 通用確認對話框組件
 * 支持不同類型的確認操作，統一的樣式和行為
 */
const ConfirmDialog = ({
  open = false,
  title = '確認操作',
  message = '您確定要執行此操作嗎？',
  type = 'info', // info, warning, error, success
  confirmText = '確認',
  cancelText = '取消',
  confirmColor = 'primary',
  onConfirm,
  onCancel,
  onClose,
  showCloseButton = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  maxWidth = 'sm',
  fullWidth = true,
  confirmButtonProps = {},
  cancelButtonProps = {},
  ...props
}) => {
  // 獲取圖標和顏色
  const getIconAndColor = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
          color: 'warning'
        };
      case 'error':
        return {
          icon: <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />,
          color: 'error'
        };
      case 'success':
        return {
          icon: <SuccessIcon sx={{ fontSize: 48, color: 'success.main' }} />,
          color: 'success'
        };
      default:
        return {
          icon: <InfoIcon sx={{ fontSize: 48, color: 'info.main' }} />,
          color: 'info'
        };
    }
  };

  const { icon, color } = getIconAndColor();

  // 處理確認
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  // 處理取消
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  // 處理關閉
  const handleClose = (event, reason) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') {
      return;
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      {...props}
    >
      {/* 標題欄 */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          {icon}
          {title}
        </Box>
        {showCloseButton && (
          <IconButton
            aria-label="關閉"
            onClick={handleClose}
            sx={{ color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      {/* 內容 */}
      <DialogContent>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>

      {/* 操作按鈕 */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleCancel}
          color="inherit"
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          {...confirmButtonProps}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
