import React, { useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Menu,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Popover
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Call as CallIcon,
  FileDownload as FileDownloadIcon,
  DeleteSweep as DeleteSweepIcon,
  ViewColumn as ViewColumnIcon
} from '@mui/icons-material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DragDropContext } from 'react-beautiful-dnd';

import QueueTable from '../../components/admin/QueueTable';
import CustomerDetailDialog from '../../components/admin/CustomerDetailDialog';
import ExportDialog from '../../components/ExportDialog';
import RegisterForm from '../../components/RegisterForm';
import { useQueueManagement } from '../../hooks/useQueueManagement';

// 定義可顯示的欄位配置
const AVAILABLE_COLUMNS = {
  orderIndex: { key: 'orderIndex', label: '叫號順序', defaultVisible: true },
  queueNumber: { key: 'queueNumber', label: '號碼', defaultVisible: true },
  status: { key: 'status', label: '狀態', defaultVisible: true },
  name: { key: 'name', label: '姓名', defaultVisible: true },
  phone: { key: 'phone', label: '電話', defaultVisible: true },
  email: { key: 'email', label: '電子郵件', defaultVisible: false },
  gender: { key: 'gender', label: '性別', defaultVisible: false },
  birthDate: { key: 'birthDate', label: '出生日期', defaultVisible: false },
  virtualAge: { key: 'virtualAge', label: '虛歲', defaultVisible: false },
  addresses: { key: 'addresses', label: '地址', defaultVisible: false },
  familyMembers: { key: 'familyMembers', label: '家人資訊', defaultVisible: false },
  totalPeople: { key: 'totalPeople', label: '人數', defaultVisible: false },
  consultationTopics: { key: 'consultationTopics', label: '諮詢主題', defaultVisible: false },
  remarks: { key: 'remarks', label: '備註', defaultVisible: false },
  createdAt: { key: 'createdAt', label: '登記時間', defaultVisible: false },
  updatedAt: { key: 'updatedAt', label: '更新時間', defaultVisible: false },
  completedAt: { key: 'completedAt', label: '完成時間', defaultVisible: false },
  actions: { key: 'actions', label: '操作', defaultVisible: true, alwaysVisible: true }
};

