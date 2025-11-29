const express = require('express');
const { body } = require('express-validator');
const adminController = require('../../controllers/admin.controller');
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

// 新增：客戶總數管理
router.put('/settings/total-customer-count', [body('totalCustomerCount').isInt({ min: 0 })], validateRequest, adminController.setTotalCustomerCount);
router.post('/settings/reset-customer-count', adminController.resetTotalCustomerCount);

// 新增：上一位辦完時間管理
router.put('/settings/last-completed-time', [body('lastCompletedTime').notEmpty()], validateRequest, adminController.setLastCompletedTime);
router.post('/settings/reset-completed-time', adminController.resetLastCompletedTime);

// 新增：活動報名區塊設定
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
  body('buttonColor').optional().isString().trim()
], validateRequest, adminController.updateEventBanner);

router.delete('/queue/clear-all', adminController.clearAllQueue);

module.exports = router;


