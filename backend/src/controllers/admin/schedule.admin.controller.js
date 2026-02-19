const SystemSetting = require('../../models/system-setting.model');

// 獲取下次開科辦事開放報名時間設定
exports.getScheduledOpenTime = async (req, res) => {
  try {
    const settings = await SystemSetting.getSettings();
    
    let scheduledOpenTime = null;
    let isExpired = false;
    
    if (settings?.scheduledOpenTime) {
      const date = new Date(settings.scheduledOpenTime);
      if (!isNaN(date.getTime())) {
        scheduledOpenTime = date.toISOString();
        isExpired = date < new Date();
      }
    }
    
    return res.status(200).json({
      success: true,
      code: 'OK',
      message: '獲取開放報名時間設定成功',
      data: { scheduledOpenTime, isExpired, autoOpenEnabled: settings?.autoOpenEnabled || false }
    });
  } catch (error) {
    console.error('獲取開放報名時間設定錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '獲取設定時發生錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 更新下次開科辦事開放報名時間設定
exports.updateScheduledOpenTime = async (req, res) => {
  try {
    const { scheduledOpenTime } = req.body;
    const settings = await SystemSetting.getSettings();
    
    if (scheduledOpenTime) {
      const date = new Date(scheduledOpenTime);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ success: false, code: 'INVALID_DATE', message: '日期格式無效' });
      }
      settings.scheduledOpenTime = date;
    } else {
      settings.scheduledOpenTime = null;
    }
    settings.updatedBy = req.user.id;
    await settings.save();
    
    const { rescheduleRegistrationOpening } = require('../../services/scheduler.service');
    await rescheduleRegistrationOpening();
    
    return res.status(200).json({ success: true, code: 'OK', message: '開放報名時間設定已更新', data: { scheduledOpenTime: settings.scheduledOpenTime } });
  } catch (error) {
    console.error('更新開放報名時間設定錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '更新設定時發生錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 設定定時開放開關
exports.setAutoOpenEnabled = async (req, res) => {
  try {
    const { autoOpenEnabled } = req.body;
    const settings = await SystemSetting.getSettings();
    
    settings.autoOpenEnabled = autoOpenEnabled;
    settings.updatedBy = req.user.id;
    await settings.save();
    
    const { rescheduleRegistrationOpening } = require('../../services/scheduler.service');
    await rescheduleRegistrationOpening();
    
    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `定時開放已${autoOpenEnabled ? '啟用' : '停用'}`,
      data: { autoOpenEnabled: settings.autoOpenEnabled }
    });
  } catch (error) {
    console.error('設定定時開放錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '設定失敗' });
  }
};
