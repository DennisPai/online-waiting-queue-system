const logger = require('../utils/logger');
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
  maxOrderIndex: {
    type: Number,
    default: 100  // 最大叫號順序上限
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
  showQueueNumberInQuery: {
    type: Boolean,
    default: true  // 預設顯示，管理員可關閉
  },
  totalCustomerCount: {
    type: Number,
    default: 0,
    min: 0  // 客戶總數不能為負數
  },
  // 本期累計發出的候位名額數（額滿原子閘門用）
  // D2/D8：只增不減 —— 報名成功 +1、管理員「刪除」記錄 -1（唯一允許下降的情況）。
  // cancelled 仍佔名額，不會讓 issuedCount 下降，因此誤取消不會解除額滿。
  // 報名第一步以 findOneAndUpdate({ issuedCount: { $lt: maxOrderIndex } }, { $inc: 1 })
  // 原子地佔名額：回 null = 已額滿，回文件 = 已佔到一個名額。
  issuedCount: {
    type: Number,
    default: 0,
    min: 0  // 已發名額不能為負數
  },
  // orderIndex 原子發號計數器（Phase 3 / Task 3.2 / design.md D3 + D14）
  // 用途：消除「讀目前最大 orderIndex → +1 → save」這個非原子分配的撞號競態。
  // 每次要分配 orderIndex 時對本欄位做 findOneAndUpdate $inc 1，MongoDB 保證
  // 每次 $inc 互斥 → 每個請求拿到「保證唯一、單調遞增」的發號值。
  // 新報名 / 恢復報名先拿這個唯一值當 orderIndex（排到隊尾、彼此不撞號），
  // 再由 ensureOrderIndexConsistency() 在安全時機把 active 記錄壓回連續 1..N。
  // D14：orderIndexCounter 與 issuedCount 解耦 —— 前者管「排序發號」、
  // 後者管「名額計數」，是兩件不同的事，互不影響。
  orderIndexCounter: {
    type: Number,
    default: 0,
    min: 0
  },
  lastCompletedTime: {
    type: Date,
    default: null  // 上一位辦完時間，初始為 null
  },
  // 下次開科辦事開放報名時間（null 表示使用動態計算）
  scheduledOpenTime: {
    type: Date,
    default: null  // 預設為 null，使用系統自動計算（開科辦事日 + 1天 + 中午12:00整）
  },
  // 是否啟用定時自動開放公開候位登記
  autoOpenEnabled: {
    type: Boolean,
    default: false  // 預設關閉定時開放
  },
  // 活動報名區塊設定（固定新分頁開啟）
  eventBanner: {
    enabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '修玄宮特別活動'
    },
    titleSize: {
      type: String,
      default: '1.5rem'
    },
    titleColor: {
      type: String,
      default: '#1976d2'
    },
    titleAlign: {
      type: String,
      default: 'center',
      enum: ['left', 'center', 'right']
    },
    fontWeight: {
      type: String,
      default: 'normal',
      enum: ['normal', 'bold']
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    buttonText: {
      type: String,
      default: '點我填寫報名表單'
    },
    buttonUrl: {
      type: String,
      default: 'https://www.google.com'
    },
    buttonColor: {
      type: String,
      default: '#1976d2'
    },
    buttonTextColor: {
      type: String,
      default: '#ffffff'
    }
  },
  // P0-7：結束本期冪等鎖 flag（原子 findOneAndUpdate 搶鎖，finally 釋放）
  sessionEnding: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 取得或創建默認系統設定的靜態方法
//
// === Phase 6.4 Hotfix（2026-05-23）：偵測缺失欄位必須繞過 Mongoose default ===
// 根因：Schema 對 `issuedCount` / `orderIndexCounter` 宣告了 `default: 0`，
// Mongoose 透過 `findOne()` 讀文件時會在記憶體裡套用 default —— 結果
// `settings.issuedCount === undefined` **永遠**為 false，自動補欄位的
// `$set` migration 永遠不會觸發 → DB 文件實際缺欄位，但 code 路徑誤以為已有。
// 引發兩個阻斷症狀：
//   1) 報名閘門 `findOneAndUpdate({issuedCount:{$lt:max}})`，`$lt` 對「缺失欄位」
//      不匹配 → 每筆報名都被擋成「今日候位已滿」（issuedCount 缺失）。
//   2) `allocateOrderIndex()` `$inc orderIndexCounter 1` 對缺失欄位視為從 0 起跳
//      → 首批發號從 1 開始，連續撞既有 active 記錄 orderIndex 直到爬過 active 範圍。
//
// 修法：偵測時改用底層 collection driver（`SystemSetting.collection.findOne()`）
// 直接看 DB 文件的真實內容（繞過 Mongoose default 套用）；補欄位也走底層
// `collection.updateOne` 確保即使 Mongoose 邏輯日後變動也能正確 $set。
//
// ⚠️ 注意：解法不能改用「拿掉 schema 的 default: 0」——那會改變 schema 語意
// （新文件不再有預設值、其他 code 路徑可能撞 undefined），且不保證未來不再有
// 同類「default 遮蔽偵測」的 bug。要從根上解決「偵測 vs default」的衝突。
systemSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({
      nextSessionDate: new Date(),
      isQueueOpen: true,
      currentQueueNumber: 0,
      maxOrderIndex: 100,
      minutesPerCustomer: 13,
      simplifiedMode: false,
      publicRegistrationEnabled: false,
      totalCustomerCount: 0,
      lastCompletedTime: null
    });
  } else {
    // === 用底層 collection 查 DB 文件的「真實」內容，繞過 Mongoose default ===
    // 對於有 `default` 宣告的欄位（如 issuedCount / orderIndexCounter），
    // 必須用此 raw 物件偵測「DB 文件是否實際缺欄位」，不能用 `settings.xxx`。
    // 對於沒有 default 宣告的欄位（如 lastCompletedTime / eventBanner 等），
    // 用 `settings.xxx` 偵測仍正確（Mongoose 不會憑空套 default）。
    const rawSettings = await this.collection.findOne({ _id: settings._id });

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
      logger.info(`初始化 totalCustomerCount: ${totalCount}`);
    }

    // D8 / Phase 6.4 hotfix：`issuedCount` 有 schema default: 0，必須用 raw DB 文件
    // 偵測「文件裡實際是不是真的有這欄位」，否則 default 會永遠掩蓋缺失。
    if (rawSettings && (rawSettings.issuedCount === undefined || rawSettings.issuedCount === null)) {
      // D8/2.6：以「目前 active + cancelled 記錄數」初始化已發名額基準
      // （cancelled 仍佔名額，故一併計入；completed 為已辦完、本期不再佔位故不計）
      const WaitingRecord = require('./waiting-record.model');
      const issued = await WaitingRecord.countDocuments({
        status: { $in: ['waiting', 'processing', 'cancelled'] }
      });
      updateFields.issuedCount = issued;
      needsUpdate = true;
      logger.info(`初始化 issuedCount: ${issued}（偵測 DB 文件實際缺欄位）`);
    }

    // D3 / Phase 6.4 hotfix：同款 default: 0 遮蔽問題，一律走 raw DB 文件偵測。
    if (rawSettings && (rawSettings.orderIndexCounter === undefined || rawSettings.orderIndexCounter === null)) {
      // Phase 3 / D3：初始化 orderIndex 原子發號計數器。
      // 基準必須 >= 目前所有 active 記錄的最大 orderIndex，
      // 否則第一批新發號值會與既有記錄撞號。
      const WaitingRecord = require('./waiting-record.model');
      const maxRecord = await WaitingRecord.findOne(
        { status: { $in: ['waiting', 'processing'] } },
        { orderIndex: 1 },
        { sort: { orderIndex: -1 } }
      );
      updateFields.orderIndexCounter = (maxRecord && maxRecord.orderIndex) ? maxRecord.orderIndex : 0;
      needsUpdate = true;
      logger.info(`初始化 orderIndexCounter: ${updateFields.orderIndexCounter}（偵測 DB 文件實際缺欄位）`);
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
        logger.info(`初始化 lastCompletedTime: ${lastCompleted.completedAt}`);
      } else {
        updateFields.lastCompletedTime = settings.nextSessionDate || new Date();
        logger.info(`初始化 lastCompletedTime: ${updateFields.lastCompletedTime} (無已完成客戶)`);
      }
      needsUpdate = true;
    }
    
    // 欄位遷移：maxQueueNumber → maxOrderIndex
    if (settings.maxOrderIndex === undefined && settings.maxQueueNumber !== undefined) {
      updateFields.maxOrderIndex = settings.maxQueueNumber;
      needsUpdate = true;
      logger.info(`遷移欄位 maxQueueNumber → maxOrderIndex: ${settings.maxQueueNumber}`);
    }
    
    // 初始化 eventBanner 欄位
    if (settings.eventBanner === undefined) {
      updateFields.eventBanner = {
        enabled: false,
        title: '修玄宮特別活動',
        titleSize: '1.5rem',
        titleColor: '#1976d2',
        titleAlign: 'center',
        fontWeight: 'normal',
        backgroundColor: '#ffffff',
        buttonText: '點我填寫報名表單',
        buttonUrl: 'https://www.google.com',
        buttonColor: '#1976d2',
        buttonTextColor: '#ffffff'
      };
      needsUpdate = true;
      logger.debug('初始化 eventBanner 設定');
    } else if (settings.eventBanner) {
      // 為現有的 eventBanner 添加新欄位
      let eventBannerNeedsUpdate = false;
      const updatedEventBanner = { ...settings.eventBanner };
      
      if (settings.eventBanner.fontWeight === undefined) {
        updatedEventBanner.fontWeight = 'normal';
        eventBannerNeedsUpdate = true;
      }
      
      if (settings.eventBanner.backgroundColor === undefined) {
        updatedEventBanner.backgroundColor = '#ffffff';
        eventBannerNeedsUpdate = true;
      }
      
      if (settings.eventBanner.buttonTextColor === undefined) {
        updatedEventBanner.buttonTextColor = '#ffffff';
        eventBannerNeedsUpdate = true;
      }
      
      // 如果 buttonColor 還是舊的 enum 值，轉換為顏色碼
      if (settings.eventBanner.buttonColor && ['primary', 'secondary', 'success', 'error', 'info', 'warning'].includes(settings.eventBanner.buttonColor)) {
        updatedEventBanner.buttonColor = '#1976d2';
        eventBannerNeedsUpdate = true;
      }
      
      if (eventBannerNeedsUpdate) {
        updateFields.eventBanner = updatedEventBanner;
        needsUpdate = true;
        logger.debug('更新 eventBanner 設定，添加新欄位');
      }
    }
    
    if (needsUpdate) {
      // Phase 6.4 hotfix：補欄位也走底層 collection.updateOne，確保 $set 真實寫進
      // DB 文件（不受 Mongoose schema/middleware 干擾），讓「補欄位」與「偵測欄位」
      // 用同一條 raw driver 路徑保持一致。
      await this.collection.updateOne({ _id: settings._id }, { $set: updateFields });
      settings = await this.findOne(); // 重新獲取更新後的設定
      logger.debug('系統設定已自動更新新欄位');
    }
  }
  
  return settings;
};

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;
module.exports._schema = systemSettingSchema; 