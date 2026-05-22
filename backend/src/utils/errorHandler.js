const logger = require('./logger');
const ApiError = require('./ApiError');

/**
 * 全局錯誤處理中間件
 * 統一處理所有應用程序錯誤
 */
const globalErrorHandler = (err, req, res, next) => {
  // 直接使用 err，保留原型鏈以便正確識別 ApiError
  let error = err;

  // 記錄錯誤（開發環境顯示詳細信息）
  if (process.env.NODE_ENV === 'development') {
    logger.error('Error Stack:', err.stack);
  }
  logger.error('Error:', err.message);

  // Mongoose 驗證錯誤
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = ApiError.badRequest(message, 'VALIDATION_ERROR');
  }

  // Mongoose 重複鍵錯誤
  // D9 / Task 4.6：不直接吐欄位名（「orderIndex 已存在」對宮廟客戶是天書）。
  // orderIndex / queueNumber 的撞號轉成可理解的友善訊息；其餘欄位才回退到
  // 通用「資料重複」訊息（仍不暴露技術欄位名）。
  if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : '';
    let message;
    if (field === 'orderIndex') {
      message = '排序衝突，請重新整理後再操作';
    } else if (field === 'queueNumber') {
      message = '候位號碼重複，請重新整理後再操作';
    } else {
      message = '資料重複，請重新整理後再操作';
    }
    error = ApiError.conflict(message, 'DUPLICATE_FIELD');
  }

  // Mongoose Cast 錯誤（無效的 ObjectId）
  if (err.name === 'CastError') {
    const message = '資源不存在';
    error = ApiError.notFound(message, 'INVALID_ID');
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('無效的令牌', 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('令牌已過期', 'EXPIRED_TOKEN');
  }

  // 如果不是 ApiError，轉換為內部錯誤
  if (!(error instanceof ApiError)) {
    error = ApiError.internal(error.message || '伺服器內部錯誤');
  }

  // 發送錯誤響應
  res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || 'INTERNAL_ERROR',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 未找到路由處理中間件
 */
const notFoundHandler = (req, res, next) => {
  const err = ApiError.notFound(`路由 ${req.originalUrl} 不存在`);
  next(err);
};

/**
 * 異步錯誤捕獲包裝器
 * 用於包裝異步路由處理器，自動捕獲錯誤
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  catchAsync
};
