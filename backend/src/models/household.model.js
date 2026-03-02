const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'hospital', 'other'],
    default: 'home'
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }]
}, {
  timestamps: true,
  collection: 'customer_households'
});

module.exports = mongoose.model('Household', householdSchema);
