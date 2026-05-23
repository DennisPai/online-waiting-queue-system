/**
 * family-address-schema.test.js
 *
 * Change B / Task 4.2.1：家人 address 結構修正的 schema 層驗證
 *
 * 驗證範圍：
 *   1. mock useQueueUI 物件丟 schema validate — 確認 mongoose 不丟欄位
 *   2. schema sync — waiting-record.familyMemberSchema vs visit-record.familyMemberSubSchema
 *      全 path 的 type / default / enum 100% 一致
 *   3. default check — 沒填 address 的家人 default === '' （不是 '臨時地址'）
 *   4. 歷史資料 read 不被影響 — 既有 '臨時地址' 的舊文件讀回來不會被 default 改 ''
 *
 * 本 test 不 mock mongoose、不連 DB，直接用 schema 物件做 in-memory validate。
 */

const mongoose = require('mongoose');

// 從 model 拿 schema 物件（兩個 model 都 export _schema）
const WaitingRecord = require('../src/models/waiting-record.model');
const VisitRecord = require('../src/models/visit-record.model');

const waitingSchema = WaitingRecord._schema;
const visitSchema = VisitRecord._schema;

// 取家人子 schema（用 mongoose path API，避免要求 production code 多 export）
const waitingFamilySchema = waitingSchema.path('familyMembers').schema;
const visitFamilySchema = visitSchema.path('familyMembers').schema;

