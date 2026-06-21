/**
 * customer-review controller 測試（P0-9 複核 API；validator H-5 補測）
 * 重點：merge 是 destructive「先快照後刪」，需回歸保護
 */
jest.mock('../src/models/customer.model');
jest.mock('../src/models/visit-record.model');
jest.mock('../src/utils/snapshot', () => ({
  saveSnapshotOrThrow: jest.fn().mockResolvedValue({})
}));
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const Customer = require('../src/models/customer.model');
const VisitRecord = require('../src/models/visit-record.model');
const { saveSnapshotOrThrow } = require('../src/utils/snapshot');
const ctrl = require('../src/controllers/admin/customer-review.controller');

const A = '507f1f77bcf86cd799439011';
const B = '507f1f77bcf86cd799439012';
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
// 模擬 mongoose query 的 .lean()
const lean = (doc) => ({ lean: jest.fn().mockResolvedValue(doc) });

describe('customer-review controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveSnapshotOrThrow.mockResolvedValue({});
  });

  describe('mergeCustomer', () => {
    test('targetId 缺失 → 400', async () => {
      const res = mockRes();
      await ctrl.mergeCustomer({ params: { id: A }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('來源與目標相同 → 400', async () => {
      const res = mockRes();
      await ctrl.mergeCustomer({ params: { id: A }, body: { targetId: A } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('成功合併：先快照後刪 + VisitRecord 轉移 + totalVisits 累加 + 首末訪日期合併', async () => {
      const source = { _id: A, name: '張', totalVisits: 8, firstVisitDate: '2025-01-01', lastVisitDate: '2026-01-01', householdId: 'hhX' };
      const target = { _id: B, name: '張', totalVisits: 1, firstVisitDate: '2025-06-01', lastVisitDate: '2025-12-01', householdId: null };
      Customer.findById.mockImplementation((qid) => lean(qid === A ? source : target));
      VisitRecord.updateMany.mockResolvedValue({});
      Customer.findByIdAndUpdate.mockResolvedValue({});
      Customer.findByIdAndDelete.mockResolvedValue({});
      const res = mockRes();

      await ctrl.mergeCustomer({ params: { id: A }, body: { targetId: B }, user: { id: 'admin' } }, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // 先快照後刪
      expect(saveSnapshotOrThrow.mock.invocationCallOrder[0])
        .toBeLessThan(Customer.findByIdAndDelete.mock.invocationCallOrder[0]);
      // VisitRecord 轉移到 target
      expect(VisitRecord.updateMany).toHaveBeenCalledWith({ customerId: A }, { $set: { customerId: B } });
      const upd = Customer.findByIdAndUpdate.mock.calls[0][1];
      expect(upd.$inc.totalVisits).toBe(8);
      expect(upd.$set.firstVisitDate).toBe('2025-01-01'); // H-3 取較早首訪
      expect(upd.$set.lastVisitDate).toBe('2026-01-01');  // H-3 取較晚末訪
      expect(upd.$set.householdId).toBe('hhX');           // target 無→繼承來源
      expect(Customer.findByIdAndDelete).toHaveBeenCalledWith(A);
    });

    test('快照失敗 → 不刪除來源（先寫後刪保護）', async () => {
      Customer.findById.mockImplementation((qid) => lean(qid === A ? { _id: A, totalVisits: 8 } : { _id: B, totalVisits: 1 }));
      saveSnapshotOrThrow.mockRejectedValueOnce(new Error('snapshot down'));
      const res = mockRes();

      await ctrl.mergeCustomer({ params: { id: A }, body: { targetId: B }, user: { id: 'admin' } }, res);

      expect(Customer.findByIdAndDelete).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('dismissDuplicate', () => {
    test('清除 needsReview 與 possibleDuplicateOf → 200', async () => {
      Customer.findByIdAndUpdate.mockReturnValue(lean({ _id: A, needsReview: false }));
      const res = mockRes();
      await ctrl.dismissDuplicate({ params: { id: A } }, res);
      expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith(
        A, { $set: { needsReview: false, possibleDuplicateOf: [] } }, { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('查無客戶 → 404', async () => {
      Customer.findByIdAndUpdate.mockReturnValue(lean(null));
      const res = mockRes();
      await ctrl.dismissDuplicate({ params: { id: A } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listDuplicateCandidates', () => {
    test('回傳 needsReview 客戶並附疑似對象資料', async () => {
      const candidate = { _id: A, name: '張', needsReview: true, possibleDuplicateOf: [{ customerId: B, score: 40, reason: '同名待複核' }] };
      Customer.find.mockReturnValue(lean([candidate]));
      Customer.findById.mockReturnValue({ select: jest.fn().mockReturnValue(lean({ _id: B, name: '張', phone: '0912', totalVisits: 8 })) });
      const res = mockRes();

      await ctrl.listDuplicateCandidates({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;
      expect(data.customers).toHaveLength(1);
      expect(data.customers[0].possibleDuplicateOf[0].customerData.name).toBe('張');
    });
  });
});
