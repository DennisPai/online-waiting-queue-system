const mongoose = require('mongoose');
const { getCustomerConnection } = require('../config/customerDb');

const visitRecordSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  consultationTopics: [{
    type: String,
    enum: ['body', 'fate', 'karma', 'family', 'career', 'relationship', 'study', 'blessing', 'other']
  }],
  otherDetails: String,
  remarks: {
    type: String,
    default: ''
  },
  // 該次候位號碼（從 waiting-record 帶過來）
  queueNumber: Number
}, {
  timestamps: true
});

visitRecordSchema.index({ customerId: 1, sessionDate: -1 });

const conn = getCustomerConnection();
const VisitRecord = conn.model('VisitRecord', visitRecordSchema);

module.exports = VisitRecord;
