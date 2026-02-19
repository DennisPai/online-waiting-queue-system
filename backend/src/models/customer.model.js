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
  // 戶籍關聯（同一家人共用一個 householdId）
  householdId: {
    type: String,
    index: true
  },
  // 標籤
  tags: [String],
  // 備註
  notes: {
    type: String,
    default: ''
  },
  // 累計來訪次數
  totalVisits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 建立索引
customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 'text' });

const conn = getCustomerConnection();
const Customer = conn.model('Customer', customerSchema);

module.exports = Customer;
