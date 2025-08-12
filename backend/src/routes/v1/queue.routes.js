const express = require('express');
const router = express.Router();
const queueController = require('../../controllers/queue.controller');

// 公共端點（v1）
router.get('/status', queueController.getQueueStatus);
router.post('/register', queueController.registerQueue);
router.get('/number/:queueNumber', queueController.getQueueNumberStatus);
router.get('/search', queueController.getQueueByNameAndPhone);
router.get('/ordered-numbers', queueController.getOrderedNumbers);
router.get('/max-order', queueController.getMaxOrderIndex);

// 客戶自助操作
router.post('/cancel', queueController.cancelQueueByCustomer);
router.put('/update', queueController.updateQueueByCustomer);

// 向後相容別名（舊前端可能呼叫 /status/:queueNumber）
router.get('/status/:queueNumber', (req, res, next) => queueController.getQueueNumberStatus(req, res, next));

module.exports = router;


