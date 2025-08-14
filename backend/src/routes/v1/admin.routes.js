const express = require('express');
const { body } = require('express-validator');
const adminController = require('../../controllers/admin.controller');
const { validateRequest, protect } = require('../../utils/middleware');

const router = express.Router();

router.use(protect);

router.get('/queue/list', adminController.getQueueList);
router.get('/queue/ordered-numbers', adminController.getOrderedQueueNumbers);
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

// 相容舊路由名稱（部分前端仍呼叫 updateOrder）
router.put(
  '/queue/updateOrder',
  [body('queueId').notEmpty(), body('newOrder').isInt({ min: 1 })],
  validateRequest,
  adminController.updateQueueOrder
);

router.put('/settings/next-session', [body('nextSessionDate').notEmpty()], validateRequest, adminController.setNextSessionDate);
router.put('/settings/queue-status', [body('isOpen').isBoolean()], validateRequest, adminController.toggleQueueStatus);
router.put('/settings/max-queue-number', [body('maxQueueNumber').isInt({ min: 1 })], validateRequest, adminController.setMaxQueueNumber);
router.put('/settings/minutes-per-customer', [body('minutesPerCustomer').isInt({ min: 1, max: 120 })], validateRequest, adminController.setMinutesPerCustomer);
router.put('/settings/simplified-mode', [body('simplifiedMode').isBoolean()], validateRequest, adminController.setSimplifiedMode);
router.put('/settings/public-registration-enabled', [body('publicRegistrationEnabled').isBoolean()], validateRequest, adminController.setPublicRegistrationEnabled);

// 新增：客戶總數管理
router.put('/settings/total-customer-count', [body('totalCustomerCount').isInt({ min: 0 })], validateRequest, adminController.setTotalCustomerCount);
router.post('/settings/reset-customer-count', adminController.resetTotalCustomerCount);

// 新增：上一位辦完時間管理
router.put('/settings/last-completed-time', [body('lastCompletedTime').notEmpty()], validateRequest, adminController.setLastCompletedTime);
router.post('/settings/reset-completed-time', adminController.resetLastCompletedTime);

router.delete('/queue/clear-all', adminController.clearAllQueue);

module.exports = router;


