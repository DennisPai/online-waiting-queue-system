import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getQueueStatus } from '../redux/slices/queueSlice';
import { getNextRegistrationDate } from '../utils/dateUtils';
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import {
  BasicInfoSection,
  AddressSection,
  FamilySection,
  ConsultationSection,
  RegistrationSuccess
} from '../components/registration';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { queueStatus, isFull } = useSelector((state) => state.queue);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [showFullMessage, setShowFullMessage] = useState(false);

  // 計算顯示的時間：優先使用自訂值，否則使用動態計算
  const getDisplayDateTime = () => {
    // 如果有自訂值，格式化顯示
    if (queueStatus?.scheduledOpenTime) {
      try {
        const date = new Date(queueStatus.scheduledOpenTime);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch (error) {
        console.error('格式化日期錯誤:', error);
      }
    }
    // 否則使用動態計算
    if (queueStatus?.nextSessionDate) {
      const dateStr = getNextRegistrationDate(queueStatus.nextSessionDate);
      return `${dateStr}中午12:00整`;
    }
    return '未設定';
  };

  const displayDateTime = getDisplayDateTime();

  const {
    // 狀態
    formData,
    formErrors,
    showSuccessPage,
    isLoading,
    registeredQueueNumber,
    waitingCount,
    estimatedWaitTime,
    estimatedEndTime,
    maxOrderIndex,
    maxOrderMessage,
    registeredOrderIndex,

    // 方法
    handleChange,
    handleAddressChange,
    addAddress,
    removeAddress,
    handleFamilyMemberChange,
    handleUsePrimaryAddress,
    addFamilyMember,
    removeFamilyMember,
    handleSubmit,
    handleBackToHome
  } = useRegistrationForm();

  // 檢查候位狀態
  useEffect(() => {
    dispatch(getQueueStatus());
  }, [dispatch]);

  // 處理額滿狀態的跳轉邏輯
  useEffect(() => {
    if (isFull) {
      setShowFullMessage(true);
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isFull, navigate]);

  // 如果已額滿，顯示提示訊息
  if (showFullMessage && isFull) {
    return (
      <Container maxWidth="md">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            本次報名已額滿
          </Typography>
          <Typography variant="h6" component="h2" color="text.secondary" paragraph>
            本次預約人數已達上限，敬請報名下次開科辦事，下次開科辦事開放報名時間為{displayDateTime}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            將在 {redirectCountdown} 秒後自動返回首頁...
          </Typography>
        </Box>
      </Container>
    );
  }

  // 如果顯示成功頁面
  if (showSuccessPage) {
    return (
      <RegistrationSuccess
        registeredQueueNumber={registeredQueueNumber}
        waitingCount={waitingCount}
        estimatedWaitTime={estimatedWaitTime}
        estimatedEndTime={estimatedEndTime}
        registeredOrderIndex={registeredOrderIndex}
        maxOrderMessage={maxOrderMessage}
        onBackToHome={handleBackToHome}
      />
    );
  }

  return (
    <Container maxWidth="md">
      {/* 頁面標題 */}
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          候位登記
        </Typography>
        <Typography variant="h6" component="h2" color="text.secondary" align="center">
          請填寫以下資料完成候位登記
        </Typography>
      </Box>

      {/* 候位提醒卡片 */}
      {maxOrderMessage && (
        <Box sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>
                📢 候位提醒
              </Typography>
              <Typography variant="body1" align="center" sx={{ mt: 1 }}>
                {maxOrderMessage}
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.9 }}>
                您的編號將會是第 <strong>{(maxOrderIndex || 0) + 1}</strong> 號
              </Typography>
              {(maxOrderIndex + 1) > 80 && (
                <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.9, color: 'warning.main' }}>
                  ※ 超過80號預計將排至凌晨1點以後，若非重大問題急需求助，建議預約下次問事。
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
      
      {/* 主要表單 */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4 }}>
        <Grid container spacing={3}>
          {/* 基本資料區塊 */}
          <BasicInfoSection
            formData={formData}
            formErrors={formErrors}
            onChange={handleChange}
          />

          {/* 地址資訊區塊 */}
          <AddressSection
            formData={formData}
            formErrors={formErrors}
            onAddressChange={handleAddressChange}
            onAddAddress={addAddress}
            onRemoveAddress={removeAddress}
          />

          {/* 家人資訊區塊 */}
          <FamilySection
            formData={formData}
            formErrors={formErrors}
            onFamilyMemberChange={handleFamilyMemberChange}
            onUsePrimaryAddress={handleUsePrimaryAddress}
            onAddFamilyMember={addFamilyMember}
            onRemoveFamilyMember={removeFamilyMember}
          />

          {/* 諮詢主題區塊 */}
          <ConsultationSection
            formData={formData}
            formErrors={formErrors}
            onChange={handleChange}
          />

          {/* 提交按鈕 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isLoading}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  '完成登記'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
