import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';
import { changePassword } from '../redux/slices/authSlice';

const ChangePasswordDialog = ({ open, onClose, forceChange = false }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLocalError('');
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setLocalError('請填寫所有欄位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('新密碼與確認密碼不一致');
      return;
    }
    if (oldPassword === newPassword) {
      setLocalError('新密碼不能與舊密碼相同');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setLocalError('新密碼需至少8位，且包含字母與數字');
      return;
    }
    try {
      await dispatch(changePassword({ oldPassword, newPassword })).unwrap();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (_) {}
  };

  const handleClose = () => {
    if (!forceChange && onClose) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLocalError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{forceChange ? '請先變更預設密碼' : '更改密碼'}</DialogTitle>
      <DialogContent>
        {success && <Alert severity="success" sx={{ mb: 2 }}>密碼已更新成功！</Alert>}
        {localError && <Alert severity="warning" sx={{ mb: 2 }}>{localError}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth
          label="舊密碼"
          type="password"
          margin="dense"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <TextField
          fullWidth
          label="新密碼（至少8位，含字母與數字）"
          type="password"
          margin="dense"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          fullWidth
          label="確認新密碼"
          type="password"
          margin="dense"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        {!forceChange && <Button onClick={handleClose}>取消</Button>}
        <Button onClick={handleSubmit} disabled={isLoading} variant="contained">更新密碼</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