const AdminDashboardPage = () => {
  const {
    // 狀態
    localQueueList,
    currentQueue,
    isLoading,
    error,
    currentTab,
    selectedRecord,
    openDialog,
    editMode,
    editedData,
    confirmDialog,
    exportDialogOpen,
    registerDialogOpen,
    duplicateNumbers,
    visibleColumns,
    columnMenuAnchor,
    columnMenuOpen,

    // 方法
    loadQueueList,
    handleReorderQueue,
    handleCallNext,
    handleDragEnd,
    handleOpenDetails,
    handleCloseDialog,
    handleEnterEditMode,
    handleInputChange,
    handleAddressChange,
    addAddress,
    removeAddress,
    handleFamilyMemberChange,
    addFamilyMember,
    removeFamilyMember,
    handleTopicChange,
    handleSaveData,
    handleCompletionChange,
    handleCancelCustomer,
    handleRestoreCustomer,
    handleCompleteFromDialog,
    handleTabChange,
    handleCloseConfirmDialog,
    handleExport,
    handleCloseExportDialog,
    handleDeleteCustomer,
    handleClearAllQueue,
    handleColumnMenuOpen,
    handleColumnMenuClose,
    handleColumnToggle,
    handleResetColumns,
    handleOpenRegisterDialog,
    handleCloseRegisterDialog,
    handleRegisterSuccess
  } = useQueueManagement();

  // 初始載入
  useEffect(() => {
    loadQueueList();
  }, [loadQueueList]);

  // 當分頁切換時重新載入
  useEffect(() => {
    loadQueueList();
  }, [currentTab, loadQueueList]);

  return (
    <Container maxWidth="lg">
      {/* 頁面標題和操作按鈕 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          候位管理
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenRegisterDialog}
            sx={{ mr: 1 }}
          >
            登記候位
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewColumnIcon />}
            onClick={handleColumnMenuOpen}
            sx={{ mr: 1 }}
          >
            欄位設定
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            sx={{ mr: 1 }}
            disabled={isLoading || localQueueList.length === 0}
          >
            匯出資料
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReorderQueue}
            sx={{ mr: 1 }}
          >
            重新排序
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={handleClearAllQueue}
            sx={{ mr: 1 }}
            disabled={isLoading}
          >
            清除所有候位
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CallIcon />}
            onClick={handleCallNext}
            disabled={isLoading}
          >
            叫號下一位
          </Button>
        </Box>
      </Box>

      {/* 錯誤提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 分頁標籤 */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="候位管理分頁">
          <Tab label="候位列表" />
          <Tab label="已完成客戶" />
          <Tab label="已取消客戶" />
        </Tabs>
      </Paper>

      {/* 主要內容區域 */}
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          {currentTab === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" component="div">
                目前叫號: {currentQueue || 0}
              </Typography>
              {/* 客戶總數控制項 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  客戶總數:
                </Typography>
                <input
                  type="number"
                  min="0"
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="0"
                />
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: '60px' }}
                >
                  重設
                </Button>
              </Box>
              {/* 上一位辦完時間控制項 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  上一位辦完時間:
                </Typography>
                <input
                  type="datetime-local"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: '60px' }}
                >
                  重設
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="h6" component="div">
              {currentTab === 1 && '已完成的客戶列表'}
              {currentTab === 2 && '已取消的客戶列表'}
            </Typography>
          )}
        </Box>

        {/* 載入中顯示 */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          /* 候位表格 */
          <DragDropContext onDragEnd={currentTab === 0 ? handleDragEnd : () => {}}>
            <QueueTable
              queueList={localQueueList}
              visibleColumns={visibleColumns}
              availableColumns={AVAILABLE_COLUMNS}
              currentTab={currentTab}
              duplicateNumbers={duplicateNumbers}
              onOpenDetails={handleOpenDetails}
              onCompletionChange={handleCompletionChange}
              onCancelCustomer={handleCancelCustomer}
              onRestoreCustomer={handleRestoreCustomer}
            />
          </DragDropContext>
        )}
      </Paper>

      {/* 客戶詳細資料對話框 */}
      <CustomerDetailDialog
        open={openDialog}
        selectedRecord={selectedRecord}
        editMode={editMode}
        editedData={editedData}
        onClose={handleCloseDialog}
        onEnterEditMode={handleEnterEditMode}
        onSaveData={handleSaveData}
        onInputChange={handleInputChange}
        onAddressChange={handleAddressChange}
        onAddAddress={addAddress}
        onRemoveAddress={removeAddress}
        onFamilyMemberChange={handleFamilyMemberChange}
        onAddFamilyMember={addFamilyMember}
        onRemoveFamilyMember={removeFamilyMember}
        onTopicChange={handleTopicChange}
        onCompleteFromDialog={handleCompleteFromDialog}
      />

      {/* 確認對話框 */}
      <Dialog open={confirmDialog.open} onClose={handleCloseConfirmDialog}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog}>取消</Button>
          <Button 
            onClick={confirmDialog.onConfirm} 
            color="primary" 
            variant="contained"
            autoFocus
          >
            確定
          </Button>
        </DialogActions>
      </Dialog>

      {/* 匯出對話框 */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={handleCloseExportDialog}
        customers={localQueueList}
      />

      {/* 登記候位對話框 */}
      <Dialog
        open={registerDialogOpen}
        onClose={handleCloseRegisterDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>登記候位</DialogTitle>
        <DialogContent>
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            embedded={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRegisterDialog}>
            關閉
          </Button>
        </DialogActions>
      </Dialog>

      {/* 欄位設定選單 */}
      <Popover
        open={columnMenuOpen}
        anchorEl={columnMenuAnchor}
        onClose={handleColumnMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            選擇要顯示的欄位
          </Typography>
          <FormGroup>
            {Object.entries(AVAILABLE_COLUMNS).map(([key, config]) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={visibleColumns.includes(key)}
                    onChange={() => handleColumnToggle(key, AVAILABLE_COLUMNS)}
                    disabled={config.alwaysVisible}
                  />
                }
                label={config.label}
              />
            ))}
          </FormGroup>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleResetColumns}
              variant="outlined"
            >
              重設為預設
            </Button>
          </Box>
        </Box>
      </Popover>
    </Container>
  );
};

export default AdminDashboardPage;
