const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { validateRequest, protect } = require('../utils/middleware');

const router = express.Router();

// 所有管理員路由都需要身份驗證
router.use(protect);

// 獲取候位列表
router.get('/queue/list', adminController.getQueueList);

// 獲取順序1和順序2的候位號碼
router.get('/queue/ordered-numbers', adminController.getOrderedQueueNumbers);

// 呼叫下一位
router.put('/queue/next', adminController.callNext);

// 更新候位狀態
router.put(
  '/queue/:queueId/status',
  [
    body('status').isIn(['waiting', 'processing', 'completed', 'cancelled']).withMessage('狀態值無效')
  ],
  validateRequest,
  adminController.updateQueueStatus
);

// 更新候位客戶資料
router.put(
  '/queue/:queueId/update',
  [
    body('name').optional().notEmpty().withMessage('姓名不能為空'),
    body('email').optional().isEmail().withMessage('電子郵件格式錯誤'),
    body('phone').optional().notEmpty().withMessage('電話不能為空'),
    body('gender').optional().isIn(['male', 'female']).withMessage('性別值無效'),
    body('gregorianBirthYear').optional().isNumeric().withMessage('國曆出生年份必須是數字'),
    body('gregorianBirthMonth').optional().isInt({ min: 1, max: 12 }).withMessage('國曆月份必須是1-12之間的數字'),
    body('gregorianBirthDay').optional().isInt({ min: 1, max: 31 }).withMessage('國曆日期必須是1-31之間的數字'),
    body('lunarBirthYear').optional().isNumeric().withMessage('農曆出生年份必須是數字'),
    body('lunarBirthMonth').optional().isInt({ min: 1, max: 12 }).withMessage('農曆月份必須是1-12之間的數字'),
    body('lunarBirthDay').optional().isInt({ min: 1, max: 31 }).withMessage('農曆日期必須是1-31之間的數字'),
    body('lunarIsLeapMonth').optional().isBoolean().withMessage('農曆閏月必須是布林值'),
    body('addresses').optional().isArray().withMessage('地址必須是陣列'),
    body('familyMembers').optional().isArray().withMessage('家人資訊必須是陣列'),
    body('consultationTopics').optional().isArray().withMessage('諮詢主題必須是陣列')
  ],
  validateRequest,
  adminController.updateQueueData
);

// 刪除客戶資料
router.delete('/queue/:queueId/delete', adminController.deleteCustomer);

// 更新候位順序
router.put(
  '/queue/updateOrder',
  [
    body('queueId').notEmpty().withMessage('候位ID不能為空'),
    body('newOrder').isNumeric().withMessage('新順序必須是數字')
  ],
  validateRequest,
  adminController.updateQueueOrder
);

// 設置下次辦事時間
router.put(
  '/settings/nextSession',
  [
    body('nextSessionDate').notEmpty().withMessage('下次辦事時間不能為空')
  ],
  validateRequest,
  adminController.setNextSessionDate
);

// 開關候位功能
router.put(
  '/settings/queueStatus',
  [
    body('isOpen').isBoolean().withMessage('isOpen 必須是布爾值')
  ],
  validateRequest,
  adminController.toggleQueueStatus
);

// 設定最大候位上限
router.put(
  '/settings/maxQueueNumber',
  [
    body('maxQueueNumber').isInt({ min: 1 }).withMessage('最大候位上限必須是大於0的整數')
  ],
  validateRequest,
  adminController.setMaxQueueNumber
);

// 設定每位客戶預估處理時間
router.put(
  '/settings/minutesPerCustomer',
  [
    body('minutesPerCustomer').isInt({ min: 1, max: 120 }).withMessage('每位客戶預估處理時間必須是1-120分鐘之間的整數')
  ],
  validateRequest,
  adminController.setMinutesPerCustomer
);

// 清除所有候位資料
router.delete('/queue/clear-all', adminController.clearAllQueue);

module.exports = router; 