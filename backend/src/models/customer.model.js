const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', ''],
    default: ''
  },
  lunarBirthYear: Number,
  lunarBirthMonth: Number,
  lunarBirthDay: Number,
  lunarIsLeapMonth: { type: Boolean, default: false },
  gregorianBirthYear: Number,
  gregorianBirthMonth: Number,
  gregorianBirthDay: Number,
  addresses: [{
    address: String,
    addressType: {
      type: String,
      enum: ['home', 'work', 'hospital', 'other'],
      default: 'home'
    }
  }],
  householdId: {
    type: String,
    index: true
  },
  tags: [String],
  notes: {
    type: String,
    default: ''
  },
  totalVisits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'customer_profiles'
});

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
