const mongoose = require('mongoose');

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
  timestamps: true,
  collection: 'customer_visits'
});

visitRecordSchema.index({ customerId: 1, sessionDate: -1 });

module.exports = mongoose.model('VisitRecord', visitRecordSchema);
