/**
 * orderIndex.test.js
 * 測試 utils/orderIndex.js 的 Change A 修正邏輯：
 *  - allocateOrderIndex：orderIndex 原子分配（design.md D3）
 *  - ensureOrderIndexConsistency：兩階段 offset 批量寫入、不吞 E11000（D14 / D7）
 *
 * 沿用既有測試模式：mock models，不連真實 DB。
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/models/system-setting.model');
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const WaitingRecord = require('../src/models/waiting-record.model');
const SystemSetting = require('../src/models/system-setting.model');
const logger = require('../src/utils/logger');
const { allocateOrderIndex, ensureOrderIndexConsistency } = require('../src/utils/orderIndex');

describe('utils/orderIndex', () => {
  beforeEach(() => jest.clearAllMocks());

  // === allocateOrderIndex：原子發號（D3）===
  describe('allocateOrderIndex', () => {
    test('用 findOneAndUpdate $inc 1 原子發號，回傳 orderIndexCounter', async () => {
      SystemSetting.getSettings.mockResolvedValue({ orderIndexCounter: 5 });
      SystemSetting.findOneAndUpdate.mockResolvedValue({ orderIndexCounter: 6 });

      const result = await allocateOrderIndex();

      expect(result).toBe(6);
      expect(SystemSetting.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        { $inc: { orderIndexCounter: 1 } },
        { new: true }
      );
    });

    test('連續呼叫應拿到單調遞增的不同值（原子性）', async () => {
      SystemSetting.getSettings.mockResolvedValue({ orderIndexCounter: 10 });
      SystemSetting.findOneAndUpdate
        .mockResolvedValueOnce({ orderIndexCounter: 11 })
        .mockResolvedValueOnce({ orderIndexCounter: 12 })
        .mockResolvedValueOnce({ orderIndexCounter: 13 });

      const a = await allocateOrderIndex();
      const b = await allocateOrderIndex();
      const c = await allocateOrderIndex();

      expect([a, b, c]).toEqual([11, 12, 13]);
    });

    test('SystemSetting 文件遺失應丟錯（防禦性處理）', async () => {
      SystemSetting.getSettings.mockResolvedValue({});
      SystemSetting.findOneAndUpdate.mockResolvedValue(null);

      await expect(allocateOrderIndex()).rejects.toThrow('原子發號失敗');
    });
  });

  // === ensureOrderIndexConsistency：兩階段 offset 批量寫入（D14 / D7）===
  describe('ensureOrderIndexConsistency', () => {
    // 把 WaitingRecord.find().sort() 鏈設成回傳指定的 active 記錄
    const mockSortedFind = (records) => {
      WaitingRecord.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(records)
      }));
    };

    test('無 active 記錄時直接 return，不寫任何東西', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      mockSortedFind([]);

      await ensureOrderIndexConsistency();

      expect(WaitingRecord.bulkWrite).not.toHaveBeenCalled();
    });

    test('orderIndex 已連續 1..N 時 idempotent，不寫任何東西', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      mockSortedFind([
        { _id: 'a', orderIndex: 1, queueNumber: 1 },
        { _id: 'b', orderIndex: 2, queueNumber: 2 },
        { _id: 'c', orderIndex: 3, queueNumber: 3 }
      ]);

      await ensureOrderIndexConsistency();

      expect(WaitingRecord.bulkWrite).not.toHaveBeenCalled();
    });

    // D14：orderIndex 有空洞（如 callNext / deleteCustomer 留下的 2..N）
    // 應用兩階段 offset bulkWrite 壓回連續 1..N。
    test('orderIndex 有空洞時用兩階段 offset bulkWrite 壓回 1..N（D14）', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      // 隊伍是 2,3,5（callNext 留洞 + 中間刪除留洞）
      mockSortedFind([
        { _id: 'a', orderIndex: 2, queueNumber: 2 },
        { _id: 'b', orderIndex: 3, queueNumber: 3 },
        { _id: 'c', orderIndex: 5, queueNumber: 5 }
      ]);
      WaitingRecord.bulkWrite.mockResolvedValue({ ok: 1 });

      await ensureOrderIndexConsistency();

      // 兩階段 = bulkWrite 被呼叫兩次
      expect(WaitingRecord.bulkWrite).toHaveBeenCalledTimes(2);
      // 第一階段：臨時值帶大偏移（> 1000000）
      const phase1 = WaitingRecord.bulkWrite.mock.calls[0][0];
      phase1.forEach(op => {
        expect(op.updateOne.update.$set.orderIndex).toBeGreaterThan(1000000);
      });
      // 第二階段：壓回最終 1..N
      const phase2 = WaitingRecord.bulkWrite.mock.calls[1][0];
      const finalIndices = phase2.map(op => op.updateOne.update.$set.orderIndex).sort((x, y) => x - y);
      expect(finalIndices).toEqual([1, 2, 3]);
    });

    // D14：isOpen=false 時第二階段應同步 queueNumber = orderIndex。
    test('isOpen=false 時第二階段同步 queueNumber = orderIndex（D14）', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: false });
      mockSortedFind([
        { _id: 'a', orderIndex: 5, queueNumber: 5 },
        { _id: 'b', orderIndex: 8, queueNumber: 8 }
      ]);
      WaitingRecord.bulkWrite.mockResolvedValue({ ok: 1 });

      await ensureOrderIndexConsistency();

      const phase2 = WaitingRecord.bulkWrite.mock.calls[1][0];
      phase2.forEach(op => {
        expect(op.updateOne.update.$set.queueNumber).toBe(op.updateOne.update.$set.orderIndex);
      });
    });

    // D14：catch 不再吞掉 E11000 —— 撞號代表資料壞了，要 log error 且往外拋。
    test('撞號（E11000）不被吞掉：log error 並往外拋（D14）', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      mockSortedFind([
        { _id: 'a', orderIndex: 2, queueNumber: 2 },
        { _id: 'b', orderIndex: 5, queueNumber: 5 }
      ]);
      const dupErr = new Error('dup'); dupErr.code = 11000;
      WaitingRecord.bulkWrite.mockRejectedValue(dupErr);

      await expect(ensureOrderIndexConsistency()).rejects.toMatchObject({ code: 11000 });
      expect(logger.error).toHaveBeenCalled();
    });

    // 非 11000 錯誤維持「log 後不中斷主流程」（不往外拋）。
    test('非 11000 錯誤維持 log 後不中斷主流程（不往外拋）', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      mockSortedFind([
        { _id: 'a', orderIndex: 2, queueNumber: 2 },
        { _id: 'b', orderIndex: 5, queueNumber: 5 }
      ]);
      WaitingRecord.bulkWrite.mockRejectedValue(new Error('一般錯誤'));

      // 不往外拋
      await expect(ensureOrderIndexConsistency()).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    // D7：排序加次鍵 _id —— find 的 sort 必須是 { orderIndex: 1, _id: 1 }。
    test('D7：排序用 orderIndex 主鍵 + _id 次鍵保證 deterministic', async () => {
      SystemSetting.getSettings.mockResolvedValue({ isQueueOpen: true });
      const sortSpy = jest.fn().mockResolvedValue([]);
      WaitingRecord.find.mockImplementation(() => ({ sort: sortSpy }));

      await ensureOrderIndexConsistency();

      expect(sortSpy).toHaveBeenCalledWith({ orderIndex: 1, _id: 1 });
    });
  });
});
