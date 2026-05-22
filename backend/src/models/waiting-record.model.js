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
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
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
  // 生肖
  zodiac: {
    type: String,
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
    required: true
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
    required: false,
    trim: true,
    lowercase: true,
    default: ''
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
    enum: ['male', 'female', 'other'],
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
  // 生肖
  zodiac: {
    type: String,
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
  // 備註欄位
  remarks: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
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

// === Phase 3 / Task 3.3（design.md D3）：orderIndex partial unique index ===
// 只對 active 狀態（waiting / processing）約束 orderIndex 唯一，
// cancelled / completed 不受約束（它們不參與排序，orderIndex 可重複或為 null）。
//
// 定位（D3）：這是「理論上不該發生的撞號」的最後一道防線，
// 不是額滿判斷工具（額滿靠 issuedCount 原子閘門）、也不是填洞防護。
//
// partialFilterExpression 用 $in 形式（status ∈ {waiting, processing}）—
// MongoDB 3.2 起 partial index 支援 $in（design.md D3 / Task 3.3a）。
// 注意：orderIndex 預設值為 null；但 partialFilterExpression 已把約束範圍
// 限縮在 active 狀態，新報名在「先發 orderIndex、後改 status」的順序下
// （D13）不會帶 null 進入約束範圍，因此不需再排除 null。
waitingRecordSchema.index(
  { orderIndex: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['waiting', 'processing'] } },
    name: 'orderIndex_active_unique'
  }
);

const WaitingRecord = mongoose.model('WaitingRecord', waitingRecordSchema);

module.exports = WaitingRecord;
module.exports._schema = waitingRecordSchema; 