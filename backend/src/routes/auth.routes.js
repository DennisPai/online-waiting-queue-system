const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validateRequest, protect, restrictTo } = require('../utils/middleware');

const router = express.Router();

// 登入路由
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('用戶名不能為空'),
    body('password').notEmpty().withMessage('密碼不能為空')
  ],
  validateRequest,
  authController.login
);

// 註冊新用戶（僅限管理員）
router.post(
  '/register',
  protect,
  restrictTo('admin'),
  [
    body('username').notEmpty().isLength({ min: 3, max: 50 }).withMessage('用戶名長度必須在3-50之間'),
    body('password').notEmpty().isLength({ min: 6 }).withMessage('密碼長度必須至少6個字符'),
    body('email').notEmpty().isEmail().withMessage('必須提供有效的電子郵箱'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('角色必須是 admin 或 staff')
  ],
  validateRequest,
  authController.register
);

// 獲取當前登入用戶資訊
router.get('/me', protect, authController.getMe);

// 修改密碼（登入後）
router.put(
  '/change-password',
  protect,
  [
    body('oldPassword').notEmpty().withMessage('舊密碼不能為空'),
    body('newPassword').notEmpty().isLength({ min: 10 }).withMessage('新密碼需至少10位')
  ],
  validateRequest,
  authController.changePassword
);

module.exports = router; 