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

// 匯入日誌系統 - 修復匯入方式
import './utils/logger';

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
  // 在應用啟動時記錄日誌
  useEffect(() => {
    // 檢查 window.logger 是否可用
    if (window.logger) {
      window.logger.info('候位系統應用已啟動', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }, 'App');

      // 在控制台顯示日誌查看器說明
      console.log('%c🔍 候位系統日誌系統已啟動', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      console.log('%c使用以下命令查看日誌:', 'color: #2196F3; font-size: 14px;');
      console.log('%clogger.showLogViewer() - 顯示日誌查看器', 'color: #FF9800; font-size: 12px;');
      console.log('%clogger.getAllLogs() - 獲取所有日誌', 'color: #FF9800; font-size: 12px;');
      console.log('%clogger.getLogsByLevel("error") - 獲取錯誤日誌', 'color: #FF9800; font-size: 12px;');
      console.log('%clogger.exportLogs() - 匯出日誌文件', 'color: #FF9800; font-size: 12px;');
    } else {
      console.warn('日誌系統尚未載入完成');
    }
  }, []);

  return (
    <ErrorBoundary>
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
              <Route path="settings" element={
                <ErrorBoundary>
                  <AdminSettingsPage />
                </ErrorBoundary>
              } />
            </Route>
            
            {/* 錯誤路由 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </FontSizeProvider>
    </ErrorBoundary>
  );
}

export default App; 