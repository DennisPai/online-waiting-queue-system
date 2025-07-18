const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const { protect } = require('../utils/middleware');

// 公共路由 - 不需要身份驗證
router.get('/status', queueController.getQueueStatus);
router.post('/register', queueController.registerQueue);
router.get('/number/:queueNumber', queueController.getQueueNumberStatus);
router.get('/search', queueController.getQueueByNameAndPhone);
router.get('/next-waiting', queueController.getNextWaitingNumber);
router.get('/ordered-numbers', queueController.getOrderedNumbers);
router.get('/max-order', queueController.getMaxOrderIndex);

// 客戶自助操作路由
router.post('/cancel', queueController.cancelQueueByCustomer);
router.put('/update', queueController.updateQueueByCustomer);

// 管理員路由 - 需要身份驗證
// 這些路由已移至 admin.routes.js

module.exports = router; 