/**
 * gdrive-backup.service.js
 * Google Drive 每日備份服務
 *
 * 環境變數：
 *   GDRIVE_BACKUP_ENABLED   - 'true' 啟用（預設 false）
 *   GDRIVE_FOLDER_ID        - Google Drive 目標資料夾 ID
 *   GDRIVE_SERVICE_ACCOUNT_KEY - Service Account JSON（Base64 encode）
 *   GDRIVE_BACKUP_CRON      - cron 表達式（預設 '0 18 * * *' = 台北 02:00）
 *   LOG_BACKUP_TTL_DAYS     - backup_logs 保留天數（預設 90）
 */
const { google } = require('googleapis');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { getQueueConn } = require('../config/db');

// ── backup_logs schema（inline）──
const backupLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  fileName: { type: String },
  fileSizeBytes: { type: Number, default: 0 },
  error: { type: String, default: null },
  dryRun: { type: Boolean, default: false }
}, { collection: 'backup_logs' });

let BackupLog;
function getBackupLogModel() {
  if (BackupLog) return BackupLog;
  try {
    const qConn = getQueueConn();
    if (qConn.modelNames().includes('BackupLog')) {
      BackupLog = qConn.model('BackupLog');
    } else {
      BackupLog = qConn.model('BackupLog', backupLogSchema);
    }
  } catch (e) {
    // fallback：unit test 環境
    if (mongoose.modelNames().includes('BackupLog')) {
      BackupLog = mongoose.model('BackupLog');
    } else {
      BackupLog = mongoose.model('BackupLog', backupLogSchema);
    }
  }
  return BackupLog;
}

// ── dump DB ──
async function dumpDb(dbConn, dbName) {
  const collections = await dbConn.db.listCollections().toArray();
  const dump = {};
  for (const col of collections) {
    const name = col.name;
    dump[name] = await dbConn.collection(name).find({}).toArray();
  }
  return { dbName, collections: Object.keys(dump), data: dump };
}

// ── Google Drive 上傳 ──
async function uploadToGDrive(fileName, content) {
  const enabled = process.env.GDRIVE_BACKUP_ENABLED === 'true';
  if (!enabled) {
    logger.info(`[gdrive-backup] dry-run 模式：不實際上傳（GDRIVE_BACKUP_ENABLED=false）`);
    return { dryRun: true, fileName };
  }

  const keyBase64 = process.env.GDRIVE_SERVICE_ACCOUNT_KEY;
  if (!keyBase64) throw new Error('缺少 GDRIVE_SERVICE_ACCOUNT_KEY 環境變數');

  const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GDRIVE_FOLDER_ID;

  const { Readable } = require('stream');
  const contentStr = JSON.stringify(content, null, 2);
  const stream = Readable.from([contentStr]);

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined
  };
  const media = { mimeType: 'application/json', body: stream };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, size'
  });

  return {
    dryRun: false,
    fileId: response.data.id,
    fileName: response.data.name,
    fileSizeBytes: parseInt(response.data.size || '0', 10)
  };
}

// ── 清除舊備份（30 天前）──
async function cleanOldBackups(daysToKeep = 30) {
  const enabled = process.env.GDRIVE_BACKUP_ENABLED === 'true';
  if (!enabled) {
    logger.info('[gdrive-backup] dry-run：跳過清除舊備份');
    return;
  }

  const keyBase64 = process.env.GDRIVE_SERVICE_ACCOUNT_KEY;
  if (!keyBase64) return;

  const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
  const folderId = process.env.GDRIVE_FOLDER_ID;
  const q = `name contains 'backup-' and createdTime < '${cutoff}'${folderId ? ` and '${folderId}' in parents` : ''}`;

  const list = await drive.files.list({ q, fields: 'files(id, name)' });
  const files = list.data.files || [];
  for (const f of files) {
    await drive.files.delete({ fileId: f.id });
    logger.info(`[gdrive-backup] 已刪除舊備份: ${f.name}`);
  }
}

// ── 完整備份流程 ──
async function runFullBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${timestamp}.json`;
  let fileSizeBytes = 0;
  let uploadResult = null;

  try {
    logger.info('[gdrive-backup] 開始備份...');

    // 取得雙 DB connection
    const { getQueueConn: _qConn, getCustomerConn: _cConn } = require('../config/db');
    const queueConn = _qConn();
    const customerConn = _cConn();

    const [queueDump, customerDump] = await Promise.all([
      dumpDb(queueConn, process.env.QUEUE_DB_NAME || 'queue'),
      dumpDb(customerConn, process.env.CUSTOMER_DB_NAME || 'customer')
    ]);

    const fullBackup = { timestamp, queue: queueDump, customer: customerDump };
    const contentStr = JSON.stringify(fullBackup, null, 2);
    fileSizeBytes = Buffer.byteLength(contentStr, 'utf-8');

    uploadResult = await uploadToGDrive(fileName, fullBackup);

    await cleanOldBackups(30);

    const Model = getBackupLogModel();
    await Model.create({
      timestamp: new Date(),
      status: 'success',
      fileName,
      fileSizeBytes,
      dryRun: uploadResult.dryRun || false
    });

    logger.info(`[gdrive-backup] 備份完成：${fileName}（${Math.round(fileSizeBytes / 1024)} KB）${uploadResult.dryRun ? ' [dry-run]' : ''}`);

    return { success: true, fileName, fileSizeBytes, dryRun: uploadResult.dryRun || false };
  } catch (err) {
    logger.error('[gdrive-backup] 備份失敗:', err.message);
    try {
      const Model = getBackupLogModel();
      await Model.create({
        timestamp: new Date(),
        status: 'failed',
        fileName,
        fileSizeBytes: 0,
        error: err.message,
        dryRun: false
      });
    } catch (logErr) {
      logger.error('[gdrive-backup] 寫入 backup_log 失敗:', logErr.message);
    }
    return { success: false, error: err.message };
  }
}

// ── 取得最新一筆 backup log ──
async function getLastBackupLog() {
  try {
    const Model = getBackupLogModel();
    return await Model.findOne({}).sort({ timestamp: -1 }).lean();
  } catch {
    return null;
  }
}

// ── 取得最近 N 筆 backup logs ──
async function getRecentBackupLogs(limit = 5) {
  try {
    const Model = getBackupLogModel();
    return await Model.find({}).sort({ timestamp: -1 }).limit(limit).lean();
  } catch {
    return [];
  }
}

// ── 啟動 cron 排程 ──
function startGDriveBackupScheduler() {
  const enabled = process.env.GDRIVE_BACKUP_ENABLED === 'true';
  if (!enabled) {
    logger.info('[gdrive-backup] 排程未啟用（GDRIVE_BACKUP_ENABLED != true）');
    return;
  }

  const cron = require('node-cron');
  const schedule = process.env.GDRIVE_BACKUP_CRON || '0 18 * * *';
  cron.schedule(schedule, () => {
    logger.info(`[gdrive-backup] cron 觸發 (${schedule})`);
    runFullBackup().catch(err => logger.error('[gdrive-backup] cron 執行失敗:', err.message));
  });
  logger.info(`[gdrive-backup] 排程已啟動：${schedule}`);
}

module.exports = { runFullBackup, getLastBackupLog, getRecentBackupLogs, startGDriveBackupScheduler };
