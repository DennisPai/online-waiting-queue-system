const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  nextSessionDate: {
    type: Date,
    default: null
  },
  isQueueOpen: {
    type: Boolean,
    default: true
  },
  currentQueueNumber: {
    type: Number,
    default: 0
  },
  maxQueueNumber: {
    type: Number,
    default: 100
  },
  minutesPerCustomer: {
    type: Number,
    default: 13,
    min: 1,
    max: 120  // 最大120分鐘，防止設定過大
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 取得或創建默認系統設定的靜態方法
systemSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({
      nextSessionDate: new Date(),
      isQueueOpen: true,
      currentQueueNumber: 0,
      maxQueueNumber: 100,
      minutesPerCustomer: 13
    });
  }
  
  return settings;
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting; 