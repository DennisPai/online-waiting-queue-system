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
  [body('status').isIn(['waiting', 'processing', 'completed', 'cancelled'])],
  validateRequest,
  adminController.updateQueueStatus
);

router.put(
  '/queue/:queueId/update',
  [
    body('queueNumber').optional().isInt({ min: 1 })
  ],
  validateRequest,
  adminController.updateQueueData
);

router.delete('/queue/:queueId/delete', adminController.deleteCustomer);

router.put(
  '/queue/order',
  [body('queueId').notEmpty(), body('newOrder').isInt({ min: 1 })],
  validateRequest,
  adminController.updateQueueOrder
);

router.put('/queue/reorder', [body('orderedIds').isArray({ min: 1 })], validateRequest, adminController.reorderQueue);
router.put('/settings/next-session', [body('nextSessionDate').notEmpty()], validateRequest, adminController.setNextSessionDate);
router.put('/settings/queue-status', [body('isOpen').isBoolean()], validateRequest, adminController.toggleQueueStatus);
router.put('/settings/max-order-index', [body('maxOrderIndex').isInt({ min: 1 })], validateRequest, adminController.setMaxOrderIndex);
router.put('/settings/minutes-per-customer', [body('minutesPerCustomer').isInt({ min: 1, max: 120 })], validateRequest, adminController.setMinutesPerCustomer);
router.put('/settings/simplified-mode', [body('simplifiedMode').isBoolean()], validateRequest, adminController.setSimplifiedMode);
router.put('/settings/public-registration-enabled', [body('publicRegistrationEnabled').isBoolean()], validateRequest, adminController.setPublicRegistrationEnabled);
router.put('/settings/show-queue-number-in-query', [body('showQueueNumberInQuery').isBoolean()], validateRequest, adminController.setShowQueueNumberInQuery);

// 新增：客戶總數管理
router.put('/settings/total-customer-count', [body('totalCustomerCount').isInt({ min: 0 })], validateRequest, adminController.setTotalCustomerCount);
router.post('/settings/reset-customer-count', adminController.resetTotalCustomerCount);

// 新增：上一位辦完時間管理
router.put('/settings/last-completed-time', [body('lastCompletedTime').notEmpty()], validateRequest, adminController.setLastCompletedTime);
router.post('/settings/reset-completed-time', adminController.resetLastCompletedTime);

// 新增：活動報名區塊設定
router.get('/settings/event-banner', adminController.getEventBanner);
router.put('/settings/event-banner', [
  body('enabled').optional().isBoolean(),
  body('title').optional().isString().trim(),
  body('titleSize').optional().isString().trim(),
  body('titleColor').optional().isString().trim(),
  body('titleAlign').optional().isIn(['left', 'center', 'right']),
  body('fontWeight').optional().isIn(['normal', 'bold']),
  body('backgroundColor').optional().isString().trim(),
  body('buttonText').optional().isString().trim(),
  body('buttonUrl').optional().isURL(),
  body('buttonColor').optional().isString().trim(),
  body('buttonTextColor').optional().isString().trim()
], validateRequest, adminController.updateEventBanner);

// 新增：下次開科辦事開放報名時間設定
router.get('/settings/scheduled-open-time', adminController.getScheduledOpenTime);
router.put('/settings/scheduled-open-time', [
  body('scheduledOpenTime').optional({ nullable: true }).isISO8601()
], validateRequest, adminController.updateScheduledOpenTime);

// 新增：定時開放開關
router.put('/settings/auto-open-enabled', [
  body('autoOpenEnabled').isBoolean()
], validateRequest, adminController.setAutoOpenEnabled);

// 結束本期（歸檔 + 清空）
router.post('/queue/end-session', adminController.endSession);

// 重建 Household 歸組（修正臨時地址污染後使用）
router.post('/customers/rebuild-households', adminController.rebuildHouseholds);

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

// ── 臨時 debug endpoints ──
const { getCustomerConn, getQueueConn } = require('../../config/db');
const mongoose = require('mongoose');

// GET /admin/debug/db-check — 列出 queue/customer/default DB 各有幾筆客戶資料
router.get('/debug/db-check', protect, async (req, res) => {
  try {
    const queueDb = getQueueConn().db;
    const customerDb = getCustomerConn().db;
    const defaultDb = mongoose.connection.db;

    const results = {};
    for (const [name, db] of [['queue', queueDb], ['customer', customerDb], ['default', defaultDb]]) {
      try {
        const collections = await db.listCollections().toArray();
        const cpCol = collections.find(c => c.name === 'customer_profiles');
        if (cpCol) {
          const count = await db.collection('customer_profiles').countDocuments();
          const sample = await db.collection('customer_profiles').find().limit(3).toArray();
          results[name] = {
            exists: true,
            count,
            dbName: db.databaseName,
            sampleNames: sample.map(s => s.name)
          };
        } else {
          results[name] = { exists: false, dbName: db.databaseName };
        }
      } catch (e) {
        results[name] = { error: e.message };
      }
    }
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /admin/debug/migrate-customer-data — 把 queue DB 的客戶資料遷移到 customer DB
router.post('/debug/migrate-customer-data', protect, async (req, res) => {
  try {
    const queueDb = getQueueConn().db;
    const customerDb = getCustomerConn().db;

    const collections = ['customer_profiles', 'customer_visits', 'customer_households'];
    const results = {};

    for (const colName of collections) {
      const srcDocs = await queueDb.collection(colName).find().toArray();
      if (srcDocs.length === 0) {
        results[colName] = { migrated: 0, message: 'queue DB 無資料' };
        continue;
      }

      let migrated = 0;
      for (const doc of srcDocs) {
        const exists = await customerDb.collection(colName).findOne({ _id: doc._id });
        if (!exists) {
          await customerDb.collection(colName).insertOne(doc);
          migrated++;
        }
      }
      results[colName] = {
        total_in_queue: srcDocs.length,
        migrated,
        skipped: srcDocs.length - migrated
      };
    }

    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;


