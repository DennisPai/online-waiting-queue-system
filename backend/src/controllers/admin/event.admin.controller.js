const SystemSetting = require('../../models/system-setting.model');

// 獲取活動報名區塊設定
exports.getEventBanner = async (req, res) => {
  try {
    const settings = await SystemSetting.getSettings();
    res.status(200).json({ success: true, message: '獲取活動報名設定成功', data: settings.eventBanner });
  } catch (error) {
    console.error('獲取活動報名區塊設定錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 更新活動報名區塊設定
exports.updateEventBanner = async (req, res) => {
  try {
    const { enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor } = req.body;
    
    // 驗證 URL 格式
    if (buttonUrl) {
      if (!/^https?:\/\/.+/i.test(buttonUrl)) {
        return res.status(400).json({ success: false, message: 'URL 格式不正確，必須以 http:// 或 https:// 開頭' });
      }
    }
    
    // 驗證字體大小格式
    if (titleSize && !/^\d+(\.\d+)?(rem|px|em)$/.test(titleSize)) {
      return res.status(400).json({ success: false, message: '字體大小格式不正確，請使用 rem、px 或 em 單位' });
    }
    
    // 驗證顏色格式
    const colorRegex = /^#[0-9A-F]{6}$/i;
    const colorFields = { titleColor, backgroundColor, buttonColor, buttonTextColor };
    for (const [field, value] of Object.entries(colorFields)) {
      if (value && !colorRegex.test(value)) {
        return res.status(400).json({ success: false, message: `${field} 顏色格式不正確，請使用 hex 格式（例如：#1976d2）` });
      }
    }
    
    // 驗證對齊方式
    if (titleAlign && !['left', 'center', 'right'].includes(titleAlign)) {
      return res.status(400).json({ success: false, message: '對齊方式必須是 left、center 或 right' });
    }
    
    // 驗證字體粗細
    if (fontWeight && !['normal', 'bold'].includes(fontWeight)) {
      return res.status(400).json({ success: false, message: '字體粗細必須是 normal 或 bold' });
    }
    
    const settings = await SystemSetting.getSettings();
    
    settings.eventBanner = settings.eventBanner || {};
    if (enabled !== undefined) settings.eventBanner.enabled = enabled;
    if (title !== undefined) settings.eventBanner.title = title;
    if (titleSize !== undefined) settings.eventBanner.titleSize = titleSize;
    if (titleColor !== undefined) settings.eventBanner.titleColor = titleColor;
    if (titleAlign !== undefined) settings.eventBanner.titleAlign = titleAlign;
    if (fontWeight !== undefined) settings.eventBanner.fontWeight = fontWeight;
    if (backgroundColor !== undefined) settings.eventBanner.backgroundColor = backgroundColor;
    if (buttonText !== undefined) settings.eventBanner.buttonText = buttonText;
    if (buttonUrl !== undefined) settings.eventBanner.buttonUrl = buttonUrl;
    if (buttonColor !== undefined) settings.eventBanner.buttonColor = buttonColor;
    if (buttonTextColor !== undefined) settings.eventBanner.buttonTextColor = buttonTextColor;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({ success: true, message: '活動報名區塊設定已更新', data: settings.eventBanner });
  } catch (error) {
    console.error('更新活動報名區塊設定錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};
