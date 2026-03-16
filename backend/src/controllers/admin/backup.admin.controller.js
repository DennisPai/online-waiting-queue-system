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

/**
 * 取得 collection 對應的 Mongoose Model，直接綁定到正確的 DB connection
 * 用 conn.model() 而不是 require cache，確保使用 rebind 後的正確 connection
 */
function getModelForCollection(collection) {
  const customerCollections = ['customer_profiles', 'customer_visits', 'customer_households'];
  const conn = customerCollections.includes(collection) ? getCustomerConn() : getQueueConn();

  const schemaMap = {
    'waitingrecords': require('../../models/waiting-record.model')._schema,
    'customer_profiles': require('../../models/customer.model')._schema,
    'customer_visits': require('../../models/visit-record.model')._schema,
    'customer_households': require('../../models/household.model')._schema,
  };

  const schema = schemaMap[collection];
  if (!schema) return null;

  // 用 conn.model() 取已有的 model（或建立），確保在正確 connection 上
  const modelNameMap = {
    'waitingrecords': 'WaitingRecord',
    'customer_profiles': 'Customer',
    'customer_visits': 'VisitRecord',
    'customer_households': 'Household',
  };
  const modelName = modelNameMap[collection];
  try {
    return conn.model(modelName);
  } catch (e) {
    // model 尚未在此 connection 上建立，建立之
    return conn.model(modelName, schema);
  }
}

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

    // 根據 collection 取對應的 model（直接綁定正確 DB connection）
    const Model = getModelForCollection(snapshot.collection);
    if (!Model) {
      return res.status(400).json({
        success: false,
        code: 'UNKNOWN_COLLECTION',
        message: `不支援恢復 collection: ${snapshot.collection}`
      });
    }

    // === DEBUG LOG: 印出各 model 的 connection DB name ===
    const RequiredCustomer = require('../../models/customer.model');
    logger.info(`[restore-debug] Model.db.databaseName = ${Model.db?.databaseName}`);
    logger.info(`[restore-debug] Model === RequiredCustomer ? ${Model === RequiredCustomer}`);
    logger.info(`[restore-debug] RequiredCustomer.db.databaseName = ${RequiredCustomer.db?.databaseName}`);
    logger.info(`[restore-debug] getCustomerConn().db.databaseName = ${getCustomerConn().db?.databaseName}`);
    logger.info(`[restore-debug] getQueueConn().db.databaseName = ${getQueueConn().db?.databaseName}`);

    // 移除 mongoose 內部欄位後 restore
    const restoreData = { ...snapshot.beforeData };
    delete restoreData.__v;
    delete restoreData._id;

    const objectId = mongoose.Types.ObjectId.isValid(snapshot.documentId)
      ? new mongoose.Types.ObjectId(snapshot.documentId)
      : snapshot.documentId;

    // replaceOne + upsert：文件存在則整體取代，不存在（已刪除）則重新建立
    logger.info(`[backup restore] 開始 replaceOne — collection=${snapshot.collection} documentId=${snapshot.documentId} objectId=${objectId} restoreDataKeys=${Object.keys(restoreData).join(',')}`);
    const replaceResult = await Model.replaceOne(
      { _id: objectId },
      { _id: objectId, ...restoreData },
      { upsert: true }
    );
    logger.info(`[backup restore] replaceOne 結果 — matchedCount=${replaceResult.matchedCount} modifiedCount=${replaceResult.modifiedCount} upsertedCount=${replaceResult.upsertedCount} upsertedId=${replaceResult.upsertedId}`);

    // 驗證：用 Model 和 RequiredCustomer 分別查詢，比較結果
    const verifyDoc = await Model.findById(objectId).lean();
    const verifyDoc2 = await RequiredCustomer.findById(objectId).lean();
    logger.info(`[backup restore] 驗證 Model.findById = ${verifyDoc ? '找到' : '查無'} (DB: ${Model.db?.databaseName})`);
    logger.info(`[backup restore] 驗證 RequiredCustomer.findById = ${verifyDoc2 ? '找到' : '查無'} (DB: ${RequiredCustomer.db?.databaseName})`);

    logger.info(`[backup restore] ${snapshot.collection}/${snapshot.documentId} 已恢復 by ${req.user?.id}`);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `已恢復 ${snapshot.collection} 的資料（操作：${snapshot.operation}）`,
      data: { snapshotId: id, collection: snapshot.collection, documentId: snapshot.documentId }
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

// [DEBUG] 查看 snapshot 詳細內容（含 beforeData 的型別資訊）
exports.debugSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await BackupSnapshot.findById(id).lean();
    if (!snapshot) return res.status(404).json({ success: false, message: '找不到 snapshot' });

    const Model = getModelForCollection(snapshot.collection);
    const objectId = mongoose.Types.ObjectId.isValid(snapshot.documentId)
      ? new mongoose.Types.ObjectId(snapshot.documentId)
      : snapshot.documentId;

    // 查現有文件
    const existingBefore = Model ? await Model.findById(objectId).lean() : null;

    // 分析 beforeData
    const bd = snapshot.beforeData || {};
    const bdIdType = typeof bd._id;
    const bdKeys = Object.keys(bd);

    // 嘗試執行 replaceOne（dry-run 模式：先 replaceOne 再 findById 確認）
    let replaceResult = null;
    let existingAfter = null;
    if (Model && !existingBefore) {
      const restoreData = { ...bd };
      delete restoreData.__v;
      delete restoreData._id;
      replaceResult = await Model.replaceOne(
        { _id: objectId },
        { _id: objectId, ...restoreData },
        { upsert: true }
      );
      existingAfter = await Model.findById(objectId).lean();
    }

    return res.json({
      success: true,
      snapshot: {
        _id: snapshot._id,
        collection: snapshot.collection,
        documentId: snapshot.documentId,
        operation: snapshot.operation,
        objectId: objectId.toString(),
        modelFound: !!Model,
        existingBeforeRestore: existingBefore ? { _id: existingBefore._id, name: existingBefore.name } : null,
        replaceResult: replaceResult ? {
          matchedCount: replaceResult.matchedCount,
          modifiedCount: replaceResult.modifiedCount,
          upsertedCount: replaceResult.upsertedCount,
          upsertedId: replaceResult.upsertedId
        } : '文件已存在，未執行 replaceOne',
        existingAfterRestore: existingAfter ? { _id: existingAfter._id, name: existingAfter.name } : null,
        beforeData: {
          _idType: bdIdType,
          _idValue: String(bd._id),
          keys: bdKeys,
          nameValue: bd.name,
          preview: Object.fromEntries(bdKeys.slice(0, 5).map(k => [k, String(bd[k]).slice(0, 80)]))
        }
      }
    });
  } catch (error) {
    logger.error('debugSnapshot 錯誤:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
