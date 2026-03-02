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

// 暫時診斷 endpoint（查 DB 實際狀態 + 列出所有 DB）
router.get('/diag/db-stats', async (req, res) => {
  const mongoose = require('mongoose');
  const WaitingRecord = require('../../models/waiting-record.model');
  try {
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    const collections = await db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    const totalAll = await WaitingRecord.countDocuments({});
    const byStatus = {};
    for (const s of ['waiting','processing','completed','cancelled']) {
      byStatus[s] = await WaitingRecord.countDocuments({ status: s });
    }
    const sample = await WaitingRecord.find({}).limit(3).lean();
    // 列出所有 DB 名稱（查 test DB 的 waitingrecords）
    const adminDb = db.admin();
    const dbList = await adminDb.listDatabases();
    const allDbs = dbList.databases.map(d => ({ name: d.name, sizeOnDisk: d.sizeOnDisk }));
    // 查 test DB 的 waitingrecords 數量
    const testDb = mongoose.connection.client.db('test');
    const testCount = await testDb.collection('waitingrecords').countDocuments({});
    const testSample = await testDb.collection('waitingrecords').find({}).limit(2).toArray();
    res.json({ success: true, data: { dbName, collections: collNames, waitingRecordTotal: totalAll, byStatus, sample, allDbs, testDb: { count: testCount, sample: testSample } } });
  } catch(e) {
    res.json({ success: false, error: e.message, stack: e.stack });
  }
});

// 清空全部（已棄用，緊急使用）
router.delete('/queue/clear-all', (req, res, next) => {
  res.setHeader('X-Deprecated', 'Use POST /admin/queue/end-session instead');
  next();
}, adminController.clearAllQueue);

module.exports = router;


