import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';
import { changePassword } from '../redux/slices/authSlice';

const ChangePasswordDialog = ({ open }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async () => {
    setLocalError('');
    if (!oldPassword || !newPassword) {
      setLocalError('請輸入舊密碼與新密碼');
      return;
    }
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setLocalError('新密碼需至少10位，且包含字母與數字');
      return;
    }
    try {
      await dispatch(changePassword({ oldPassword, newPassword })).unwrap();
      setOldPassword('');
      setNewPassword('');
    } catch (_) {}
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>請先變更預設密碼</DialogTitle>
      <DialogContent>
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
          label="新密碼（至少10位，含字母與數字）"
          type="password"
          margin="dense"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} disabled={isLoading} variant="contained">更新密碼</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;

