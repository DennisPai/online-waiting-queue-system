/**
 * Queue admin controller 測試
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/models/system-setting.model');
jest.mock('../src/utils/orderIndex', () => ({
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

const WaitingRecord = require('../src/models/waiting-record.model');
const SystemSetting = require('../src/models/system-setting.model');
const queueAdminController = require('../src/controllers/admin/queue.admin.controller');

const mockReq = (body = {}, params = {}, query = {}) => ({ body, params, query, user: { id: 'admin1' } });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Queue Admin Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getQueueList', () => {
    test('無過濾條件應回傳 waiting+processing 記錄', async () => {
      WaitingRecord.aggregate.mockResolvedValue([{ queueNumber: 1 }]);
      WaitingRecord.countDocuments.mockResolvedValue(1);
      const req = mockReq({}, {}, {});
      const res = mockRes();

      await queueAdminController.getQueueList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.records).toHaveLength(1);
    });
  });

  describe('callNext', () => {
    test('無候位客戶應回 404', async () => {
      WaitingRecord.findOne.mockResolvedValue(null);
      const req = mockReq();
      const res = mockRes();

      await queueAdminController.callNext(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('成功叫號應標記完成並回傳', async () => {
      const mockRecord = {
        _id: 'rec1',
        queueNumber: 5,
        name: '張三',
        status: 'waiting',
        orderIndex: 1,
        save: jest.fn().mockResolvedValue(true)
      };
      const mockSettings = {
        save: jest.fn().mockResolvedValue(true),
        currentQueueNumber: 0
      };

      WaitingRecord.findOne
        .mockResolvedValueOnce(mockRecord) // first call: find orderIndex=1
        .mockResolvedValueOnce(null); // second call: find new first
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      WaitingRecord.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const req = mockReq();
      const res = mockRes();

      await queueAdminController.callNext(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRecord.status).toBe('completed');
      expect(mockRecord.completedAt).toBeDefined();
      expect(mockSettings.currentQueueNumber).toBe(5);
    });
  });

  describe('updateQueueStatus', () => {
    test('無效狀態應回 400', async () => {
      const req = mockReq({ status: 'invalid' }, { queueId: '123' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('找不到記錄應回 404', async () => {
      WaitingRecord.findById.mockResolvedValue(null);
      const req = mockReq({ status: 'completed' }, { queueId: '123' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('成功更新狀態', async () => {
      const mockRecord = {
        status: 'waiting',
        save: jest.fn().mockResolvedValue(true)
      };
      WaitingRecord.findById.mockResolvedValue(mockRecord);
      const req = mockReq({ status: 'cancelled' }, { queueId: '123' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRecord.status).toBe('cancelled');
    });
  });

  describe('deleteCustomer', () => {
    test('找不到記錄應回 404', async () => {
      WaitingRecord.findById.mockResolvedValue(null);
      const req = mockReq({}, { queueId: 'nonexist' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('成功刪除客戶', async () => {
      WaitingRecord.findById.mockResolvedValue({
        queueNumber: 10,
        name: '李四',
        phone: '0912345678',
        orderIndex: 3
      });
      WaitingRecord.findByIdAndDelete.mockResolvedValue(true);
      WaitingRecord.updateMany.mockResolvedValue({ modifiedCount: 2 });
      const req = mockReq({}, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.deletedCustomer.name).toBe('李四');
    });
  });

  describe('clearAllQueue', () => {
    test('成功清除所有候位資料', async () => {
      WaitingRecord.countDocuments.mockResolvedValue(15);
      WaitingRecord.deleteMany.mockResolvedValue({ deletedCount: 15 });
      const mockSettings = {
        save: jest.fn().mockResolvedValue(true),
        currentQueueNumber: 10,
        maxOrderIndex: 100
      };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq();
      const res = mockRes();

      await queueAdminController.clearAllQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSettings.currentQueueNumber).toBe(0);
      expect(res.json.mock.calls[0][0].data.deletedCount).toBe(15);
    });
  });
});
