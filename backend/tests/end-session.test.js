/**
 * end-session.test.js
 * 測試「結束本期」API 的核心邏輯（mock models，不連真實 DB）
 * 注意：新版不使用 transaction/session（Zeabur 單節點不支援）
 */

// Mock WaitingRecord
jest.mock('../src/models/waiting-record.model', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn()
}));

// Mock SystemSetting
jest.mock('../src/models/system-setting.model', () => ({
  getSettings: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

// Mock Customer
jest.mock('../src/models/customer.model', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn()
}));

// Mock VisitRecord
jest.mock('../src/models/visit-record.model', () => ({
  create: jest.fn()
}));

// Mock Household
jest.mock('../src/models/household.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

const WaitingRecord = require('../src/models/waiting-record.model');
const SystemSetting = require('../src/models/system-setting.model');
const Customer = require('../src/models/customer.model');
const VisitRecord = require('../src/models/visit-record.model');
const Household = require('../src/models/household.model');
const { endSession } = require('../src/controllers/admin/end-session.admin.controller');

// Make a fake Customer doc (simulates mongoose doc with save())
const makeCustDoc = (id, overrides = {}) => ({
  _id: id,
  name: 'test',
  totalVisits: 1,
  lastVisitDate: new Date(),
  phone: '',
  zodiac: null,
  addresses: [],
  householdId: null,
  save: jest.fn().mockResolvedValue(true),
  ...overrides
});

describe('結束本期 API', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // 預設：無記錄（各測試自己設定）
    WaitingRecord.countDocuments.mockResolvedValue(0);
    WaitingRecord.find.mockResolvedValue([]);
    WaitingRecord.deleteMany.mockResolvedValue({});
    SystemSetting.getSettings.mockResolvedValue({ nextSessionDate: '2026-03-01T00:00:00.000Z' });
    SystemSetting.findOneAndUpdate.mockResolvedValue({});
    Customer.updateMany.mockResolvedValue({});
    // Customer.find().select() chain → 預設回傳空陣列
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    Household.findOne.mockResolvedValue(null);
    Household.create.mockResolvedValue({ _id: 'hh1', memberIds: [], save: jest.fn() });
    VisitRecord.create.mockResolvedValue({});
  });

  test('4.5 - 空候位列表回傳 409', async () => {
    // countDocuments 預設已是 0
    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'CONFLICT'
    }));
  });

  test('4.1 - 正常流程：3 筆非取消，1 已取消', async () => {
    const records = [
      { _id: 'r1', name: '張三', phone: '0912', status: 'waiting', queueNumber: 1, zodiac: '龍', gender: 'male', addresses: [{ address: '台北市中正區', addressType: 'home' }], familyMembers: [], consultationTopics: ['body'], remarks: '' },
      { _id: 'r2', name: '李四', phone: '0913', status: 'waiting', queueNumber: 2, zodiac: '虎', gender: 'male', addresses: [{ address: '台北市大安區', addressType: 'home' }], familyMembers: [], consultationTopics: [], remarks: '' },
      { _id: 'r3', name: '王五', phone: '0914', status: 'completed', queueNumber: 3, zodiac: '鼠', gender: 'female', addresses: [{ address: '台北市中正區', addressType: 'home' }], familyMembers: [], consultationTopics: ['fate'], remarks: '備註' }
    ];
    WaitingRecord.find.mockResolvedValue(records);
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(3)  // recordCount（非取消）
      .mockResolvedValueOnce(1); // cancelledCount
    Customer.findOne.mockResolvedValue(null);
    let cnt = 0;
    Customer.create.mockImplementation(() => Promise.resolve(makeCustDoc(`c${cnt++}`)));
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0].data;
    expect(data.totalProcessed).toBe(3);
    expect(data.newCustomers).toBe(3);
    expect(data.returningCustomers).toBe(0);
    expect(data.skippedCancelled).toBe(1);
    // 確認先歸檔後才刪除
    const deleteOrder = WaitingRecord.deleteMany.mock.invocationCallOrder[0];
    const createOrder = Customer.create.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(deleteOrder);
  });

  test('4.1 - VisitRecord 正確建立（含 consultationTopics, queueNumber）', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    WaitingRecord.find.mockResolvedValue([
      { _id: 'r1', name: '甲', phone: '0912', status: 'waiting', queueNumber: 7, zodiac: '馬', gender: 'male', addresses: [], familyMembers: [], consultationTopics: ['body', 'fate'], remarks: '測試備註' }
    ]);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(makeCustDoc('c1'));

    await endSession(req, res);

    expect(VisitRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        queueNumber: 7,
        consultationTopics: ['body', 'fate'],
        remarks: '測試備註'
      })
    );
  });

  test('4.2 - 舊客：同名同農曆生日 → totalVisits +1', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    const existing = makeCustDoc('c_old', { totalVisits: 2, name: '張三', lunarBirthYear: 1990, lunarBirthMonth: 3, lunarBirthDay: 15 });
    WaitingRecord.find.mockResolvedValue([{
      _id: 'r1', name: '張三', phone: '0912', status: 'waiting', queueNumber: 1,
      lunarBirthYear: 1990, lunarBirthMonth: 3, lunarBirthDay: 15,
      zodiac: '馬', gender: 'male', addresses: [], familyMembers: [], consultationTopics: [], remarks: ''
    }]);
    Customer.findOne.mockResolvedValue(existing);
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await endSession(req, res);

    expect(existing.totalVisits).toBe(3);
    expect(existing.save).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.returningCustomers).toBe(1);
    expect(res.json.mock.calls[0][0].data.newCustomers).toBe(0);
  });

  test('4.2 - 新客：同名不同生日 → 建新客戶', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    WaitingRecord.find.mockResolvedValue([{
      _id: 'r1', name: '張三', phone: '0912', status: 'waiting', queueNumber: 1,
      lunarBirthYear: 1991, lunarBirthMonth: 5, lunarBirthDay: 10,
      zodiac: '羊', gender: 'male', addresses: [], familyMembers: [], consultationTopics: [], remarks: ''
    }]);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(makeCustDoc('c_new'));
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await endSession(req, res);

    expect(Customer.create).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.newCustomers).toBe(1);
  });

  test('4.3 - 主客戶帶 2 位家人 → 3 Customer + 3 VisitRecord', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    WaitingRecord.find.mockResolvedValue([{
      _id: 'r1', name: '主客', phone: '0912', status: 'waiting', queueNumber: 1,
      zodiac: '龍', gender: 'male', addresses: [{ address: '台北', addressType: 'home' }],
      familyMembers: [
        { name: '家人A', gender: 'female', zodiac: '蛇', address: '', lunarBirthYear: 1995, lunarBirthMonth: 1, lunarBirthDay: 1 },
        { name: '家人B', gender: 'male', zodiac: '馬', address: '', lunarBirthYear: 2000, lunarBirthMonth: 6, lunarBirthDay: 15 }
      ],
      consultationTopics: [], remarks: ''
    }]);
    Customer.findOne.mockResolvedValue(null);
    let cnt = 0;
    Customer.create.mockImplementation(() => Promise.resolve(makeCustDoc(`c${cnt++}`)));
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await endSession(req, res);

    expect(Customer.create).toHaveBeenCalledTimes(3);
    expect(VisitRecord.create).toHaveBeenCalledTimes(3);
    expect(res.json.mock.calls[0][0].data.newCustomers).toBe(3);
  });

  test('4.4 - 2 人同地址 → 建立 1 Household', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    const custA = makeCustDoc('custA', { addresses: [{ address: '台北市中正區1號', addressType: 'home' }] });
    const custB = makeCustDoc('custB', { addresses: [{ address: '台北市中正區1號', addressType: 'home' }] });
    WaitingRecord.find.mockResolvedValue([
      { _id: 'r1', name: '甲', phone: '0912', status: 'waiting', queueNumber: 1, addresses: [{ address: '台北市中正區1號', addressType: 'home' }], familyMembers: [], consultationTopics: [], remarks: '' },
      { _id: 'r2', name: '乙', phone: '0913', status: 'waiting', queueNumber: 2, addresses: [{ address: '台北市中正區1號', addressType: 'home' }], familyMembers: [], consultationTopics: [], remarks: '' }
    ]);
    Customer.findOne.mockResolvedValue(null);
    let cnt = 0;
    Customer.create.mockImplementation(() => Promise.resolve([custA, custB][cnt++]));
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([custA, custB]) });
    Household.findOne.mockResolvedValue(null);
    Household.create.mockResolvedValue({ _id: 'hh1', memberIds: [] });

    await endSession(req, res);

    expect(Household.create).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].data.newHouseholds).toBe(1);
  });

  test('4.4 - 單人地址 → 不建 Household', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    const custA = makeCustDoc('custA', { addresses: [{ address: '地址A', addressType: 'home' }] });
    WaitingRecord.find.mockResolvedValue([
      { _id: 'r1', name: '甲', phone: '0912', status: 'waiting', queueNumber: 1, addresses: [{ address: '地址A', addressType: 'home' }], familyMembers: [], consultationTopics: [], remarks: '' }
    ]);
    Customer.findOne.mockResolvedValue(null);
    Customer.create.mockResolvedValue(custA);
    Customer.find.mockReturnValue({ select: jest.fn().mockResolvedValue([custA]) });

    await endSession(req, res);

    expect(Household.create).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.newHouseholds).toBe(0);
  });

  test('4.5 - 重複點擊（候位已清空）回傳 409', async () => {
    // countDocuments 預設已是 0
    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('4.6 - clear-all 仍可使用（向下相容）', () => {
    const { clearAllQueue } = require('../src/controllers/admin/queue.admin.controller');
    expect(typeof clearAllQueue).toBe('function');
  });

  test('歸檔失敗時不刪除候位資料', async () => {
    WaitingRecord.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    WaitingRecord.find.mockResolvedValue([
      { _id: 'r1', name: '甲', phone: '0912', status: 'waiting', queueNumber: 1, addresses: [], familyMembers: [], consultationTopics: [], remarks: '' }
    ]);
    Customer.findOne.mockResolvedValue(null);
    // 模擬歸檔寫入失敗
    Customer.create.mockRejectedValue(new Error('DB write error'));

    await endSession(req, res);

    // deleteMany 不應被呼叫
    expect(WaitingRecord.deleteMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'INTERNAL_ERROR'
    }));
  });
});
