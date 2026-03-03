/**
 * snapshot.js
 * 操作前快照工具，FIFO 上限 200 筆
 * 失敗不 throw，不阻塞主流程
 */
const mongoose = require('mongoose');
const BackupSnapshot = require('../models/backup-snapshot.model');

const SNAPSHOT_MAX = 200;

/**
 * 儲存一份操作前快照
 * @param {object} opts
 * @param {string} opts.operation  - 操作名稱（如 'update-queue-status'）
 * @param {string} opts.collection - 資料集名稱
 * @param {string} [opts.documentId]
 * @param {*} opts.beforeData      - 修改前的資料
 * @param {string} [opts.operatorId]
 * @param {*} [opts.metadata]
 */
async function saveSnapshot({ operation, collection, documentId, beforeData, operatorId, metadata } = {}) {
  // 沒有 DB 連線時跳過（unit test 環境）
  if (mongoose.connection.readyState !== 1) return;
  try {
    await BackupSnapshot.create({
      timestamp: new Date(),
      operation,
      collection,
      documentId: documentId ? String(documentId) : null,
      beforeData,
      operatorId: operatorId ? String(operatorId) : null,
      metadata: metadata || null
    });

    // FIFO：超過上限就刪最舊的
    const total = await BackupSnapshot.countDocuments();
    if (total > SNAPSHOT_MAX) {
      // 找出最舊的 (total - SNAPSHOT_MAX) 筆
      const excess = total - SNAPSHOT_MAX;
      const oldest = await BackupSnapshot.find({})
        .sort({ timestamp: 1 })
        .limit(excess)
        .select('_id')
        .lean();
      const ids = oldest.map(d => d._id);
      if (ids.length > 0) {
        await BackupSnapshot.deleteMany({ _id: { $in: ids } });
      }
    }
  } catch (err) {
    console.error('[snapshot] 寫入快照失敗:', err.message);
  }
}

module.exports = { saveSnapshot };
