const express = require('express');
const { body } = require('express-validator');
const { validateRequest, protect } = require('../../utils/middleware');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

router.post(
  '/login',
  [
    body('username').notEmpty(),
    body('password').notEmpty()
  ],
  validateRequest,
  authController.login
);

router.get('/me', protect, authController.getMe);

router.post(
  '/register',
  protect,
  [
    body('username').notEmpty().isLength({ min: 3, max: 50 }),
    body('password').notEmpty().isLength({ min: 6 }),
    body('email').notEmpty().isEmail()
  ],
  validateRequest,
  authController.register
);

router.put(
  '/change-password',
  protect,
  [
    body('oldPassword').notEmpty(),
    body('newPassword').notEmpty().isLength({ min: 8 })
  ],
  validateRequest,
  authController.changePassword
);

module.exports = router;


