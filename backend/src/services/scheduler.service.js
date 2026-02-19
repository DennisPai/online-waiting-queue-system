const logger = require('../utils/logger');
const schedule = require('node-schedule');
const SystemSetting = require('../models/system-setting.model');

let scheduledJob = null;

/**
 * 動態設定排程任務
 * 只在特定時間執行一次，不是輪詢
 */
const schedulePublicRegistrationOpening = async () => {
  try {
    const settings = await SystemSetting.findOne();
    
    // 取消現有任務
    if (scheduledJob) {
      scheduledJob.cancel();
      scheduledJob = null;
      logger.info('[排程系統] 已取消舊的排程任務');
    }
    
    // 檢查是否需要設定新任務
    if (settings && settings.autoOpenEnabled) {
      let scheduledTime;
      
      // 優先使用自訂時間，否則使用動態計算（nextSessionDate + 1天 + 中午12:00）
      if (settings.scheduledOpenTime) {
        scheduledTime = new Date(settings.scheduledOpenTime);
        logger.info('[排程系統] 使用自訂時間');
      } else if (settings.nextSessionDate) {
        const sessionDate = new Date(settings.nextSessionDate);
        scheduledTime = new Date(sessionDate);
        scheduledTime.setDate(sessionDate.getDate() + 1);
        scheduledTime.setHours(12, 0, 0, 0);
        logger.info('[排程系統] 使用動態計算時間（開科辦事日 + 1天 + 中午12:00）');
      } else {
        logger.info('[排程系統] ⚠️ 未設定開科辦事日期，無法計算排程時間');
        return;
      }
      
      const now = new Date();
      
      // 只有未來時間才設定任務
      if (scheduledTime > now) {
        scheduledJob = schedule.scheduleJob(scheduledTime, async () => {
          try {
            logger.info('[排程系統] 開始執行定時開放任務...');
            
            const currentSettings = await SystemSetting.findOne();
            
            if (currentSettings && currentSettings.autoOpenEnabled) {
              currentSettings.publicRegistrationEnabled = true;
              currentSettings.autoOpenEnabled = false; // 執行後自動關閉
              await currentSettings.save();
              
              logger.info(`[排程系統] ✅ 已在 ${new Date().toISOString()} 自動開啟公開候位登記`);
            } else {
              logger.info('[排程系統] ⚠️ 任務已被取消或設定已變更');
            }
          } catch (error) {
            logger.error('[排程系統] ❌ 執行失敗:', error);
          } finally {
            scheduledJob = null;
          }
        });
        
        logger.info(`[排程系統] ✅ 已設定在 ${scheduledTime.toISOString()} (台北時間) 自動開啟公開候位登記`);
        logger.info(`[排程系統] 距離執行還有 ${Math.round((scheduledTime - now) / 1000 / 60)} 分鐘`);
      } else {
        logger.info('[排程系統] ⚠️ 排程時間已過期，不設定任務');
      }
    } else {
      logger.info('[排程系統] ℹ️ 未啟用定時開放');
    }
  } catch (error) {
    logger.error('[排程系統] ❌ 初始化失敗:', error);
  }
};

/**
 * 重新設定排程（當管理員更新時間或開關時呼叫）
 */
const rescheduleRegistrationOpening = async () => {
  logger.info('[排程系統] 🔄 管理員更新設定，重新設定排程任務...');
  await schedulePublicRegistrationOpening();
};

/**
 * 取消所有排程任務（用於服務關閉時）
 */
const cancelAllScheduledJobs = () => {
  if (scheduledJob) {
    scheduledJob.cancel();
    scheduledJob = null;
    logger.info('[排程系統] 🛑 已取消所有排程任務');
  }
};

module.exports = { 
  schedulePublicRegistrationOpening, 
  rescheduleRegistrationOpening,
  cancelAllScheduledJobs
};

