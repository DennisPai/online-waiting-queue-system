const logger = require('./logger');
const WaitingRecord = require('../models/waiting-record.model');

/**
 * 確保 orderIndex 的一致性和連續性
 * 共用於 admin queue controller 和 queue controller
 */
async function ensureOrderIndexConsistency() {
  try {
    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1 });
    
    let needsUpdate = false;
    for (let i = 0; i < activeRecords.length; i++) {
      const correctOrderIndex = i + 1;
      if (activeRecords[i].orderIndex !== correctOrderIndex) {
        activeRecords[i].orderIndex = correctOrderIndex;
        await activeRecords[i].save();
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      logger.info('已完成 orderIndex 一致性修正');
    }
  } catch (error) {
    logger.error('確保 orderIndex 一致性時發生錯誤:', error);
  }
}

module.exports = { ensureOrderIndexConsistency };
