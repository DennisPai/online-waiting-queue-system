import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { useDispatch } from 'react-redux';
import { resetRegistration, clearQueueSearch } from './redux/slices/queueSlice';

// 匯入頁面
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import StatusPage from './pages/StatusPage';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// 匯入元件
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// 匯入字體大小Context
import { FontSizeProvider } from './contexts/FontSizeContext';

// 重置 Redux 狀態的包裝器組件
const RegisterResetWrapper = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  
  useEffect(() => {
    dispatch(resetRegistration());
  }, [dispatch, location.key]);
  
  return <RegisterPage />;
};

const StatusResetWrapper = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  
  useEffect(() => {
    dispatch(clearQueueSearch());
  }, [dispatch, location.key]);
  
  return <StatusPage />;
};

function App() {
  return (
    <FontSizeProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          {/* 公共路由 */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="register" element={<RegisterResetWrapper />} />
            <Route path="status/:queueNumber" element={<StatusResetWrapper />} />
            <Route path="login" element={<LoginPage />} />
          </Route>
          
          {/* 管理員路由 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="settings" element={<ErrorBoundary><AdminSettingsPage /></ErrorBoundary>} />
          </Route>
          
          {/* 錯誤路由 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </FontSizeProvider>
  );
}

export default App; 