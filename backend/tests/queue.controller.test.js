/**
 * queue.controller.test.js
 * 測試公開候位 API 控制器 —— 重點覆蓋 Change A 問題 1：
 * 取消候位改用 _id 定位 + 姓名/電話身分驗證（design.md D1）。
 *
 * 沿用既有測試模式：mock models / service，不連真實 DB。
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/models/system-setting.model');
jest.mock('../src/services/QueueService', () => ({
  registerQueue: jest.fn(),
  getQueueList: jest.fn(),
  getQueueStatus: jest.fn(),
  searchQueueByNameAndPhone: jest.fn()
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

const WaitingRecord = require('../src/models/waiting-record.model');
const queueController = require('../src/controllers/queue.controller');

// catchAsync 包裝後的 handler：呼叫並把 next 的 error 攤平回傳，方便斷言。
const mockReq = (body = {}, params = {}, query = {}) => ({ body, params, query });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// catchAsync 會把 throw 的 ApiError 丟給 next，這裡收集起來供斷言
const runHandler = async (handler, req, res) => {
  let nextErr = null;
  await handler(req, res, (err) => { nextErr = err; });
  return nextErr;
};

describe('Queue Controller — 取消候位（問題 1 / D1）', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('cancelQueueByCustomer', () => {
    test('未提供 id 應回 400', async () => {
      const req = mockReq({ name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toContain('識別碼');
    });

    test('未提供姓名或電話應回 400（身分驗證必填）', async () => {
      const req = mockReq({ id: 'rec1' }); // 缺 name/phone
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toContain('身分');
    });

    test('查無此 _id 記錄應回 404', async () => {
      WaitingRecord.findById.mockResolvedValue(null);
      const req = mockReq({ id: 'rec_notexist', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('不合法的 _id（CastError）應視為查無記錄回 404', async () => {
      const castErr = new Error('Cast to ObjectId failed');
      castErr.name = 'CastError';
      WaitingRecord.findById.mockRejectedValue(castErr);
      const req = mockReq({ id: 'bad-id', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    // D1 核心：身分驗證 —— 姓名/電話不符應被拒絕（不會取消到別人）。
    test('姓名不符應回 403 被拒絕', async () => {
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'waiting',
        save: jest.fn()
      });
      const req = mockReq({ id: 'rec1', name: '李四', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].message).toContain('不符');
    });

    test('電話不符應回 403 被拒絕', async () => {
      const save = jest.fn();
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'waiting', save
      });
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0900000000' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      // 身分不符 → 絕不能改動記錄
      expect(save).not.toHaveBeenCalled();
    });

    // D1 核心：姓名+電話皆相符 → 成功取消。
    test('姓名+電話皆相符應成功取消（status→cancelled）', async () => {
      const save = jest.fn().mockResolvedValue(true);
      const record = {
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'waiting', save
      };
      WaitingRecord.findById.mockResolvedValue(record);
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(record.status).toBe('cancelled');
      expect(save).toHaveBeenCalled();
    });

    // === Phase 6.4 後續修補（design.md D13）：客戶端取消也須設 orderIndex = null ===
    // 與 admin 端 updateQueueStatus 對齊。原本只有 admin 路徑有設 null，
    // 客戶端取消漏設 → 留下髒舊值會在日後恢復報名時被帶回。
    test('成功取消時應把 orderIndex 設為 null（D13）', async () => {
      const save = jest.fn().mockResolvedValue(true);
      const record = {
        _id: 'rec1', name: '張三', phone: '0912345678',
        status: 'waiting', orderIndex: 53, save
      };
      WaitingRecord.findById.mockResolvedValue(record);
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(record.status).toBe('cancelled');
      expect(record.orderIndex).toBeNull();
      expect(save).toHaveBeenCalled();
    });

    // D1：姓名/電話含前後空白應被 trim 後比對 —— 仍視為相符。
    test('姓名/電話含前後空白經 trim 後相符應成功取消', async () => {
      const save = jest.fn().mockResolvedValue(true);
      const record = {
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'waiting', save
      };
      WaitingRecord.findById.mockResolvedValue(record);
      const req = mockReq({ id: 'rec1', name: '  張三 ', phone: ' 0912345678 ' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(record.status).toBe('cancelled');
    });

    test('已取消的候位應回 400', async () => {
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'cancelled',
        save: jest.fn()
      });
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toContain('已被取消');
    });

    test('已完成的候位應回 400', async () => {
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'completed',
        save: jest.fn()
      });
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toContain('已完成');
    });

    // === Follow-up patch #2（OpenSpec 2026-05-23-followup-patches D2）：cancel response 不含 mongoose 內部 ===
    // controller 改用 `record.toObject()` 而非 mongoose document 丟給 res.json，
    // 確保對外 API contract 是純客戶資料欄位（不噴 $__/_doc/activePaths）。

    test('Follow-up #2：成功取消時 response data 來自 record.toObject() 不含 mongoose 內部欄位', async () => {
      const save = jest.fn().mockResolvedValue(true);
      // mock toObject 回傳乾淨的 plain object（mongoose 真實行為）
      const toObject = jest.fn().mockReturnValue({
        _id: 'rec1',
        name: '張三',
        phone: '0912345678',
        status: 'cancelled',
        orderIndex: null,
        queueNumber: 5
      });
      // 故意在 record 上掛 mongoose-like 內部欄位驗證它們不會漏進 response
      const record = {
        _id: 'rec1',
        name: '張三',
        phone: '0912345678',
        status: 'waiting',
        orderIndex: 5,
        save,
        toObject,
        $__: { activePaths: { states: {} } },
        _doc: { _id: 'rec1', name: '張三' },
        $isNew: false
      };
      WaitingRecord.findById.mockResolvedValue(record);
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      // toObject 必須被呼叫（D2 要求）
      expect(toObject).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      // response data 必須是 toObject 的回傳值、不含 mongoose 內部欄位
      const responsePayload = res.json.mock.calls[0][0];
      expect(responsePayload.success).toBe(true);
      expect(responsePayload.data).toBeDefined();
      // 純資料欄位有
      expect(responsePayload.data._id).toBe('rec1');
      expect(responsePayload.data.name).toBe('張三');
      expect(responsePayload.data.status).toBe('cancelled');
      // mongoose 內部欄位絕不能出現
      expect(responsePayload.data.$__).toBeUndefined();
      expect(responsePayload.data._doc).toBeUndefined();
      expect(responsePayload.data.activePaths).toBeUndefined();
      expect(responsePayload.data.$isNew).toBeUndefined();
    });

    // D1：取消用 _id 定位（findById），不用會漂移的 queueNumber（findOne）。
    test('取消是用 _id 定位（findById），不用 queueNumber（findOne）', async () => {
      const save = jest.fn().mockResolvedValue(true);
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', name: '張三', phone: '0912345678', status: 'waiting', save
      });
      const req = mockReq({ id: 'rec1', name: '張三', phone: '0912345678' });
      const res = mockRes();

      await runHandler(queueController.cancelQueueByCustomer, req, res);

      expect(WaitingRecord.findById).toHaveBeenCalledWith('rec1');
      // 不得用 queueNumber 走 findOne 定位
      expect(WaitingRecord.findOne).not.toHaveBeenCalled();
    });
  });
});
