import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { hideAlert } from '../redux/slices/uiSlice';
import { logout } from '../redux/slices/authSlice';
import FontSizeSelector from './FontSizeSelector';

const Layout = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { alert } = useSelector((state) => state.ui);

  const handleLogout = () => {
    dispatch(logout());
    handleCloseMenu();
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    dispatch(hideAlert());
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ 
              flexGrow: 1, 
              textDecoration: 'none', 
              color: 'inherit',
              fontSize: { xs: '1rem', md: '1.25rem' }
            }}
          >
            線上候位系統
          </Typography>
          
          {!isMobile && (
            <>
              {/* 桌面版字體大小調整器 */}
              <Box sx={{ mr: 2 }}>
                <FontSizeSelector variant="buttons" showLabel={false} />
              </Box>
              
              {/* 只有管理員登入時才顯示我要候位按鈕 */}
              {isAuthenticated && (
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/register"
                  sx={{ mr: 1 }}
                  startIcon={<PersonAddIcon />}
                >
                  我要候位
                </Button>
              )}
              
              {isAuthenticated ? (
                <>
                  <Button
                    color="inherit"
                    component={RouterLink}
                    to="/admin/dashboard"
                    sx={{ mr: 1 }}
                    startIcon={<AdminIcon />}
                  >
                    管理面板
                  </Button>
                  <Button 
                    color="inherit" 
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                  >
                    登出
                  </Button>
                </>
              ) : (
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/login"
                  startIcon={<LoginIcon />}
                >
                  管理員登入
                </Button>
              )}
            </>
          )}
          
          {isMobile && (
            <>
              {/* 手機版字體大小調整器 */}
              <Box sx={{ mr: 1 }}>
                <FontSizeSelector variant="buttons" showLabel={false} />
              </Box>
              
              <IconButton
                color="inherit"
                onClick={handleMenuClick}
                edge="end"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
              >
                <MenuItem 
                  component={RouterLink} 
                  to="/" 
                  onClick={handleCloseMenu}
                >
                  <HomeIcon sx={{ mr: 1 }} />
                  首頁
                </MenuItem>
                {/* 只有管理員登入時才顯示我要候位選項 */}
                {isAuthenticated && (
                  <MenuItem 
                    component={RouterLink} 
                    to="/register" 
                    onClick={handleCloseMenu}
                  >
                    <PersonAddIcon sx={{ mr: 1 }} />
                    我要候位
                  </MenuItem>
                )}
                {isAuthenticated ? (
                  <>
                    <MenuItem 
                      component={RouterLink} 
                      to="/admin/dashboard" 
                      onClick={handleCloseMenu}
                    >
                      <AdminIcon sx={{ mr: 1 }} />
                      管理面板
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1 }} />
                      登出
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem 
                    component={RouterLink} 
                    to="/login" 
                    onClick={handleCloseMenu}
                  >
                    <LoginIcon sx={{ mr: 1 }} />
                    管理員登入
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container 
        component="main" 
        sx={{ 
          mt: { xs: 2, md: 4 }, 
          mb: { xs: 2, md: 4 }, 
          flexGrow: 1,
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          py: { xs: 2, md: 3 },
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[200]
        }}
      >
        <Container maxWidth="sm">
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          >
            © {new Date().getFullYear()} 線上候位系統
          </Typography>
        </Container>
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ 
          vertical: 'bottom', 
          horizontal: 'center' 
        }}
        sx={{
          bottom: { xs: 24, md: 24 }
        }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity} 
          sx={{ 
            width: '100%',
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout; 