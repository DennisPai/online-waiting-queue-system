const logger = require('./logger');
const mongoose = require('mongoose');
const WaitingRecord = require('../models/waiting-record.model');

async function removeQueueNumberUniqueIndex() {
  try {
    logger.info('開始移除queueNumber的唯一索引...');
    
    // 檢查索引是否存在
    const indexes = await WaitingRecord.collection.getIndexes();
    logger.info('當前索引:', Object.keys(indexes));
    
    // 嘗試移除queueNumber的唯一索引
    if (indexes['queueNumber_1']) {
      await WaitingRecord.collection.dropIndex('queueNumber_1');
      logger.info('成功移除queueNumber_1唯一索引');
    } else {
      logger.info('queueNumber_1索引不存在，無需移除');
    }
    
    // 重新檢查索引
    const newIndexes = await WaitingRecord.collection.getIndexes();
    logger.info('移除後的索引:', Object.keys(newIndexes));
    
    logger.info('索引移除完成');
  } catch (error) {
    logger.error('移除索引時發生錯誤:', error);
    
    if (error.code === 27) {
      logger.info('索引不存在，這是正常的');
    } else {
      throw error;
    }
  }
}

module.exports = removeQueueNumberUniqueIndex;

// 如果直接運行此腳本
if (require.main === module) {
  const connectDB = require('../config/database');
  
  async function run() {
    try {
      await connectDB();
      await removeQueueNumberUniqueIndex();
      process.exit(0);
    } catch (error) {
      logger.error('腳本執行失敗:', error);
      process.exit(1);
    }
  }
  
  run();
} 