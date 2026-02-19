const mongoose = require('mongoose');
const User = require('../models/user.model');
const SystemSetting = require('../models/system-setting.model');

// 初始化管理員帳戶和系統設置
const initializeData = async () => {
  try {
    console.log('=== 開始初始化數據 ===');
    
    // 檢查是否已存在管理員帳戶
    console.log('檢查管理員帳戶...');
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('創建管理員帳戶...');
      
      const admin = await User.create({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123', // 優先使用環境變數
        email: 'admin@example.com',
        role: 'admin'
      });
      
      console.log('管理員帳戶創建成功! ID:', admin._id);
    } else {
      console.log('管理員帳戶已存在，ID:', adminExists._id);
    }
    
    // 初始化系統設置
    console.log('檢查系統設置...');
    const settingsExist = await SystemSetting.findOne();
    
    if (!settingsExist) {
      console.log('初始化系統設置...');
      
      const settings = await SystemSetting.create({
        nextSessionDate: new Date(),
        isQueueOpen: true,
        currentQueueNumber: 0,
        maxQueueNumber: 100
      });
      
      console.log('系統設置初始化成功! ID:', settings._id);
    } else {
      console.log('系統設置已存在，ID:', settingsExist._id);
    }
    
    console.log('=== 數據初始化完成! ===');
    return true;
  } catch (error) {
    console.error('初始化數據時出錯:', error);
    return false;
  }
};

module.exports = initializeData; 