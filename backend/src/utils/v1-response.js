/**
 * v1 回應規格封裝中介層
 * - 將 { success: true, ... } 正規化為 { success, code: 'OK', message?, data }
 * - 將 { success: false, ... } 正規化並補上 code
 * 僅套用於 /api/v1 路徑下。
 */
module.exports = function v1ResponseWrapper(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function wrappedJson(body) {
    try {
      if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
        // 成功回應
        if (body.success === true) {
          if (Object.prototype.hasOwnProperty.call(body, 'data')) {
            const { success, data, message } = body;
            return originalJson({ success: true, code: 'OK', message, data });
          }
          // 無 data，將其餘欄位包到 data
          const { success, message, ...rest } = body;
          return originalJson({ success: true, code: 'OK', message, data: rest });
        }

        // 失敗回應
        if (body.success === false) {
          let { code } = body;
          if (!code) {
            const status = res.statusCode;
            if (status === 400) code = 'VALIDATION_ERROR';
            else if (status === 401) code = 'UNAUTHORIZED';
            else if (status === 403) code = 'FORBIDDEN';
            else if (status === 404) code = 'NOT_FOUND';
            else if (status === 409) code = 'CONFLICT';
            else code = 'INTERNAL_ERROR';
          }
          const { success, ...rest } = body;
          return originalJson({ success: false, code, ...rest });
        }
      }
    } catch (e) {
      // 發生例外時，回退原始回應
    }
    return originalJson(body);
  };

  next();
};


