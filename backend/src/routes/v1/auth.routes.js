const express = require('express');
const { body } = require('express-validator');
const { validateRequest, protect, restrictTo } = require('../../utils/middleware');
const authController = require('../../controllers/auth.controller');

const router = express.Router();

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('請輸入帳號'),
    body('password').notEmpty().withMessage('請輸入密碼')
  ],
  validateRequest,
  authController.login
);

router.get('/me', protect, authController.getMe);

router.post(
  '/register',
  protect,
  restrictTo('admin'),
  [
    body('username').notEmpty().withMessage('請輸入帳號').isLength({ min: 3, max: 50 }).withMessage('帳號長度需 3-50 字'),
    body('password').notEmpty().withMessage('請輸入密碼').isLength({ min: 6 }).withMessage('密碼至少 6 字'),
    body('email').notEmpty().withMessage('請輸入電子信箱').isEmail().withMessage('請輸入有效的電子信箱')
  ],
  validateRequest,
  authController.register
);

router.put(
  '/change-password',
  protect,
  [
    body('oldPassword').notEmpty().withMessage('請輸入舊密碼'),
    body('newPassword').notEmpty().withMessage('請輸入新密碼').isLength({ min: 8 }).withMessage('新密碼至少 8 字')
  ],
  validateRequest,
  authController.changePassword
);

module.exports = router;


