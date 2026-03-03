const mongoose = require('mongoose');

const backupSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  operation: { type: String, required: true },    // e.g. 'update-queue-status', 'delete-customer', 'end-session'
  collection: { type: String, required: true },   // e.g. 'waitingrecords', 'customer_profiles'
  documentId: { type: String, default: null },
  beforeData: { type: mongoose.Schema.Types.Mixed, default: null },
  operatorId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
  timestamps: false,
  collection: 'backup_snapshots'
});

backupSnapshotSchema.index({ operation: 1 });
backupSnapshotSchema.index({ collection: 1 });

const BackupSnapshot = mongoose.model('BackupSnapshot', backupSnapshotSchema);
module.exports = BackupSnapshot;
module.exports._schema = backupSnapshotSchema;
