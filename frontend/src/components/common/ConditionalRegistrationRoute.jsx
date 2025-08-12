import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const ConditionalRegistrationRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { queueStatus } = useSelector((state) => state.queue);
  
  // 如果公開候位登記開啟或管理員已登入，則允許訪問
  if (queueStatus?.publicRegistrationEnabled || isAuthenticated) {
    return children;
  }
  
  // 否則重定向到首頁
  return <Navigate to="/" replace />;
};

export default ConditionalRegistrationRoute; 