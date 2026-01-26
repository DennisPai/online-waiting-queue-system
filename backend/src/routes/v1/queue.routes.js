const express = require('express');
const router = express.Router();
const queueController = require('../../controllers/queue.controller');
const { protect } = require('../../utils/middleware');

// 公共端點（v1）- 統一使用重構版控制器
router.get('/status', queueController.getQueueStatus);
router.post('/register', queueController.registerQueue);
router.get('/number/:queueNumber', queueController.getQueueNumberStatus);
router.get('/search', queueController.searchQueue);
router.get('/next-waiting', queueController.getNextWaitingNumber);
router.get('/ordered-numbers', queueController.getOrderedNumbers);
router.get('/max-order', queueController.getMaxOrderIndex);

// 客戶自助操作
router.post('/cancel', queueController.cancelQueueByCustomer);
router.put('/update', protect, queueController.updateQueueByCustomer); // 需要認證（僅管理員）

module.exports = router;


