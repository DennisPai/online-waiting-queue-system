const express = require('express');
const { body } = require('express-validator');
const { validateRequest, protect } = require('../../utils/middleware');
const customerController = require('../../controllers/customer.controller');

const router = express.Router();

// 所有客戶資料庫路由需要登入
router.use(protect);

// 客戶列表（分頁 + 搜尋）
router.get('/', customerController.listCustomers);

// 客戶詳情
router.get('/:id', customerController.getCustomer);

// 新增客戶
router.post('/', [
  body('name').notEmpty().withMessage('姓名為必填')
], validateRequest, customerController.createCustomer);

// 編輯客戶
router.put('/:id', customerController.updateCustomer);

// 客戶歷史來訪記錄
router.get('/:id/visits', customerController.getVisitHistory);

module.exports = router;
