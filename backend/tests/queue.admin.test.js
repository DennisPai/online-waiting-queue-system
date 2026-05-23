/**
 * Queue admin controller 測試
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/models/system-setting.model');
jest.mock('../src/utils/orderIndex', () => ({
  ensureOrderIndexConsistency: jest.fn().mockResolvedValue(),
  allocateOrderIndex: jest.fn().mockResolvedValue(1000001)
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

      const req = mockReq();
      const res = mockRes();

      await queueAdminController.callNext(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRecord.status).toBe('completed');
      expect(mockRecord.completedAt).toBeDefined();
      expect(mockSettings.currentQueueNumber).toBe(5);
    });

    // Phase 4 / Task 4.5（D11）：callNext 不再用 updateMany $inc -1 全體平移，
    // 第一筆轉 completed 後 orderIndex 設為 null（離開 partial unique index 約束）。
    test('叫號不用 updateMany 平移，第一筆 orderIndex 設為 null（D11）', async () => {
      const mockRecord = {
        _id: 'rec1',
        queueNumber: 5,
        name: '張三',
        status: 'waiting',
        orderIndex: 1,
        save: jest.fn().mockResolvedValue(true)
      };
      WaitingRecord.findOne
        .mockResolvedValueOnce(mockRecord)
        .mockResolvedValueOnce(null);
      SystemSetting.getSettings.mockResolvedValue({ save: jest.fn().mockResolvedValue(true), currentQueueNumber: 0 });

      const req = mockReq();
      const res = mockRes();

      await queueAdminController.callNext(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRecord.orderIndex).toBeNull();
      // D11：不再呼叫 updateMany 全體平移
      expect(WaitingRecord.updateMany).not.toHaveBeenCalled();
    });

    // Phase 4 / Task 4.6（D9）：撞號（E11000）回 409 友善訊息，不裸吐 500。
    test('叫號撞號（E11000）應回 409 友善訊息', async () => {
      const err = new Error('dup'); err.code = 11000;
      const mockRecord = {
        _id: 'rec1', queueNumber: 5, name: '張三', status: 'waiting', orderIndex: 1,
        save: jest.fn().mockRejectedValue(err)
      };
      WaitingRecord.findOne.mockResolvedValueOnce(mockRecord);
      SystemSetting.getSettings.mockResolvedValue({ save: jest.fn(), currentQueueNumber: 0 });

      const req = mockReq();
      const res = mockRes();

      await queueAdminController.callNext(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('排序衝突');
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

    // Phase 3 / Task 3.2c（D13）：取消時把 orderIndex 設為 null，杜絕髒舊值
    test('取消候位應把 orderIndex 設為 null（D13）', async () => {
      const mockRecord = {
        _id: 'rec1',
        status: 'waiting',
        orderIndex: 3,
        save: jest.fn().mockResolvedValue(true)
      };
      WaitingRecord.findById.mockResolvedValue(mockRecord);
      const req = mockReq({ status: 'cancelled' }, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRecord.status).toBe('cancelled');
      expect(mockRecord.orderIndex).toBeNull();
    });

    // Phase 3 / Task 3.1 + 3.2 + 3.2c（D13）：恢復報名先原子發號、後改 status，並補一致性重算
    test('恢復報名（cancelled→waiting）應原子發號並補一致性重算', async () => {
      const { allocateOrderIndex, ensureOrderIndexConsistency } = require('../src/utils/orderIndex');
      const mockRecord = {
        _id: 'rec2',
        status: 'cancelled',
        orderIndex: null,
        save: jest.fn().mockResolvedValue(true)
      };
      // 第一次 findById 取記錄；恢復路徑末尾會再 findById 取壓回後的記錄
      WaitingRecord.findById
        .mockResolvedValueOnce(mockRecord)
        .mockResolvedValueOnce({ _id: 'rec2', status: 'waiting', orderIndex: 5, queueNumber: 5 });
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });

      const req = mockReq({ status: 'waiting' }, { queueId: 'rec2' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // 原子發號被呼叫，且 orderIndex 在改 status 前已是發號值
      expect(allocateOrderIndex).toHaveBeenCalled();
      expect(mockRecord.status).toBe('waiting');
      // 恢復報名補呼叫一致性重算
      expect(ensureOrderIndexConsistency).toHaveBeenCalled();
    });

    // Phase 3 / Task 3.2c（D13）：恢復報名「先發 orderIndex、後改 status」順序驗證。
    // 必須在改 status 前 orderIndex 已是乾淨的發號值，否則記錄會帶舊髒值瞬間
    // 進入 partial unique index 約束範圍。
    test('恢復報名 orderIndex 在改 status 成 waiting 前已是發號值（D13 順序）', async () => {
      const { allocateOrderIndex } = require('../src/utils/orderIndex');
      allocateOrderIndex.mockResolvedValueOnce(1000042);
      let orderIndexWhenStatusBecameWaiting = 'unset';
      const mockRecord = {
        _id: 'rec3',
        status: 'cancelled',
        orderIndex: null,
        save: jest.fn().mockImplementation(function () {
          if (this.status === 'waiting' && orderIndexWhenStatusBecameWaiting === 'unset') {
            orderIndexWhenStatusBecameWaiting = this.orderIndex;
          }
          return Promise.resolve(true);
        })
      };
      WaitingRecord.findById
        .mockResolvedValueOnce(mockRecord)
        .mockResolvedValueOnce({ _id: 'rec3', status: 'waiting', orderIndex: 6, queueNumber: 6 });
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });

      const req = mockReq({ status: 'waiting' }, { queueId: 'rec3' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // save 時 status 已是 waiting，orderIndex 必須已是發號值（非 null 髒值）
      expect(orderIndexWhenStatusBecameWaiting).toBe(1000042);
    });

    // Phase 4 / Task 4.6（D9）：updateQueueStatus 撞號（E11000）回 409 友善訊息。
    test('更新狀態撞號（E11000）應回 409 友善訊息', async () => {
      const err = new Error('dup'); err.code = 11000;
      const mockRecord = {
        _id: 'rec1', status: 'waiting', orderIndex: 2,
        save: jest.fn().mockRejectedValue(err)
      };
      WaitingRecord.findById.mockResolvedValue(mockRecord);
      const req = mockReq({ status: 'processing' }, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.updateQueueStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('排序衝突');
    });
  });

  describe('updateQueueData', () => {
    test('找不到記錄應回 404', async () => {
      WaitingRecord.findById.mockResolvedValue(null);
      const req = mockReq({ name: '改名' }, { queueId: 'nonexist' });
      const res = mockRes();

      await queueAdminController.updateQueueData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    // Phase 1 / Task 1.4 + 1.5（G7）：撞號（11000）回 409 友善訊息，
    // 且 catch 不再 dropIndex、不再因引用 block-scope record 丟 ReferenceError。
    test('更新客戶資料撞號（11000）回 409 友善訊息、不丟 ReferenceError、不 dropIndex', async () => {
      const err = new Error('dup'); err.code = 11000;
      const mockRecord = {
        _id: 'rec1', status: 'waiting',
        save: jest.fn().mockRejectedValue(err)
      };
      WaitingRecord.findById.mockResolvedValue(mockRecord);
      const req = mockReq({ name: '新名字' }, { queueId: 'rec1' });
      const res = mockRes();

      // G7：監看 collection.dropIndex —— 確認 catch 不再自動拆 index
      const dropIndexSpy = jest.fn();
      WaitingRecord.collection = { dropIndex: dropIndexSpy };

      // 不應丟出（舊 catch 引用 block-scope record 會丟 ReferenceError）
      await expect(queueAdminController.updateQueueData(req, res)).resolves.not.toThrow();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('候位號碼重複');
      // G7：catch 不再有自動 dropIndex 邏輯（dropIndex 完全不被呼叫）
      expect(dropIndexSpy).not.toHaveBeenCalled();
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
      SystemSetting.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const req = mockReq({}, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].data.deletedCustomer.name).toBe('李四');
    });

    // Phase 4.5 併修（D11，懷特 2026-05-22 核可）：deleteCustomer 不用
    // updateMany $inc -1 全體平移；其餘記錄 orderIndex 不動，留空洞交給
    // ensureOrderIndexConsistency() 壓回。
    test('刪除客戶不用 updateMany 全體平移，交給 ensureOrderIndexConsistency 壓回（D11 併修）', async () => {
      const { ensureOrderIndexConsistency } = require('../src/utils/orderIndex');
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', queueNumber: 10, name: '李四', phone: '0912345678', orderIndex: 3
      });
      WaitingRecord.findByIdAndDelete.mockResolvedValue(true);
      SystemSetting.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const req = mockReq({}, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // D11 併修：不再呼叫 updateMany 對 orderIndex 做全體 $inc -1 平移
      expect(WaitingRecord.updateMany).not.toHaveBeenCalled();
      // 連續 1..N 由 ensureOrderIndexConsistency() 壓回
      expect(ensureOrderIndexConsistency).toHaveBeenCalled();
    });

    // Phase 2 / Task 2.4（D8）：刪除是唯一允許 issuedCount 下降的情況 —— 釋出名額。
    test('刪除客戶應對 issuedCount $inc -1 釋出名額（D8/2.4）', async () => {
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', queueNumber: 10, name: '李四', phone: '0912345678', orderIndex: 3
      });
      WaitingRecord.findByIdAndDelete.mockResolvedValue(true);
      SystemSetting.updateOne.mockResolvedValue({ modifiedCount: 1 });
      const req = mockReq({}, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // issuedCount $inc -1，且加 issuedCount>0 條件不會變負數
      expect(SystemSetting.updateOne).toHaveBeenCalledWith(
        { issuedCount: { $gt: 0 } },
        { $inc: { issuedCount: -1 } }
      );
    });

    // Phase 4 / Task 4.6（D9）：刪除撞號（E11000）回 409 友善訊息，不裸吐 500。
    test('刪除撞號（E11000）應回 409 友善訊息', async () => {
      const err = new Error('dup'); err.code = 11000;
      const { ensureOrderIndexConsistency } = require('../src/utils/orderIndex');
      WaitingRecord.findById.mockResolvedValue({
        _id: 'rec1', queueNumber: 10, name: '李四', phone: '0912345678', orderIndex: 3
      });
      WaitingRecord.findByIdAndDelete.mockResolvedValue(true);
      ensureOrderIndexConsistency.mockRejectedValueOnce(err);
      const req = mockReq({}, { queueId: 'rec1' });
      const res = mockRes();

      await queueAdminController.deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('排序衝突');
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

  describe('reorderQueue', () => {
    // 把 WaitingRecord.find 設成回傳指定的 active 記錄（select 後鏈式呼叫）
    const mockActiveFind = (records) => {
      WaitingRecord.find.mockImplementation(() => {
        const chain = {
          select: jest.fn().mockResolvedValue(records),
          sort: jest.fn().mockResolvedValue(records)
        };
        return chain;
      });
    };

    test('orderedIds 非陣列應回 400', async () => {
      const req = mockReq({ orderedIds: 'not-array' });
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    // Phase 4 / Task 4.2（D5）：id 數量與 DB active 記錄不符應拒絕
    test('id 數量與 DB active 記錄不符應回 409（D5）', async () => {
      mockActiveFind([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
      const req = mockReq({ orderedIds: ['a', 'b'] }); // 少一筆
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('重新整理');
    });

    // Phase 4 / Task 4.2（D5）：id 內容與 DB active 記錄不符應拒絕
    test('id 內容與 DB active 記錄不符應回 409（D5）', async () => {
      mockActiveFind([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
      const req = mockReq({ orderedIds: ['a', 'b', 'x'] }); // x 不在 DB
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    // Phase 4 / Task 4.2：orderedIds 含重複項應回 400
    test('orderedIds 含重複項應回 400', async () => {
      mockActiveFind([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
      const req = mockReq({ orderedIds: ['a', 'a', 'b'] });
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    // Phase 4 / Task 4.4（D10）：合法 reorder 應做兩階段 offset 批量寫入
    test('合法 reorder 應做兩階段 bulkWrite（D10）', async () => {
      mockActiveFind([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      WaitingRecord.bulkWrite.mockResolvedValue({ ok: 1 });

      const req = mockReq({ orderedIds: ['c', 'a', 'b'] });
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // 兩階段 = bulkWrite 被呼叫兩次
      expect(WaitingRecord.bulkWrite).toHaveBeenCalledTimes(2);
      // 第一階段：臨時值帶大偏移（> 1000000）
      const phase1 = WaitingRecord.bulkWrite.mock.calls[0][0];
      expect(phase1[0].updateOne.update.$set.orderIndex).toBeGreaterThan(1000000);
      // 第二階段：壓回最終 1..N
      const phase2 = WaitingRecord.bulkWrite.mock.calls[1][0];
      const finalIndices = phase2.map(op => op.updateOne.update.$set.orderIndex).sort();
      expect(finalIndices).toEqual([1, 2, 3]);
    });

    // Phase 4 / Task 4.6（D9）：reorder 撞號（E11000）應回 409 友善訊息
    test('reorder 撞號（E11000）應回 409 友善訊息', async () => {
      mockActiveFind([{ _id: 'a' }, { _id: 'b' }]);
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      const err = new Error('dup'); err.code = 11000;
      WaitingRecord.bulkWrite.mockRejectedValue ? WaitingRecord.bulkWrite.mockRejectedValue(err) : WaitingRecord.bulkWrite.mockImplementation(() => Promise.reject(err));

      const req = mockReq({ orderedIds: ['a', 'b'] });
      const res = mockRes();

      await queueAdminController.reorderQueue(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('排序衝突');
    });
  });

  // === Phase 6.4 後續修補（D10 同款）：updateQueueOrder 單筆移動也須兩階段 ===
  // 前端 handleReorderQueue 按鈕仍用此 endpoint，Phase 6.4 實測舊版用
  // for-loop 逐筆 save() 「往前移」中間記錄 +1 會撞 partial unique index → 409。
  // 改成兩階段 offset bulkWrite，與 reorderQueue 同演算法。
  describe('updateQueueOrder（Phase 6.4 後續修補：兩階段 offset 寫入）', () => {
    // mock 「find({status...}).sort({orderIndex,_id})」回傳給定 active 記錄
    const mockActiveSortedFind = (records) => {
      WaitingRecord.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(records)
      }));
    };

    test('缺 queueId 應回 400', async () => {
      const req = mockReq({ newOrder: 3 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('newOrder 非正整數應回 400', async () => {
      const req = mockReq({ queueId: 'a', newOrder: 0 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('找不到 queueId 對應記錄應回 404', async () => {
      WaitingRecord.findById.mockResolvedValue(null);
      const req = mockReq({ queueId: 'nope', newOrder: 1 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('currentOrder === newOrder 應直接 return 200「順序未變更」（不動 DB）', async () => {
      WaitingRecord.findById.mockResolvedValue({ _id: 'a', orderIndex: 3 });
      const req = mockReq({ queueId: 'a', newOrder: 3 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].message).toContain('未變更');
      expect(WaitingRecord.bulkWrite).not.toHaveBeenCalled();
    });

    test('newOrder 超過 active 記錄總數應回 400', async () => {
      WaitingRecord.findById.mockResolvedValue({ _id: 'a', orderIndex: 1 });
      mockActiveSortedFind([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
      const req = mockReq({ queueId: 'a', newOrder: 99 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('合法移動應做兩階段 bulkWrite（D10）：第一階段大偏移、第二階段壓回 1..N', async () => {
      // active 記錄 a,b,c（orderIndex 1,2,3）；把 a（orderIndex=1）移到 newOrder=3
      WaitingRecord.findById.mockResolvedValue({ _id: 'a', orderIndex: 1 });
      // 第一個 find().sort 給 active 列表；第二個 find().sort 給最終回傳的列表
      let callIdx = 0;
      WaitingRecord.find.mockImplementation(() => ({
        sort: jest.fn().mockImplementation(() => {
          callIdx += 1;
          if (callIdx === 1) return Promise.resolve([{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]);
          return Promise.resolve([
            { _id: 'b', orderIndex: 1 },
            { _id: 'c', orderIndex: 2 },
            { _id: 'a', orderIndex: 3 }
          ]);
        })
      }));
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      WaitingRecord.bulkWrite.mockResolvedValue({ ok: 1 });

      const req = mockReq({ queueId: 'a', newOrder: 3 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // 兩階段 = bulkWrite 被呼叫兩次
      expect(WaitingRecord.bulkWrite).toHaveBeenCalledTimes(2);
      // 第一階段：臨時值帶大偏移（> 1000000）、彼此唯一
      const phase1 = WaitingRecord.bulkWrite.mock.calls[0][0];
      const phase1Indices = phase1.map(op => op.updateOne.update.$set.orderIndex);
      expect(phase1Indices.every(v => v > 1000000)).toBe(true);
      expect(new Set(phase1Indices).size).toBe(phase1Indices.length); // 彼此唯一
      // 第二階段：壓回最終 1..N（移動後排列：b=1, c=2, a=3）
      const phase2 = WaitingRecord.bulkWrite.mock.calls[1][0];
      const phase2Map = {};
      for (const op of phase2) {
        phase2Map[String(op.updateOne.filter._id)] = op.updateOne.update.$set.orderIndex;
      }
      expect(phase2Map.b).toBe(1);
      expect(phase2Map.c).toBe(2);
      expect(phase2Map.a).toBe(3);
    });

    test('isOpen=false 時第二階段應同步寫 queueNumber = orderIndex', async () => {
      WaitingRecord.findById.mockResolvedValue({ _id: 'a', orderIndex: 1 });
      let callIdx = 0;
      WaitingRecord.find.mockImplementation(() => ({
        sort: jest.fn().mockImplementation(() => {
          callIdx += 1;
          if (callIdx === 1) return Promise.resolve([{ _id: 'a' }, { _id: 'b' }]);
          return Promise.resolve([{ _id: 'b' }, { _id: 'a' }]);
        })
      }));
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: false });
      WaitingRecord.bulkWrite.mockResolvedValue({ ok: 1 });

      const req = mockReq({ queueId: 'a', newOrder: 2 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const phase2 = WaitingRecord.bulkWrite.mock.calls[1][0];
      // isOpen=false → 第二階段每筆 $set 必含 queueNumber
      for (const op of phase2) {
        expect(op.updateOne.update.$set).toHaveProperty('queueNumber');
        expect(op.updateOne.update.$set.queueNumber).toBe(op.updateOne.update.$set.orderIndex);
      }
    });

    test('撞號（E11000）應回 409 友善訊息（D9 / handleAdminError）', async () => {
      WaitingRecord.findById.mockResolvedValue({ _id: 'a', orderIndex: 1 });
      mockActiveSortedFind([{ _id: 'a' }, { _id: 'b' }]);
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      const err = new Error('dup'); err.code = 11000;
      WaitingRecord.bulkWrite.mockRejectedValue(err);

      const req = mockReq({ queueId: 'a', newOrder: 2 });
      const res = mockRes();

      await queueAdminController.updateQueueOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toContain('排序衝突');
    });
  });
});
