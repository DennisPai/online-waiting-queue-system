/**
 * system-setting.test.js
 * 測試 SystemSetting.getSettings() 的「偵測 + 補欄位」邏輯。
 *
 * Phase 6.4 hotfix 重點：偵測 issuedCount / orderIndexCounter 是否缺失，
 * 必須走底層 collection.findOne 取回 DB 文件「真實」內容，繞過 Mongoose
 * schema default 對 `findOne()` 回傳物件的記憶體套用 —— 否則
 * `settings.issuedCount === undefined` 永遠為 false，自動補欄位的
 * $set migration 永遠不會觸發，DB 文件實際缺欄位 → 阻斷報名與發號。
 *
 * 測試策略：把 schema.statics.getSettings 從 schema export 取出，用 `.call(this)`
 * 餵一個 fake `this` 物件（mock findOne / collection.findOne / collection.updateOne）
 * 驗證行為。不連真 DB、不依賴 mongoose 連線，與既有測試風格一致。
 */

jest.mock('../src/models/waiting-record.model');
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const WaitingRecord = require('../src/models/waiting-record.model');
const { _schema } = require('../src/models/system-setting.model');
const getSettings = _schema.statics.getSettings;

/**
 * 建一個 fake model 物件，模擬 SystemSetting model 在 getSettings() 內用到的 API：
 *   - this.findOne() —— Mongoose 取文件（會套 schema default）
 *   - this.collection.findOne() —— 底層 driver 取「真實」DB 文件（繞過 default）
 *   - this.collection.updateOne() —— 底層 driver 寫入
 *   - this.create() —— 創建新 SystemSetting（找不到時用）
 *
 * @param {object} options
 *   - rawDoc: 底層 driver 回傳的 DB 真實文件（用來決定欄位缺不缺）
 *   - mongooseDoc: Mongoose findOne 回傳物件（會套 default —— 模擬 issuedCount=0 即使 DB 缺）
 */
function makeFakeModel({ rawDoc, mongooseDoc }) {
  const collectionFindOne = jest.fn().mockResolvedValue(rawDoc);
  const collectionUpdateOne = jest.fn().mockResolvedValue({ acknowledged: true });
  // 第一次 findOne 回傳 mongooseDoc；如果 needsUpdate 觸發補寫，再 findOne 取回「補完後」的物件
  const findOne = jest.fn();
  findOne.mockResolvedValueOnce(mongooseDoc);
  findOne.mockResolvedValueOnce({ ...mongooseDoc, _refreshed: true });
  const create = jest.fn();
  return {
    fake: {
      findOne,
      create,
      collection: {
        findOne: collectionFindOne,
        updateOne: collectionUpdateOne
      }
    },
    spies: { findOne, create, collectionFindOne, collectionUpdateOne }
  };
}

