const mongoose = require('mongoose');

// 地址子結構
const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    default: '臨時地址'
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'hospital', 'other'],
    default: 'home'
  }
}, { _id: false });

// 家人子結構
const familyMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 新增性別欄位
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true,
    default: 'male'
  },
  // 國曆出生日期
  gregorianBirthYear: {
    type: Number,
    default: null
  },
  gregorianBirthMonth: {
    type: Number,
    default: null,
    min: 1,
    max: 12
  },
  gregorianBirthDay: {
    type: Number,
    default: null,
    min: 1,
    max: 31
  },
  // 農曆出生日期
  lunarBirthYear: {
    type: Number,
    default: null
  },
  lunarBirthMonth: {
    type: Number,
    default: null,
    min: 1,
    max: 12
  },
  lunarBirthDay: {
    type: Number,
    default: null,
    min: 1,
    max: 31
  },
  lunarIsLeapMonth: {
    type: Boolean,
    default: false
  },
  // 虛歲
  virtualAge: {
    type: Number,
    default: null
  },
  address: {
    type: String,
    default: '臨時地址'
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'hospital', 'other'],
    default: 'home'
  }
}, { _id: false });

const waitingRecordSchema = new mongoose.Schema({
  queueNumber: {
    type: Number,
    required: true,
    unique: true
  },
  orderIndex: {
    type: Number,
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['waiting', 'processing', 'completed', 'cancelled'],
    default: 'waiting'
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  // 國曆出生日期
  gregorianBirthYear: {
    type: Number,
    default: null
  },
  gregorianBirthMonth: {
    type: Number,
    default: null,
    min: 1,
    max: 12
  },
  gregorianBirthDay: {
    type: Number,
    default: null,
    min: 1,
    max: 31
  },
  // 農曆出生日期
  lunarBirthYear: {
    type: Number,
    default: null
  },
  lunarBirthMonth: {
    type: Number,
    default: null,
    min: 1,
    max: 12
  },
  lunarBirthDay: {
    type: Number,
    default: null,
    min: 1,
    max: 31
  },
  lunarIsLeapMonth: {
    type: Boolean,
    default: false
  },
  // 虛歲
  virtualAge: {
    type: Number,
    default: null
  },
  // 修改為支持多地址
  addresses: {
    type: [addressSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0 && v.length <= 3;
      },
      message: '至少需要一個地址，最多三個地址'
    }
  },
  // 新增家人陣列
  familyMembers: {
    type: [familyMemberSchema],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: '最多可以添加5位家人'
    }
  },
  consultationTopics: {
    type: [String],
    enum: ['body', 'fate', 'karma', 'family', 'career', 'relationship', 'study', 'blessing', 'other'],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: '至少需要選擇一個諮詢主題'
    }
  },
  // 其他詳細內容欄位
  otherDetails: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// 添加虛擬字段來處理狀態排序
waitingRecordSchema.virtual('statusOrder').get(function() {
  const statusOrder = {
    'waiting': 0,
    'processing': 1,
    'completed': 2,
    'cancelled': 3
  };
  return statusOrder[this.status] || 99;
});

// 為了向後兼容，添加虛擬字段
waitingRecordSchema.virtual('address').get(function() {
  return this.addresses && this.addresses.length > 0 ? this.addresses[0].address : '';
});

waitingRecordSchema.virtual('addressType').get(function() {
  return this.addresses && this.addresses.length > 0 ? this.addresses[0].addressType : 'home';
});

// 候位號碼自動遞增的靜態方法
waitingRecordSchema.statics.getNextQueueNumber = async function() {
  const lastRecord = await this.findOne().sort({ queueNumber: -1 }).limit(1);
  return lastRecord ? lastRecord.queueNumber + 1 : 1;
};

const WaitingRecord = mongoose.model('WaitingRecord', waitingRecordSchema);

module.exports = WaitingRecord; 