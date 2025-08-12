// v1 回應封裝中介層：統一成功/失敗回應格式
// 成功：{ success: true, code: 'OK', message: 'OK', data }
// 失敗：{ success: false, code, message, errors? }
module.exports = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    try {
      if (payload && typeof payload === 'object') {
        const isSuccess = payload.success === true;
        const isFailure = payload.success === false;

        if (isSuccess) {
          // 合併現有 data 與其它非標準鍵，確保像 token 這類鍵也會落在 data 內
          let data = payload.data !== undefined ? { ...payload.data } : {};
          Object.keys(payload).forEach((k) => {
            if (['success', 'code', 'message', 'errors', 'error', 'data'].includes(k)) return;
            data[k] = payload[k];
          });
          const out = {
            success: true,
            code: payload.code || 'OK',
            message: payload.message || 'OK',
            data
          };
          return originalJson(out);
        }

        if (isFailure) {
          const out = {
            success: false,
            code: payload.code || (payload.error ? 'INTERNAL_ERROR' : 'ERROR'),
            message: payload.message || (typeof payload.error === 'string' ? payload.error : 'Request failed')
          };
          if (payload.errors) out.errors = payload.errors;
          return originalJson(out);
        }
      }
    } catch (e) {
      // ignore and fall back
    }
    return originalJson(payload);
  };

  next();
};


