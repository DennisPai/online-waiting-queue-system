const express = require('express');
const router = express.Router();

// v1 路由骨架（逐步遷移）
router.use('/auth', require('./auth.routes'));
router.use('/queue', require('./queue.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;

