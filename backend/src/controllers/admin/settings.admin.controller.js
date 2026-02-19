const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');

// 設置下次辦事時間
exports.setNextSessionDate = async (req, res) => {
  try {
    const { nextSessionDate } = req.body;
    if (!nextSessionDate || isNaN(new Date(nextSessionDate).getTime())) {
      return res.status(400).json({ success: false, message: '無效的日期格式' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.nextSessionDate = new Date(nextSessionDate);
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: '下次辦事時間設置成功', data: { nextSessionDate: settings.nextSessionDate } });
  } catch (error) {
    console.error('設置下次辦事時間錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 開關候位功能
exports.toggleQueueStatus = async (req, res) => {
  try {
    const { isOpen } = req.body;
    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isOpen 必須是布爾值' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.isQueueOpen = isOpen;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `辦事服務已${isOpen ? '開始' : '停止'}`, data: { isQueueOpen: settings.isQueueOpen } });
  } catch (error) {
    console.error('切換候位狀態錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定最大叫號順序上限
exports.setMaxOrderIndex = async (req, res) => {
  try {
    const { maxOrderIndex } = req.body;
    if (!Number.isInteger(maxOrderIndex) || maxOrderIndex < 1) {
      return res.status(400).json({ success: false, message: '最大叫號順序上限必須是大於0的整數' });
    }
    
    const settings = await SystemSetting.getSettings();
    
    const maxOrderIndexRecord = await WaitingRecord.findOne({ status: { $in: ['waiting', 'processing'] } }).sort({ orderIndex: -1 });
    const currentMaxOrderIndex = maxOrderIndexRecord ? maxOrderIndexRecord.orderIndex : 0;
    
    if (currentMaxOrderIndex > maxOrderIndex) {
      return res.status(400).json({ success: false, message: `無法設定，目前最大叫號順序為 ${currentMaxOrderIndex}，新上限不能小於此數字` });
    }
    
    settings.maxOrderIndex = maxOrderIndex;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `最大叫號順序上限已設定為 ${maxOrderIndex}`, data: { maxOrderIndex: settings.maxOrderIndex } });
  } catch (error) {
    console.error('設定最大叫號順序上限錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定每位客戶預估處理時間
exports.setMinutesPerCustomer = async (req, res) => {
  try {
    const { minutesPerCustomer } = req.body;
    if (!Number.isInteger(minutesPerCustomer) || minutesPerCustomer < 1 || minutesPerCustomer > 120) {
      return res.status(400).json({ success: false, message: '每位客戶預估處理時間必須是1-120分鐘之間的整數' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.minutesPerCustomer = minutesPerCustomer;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `每位客戶預估處理時間已設定為 ${minutesPerCustomer} 分鐘`, data: { minutesPerCustomer: settings.minutesPerCustomer } });
  } catch (error) {
    console.error('設定每位客戶預估處理時間錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定簡化模式
exports.setSimplifiedMode = async (req, res) => {
  try {
    const { simplifiedMode } = req.body;
    if (typeof simplifiedMode !== 'boolean') {
      return res.status(400).json({ success: false, message: 'simplifiedMode 必須是布爾值' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.simplifiedMode = simplifiedMode;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `簡化模式已${simplifiedMode ? '開啟' : '關閉'}`, data: { simplifiedMode: settings.simplifiedMode } });
  } catch (error) {
    console.error('設定簡化模式錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定公開候位登記功能
exports.setPublicRegistrationEnabled = async (req, res) => {
  try {
    const { publicRegistrationEnabled } = req.body;
    if (typeof publicRegistrationEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'publicRegistrationEnabled 必須是布爾值' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.publicRegistrationEnabled = publicRegistrationEnabled;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `公開候位登記功能已${publicRegistrationEnabled ? '開啟' : '關閉'}`, data: { publicRegistrationEnabled: settings.publicRegistrationEnabled } });
  } catch (error) {
    console.error('設定公開候位登記功能錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定查詢頁號碼顯示開關
exports.setShowQueueNumberInQuery = async (req, res) => {
  try {
    const { showQueueNumberInQuery } = req.body;
    if (typeof showQueueNumberInQuery !== 'boolean') {
      return res.status(400).json({ success: false, message: 'showQueueNumberInQuery 必須是布爾值' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.showQueueNumberInQuery = showQueueNumberInQuery;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `查詢頁號碼顯示已${showQueueNumberInQuery ? '開啟' : '關閉'}`, data: { showQueueNumberInQuery: settings.showQueueNumberInQuery } });
  } catch (error) {
    console.error('設定查詢頁號碼顯示錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定客戶總數
exports.setTotalCustomerCount = async (req, res) => {
  try {
    const { totalCustomerCount } = req.body;
    if (!Number.isInteger(totalCustomerCount) || totalCustomerCount < 0) {
      return res.status(400).json({ success: false, message: '客戶總數必須是大於等於0的整數' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.totalCustomerCount = totalCustomerCount;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: `客戶總數已設定為 ${totalCustomerCount}`, data: { totalCustomerCount: settings.totalCustomerCount } });
  } catch (error) {
    console.error('設定客戶總數錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 重設客戶總數（自動計算）
exports.resetTotalCustomerCount = async (req, res) => {
  try {
    const waitingCount = await WaitingRecord.countDocuments({ status: 'waiting' });
    const processingCount = await WaitingRecord.countDocuments({ status: 'processing' });
    const completedCount = await WaitingRecord.countDocuments({ status: 'completed' });
    const totalCount = waitingCount + processingCount + completedCount;
    
    const settings = await SystemSetting.getSettings();
    settings.totalCustomerCount = totalCount;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `客戶總數已重設為 ${totalCount}（等待中: ${waitingCount}，處理中: ${processingCount}，已完成: ${completedCount}）`,
      data: {
        totalCustomerCount: settings.totalCustomerCount,
        breakdown: { waiting: waitingCount, processing: processingCount, completed: completedCount }
      }
    });
  } catch (error) {
    console.error('重設客戶總數錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定上一位辦完時間
exports.setLastCompletedTime = async (req, res) => {
  try {
    const { lastCompletedTime } = req.body;
    if (!lastCompletedTime || isNaN(new Date(lastCompletedTime).getTime())) {
      return res.status(400).json({ success: false, message: '無效的時間格式' });
    }
    
    const settings = await SystemSetting.getSettings();
    settings.lastCompletedTime = new Date(lastCompletedTime);
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({ success: true, message: '上一位辦完時間設置成功', data: { lastCompletedTime: settings.lastCompletedTime } });
  } catch (error) {
    console.error('設置上一位辦完時間錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 重設上一位辦完時間（自動查找）
exports.resetLastCompletedTime = async (req, res) => {
  try {
    const lastCompleted = await WaitingRecord.findOne(
      { status: 'completed', completedAt: { $exists: true, $ne: null } },
      {},
      { sort: { completedAt: -1 } }
    );
    
    const settings = await SystemSetting.getSettings();
    let newLastCompletedTime;
    let message;
    
    if (lastCompleted) {
      newLastCompletedTime = lastCompleted.completedAt;
      message = `上一位辦完時間已重設為最後一位已完成客戶的時間: ${newLastCompletedTime}`;
    } else {
      newLastCompletedTime = settings.nextSessionDate || new Date();
      message = `沒有已完成客戶記錄，上一位辦完時間已重設為: ${newLastCompletedTime}`;
    }
    
    if (settings.nextSessionDate && newLastCompletedTime < settings.nextSessionDate) {
      newLastCompletedTime = settings.nextSessionDate;
      message = `上一位辦完時間已重設為下次辦事時間: ${newLastCompletedTime}（因早於開始辦事時間）`;
    }
    
    settings.lastCompletedTime = newLastCompletedTime;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message,
      data: {
        lastCompletedTime: settings.lastCompletedTime,
        hasCompletedCustomers: !!lastCompleted,
        nextSessionDate: settings.nextSessionDate
      }
    });
  } catch (error) {
    console.error('重設上一位辦完時間錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};
