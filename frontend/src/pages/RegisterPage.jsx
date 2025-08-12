import React from 'react';
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
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import {
  BasicInfoSection,
  AddressSection,
  FamilySection,
  ConsultationSection,
  RegistrationSuccess
} from '../components/registration';

const RegisterPage = () => {
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
    addFamilyMember,
    removeFamilyMember,
    handleSubmit,
    handleBackToHome
  } = useRegistrationForm();

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
      {maxOrderIndex !== undefined && (
        <Box sx={{ mb: 3 }}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 候位提醒
              </Typography>
              <Typography variant="body1">
                您的叫號順序將會是第 <strong>{(maxOrderIndex || 0) + 1}</strong> 號
              </Typography>
              {maxOrderMessage && (
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                  {maxOrderMessage}
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
