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
  simplifiedMode: {
    type: Boolean,
    default: false
  },
  publicRegistrationEnabled: {
    type: Boolean,
    default: false  // 預設為false，即預設關閉公開候位登記
  },
  totalCustomerCount: {
    type: Number,
    default: 0,
    min: 0  // 客戶總數不能為負數
  },
  lastCompletedTime: {
    type: Date,
    default: null  // 上一位辦完時間，初始為 null
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
      minutesPerCustomer: 13,
      simplifiedMode: false,
      publicRegistrationEnabled: false,
      totalCustomerCount: 0,
      lastCompletedTime: null
    });
  } else {
    // 檢查並初始化新欄位（適用於雲端部署自動更新）
    let needsUpdate = false;
    const updateFields = {};
    
    if (settings.totalCustomerCount === undefined) {
      // 計算當前總客戶數（包含活躍狀態的客戶）
      const WaitingRecord = require('./waiting-record.model');
      const totalCount = await WaitingRecord.countDocuments({
        status: { $in: ['waiting', 'processing', 'completed'] }
      });
      updateFields.totalCustomerCount = totalCount;
      needsUpdate = true;
      console.log(`初始化 totalCustomerCount: ${totalCount}`);
    }
    
    if (settings.lastCompletedTime === undefined) {
      // 查找最後一位已完成的客戶
      const WaitingRecord = require('./waiting-record.model');
      const lastCompleted = await WaitingRecord.findOne(
        { status: 'completed', completedAt: { $exists: true, $ne: null } },
        {},
        { sort: { completedAt: -1 } }
      );
      
      if (lastCompleted) {
        updateFields.lastCompletedTime = lastCompleted.completedAt;
        console.log(`初始化 lastCompletedTime: ${lastCompleted.completedAt}`);
      } else {
        updateFields.lastCompletedTime = settings.nextSessionDate || new Date();
        console.log(`初始化 lastCompletedTime: ${updateFields.lastCompletedTime} (無已完成客戶)`);
      }
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await this.updateOne({}, { $set: updateFields });
      settings = await this.findOne(); // 重新獲取更新後的設定
      console.log('系統設定已自動更新新欄位');
    }
  }
  
  return settings;
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting; 