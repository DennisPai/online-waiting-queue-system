/**
 * backup.admin.controller.js
 * GET  /api/v1/admin/backups                - 列出 snapshot
 * POST /api/v1/admin/backups/:id/restore    - 從 snapshot 恢復資料
 * POST /api/v1/admin/backup/gdrive          - 手動觸發 Google Drive 備份
 */
const logger = require('../../utils/logger');
const BackupSnapshot = require('../../models/backup-snapshot.model');
const mongoose = require('mongoose');
const { runFullBackup, getRecentBackupLogs } = require('../../services/gdrive-backup.service');
const { getCustomerConn, getQueueConn } = require('../../config/db');

// 列出 snapshot（分頁 + 篩選）
exports.listBackups = async (req, res) => {
  try {
    const { page = 1, limit = 20, operation, collection } = req.query;
    const query = {};
    if (operation) query.operation = operation;
    if (collection) query.collection = collection;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const [snapshots, total] = await Promise.all([
      BackupSnapshot.find(query).sort({ timestamp: -1 }).skip(skip).limit(lim).lean(),
      BackupSnapshot.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      code: 'OK',
      data: {
        snapshots,
        pagination: { total, page: parseInt(page, 10), limit: lim, pages: Math.ceil(total / lim) }
      }
    });
  } catch (error) {
    logger.error('列出 backup 錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' });
  }
};

// 從 snapshot 恢復資料
exports.restoreBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmToken } = req.body;

    // 二次確認 token
    if (confirmToken !== 'CONFIRM_RESTORE') {
      return res.status(400).json({
        success: false,
        code: 'CONFIRM_REQUIRED',
        message: '需要在 body 傳入 confirmToken: "CONFIRM_RESTORE" 以確認恢復操作'
      });
    }

    const snapshot = await BackupSnapshot.findById(id).lean();
    if (!snapshot) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '查無此備份記錄' });
    }

    // end-session 是陣列備份，不支援自動 restore
    if (snapshot.operation === 'end-session' || Array.isArray(snapshot.beforeData)) {
      return res.status(400).json({
        success: false,
        code: 'NOT_SUPPORTED',
        message: 'end-session 的批次備份不支援自動恢復，請聯繫系統管理員手動處理'
      });
    }

    if (!snapshot.documentId || !snapshot.beforeData) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_SNAPSHOT',
        message: '此備份資料不完整，無法恢復'
      });
    }

    // 支援的 collection 白名單
    const supportedCollections = ['waitingrecords', 'customer_profiles', 'customer_visits', 'customer_households'];
    if (!supportedCollections.includes(snapshot.collection)) {
      return res.status(400).json({
        success: false,
        code: 'UNKNOWN_COLLECTION',
        message: `不支援恢復 collection: ${snapshot.collection}`
      });
    }

    // 移除 mongoose 內部欄位，保留 _id（raw driver 支援）
    const restoreData = { ...snapshot.beforeData };
    delete restoreData.__v;

    const objectId = mongoose.Types.ObjectId.isValid(snapshot.documentId)
      ? new mongoose.Types.ObjectId(snapshot.documentId)
      : snapshot.documentId;
    restoreData._id = objectId;

    // 使用 raw MongoDB driver 繞過 Mongoose connection 問題
    const customerCollections = ['customer_profiles', 'customer_visits', 'customer_households'];
    const conn = customerCollections.includes(snapshot.collection) ? getCustomerConn() : getQueueConn();
    const connDbName = conn.db?.databaseName || conn.db?.db?.databaseName || 'unknown';
    const rawCollection = conn.db.collection(snapshot.collection);

    const replaceResult = await rawCollection.replaceOne({ _id: objectId }, restoreData, { upsert: true });

    // 驗證寫入是否成功（raw driver）
    const verifiedRaw = await rawCollection.findOne({ _id: objectId });
    if (!verifiedRaw) {
      throw new Error(`replaceOne 執行後仍查無文件（DB: ${connDbName}, collection: ${snapshot.collection}）`);
    }

    // 同時用 Mongoose model 驗證（確認 API 讀得到）
    const RequiredCustomer = require('../../models/customer.model');
    const verifiedMongoose = snapshot.collection === 'customer_profiles'
      ? await RequiredCustomer.findById(objectId).lean()
      : null;
    const mongooseDbName = RequiredCustomer?.db?.databaseName || RequiredCustomer?.db?.db?.databaseName || 'unknown';

    logger.info(`[backup restore] ${snapshot.collection}/${snapshot.documentId} 已恢復 — rawDriver DB: ${connDbName}, mongoose DB: ${mongooseDbName}, rawFound: ${!!verifiedRaw}, mongooseFound: ${!!verifiedMongoose}`);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `已恢復 ${snapshot.collection} 的資料（操作：${snapshot.operation}）`,
      data: {
        snapshotId: id,
        collection: snapshot.collection,
        documentId: snapshot.documentId,
        debug: {
          rawDriver_dbName: connDbName,
          mongoose_dbName: mongooseDbName,
          rawDriver_found: !!verifiedRaw,
          mongoose_found: verifiedMongoose !== null ? !!verifiedMongoose : 'N/A（非 customer_profiles）',
          replaceResult: { matchedCount: replaceResult.matchedCount, modifiedCount: replaceResult.modifiedCount, upsertedCount: replaceResult.upsertedCount }
        }
      }
    });
  } catch (error) {
    logger.error('恢復 backup 錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' });
  }
};

// 手動觸發 Google Drive 備份
exports.triggerGDriveBackup = async (req, res) => {
  try {
    const result = await runFullBackup();
    if (result.success) {
      return res.status(200).json({
        success: true,
        code: 'OK',
        message: result.dryRun ? 'dry-run 模式（GDRIVE_BACKUP_ENABLED=false），備份未實際上傳' : '備份完成',
        data: result
      });
    } else {
      return res.status(500).json({ success: false, code: 'BACKUP_FAILED', message: result.error });
    }
  } catch (error) {
    logger.error('觸發 gdrive 備份錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' });
  }
};

// 取得最近 backup logs
exports.getBackupLogs = async (req, res) => {
  try {
    const logs = await getRecentBackupLogs(20);
    return res.status(200).json({ success: true, code: 'OK', data: { logs } });
  } catch (error) {
    logger.error('取得 backup logs 錯誤:', error);
    return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: '伺服器內部錯誤' });
  }
};


