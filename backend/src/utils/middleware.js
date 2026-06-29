const logger = require('./logger');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/user.model');

// 請求驗證中間件
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const arr = errors.array();
    // 2026-06-29：補上可讀 message（彙整各欄位 errors[].msg）。原本只回 { success, errors }、無 message，
    // 經 v1-response 信封補成通用「Request failed」→ 前端拿不到真正原因。新增 message、保留 errors[]（向後相容）。
    // v1-response（line 33）會尊重既有 message，不再覆蓋成「Request failed」。全站掛 validateRequest 的端點同時受惠。
    return res.status(400).json({
      success: false,
      message: arr.map((e) => e.msg).join('；'),
      errors: arr
    });
  }
  next();
};

// 保護路由中間件（驗證 JWT）
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 從 Authorization 頭部獲取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '您未登入，無法訪問此資源'
      });
    }
    
    // 驗證令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 檢查用戶是否仍然存在
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: '此令牌所屬的用戶不再存在'
      });
    }
    
    // 將用戶信息添加到請求中
    req.user = {
      id: currentUser._id,
      username: currentUser.username,
      role: currentUser.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '無效的令牌'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已過期，請重新登入'
      });
    }
    
    logger.error('JWT驗證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤'
    });
  }
};

// 角色限制中間件
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '您沒有權限執行此操作'
      });
    }
    next();
  };
}; 