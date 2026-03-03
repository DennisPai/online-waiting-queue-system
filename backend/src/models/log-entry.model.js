const mongoose = require('mongoose');

const LOG_TTL_DAYS = parseInt(process.env.LOG_TTL_DAYS || '90', 10);

const logEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number },
  responseTimeMs: { type: Number },
  ip: { type: String },
  userAgent: { type: String },
  userId: { type: String, default: null },
  requestBody: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: null },
  tags: [{ type: String }]
}, {
  timestamps: false,
  collection: 'log_entries'
});

// TTL index：自動清除 N 天前的 log
logEntrySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: LOG_TTL_DAYS * 24 * 60 * 60 }
);

// 查詢常用 index
logEntrySchema.index({ method: 1, path: 1 });
logEntrySchema.index({ tags: 1 });

const LogEntry = mongoose.model('LogEntry', logEntrySchema);
module.exports = LogEntry;
module.exports._schema = logEntrySchema;
