/**
 * queue.service.test.js
 * 測試 QueueService.registerQueue 的 Change A 修正邏輯：
 *  - 問題 2 / D8：issuedCount 原子閘門額滿控制
 *  - 問題 3 / D3：orderIndex 原子分配（allocateOrderIndex）
 *  - 問題 4 / D12：E11000 撞號 retry（上限 + 退避 + 補償）
 *
 * 沿用既有測試模式：mock models / repository / util，不連真實 DB。
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/models/system-setting.model');
jest.mock('../src/repositories/QueueRepository', () => ({
  create: jest.fn(),
  countActiveCustomers: jest.fn().mockResolvedValue(0),
  findRecordsAhead: jest.fn().mockResolvedValue([])
}));
jest.mock('../src/utils/orderIndex', () => ({
  allocateOrderIndex: jest.fn().mockResolvedValue(1000001),
  ensureOrderIndexConsistency: jest.fn().mockResolvedValue()
}));
jest.mock('../src/utils/calendarConverter', () => ({
  autoFillDates: jest.fn(d => d),
  autoFillFamilyMembersDates: jest.fn(d => d),
  addZodiac: jest.fn(d => d),
  addVirtualAge: jest.fn(d => d)
}));
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const SystemSetting = require('../src/models/system-setting.model');
const WaitingRecord = require('../src/models/waiting-record.model');
const queueRepository = require('../src/repositories/QueueRepository');
const { allocateOrderIndex } = require('../src/utils/orderIndex');
const queueService = require('../src/services/QueueService');

// 一筆合法報名資料
const validData = () => ({
  name: '王小明',
  phone: '0912345678',
  gender: 'male',
  addresses: [{ address: '台北市', addressType: 'home' }],
  familyMembers: [],
  consultationTopics: ['body']
});

// 模擬 repository.create 回傳的記錄
const createdRecord = (overrides = {}) => ({
  _id: 'newrec1',
  queueNumber: 1,
  orderIndex: 1000001,
  name: '王小明',
  phone: '0912345678',
  email: '',
  addresses: [{ address: '台北市', addressType: 'home' }],
  familyMembers: [],
  createdAt: new Date(),
  ...overrides
});

describe('QueueService.registerQueue — 問題 2/3/4 修正邏輯', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    allocateOrderIndex.mockResolvedValue(1000001);
    queueRepository.countActiveCustomers.mockResolvedValue(0);
    queueRepository.findRecordsAhead.mockResolvedValue([]);
    WaitingRecord.getNextQueueNumber.mockResolvedValue(1);
    WaitingRecord.findById.mockResolvedValue(createdRecord());
  });

  // === 問題 2 / D8：issuedCount 原子閘門 ===

  test('D8：報名第一步走 issuedCount 原子閘門（findOneAndUpdate $lt maxOrderIndex）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    await queueService.registerQueue(validData());

    // 閘門：條件 issuedCount < maxOrderIndex、動作 $inc issuedCount 1
    expect(SystemSetting.findOneAndUpdate).toHaveBeenCalledWith(
      { issuedCount: { $lt: 100 } },
      { $inc: { issuedCount: 1 } },
      { new: true }
    );
  });

  test('D8：閘門回傳 null（額滿）應丟出友善的「今日候位已滿」錯誤，不走 create', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 5, isQueueOpen: false });
    SystemSetting.findOneAndUpdate.mockResolvedValue(null); // 額滿

    await expect(queueService.registerQueue(validData())).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining('今日候位已滿')
    });
    // 額滿 → 根本走不到 create
    expect(queueRepository.create).not.toHaveBeenCalled();
  });

  test('D8：閘門通過應原子地佔到名額並完成報名', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    const result = await queueService.registerQueue(validData());

    expect(result).toMatchObject({ queueNumber: expect.any(Number) });
    expect(queueRepository.create).toHaveBeenCalled();
  });

  // === 問題 3 / D3：orderIndex 原子分配 ===

  test('D3：新報名用 allocateOrderIndex() 原子發號，不用「讀 max +1」', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    await queueService.registerQueue(validData());

    expect(allocateOrderIndex).toHaveBeenCalled();
    // create 收到的 orderIndex 必須是發號值
    expect(queueRepository.create.mock.calls[0][0].orderIndex).toBe(1000001);
  });

  test('問題 3：報名成功後呼叫 ensureOrderIndexConsistency 壓回連續 1..N', async () => {
    const { ensureOrderIndexConsistency } = require('../src/utils/orderIndex');
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    await queueService.registerQueue(validData());

    expect(ensureOrderIndexConsistency).toHaveBeenCalled();
  });

  // === 問題 4 / D12：E11000 撞號 retry + 補償 ===

  test('D12：create 撞號（E11000）一次後成功應 retry 並完成報名', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, issuedCount: 1, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    const dupErr = new Error('dup'); dupErr.code = 11000;
    queueRepository.create
      .mockRejectedValueOnce(dupErr)             // 第 1 次撞號
      .mockResolvedValueOnce(createdRecord());   // retry 後成功

    const result = await queueService.registerQueue(validData());

    expect(result).toMatchObject({ queueNumber: expect.any(Number) });
    expect(queueRepository.create).toHaveBeenCalledTimes(2);
  }, 10000);

  test('D12：撞號 retry 用盡（4 次皆 E11000）應回友善訊息「報名人數眾多」', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, issuedCount: 1, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    SystemSetting.updateOne.mockResolvedValue({});
    const dupErr = new Error('dup'); dupErr.code = 11000;
    queueRepository.create.mockRejectedValue(dupErr);

    await expect(queueService.registerQueue(validData())).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('報名人數眾多')
    });
    // 首次 + 3 retry = 4 次嘗試（REGISTER_MAX_RETRY=3）
    expect(queueRepository.create).toHaveBeenCalledTimes(4);
  }, 15000);

  test('D12 (e)：報名最終失敗應補償 issuedCount $inc -1（名額不被吃掉）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, issuedCount: 1, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    SystemSetting.updateOne.mockResolvedValue({});
    const dupErr = new Error('dup'); dupErr.code = 11000;
    queueRepository.create.mockRejectedValue(dupErr);

    await expect(queueService.registerQueue(validData())).rejects.toBeDefined();

    // 補償：閘門已 $inc 的名額補回 $inc -1
    expect(SystemSetting.updateOne).toHaveBeenCalledWith({}, { $inc: { issuedCount: -1 } });
  }, 15000);

  test('D12：非 11000 錯誤不 retry，直接往外拋並補償名額', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    SystemSetting.updateOne.mockResolvedValue({});
    const otherErr = new Error('某種非撞號錯誤');
    queueRepository.create.mockRejectedValue(otherErr);

    await expect(queueService.registerQueue(validData())).rejects.toThrow('某種非撞號錯誤');
    // 非 11000 → 只嘗試一次，不 retry
    expect(queueRepository.create).toHaveBeenCalledTimes(1);
    // 仍要補償名額
    expect(SystemSetting.updateOne).toHaveBeenCalledWith({}, { $inc: { issuedCount: -1 } });
  });

  test('問題 2：非簡化模式缺必填欄位應在閘門前被擋（不白佔名額）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: false, maxOrderIndex: 100, isQueueOpen: false });

    await expect(queueService.registerQueue({ phone: '0912' })).rejects.toMatchObject({
      statusCode: 400
    });
    // 驗證在閘門前 → 不應佔名額
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // === Change B / Task 4.1.1：家人 address 端到端寫入驗證 ===
  // 驗證點：registerQueue 接收前端送來的家人物件（純量 address）後，
  // QueueService.processFamilyMembers + queueRepository.create 傳給
  // mongoose 的 payload，familyMembers[0].address 是否真的帶到。
  // 用 queueRepository.create.mock.calls[0][0] 看 payload。

  test('Change B 4.1.1(a)：報名時帶完整家人含 address → create payload 完整保留 address', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    const data = {
      name: '王大頭',
      phone: '0912345678',
      gender: 'male',
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body'],
      familyMembers: [{
        name: '王小弟',
        gender: 'male',
        address: '家人地址1',
        addressType: 'home',
        gregorianBirthYear: 90,
        gregorianBirthMonth: 6,
        gregorianBirthDay: 15
      }]
    };

    await queueService.registerQueue(data);

    // create 收到的 payload 必須完整保留家人 address
    const payload = queueRepository.create.mock.calls[0][0];
    expect(payload.familyMembers).toHaveLength(1);
    expect(payload.familyMembers[0]).toMatchObject({
      name: '王小弟',
      gender: 'male',
      address: '家人地址1',
      addressType: 'home'
    });
    // 確認不是 fallback 「臨時地址」或 undefined
    expect(payload.familyMembers[0].address).toBe('家人地址1');
    expect(payload.familyMembers[0].address).not.toBe('臨時地址');
  });

  // === Follow-up patch #3（OpenSpec 2026-05-23-followup-patches D3）：lunar 三欄位必填驗證 ===
  // validateRequiredFields 在非簡化模式下會擋下缺 lunarBirth* 的請求。
  // 簡化模式仍 skip（保持既有行為，懷特沒要求簡化模式也必填）。

  test('Follow-up #3：非簡化模式缺 lunarBirthYear → 回 400 友善錯誤（請輸入農曆生日年份）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: false, maxOrderIndex: 100, isQueueOpen: false });

    // 帶完整 name/phone + lunarMonth/Day 但缺 lunarYear
    const data = {
      name: '王小明',
      phone: '0912345678',
      gender: 'male',
      lunarBirthMonth: 1,
      lunarBirthDay: 15,
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body']
    };

    await expect(queueService.registerQueue(data)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('農曆生日年份')
    });
    // 驗證在閘門前 → 不應佔名額
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('Follow-up #3：非簡化模式缺 lunarBirthDay → 回 400 友善錯誤（請輸入農曆生日日期）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: false, maxOrderIndex: 100, isQueueOpen: false });

    const data = {
      name: '王小明',
      phone: '0912345678',
      gender: 'male',
      lunarBirthYear: 80,
      lunarBirthMonth: 1,
      // 故意不帶 lunarBirthDay
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body']
    };

    await expect(queueService.registerQueue(data)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('農曆生日日期')
    });
    expect(SystemSetting.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('Follow-up #3：簡化模式缺 lunar 三欄位 → 仍接受報名（簡化模式 skip 驗證，既有行為保留）', async () => {
    // 簡化模式 = true → registerQueue line 37 `if (!settings.simplifiedMode)` 短路、
    // validateRequiredFields 根本不被呼叫，缺 lunar 不擋
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    // 完全不帶 lunar 三欄位
    const data = {
      name: '王小明',
      phone: '0912345678',
      gender: 'male',
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body']
    };

    const result = await queueService.registerQueue(data);

    expect(result).toMatchObject({ queueNumber: expect.any(Number) });
    expect(SystemSetting.findOneAndUpdate).toHaveBeenCalled();
    expect(queueRepository.create).toHaveBeenCalled();
  });

  test('Change B 4.1.1(b)：報名時帶家人不填 address → create payload address === \'\' （不是 \'臨時地址\'）', async () => {
    SystemSetting.getSettings.mockResolvedValue({ simplifiedMode: true, maxOrderIndex: 100, isQueueOpen: false, minutesPerCustomer: 13, nextSessionDate: new Date('2026-06-01T00:00:00Z') });
    SystemSetting.findOneAndUpdate.mockResolvedValue({ issuedCount: 1, maxOrderIndex: 100 });
    queueRepository.create.mockResolvedValue(createdRecord());

    const data = {
      name: '王大頭',
      phone: '0912345678',
      gender: 'male',
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body'],
      familyMembers: [{
        name: '王沒地址',
        gender: 'female'
        // 故意不帶 address / addressType
      }]
    };

    await queueService.registerQueue(data);

    const payload = queueRepository.create.mock.calls[0][0];
    expect(payload.familyMembers).toHaveLength(1);
    // Change B Phase 3：QueueService.processFamilyMembers 把缺 address 的家人補 ''
    // 不是補 '臨時地址'。schema default 也已改 ''。
    expect(payload.familyMembers[0].address).toBe('');
    expect(payload.familyMembers[0].address).not.toBe('臨時地址');
    expect(payload.familyMembers[0].addressType).toBe('home'); // default
  });
});