describe('Change B / Task 4.2.1 — 家人 address schema 修正驗證', () => {

  // === Case 1：mock 前端 useQueueUI.addFamilyMember() 產出物件丟 schema validate ===
  test('1. 前端 addFamilyMember 產出的純量 address 物件 → schema 不丟欄位', () => {
    // 模擬 Phase 1 修正後 useQueueUI:140 addFamilyMember() 產出的新家人物件
    // （純量 address + addressType，非陣列 addresses[]）
    const newFamilyFromUI = {
      name: '測試家人',
      gender: 'female',
      address: '前端送來的地址',
      addressType: 'home',
      gregorianBirthYear: 90,
      gregorianBirthMonth: 6,
      gregorianBirthDay: 15,
      lunarBirthYear: 90,
      lunarBirthMonth: 5,
      lunarBirthDay: 18,
      lunarIsLeapMonth: false,
      virtualAge: 30,
      zodiac: '羊'
    };

    // 建一筆完整 WaitingRecord 帶這位家人，validateSync 不應有錯
    const record = new WaitingRecord({
      queueNumber: 1,
      name: '主客',
      phone: '0912345678',
      gender: 'male',
      addresses: [{ address: '主客地址', addressType: 'home' }],
      familyMembers: [newFamilyFromUI],
      consultationTopics: ['body']
    });

    const validateErr = record.validateSync();
    expect(validateErr).toBeUndefined();

    // 取出存進去的家人物件，13 欄位都應該在（mongoose 不應 strict-mode 丟棄）
    const stored = record.familyMembers[0].toObject();
    expect(stored.name).toBe('測試家人');
    expect(stored.gender).toBe('female');
    expect(stored.address).toBe('前端送來的地址'); // 純量、不是陣列
    expect(stored.addressType).toBe('home');
    expect(stored.gregorianBirthYear).toBe(90);
    expect(stored.gregorianBirthMonth).toBe(6);
    expect(stored.gregorianBirthDay).toBe(15);
    expect(stored.lunarBirthYear).toBe(90);
    expect(stored.lunarBirthMonth).toBe(5);
    expect(stored.lunarBirthDay).toBe(18);
    expect(stored.lunarIsLeapMonth).toBe(false);
    expect(stored.virtualAge).toBe(30);
    expect(stored.zodiac).toBe('羊');

    // 反向驗：確認舊的 addresses[] 陣列結構「不」應該出現
    expect(stored.addresses).toBeUndefined();
  });

  // === Case 2：schema sync — waiting vs visit 家人子 schema 100% 一致 ===
  describe('2. schema sync — waiting/visit familyMember 子 schema 對齊', () => {
    // 13 個 path 全部要 sync
    const EXPECTED_PATHS = [
      'name', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'virtualAge', 'zodiac',
      'address', 'addressType'
    ];

    test('2a. 兩個 schema 的 path 集合 100% 一致', () => {
      // 過濾掉 mongoose 自動加的 _id / __v 等內部 path
      const filter = p => !p.startsWith('_') && p !== '__v';
      const waitingPaths = Object.keys(waitingFamilySchema.paths).filter(filter).sort();
      const visitPaths = Object.keys(visitFamilySchema.paths).filter(filter).sort();

      expect(waitingPaths).toEqual(visitPaths);
      expect(waitingPaths.sort()).toEqual([...EXPECTED_PATHS].sort());
    });

    test('2b. 兩個 schema 都設 { _id: false } （無子文件 ID 噪音）', () => {
      // schema.options 應有 _id: false
      expect(waitingFamilySchema.options._id).toBe(false);
      expect(visitFamilySchema.options._id).toBe(false);
    });

    test.each(EXPECTED_PATHS)('2c. path "%s" 的 type / default / enum 在兩 schema 100% 一致', (pathName) => {
      const wp = waitingFamilySchema.path(pathName);
      const vp = visitFamilySchema.path(pathName);

      expect(wp).toBeDefined();
      expect(vp).toBeDefined();

      // instance（type，如 String / Number / Boolean）
      expect(wp.instance).toBe(vp.instance);

      // default
      const wDefault = wp.defaultValue;
      const vDefault = vp.defaultValue;
      expect(wDefault).toEqual(vDefault);

      // enum（如果有）
      const wEnum = wp.enumValues || (wp.options && wp.options.enum);
      const vEnum = vp.enumValues || (vp.options && vp.options.enum);
      expect(wEnum).toEqual(vEnum);
    });
  });

  // === Case 3：default check — 沒填 address 預設 '' 不是 '臨時地址' ===
  describe('3. default check — address default 應為 \'\'', () => {
    test('3a. 家人不填 address → 預設值 === \'\' （waiting-record）', () => {
      const record = new WaitingRecord({
        queueNumber: 1,
        name: '主客',
        phone: '0912345678',
        gender: 'male',
        addresses: [{ address: '主客地址', addressType: 'home' }],
        familyMembers: [{
          name: '沒地址家人',
          gender: 'male'
          // 故意不填 address / addressType
        }],
        consultationTopics: ['body']
      });

      const validateErr = record.validateSync();
      expect(validateErr).toBeUndefined();

      const fm = record.familyMembers[0].toObject();
      expect(fm.address).toBe('');
      expect(fm.address).not.toBe('臨時地址');
      expect(fm.addressType).toBe('home'); // 也要驗 default
    });

    test('3b. 主客戶 address 不填 → addressSchema default === \'\' （不是 \'臨時地址\'）', () => {
      const record = new WaitingRecord({
        queueNumber: 1,
        name: '主客',
        phone: '0912345678',
        gender: 'male',
        addresses: [{ /* 不填 address */ addressType: 'home' }],
        familyMembers: [],
        consultationTopics: ['body']
      });

      const validateErr = record.validateSync();
      expect(validateErr).toBeUndefined();

      const addr = record.addresses[0].toObject();
      expect(addr.address).toBe('');
      expect(addr.address).not.toBe('臨時地址');
    });

    test('3c. visit-record 家人不填 address → 預設值 === \'\'', () => {
      // 直接用 sub-schema 建一個 sub-doc — mongoose 子 schema 不能單獨 new
      // 改用整個 VisitRecord 包起來 validate
      const visit = new VisitRecord({
        customerId: new mongoose.Types.ObjectId(),
        sessionDate: new Date(),
        familyMembers: [{
          name: '沒地址家人',
          gender: 'male'
        }]
      });

      const validateErr = visit.validateSync();
      expect(validateErr).toBeUndefined();

      const fm = visit.familyMembers[0].toObject();
      expect(fm.address).toBe('');
      expect(fm.address).not.toBe('臨時地址');
      // Phase 5 sub-agent review NICE-TO-HAVE：補 addressType default 驗證對齊 3a
      expect(fm.addressType).toBe('home');
    });
  });

  // === Case 4：歷史資料 read 不被影響 — default 只在 create/save 套用 ===
  describe('4. 歷史 \'臨時地址\' 資料 read 行為不變', () => {
    test('4a. 已存的舊文件 address === \'臨時地址\' → 讀回來仍是 \'臨時地址\' (default 不覆寫已有值)', () => {
      // 模擬從 DB 讀到一個帶 '臨時地址' 的歷史 record（這是 Change B 改 default 前留下的資料）
      // 用 hydrate API（mongoose 把 raw object 包成 mongoose doc 但不觸發 setter/default）
      const legacyRaw = {
        queueNumber: 99,
        name: '舊客戶',
        phone: '0900000000',
        gender: 'male',
        addresses: [{ address: '臨時地址', addressType: 'home' }],
        familyMembers: [{
          name: '舊家人',
          gender: 'female',
          address: '臨時地址',
          addressType: 'home'
        }],
        consultationTopics: ['body']
      };

      const hydrated = WaitingRecord.hydrate(legacyRaw);

      // 歷史 '臨時地址' 字串應原封不動保留（mongoose 讀時不套 default）
      expect(hydrated.addresses[0].address).toBe('臨時地址');
      expect(hydrated.familyMembers[0].address).toBe('臨時地址');
    });

    test('4b. new WaitingRecord 帶現存 \'臨時地址\' 字串 → 也不會被 default 覆寫', () => {
      // 邊界 case：就算用 new Document() 建立，已 explicit 給 '臨時地址' 的值
      // mongoose default 也不會去覆蓋掉「使用者明確給的值」
      const record = new WaitingRecord({
        queueNumber: 100,
        name: '邊界客戶',
        phone: '0900000001',
        gender: 'male',
        addresses: [{ address: '臨時地址', addressType: 'home' }],
        familyMembers: [{
          name: '邊界家人',
          gender: 'male',
          address: '臨時地址',
          addressType: 'home'
        }],
        consultationTopics: ['body']
      });

      expect(record.addresses[0].address).toBe('臨時地址');
      expect(record.familyMembers[0].address).toBe('臨時地址');
    });
  });
});
