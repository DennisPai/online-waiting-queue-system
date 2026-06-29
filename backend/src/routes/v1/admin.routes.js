const express = require('express');
const { body } = require('express-validator');
const adminController = require('../../controllers/admin/index');
const queueController = require('../../controllers/queue.controller');
const { validateRequest, protect } = require('../../utils/middleware');

const router = express.Router();

router.use(protect);

router.get('/queue/list', adminController.getQueueList);
// 使用 queue controller 中已有的 getOrderedNumbers 函數
router.get('/queue/ordered-numbers', queueController.getOrderedNumbers);
router.put('/queue/next', adminController.callNext);

router.put(
  '/queue/:queueId/status',
  [body('status').isIn(['waiting', 'processing', 'completed', 'cancelled']).withMessage('狀態值無效')],
  validateRequest,
  adminController.updateQueueStatus
);

router.put(
  '/queue/:queueId/update',
  [
    body('queueNumber').optional().isInt({ min: 1 }).withMessage('候位號碼必須是正整數')
  ],
  validateRequest,
  adminController.updateQueueData
);

router.delete('/queue/:queueId/delete', adminController.deleteCustomer);

router.put(
  '/queue/order',
  [body('queueId').notEmpty().withMessage('缺少候位識別碼'), body('newOrder').isInt({ min: 1 }).withMessage('新順序必須是正整數')],
  validateRequest,
  adminController.updateQueueOrder
);

router.put('/queue/reorder', [body('orderedIds').isArray({ min: 1 }).withMessage('排序清單必須是非空陣列')], validateRequest, adminController.reorderQueue);
router.put('/settings/next-session', [body('nextSessionDate').notEmpty().withMessage('請設定下次開科日期')], validateRequest, adminController.setNextSessionDate);
router.put('/settings/queue-status', [body('isOpen').isBoolean().withMessage('開放狀態必須是布林值')], validateRequest, adminController.toggleQueueStatus);
router.put('/settings/max-order-index', [body('maxOrderIndex').isInt({ min: 1 }).withMessage('最大號碼必須是正整數')], validateRequest, adminController.setMaxOrderIndex);
router.put('/settings/minutes-per-customer', [body('minutesPerCustomer').isInt({ min: 1, max: 120 }).withMessage('每位客戶分鐘數必須是 1-120 的整數')], validateRequest, adminController.setMinutesPerCustomer);
router.put('/settings/simplified-mode', [body('simplifiedMode').isBoolean().withMessage('精簡模式必須是布林值')], validateRequest, adminController.setSimplifiedMode);
router.put('/settings/public-registration-enabled', [body('publicRegistrationEnabled').isBoolean().withMessage('開放報名開關必須是布林值')], validateRequest, adminController.setPublicRegistrationEnabled);
router.put('/settings/show-queue-number-in-query', [body('showQueueNumberInQuery').isBoolean().withMessage('查詢顯示號碼開關必須是布林值')], validateRequest, adminController.setShowQueueNumberInQuery);

// 新增：客戶總數管理
router.put('/settings/total-customer-count', [body('totalCustomerCount').isInt({ min: 0 }).withMessage('客戶總數必須是非負整數')], validateRequest, adminController.setTotalCustomerCount);
router.post('/settings/reset-customer-count', adminController.resetTotalCustomerCount);

// 新增：上一位辦完時間管理
router.put('/settings/last-completed-time', [body('lastCompletedTime').notEmpty().withMessage('請設定上一位辦完時間')], validateRequest, adminController.setLastCompletedTime);
router.post('/settings/reset-completed-time', adminController.resetLastCompletedTime);

// Phase 6.4 hotfix：強制重算 issuedCount + orderIndexCounter
// ?mode=dry-run （只看不改） / ?mode=execute （實際覆寫）
router.post('/settings/recalc-counters', adminController.recalcCounters);

// Change B / Phase 7.6：開發/驗證用 — 從 snapshot JSON 還原 waiting_records
// ?mode=dry-run （只看 snapshot 摘要） / ?mode=execute （raw insertMany）
// body: { records: [...raw waiting_record documents] }
router.post('/dev/restore-waiting-records', adminController.restoreWaitingRecords);

