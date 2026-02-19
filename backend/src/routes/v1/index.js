const express = require('express');
const router = express.Router();

// v1 路由骨架（逐步遷移），統一回應封裝
const v1Response = require('../../utils/v1-response');

router.use(v1Response);
router.use('/auth', require('./auth.routes'));
router.use('/queue', require('./queue.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/customers', require('./customer.routes'));

module.exports = router;


