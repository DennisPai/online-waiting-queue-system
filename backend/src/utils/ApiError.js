/**
 * 自定義 API 錯誤類
 * 用於統一處理應用程序中的錯誤
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null, isOperational = true, stack = '') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 靜態方法：創建常見的錯誤類型
   */
  static badRequest(message = '請求參數錯誤', code = 'VALIDATION_ERROR') {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = '未授權訪問', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = '禁止訪問', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = '資源不存在', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message = '資源衝突', code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static internal(message = '伺服器內部錯誤', code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code);
  }
}

module.exports = ApiError;
