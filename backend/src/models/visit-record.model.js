const mongoose = require('mongoose');

// Change B / Phase 2.2：familyMember 子 schema 用 explicit `new Schema({...}, { _id: false })`
// 寫法跟 `waiting-record.model.js` familyMemberSchema 100% 對齊（同欄位 / 同 default / 同
// enum / 同 _id: false）。為什麼不抽共用子 schema：design.md D2 — 避免跨 model 耦合，
// 維護痛點靠 Phase 4.2 schema sync test + Phase 5 自我 review 防漂移。
// 既有 archived 資料殘留的子文件 _id 不影響 read path（前端不讀 familyMember._id）。
const familyMemberSubSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  // 國曆出生日期
  // Change C v3：gregorianBirth* 保留欄位但主流程不寫入；歷史 record 已存的值不動。
  // 保留欄位避免資料庫遷移；未來 admin 工具用 calendarConverter 的 lunarToGregorian/
  // gregorianToLunar export 自行雙向轉換。
  gregorianBirthYear: { type: Number, default: null },
  gregorianBirthMonth: { type: Number, default: null, min: 1, max: 12 },
  gregorianBirthDay: { type: Number, default: null, min: 1, max: 31 },
  // 農曆出生日期
  // Change C v3：lunar 為主要生日欄位（民國年），register 流程的主資料來源。
  // 此處不加 required（避免歷史資料 hydrate 撞 validation），驗證留給 register 流程做。
  lunarBirthYear: { type: Number, default: null },
  lunarBirthMonth: { type: Number, default: null, min: 1, max: 12 },
  lunarBirthDay: { type: Number, default: null, min: 1, max: 31 },
  lunarIsLeapMonth: { type: Boolean, default: false },
  // 虛歲 / 生肖
  virtualAge: { type: Number, default: null },
  zodiac: { type: String, default: null },
  // 地址（純量；Change B Phase 3 default 改 ''）
  address: { type: String, default: '' },
  addressType: { type: String, enum: ['home', 'work', 'hospital', 'other'], default: 'home' }
}, { _id: false });

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
  queueNumber: Number,
  // 用上方 explicit `familyMemberSubSchema`（_id: false + 完整欄位對齊 waiting-record）
  familyMembers: [familyMemberSubSchema],
  sourceQueueId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
}, {
  timestamps: true,
  collection: 'customer_visits'
});

visitRecordSchema.index({ customerId: 1, sessionDate: -1 });

module.exports = mongoose.model('VisitRecord', visitRecordSchema);
module.exports._schema = visitRecordSchema;
