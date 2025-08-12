// v1 回應封裝中介層：統一成功/失敗回應格式
// 成功：{ success: true, code: 'OK', message: 'OK', data }
// 失敗：{ success: false, code, message, errors? }
module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  const statusCodeToCode = (status) => {
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status >= 500) return 'INTERNAL_ERROR';
    return 'OK';
  };

  res.json = (payload) => {
    try {
      const currentStatus = res.statusCode || 200;
      if (payload && typeof payload === 'object') {
        const hasSuccessFlag = Object.prototype.hasOwnProperty.call(payload, 'success');
        if (hasSuccessFlag) {
          // 正規格式，保留但確保鍵齊全
          if (payload.success === true) {
            const out = {
              success: true,
              code: payload.code || statusCodeToCode(currentStatus),
              message: payload.message || 'OK',
              data: payload.data !== undefined ? payload.data : {}
            };
            return originalJson(out);
          }
          if (payload.success === false) {
            const out = {
              success: false,
              code: payload.code || statusCodeToCode(currentStatus),
              message: payload.message || 'Request failed'
            };
            if (payload.errors) out.errors = payload.errors;
            return originalJson(out);
          }
        }

        // 無 success 欄位時：依狀態碼自動包裝
        if (currentStatus < 400) {
          return originalJson({
            success: true,
            code: 'OK',
            message: 'OK',
            data: payload
          });
        }
        // 失敗：嘗試從 payload 取 message/errors
        const autoMessage = typeof payload.message === 'string' ? payload.message : 'Request failed';
        const out = {
          success: false,
          code: statusCodeToCode(currentStatus),
          message: autoMessage
        };
        if (payload.errors) out.errors = payload.errors;
        return originalJson(out);
      }
    } catch (e) {
      // ignore and fall back
    }
    return originalJson(payload);
  };

  next();
};


