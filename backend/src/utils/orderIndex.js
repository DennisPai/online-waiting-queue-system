const logger = require('./logger');
const WaitingRecord = require('../models/waiting-record.model');
const SystemSetting = require('../models/system-setting.model');

/**
 * 確保 orderIndex 的一致性和連續性
 * isOpen=false 時同步 queueNumber = orderIndex
 * 共用於 admin queue controller 和 queue controller
 */
async function ensureOrderIndexConsistency() {
  try {
    const settings = await SystemSetting.getSettings();
    const isOpen = settings.isQueueOpen;

    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1 });
    
    let needsUpdate = false;
    for (let i = 0; i < activeRecords.length; i++) {
      const correctOrderIndex = i + 1;
      let changed = false;

      if (activeRecords[i].orderIndex !== correctOrderIndex) {
        activeRecords[i].orderIndex = correctOrderIndex;
        changed = true;
      }

      // isOpen=false 時同步 queueNumber = orderIndex
      if (!isOpen && activeRecords[i].queueNumber !== correctOrderIndex) {
        activeRecords[i].queueNumber = correctOrderIndex;
        changed = true;
      }

      if (changed) {
        await activeRecords[i].save();
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      logger.info(`已完成 orderIndex 一致性修正（isOpen=${isOpen}）`);
    }
  } catch (error) {
    logger.error('確保 orderIndex 一致性時發生錯誤:', error);
  }
}

module.exports = { ensureOrderIndexConsistency };
