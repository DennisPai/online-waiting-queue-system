const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const { validateRequest, protect } = require('../../utils/middleware');
const customerController = require('../../controllers/customer.controller');

const router = express.Router();

// 驗證 :id 是合法 ObjectId，避免非法 ID 造成 500
const validateObjectId = (paramName = 'id') => [
  param(paramName).custom(val => {
    if (!mongoose.Types.ObjectId.isValid(val)) throw new Error('無效的 ID 格式');
    return true;
  }),
  validateRequest
];

router.use(protect);

router.get('/', customerController.listCustomers);
router.get('/:id', ...validateObjectId('id'), customerController.getCustomer);
router.post('/', [
  body('name').notEmpty().withMessage('姓名為必填')
], validateRequest, customerController.createCustomer);
router.put('/:id', ...validateObjectId('id'), customerController.updateCustomer);
router.delete('/:id', ...validateObjectId('id'), customerController.deleteCustomer);
router.get('/:id/visits', ...validateObjectId('id'), customerController.getVisitHistory);
router.post('/:id/visits', ...validateObjectId('id'), [
  body('sessionDate').notEmpty().withMessage('sessionDate 為必填')
], validateRequest, customerController.createVisitRecord);
router.put('/:id/visits/:visitId', ...validateObjectId('id'), customerController.updateVisitRecord);
router.delete('/:id/visits/:visitId', ...validateObjectId('id'), customerController.deleteVisitRecord);

module.exports = router;
