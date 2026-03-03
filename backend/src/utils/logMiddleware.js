/**
 * logMiddleware.js
 * 非同步攔截所有 API 請求，寫入 MongoDB log_entries
 * 失敗不影響 API 回應（try-catch + 非同步）
 */
const LogEntry = require('../models/log-entry.model');

// 敏感欄位清單：這些欄位的值替換為 ***
const SENSITIVE_FIELDS = new Set(['password', 'oldPassword', 'newPassword', 'token', 'secret', 'authorization']);

/**
 * 遞迴遮蔽物件中的敏感欄位
 */
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '***';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeBody(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 根據 method 和 path 決定 tags
 */
function buildTags(method, path, statusCode) {
  const tags = [];
  const m = method.toUpperCase();

  if (path.startsWith('/api/v1/admin')) tags.push('admin');
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(m)) tags.push('write');
  if (m === 'DELETE') tags.push('danger');
  if (path.includes('end-session')) tags.push('danger');
  if (statusCode >= 400) tags.push('error');

  return tags;
}

/**
 * Express middleware
 */
function logMiddleware(req, res, next) {
  const startTime = Date.now();

  // 攔截 res.json 來捕捉 statusCode（在 response 送出後非同步寫 log）
  res.on('finish', () => {
    // 非同步寫入，不阻塞 response
    setImmediate(async () => {
      try {
        const responseTimeMs = Date.now() - startTime;
        const method = req.method;
        const path = req.originalUrl || req.url;
        const statusCode = res.statusCode;

        // 只記錄 /api/ 開頭的請求
        if (!path.startsWith('/api/')) return;

        const tags = buildTags(method, path, statusCode);

        // 取得 userId（JWT 解碼後掛在 req.user）
        const userId = req.user ? (req.user.id || req.user._id || null) : null;

        // 遮蔽敏感欄位
        const requestBody = req.body && Object.keys(req.body).length > 0
          ? sanitizeBody(req.body)
          : null;

        await LogEntry.create({
          timestamp: new Date(startTime),
          method,
          path,
          statusCode,
          responseTimeMs,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'] || null,
          userId: userId ? String(userId) : null,
          requestBody,
          tags
        });
      } catch (err) {
        // Log 失敗不影響主流程，靜默忽略
        // 只在開發環境印出錯誤
        if (process.env.NODE_ENV !== 'production') {
          console.error('[logMiddleware] 寫入 log 失敗:', err.message);
        }
      }
    });
  });

  next();
}

module.exports = logMiddleware;
