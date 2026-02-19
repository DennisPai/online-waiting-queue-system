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
router.get('/:id/visits', customerController.getVisitHistory);

module.exports = router;
