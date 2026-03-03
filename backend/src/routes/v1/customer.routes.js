const express = require('express');
const { body } = require('express-validator');
const { validateRequest, protect } = require('../../utils/middleware');
const customerController = require('../../controllers/customer.controller');

const router = express.Router();

router.use(protect);

router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', [
  body('name').notEmpty().withMessage('姓名為必填')
], validateRequest, customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.get('/:id/visits', customerController.getVisitHistory);
router.post('/:id/visits', [
  body('sessionDate').notEmpty().withMessage('sessionDate 為必填')
], validateRequest, customerController.createVisitRecord);
router.delete('/:id/visits/:visitId', customerController.deleteVisitRecord);

module.exports = router;
