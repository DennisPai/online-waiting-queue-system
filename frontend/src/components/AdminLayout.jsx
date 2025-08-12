import React, { useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Snackbar,
  Alert,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { hideAlert } from '../redux/slices/uiSlice';
import { logout, changePassword } from '../redux/slices/authSlice';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

const drawerWidth = 240;

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useSelector((state) => state.auth);
  const { alert } = useSelector((state) => state.ui);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const mustChange = useMemo(() => !!user?.mustChangePassword, [user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSubmitPassword = async () => {
    if (!oldPwd || !newPwd) return;
    try {
      await dispatch(changePassword({ oldPassword: oldPwd, newPassword: newPwd })).unwrap();
      setPwdOpen(false);
      setOldPwd('');
      setNewPwd('');
    } catch (_) {}
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    dispatch(hideAlert());
  };

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          管理員面板
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigateTo('/admin/dashboard')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="候位管理" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigateTo('/admin/settings')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="系統設定" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="登出" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            線上候位系統
          </Typography>
          <Button color="inherit" onClick={() => navigate('/')}>
            返回前台
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
        {/* 首次登入強制修改密碼 */}
        <Dialog open={mustChange || pwdOpen} disableEscapeKeyDown={mustChange}>
          <DialogTitle>請變更您的密碼</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="原密碼"
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              margin="dense"
            />
            <TextField
              fullWidth
              label="新密碼（至少10字元，含字母與數字）"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            {!mustChange && (
              <Button onClick={() => setPwdOpen(false)} disabled={isLoading}>取消</Button>
            )}
            <Button onClick={handleSubmitPassword} disabled={isLoading || !oldPwd || !newPwd} variant="contained">
              儲存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLayout; 