// 新增：活動報名區塊設定
router.get('/settings/event-banner', adminController.getEventBanner);
router.put('/settings/event-banner', [
  body('enabled').optional().isBoolean().withMessage('啟用開關必須是布林值'),
  body('title').optional().isString().trim().withMessage('標題格式不正確'),
  body('titleSize').optional().isString().trim().withMessage('標題大小格式不正確'),
  body('titleColor').optional().isString().trim().withMessage('標題顏色格式不正確'),
  body('titleAlign').optional().isIn(['left', 'center', 'right']).withMessage('標題對齊方式無效'),
  body('fontWeight').optional().isIn(['normal', 'bold']).withMessage('字體粗細值無效'),
  body('backgroundColor').optional().isString().trim().withMessage('背景顏色格式不正確'),
  body('buttonText').optional().isString().trim().withMessage('按鈕文字格式不正確'),
  body('buttonUrl').optional().isURL().withMessage('按鈕連結必須是有效網址'),
  body('buttonColor').optional().isString().trim().withMessage('按鈕顏色格式不正確'),
  body('buttonTextColor').optional().isString().trim().withMessage('按鈕文字顏色格式不正確')
], validateRequest, adminController.updateEventBanner);

// 新增：下次開科辦事開放報名時間設定
router.get('/settings/scheduled-open-time', adminController.getScheduledOpenTime);
router.put('/settings/scheduled-open-time', [
  body('scheduledOpenTime').optional({ nullable: true }).isISO8601().withMessage('開放時間格式不正確')
], validateRequest, adminController.updateScheduledOpenTime);

// 新增：定時開放開關
router.put('/settings/auto-open-enabled', [
  body('autoOpenEnabled').isBoolean().withMessage('定時開放開關必須是布林值')
], validateRequest, adminController.setAutoOpenEnabled);

// 結束本期（歸檔 + 清空）
router.post('/queue/end-session', adminController.endSession);

// 重建 Household 歸組（修正臨時地址污染後使用）
router.post('/customers/rebuild-households', adminController.rebuildHouseholds);

// 人工複核重複客戶（P0-9 needsReview 標記）
router.get('/customers/duplicates', adminController.listDuplicateCandidates);
router.post('/customers/:id/merge', [body('targetId').notEmpty().withMessage('缺少合併目標識別碼')], validateRequest, adminController.mergeCustomer);
router.post('/customers/:id/dismiss-duplicate', adminController.dismissDuplicate);

// API Log 查詢
router.get('/logs', adminController.getLogs);

// 操作快照備份
router.get('/backups', adminController.listBackups);
router.post('/backups/:id/restore', adminController.restoreBackup);

// Google Drive 備份
router.post('/backup/gdrive', adminController.triggerGDriveBackup);
router.get('/backup/logs', adminController.getBackupLogs);

// 清空全部（已棄用，緊急使用）
router.delete('/queue/clear-all', (req, res, next) => {
  res.setHeader('X-Deprecated', 'Use POST /admin/queue/end-session instead');
  next();
}, adminController.clearAllQueue);

// POST /admin/migrate?mode=dry-run|execute
router.post('/migrate', protect, async (req, res) => {
  try {
    const { getQueueConn, getCustomerConn, QUEUE_DB_NAME, CUSTOMER_DB_NAME } = require('../../config/db');

    if (QUEUE_DB_NAME === CUSTOMER_DB_NAME) {
      return res.status(400).json({ success: false, message: '單一 DB 模式不需要遷移' });
    }

    const mode = req.query.mode;
    if (mode !== 'dry-run' && mode !== 'execute') {
      return res.status(400).json({ success: false, message: 'query 參數 mode 必須是 dry-run 或 execute' });
    }

    const sourceDb = getQueueConn().db;
    const targetDb = getCustomerConn().db;
    const collections = ['customer_profiles', 'customer_visits', 'customer_households'];

    if (mode === 'dry-run') {
      const result = { mode: 'dry-run', source: sourceDb.databaseName, target: targetDb.databaseName, collections: {} };
      for (const colName of collections) {
        const sourceCount = await sourceDb.collection(colName).countDocuments();
        const targetCount = await targetDb.collection(colName).countDocuments();
        result.collections[colName] = { sourceCount, targetCount };
      }
      return res.json({ success: true, data: result });
    }

    // execute
    const result = { mode: 'execute', source: sourceDb.databaseName, target: targetDb.databaseName, collections: {} };
    for (const colName of collections) {
      const sourceCount = await sourceDb.collection(colName).countDocuments();
      if (sourceCount === 0) {
        result.collections[colName] = { sourceCount: 0, copied: 0, skipped: 0 };
        continue;
      }

      const docs = await sourceDb.collection(colName).find().toArray();
      let copied = 0;
      try {
        const r = await targetDb.collection(colName).insertMany(docs, { ordered: false });
        copied = r.insertedCount;
      } catch (err) {
        if (err.code === 11000 || err.name === 'MongoBulkWriteError') {
          copied = err.result?.nInserted || 0;
        } else {
          throw err;
        }
      }
      result.collections[colName] = { sourceCount, copied, skipped: sourceCount - copied };
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;


