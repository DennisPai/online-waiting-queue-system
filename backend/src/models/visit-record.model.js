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
  queueNumber: Number
}, {
  timestamps: true
});

visitRecordSchema.index({ customerId: 1, sessionDate: -1 });

let VisitRecord = null;
function getVisitRecordModel() {
  if (VisitRecord) return VisitRecord;
  const conn = getCustomerConnection();
  if (!conn) return null;
  VisitRecord = conn.model('VisitRecord', visitRecordSchema);
  return VisitRecord;
}

module.exports = { getVisitRecordModel, visitRecordSchema };