describe('SystemSetting.getSettings — Phase 6.4 hotfix（偵測欄位缺失繞過 Mongoose default）', () => {
  beforeEach(() => jest.clearAllMocks());

  test('DB 文件實際缺 issuedCount（Mongoose default 把它套成 0）→ 應觸發 $set 補欄位', async () => {
    // rawDoc 模擬「DB 文件真實內容」—— 沒有 issuedCount 欄位。
    const rawDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      orderIndexCounter: 5,   // 此欄位 DB 有，不該被補
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };
    // mongooseDoc 模擬 Mongoose findOne 後在記憶體套了 default —— issuedCount=0、totalCustomerCount=0
    const mongooseDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: 0,           // ⚠️ Mongoose default 套上去的，不代表 DB 文件有
      orderIndexCounter: 5,
      totalCustomerCount: 0,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };

    // 既有 active + cancelled 計數 = 17（issuedCount 初始基準）
    WaitingRecord.countDocuments.mockResolvedValue(17);

    const { fake, spies } = makeFakeModel({ rawDoc, mongooseDoc });

    await getSettings.call(fake);

    // 必須呼叫底層 collection.findOne 取 raw 文件偵測
    expect(spies.collectionFindOne).toHaveBeenCalledWith({ _id: 'setting1' });
    // 應觸發 collection.updateOne 補欄位，且 $set 含 issuedCount
    expect(spies.collectionUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = spies.collectionUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: 'setting1' });
    expect(update.$set).toHaveProperty('issuedCount', 17);
    // orderIndexCounter DB 有 → 不該被補
    expect(update.$set).not.toHaveProperty('orderIndexCounter');
  });

  test('DB 文件實際缺 orderIndexCounter（Mongoose default 套成 0）→ 應以 max active orderIndex 初始化', async () => {
    const rawDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: 10,          // 此欄位 DB 有
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
      // orderIndexCounter 缺
    };
    const mongooseDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: 10,
      orderIndexCounter: 0,     // ⚠️ Mongoose default 套的
      totalCustomerCount: 0,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };

    // active 記錄最大 orderIndex = 53（基準必須 >= 此值）
    WaitingRecord.findOne.mockResolvedValue({ orderIndex: 53 });
    WaitingRecord.countDocuments.mockResolvedValue(0);

    const { fake, spies } = makeFakeModel({ rawDoc, mongooseDoc });

    await getSettings.call(fake);

    expect(spies.collectionUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = spies.collectionUpdateOne.mock.calls[0];
    // 應以 max(orderIndex) = 53 初始化（之後 $inc 1 發 54，不撞既有）
    expect(update.$set).toHaveProperty('orderIndexCounter', 53);
    // issuedCount DB 有 → 不該被補
    expect(update.$set).not.toHaveProperty('issuedCount');
  });

  test('DB 文件兩個欄位都缺（同時測 issuedCount + orderIndexCounter）→ 兩個都應補', async () => {
    const rawDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };
    const mongooseDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: 0,           // 都是 Mongoose default 套的
      orderIndexCounter: 0,
      totalCustomerCount: 0,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };

    // issuedCount 基準 = 17（active + cancelled）
    WaitingRecord.countDocuments.mockResolvedValue(17);
    // orderIndexCounter 基準 = max active orderIndex = 53
    WaitingRecord.findOne.mockResolvedValue({ orderIndex: 53 });

    const { fake, spies } = makeFakeModel({ rawDoc, mongooseDoc });

    await getSettings.call(fake);

    expect(spies.collectionUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = spies.collectionUpdateOne.mock.calls[0];
    expect(update.$set).toHaveProperty('issuedCount', 17);
    expect(update.$set).toHaveProperty('orderIndexCounter', 53);
  });

  test('DB 文件兩個欄位都有（不該補欄位）→ 不應呼叫 collection.updateOne', async () => {
    const rawDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: 42,          // DB 有
      orderIndexCounter: 99,    // DB 有
      totalCustomerCount: 100,  // DB 有
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };
    const mongooseDoc = { ...rawDoc };

    WaitingRecord.countDocuments.mockResolvedValue(0);
    WaitingRecord.findOne.mockResolvedValue(null);

    const { fake, spies } = makeFakeModel({ rawDoc, mongooseDoc });

    await getSettings.call(fake);

    // 既有欄位齊全 → 不該觸發 $set 補欄位
    expect(spies.collectionUpdateOne).not.toHaveBeenCalled();
  });

  test('DB 文件 issuedCount = null（不是 undefined）→ 也應視為缺欄位並補', async () => {
    // 防禦性：null 也算缺（避免歷史資料留下半截欄位）
    const rawDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: null,
      orderIndexCounter: 10,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };
    const mongooseDoc = {
      _id: 'setting1',
      maxOrderIndex: 100,
      issuedCount: null,
      orderIndexCounter: 10,
      totalCustomerCount: 0,
      lastCompletedTime: new Date(),
      eventBanner: { enabled: false, fontWeight: 'normal', backgroundColor: '#fff', buttonTextColor: '#fff' }
    };

    WaitingRecord.countDocuments.mockResolvedValue(7);

    const { fake, spies } = makeFakeModel({ rawDoc, mongooseDoc });

    await getSettings.call(fake);

    expect(spies.collectionUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = spies.collectionUpdateOne.mock.calls[0];
    expect(update.$set).toHaveProperty('issuedCount', 7);
  });

  test('找不到 SystemSetting 文件 → 應走 this.create() 創建（不執行偵測邏輯）', async () => {
    // findOne 回 null → 應走 create branch、不查 collection.findOne
    const findOne = jest.fn().mockResolvedValueOnce(null);
    const create = jest.fn().mockResolvedValue({ _id: 'newdoc', isQueueOpen: true });
    const collectionFindOne = jest.fn();
    const collectionUpdateOne = jest.fn();
    const fake = {
      findOne,
      create,
      collection: { findOne: collectionFindOne, updateOne: collectionUpdateOne }
    };

    const result = await getSettings.call(fake);

    expect(create).toHaveBeenCalledTimes(1);
    // 沒有現存文件 → 不該動 collection 偵測 / 補欄位
    expect(collectionFindOne).not.toHaveBeenCalled();
    expect(collectionUpdateOne).not.toHaveBeenCalled();
    expect(result._id).toBe('newdoc');
  });
});
