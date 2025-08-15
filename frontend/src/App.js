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

// 匯入新增的預覽頁面
import ExcelPreviewPage from './pages/admin/ExcelPreviewPage';
import PDFPreviewPage from './pages/admin/PDFPreviewPage';

// 匯入元件
import { ProtectedRoute, ConditionalRegistrationRoute } from './components/common';
import { Layout, AdminLayout } from './components/layout';

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
            <Route 
              path="register" 
              element={
                <ConditionalRegistrationRoute>
                  <RegisterResetWrapper />
                </ConditionalRegistrationRoute>
              } 
            />
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
            <Route path="settings" element={<AdminSettingsPage />} />
            
            {/* 新增預覽頁面路由 */}
            <Route path="excel-preview" element={<ExcelPreviewPage />} />
            <Route path="pdf-preview" element={<PDFPreviewPage />} />
          </Route>
          
          {/* 錯誤路由 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </FontSizeProvider>
  );
}

export default App; 