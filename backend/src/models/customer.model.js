const mongoose = require('mongoose');
const { getCustomerConnection } = require('../config/customerDb');

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
  // 農曆生日
  lunarBirthYear: Number,
  lunarBirthMonth: Number,
  lunarBirthDay: Number,
  lunarIsLeapMonth: { type: Boolean, default: false },
  // 國曆生日
  gregorianBirthYear: Number,
  gregorianBirthMonth: Number,
  gregorianBirthDay: Number,
  // 地址（可多筆）
  addresses: [{
    address: String,
    addressType: {
      type: String,
      enum: ['home', 'work', 'hospital', 'other'],
      default: 'home'
    }
  }],
  // 戶籍關聯
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
  timestamps: true
});

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

// Lazy model：連線可能不存在
let Customer = null;
function getCustomerModel() {
  if (Customer) return Customer;
  const conn = getCustomerConnection();
  if (!conn) return null;
  Customer = conn.model('Customer', customerSchema);
  return Customer;
}

module.exports = { getCustomerModel, customerSchema };
