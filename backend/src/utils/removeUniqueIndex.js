/*
 * ⚠️ 手動一次性腳本 —— 不再掛在 app.js 開機流程（Phase 3 額外任務移除）。
 *
 * 此工具只 dropIndex('queueNumber_1')，以「精確索引名」定位，
 * 絕不會誤拆 Phase 3 新加的 orderIndex partial unique index
 * （orderIndex_active_unique）。保留此檔僅供日後「真的需要手動移除
 * 舊 queueNumber 唯一索引」的一次性情境使用：
 *   node src/utils/removeUniqueIndex.js
 *
 * 系統正常運作不需要、也不應該自動執行此腳本。
 */
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