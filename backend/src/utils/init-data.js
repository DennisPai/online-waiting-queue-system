const logger = require('./logger');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const SystemSetting = require('../models/system-setting.model');

// 初始化管理員帳戶和系統設置
const initializeData = async () => {
  try {
    logger.info('=== 開始初始化數據 ===');
    
    // 檢查是否已存在管理員帳戶
    logger.info('檢查管理員帳戶...');
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      logger.info('創建管理員帳戶...');
      
      const admin = await User.create({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123', // 優先使用環境變數
        email: 'admin@example.com',
        role: 'admin'
      });
      
      logger.info('管理員帳戶創建成功! ID:', admin._id);
    } else {
      logger.info('管理員帳戶已存在，ID:', adminExists._id);
    }
    
    // 初始化系統設置
    logger.info('檢查系統設置...');
    const settingsExist = await SystemSetting.findOne();
    
    if (!settingsExist) {
      logger.info('初始化系統設置...');
      
      const settings = await SystemSetting.create({
        nextSessionDate: new Date(),
        isQueueOpen: true,
        currentQueueNumber: 0,
        maxQueueNumber: 100
      });
      
      logger.info('系統設置初始化成功! ID:', settings._id);
    } else {
      logger.info('系統設置已存在，ID:', settingsExist._id);
    }
    
    logger.info('=== 數據初始化完成! ===');
    return true;
  } catch (error) {
    logger.error('初始化數據時出錯:', error);
    return false;
  }
};

module.exports = initializeData; 