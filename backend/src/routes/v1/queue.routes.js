const express = require('express');
const router = express.Router();
const queueController = require('../../controllers/queue.controller');

router.get('/status', queueController.getQueueStatus);
router.post('/register', queueController.registerQueue);
router.get('/number/:queueNumber', queueController.getQueueNumberStatus);
router.get('/search', queueController.getQueueByNameAndPhone);
router.get('/ordered-numbers', queueController.getOrderedNumbers);
router.get('/max-order', queueController.getMaxOrderIndex);
router.post('/cancel', queueController.cancelQueueByCustomer);
router.put('/update', queueController.updateQueueByCustomer);

module.exports = router;


