/**
 * log.admin.controller.js
 * GET /api/v1/admin/logs — 查詢 API log
 */
const logger = require('../../utils/logger');
const LogEntry = require('../../models/log-entry.model');

exports.getLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      method,
      path,
      tag,
      from,   // ISO 8601
      to,     // ISO 8601
      statusCode
    } = req.query;

    const query = {};

    if (method) query.method = method.toUpperCase();
    if (path) query.path = { $regex: path, $options: 'i' };
    if (tag) query.tags = tag;
    if (statusCode) query.statusCode = parseInt(statusCode, 10);

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      LogEntry.find(query).sort({ timestamp: -1 }).skip(skip).limit(lim).lean(),
      LogEntry.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      code: 'OK',
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: lim,
          pages: Math.ceil(total / lim)
        }
      }
    });
  } catch (error) {
    logger.error('查詢 log 錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' });
  }
};
