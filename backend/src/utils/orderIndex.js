const logger = require('./logger');
const WaitingRecord = require('../models/waiting-record.model');
const SystemSetting = require('../models/system-setting.model');

/**
 * 原子分配一個 orderIndex 發號值（Phase 3 / Task 3.2 / design.md D3）
 *
 * 病根：原本「讀目前最大 orderIndex → +1 → save」是非原子三步，並發時
 *      兩個請求會讀到同一個 max → 算出同一個 orderIndex → 撞號。
 *
 * 解法：對 SystemSetting.orderIndexCounter 做 findOneAndUpdate $inc 1。
 *      MongoDB 對單一文件的 $inc 是原子操作，並發請求每次都拿到不同值，
 *      保證「唯一、單調遞增」。回傳值直接當新記錄的 orderIndex（排到隊尾）。
 *
 * 注意：這個發號值會單調膨脹（不會壓回 1..N）。連續的 1..N 由
 *      ensureOrderIndexConsistency() 在安全時機壓回。發號值只需保證
 *      「彼此唯一、且大於目前所有 active 記錄」即可不撞 partial unique index。
 *
 * 為何不直接用 SystemSetting.getSettings()：getSettings() 是「先 find 再
 * 視情況 update」的非原子流程，不能用來發號。本函式直接打原子 $inc。
 *
 * @returns {Promise<number>} 保證唯一、單調遞增的 orderIndex 值
 */
async function allocateOrderIndex() {
  // 第一次呼叫前 orderIndexCounter 可能尚未存在（舊資料）。
  // getSettings() 內建 orderIndexCounter 的自動初始化（以目前 active 最大
  // orderIndex 為基準），先呼叫一次確保欄位存在且基準正確。
  await SystemSetting.getSettings();

  const updated = await SystemSetting.findOneAndUpdate(
    {},
    { $inc: { orderIndexCounter: 1 } },
    { new: true }
  );

  if (!updated || typeof updated.orderIndexCounter !== 'number') {
    // 理論上 getSettings() 已保證文件存在；防禦性處理。
    throw new Error('orderIndex 原子發號失敗：找不到 SystemSetting 文件');
  }

  return updated.orderIndexCounter;
}

/**
 * 確保 orderIndex 的一致性和連續性（Phase 3 / Task 3.5 / design.md D14）
 * isOpen=false 時同步 queueNumber = orderIndex
 * 共用於 admin queue controller 和 queue controller
 *
 * 改寫重點（D14）：
 * 1. 原本「for 迴圈逐筆 save()」整列重寫 —— 配 partial unique index，
 *    中間態必然出現「兩筆暫時同 orderIndex」→ 撞 E11000。改成
 *    「兩階段 offset 批量寫入」：先把所有要改的記錄推到大偏移臨時值區間
 *    （離開 1..N、彼此唯一），再壓回最終 1..N，全程不撞號。
 * 2. 排序加次鍵 _id（design.md D7）：萬一中間態出現 orderIndex 撞號，
 *    單鍵 sort 結果不穩定；加 _id 次鍵讓排序 deterministic，批量重寫
 *    才有穩定的目標順序。
 * 3. catch 不再吞掉 E11000（D14）：撞號代表資料真的壞了，要 log error
 *    並讓呼叫端可觀測（往外拋），不再靜默 console.log 放生。
 */
async function ensureOrderIndexConsistency() {
  try {
    const settings = await SystemSetting.getSettings();
    const isOpen = settings.isQueueOpen;

    // D7：orderIndex 為主鍵、_id 為次鍵，撞號時排序仍 deterministic
    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1, _id: 1 });

    if (activeRecords.length === 0) {
      return;
    }

    // 計算每筆記錄的「正確最終值」
    const plan = activeRecords.map((rec, i) => {
      const correctOrderIndex = i + 1;
      return {
        _id: rec._id,
        currentOrderIndex: rec.orderIndex,
        currentQueueNumber: rec.queueNumber,
        targetOrderIndex: correctOrderIndex,
        // isOpen=false 時 queueNumber 同步 orderIndex
        targetQueueNumber: !isOpen ? correctOrderIndex : rec.queueNumber
      };
    });

    // 只挑真的需要變動的記錄（idempotent：全部已正確時不寫任何東西）
    const needsChange = plan.filter(p =>
      p.currentOrderIndex !== p.targetOrderIndex ||
      (!isOpen && p.currentQueueNumber !== p.targetOrderIndex)
    );

    if (needsChange.length === 0) {
      return;
    }

    // === 兩階段 offset 批量寫入（D14 / 比照 D10）===
    // 大偏移量：保證臨時值離開 1..N 區間、且彼此唯一（沿用各記錄的
    // targetOrderIndex 加上偏移，天然互不重複）。偏移量取「遠大於任何
    // 可能的 active 記錄數」的安全值。
    const OFFSET = 1000000;

    // 第一階段：把要動的記錄推到臨時值 = targetOrderIndex + OFFSET。
    // 臨時值彼此唯一（targetOrderIndex 已是 1..N 的唯一子集），
    // 且遠離任何 active 記錄的真實 orderIndex → 不與任何記錄撞號。
    const phase1Ops = needsChange.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { orderIndex: p.targetOrderIndex + OFFSET } }
      }
    }));
    await WaitingRecord.bulkWrite(phase1Ops, { ordered: false });

    // 第二階段：把這些記錄從臨時值壓回最終 1..N（並同步 queueNumber）。
    // 此時「沒被動到的記錄」已是正確的 1..N 子集，「被動到的記錄」在
    // 臨時值區間，兩者不重疊；逐筆壓回最終值的過程中，目標值不會撞上
    // 任何「尚停在臨時值區間」的記錄 → 全程不撞 partial unique index。
    const phase2Ops = needsChange.map(p => {
      const set = { orderIndex: p.targetOrderIndex };
      if (!isOpen) set.queueNumber = p.targetOrderIndex;
      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: set }
        }
      };
    });
    await WaitingRecord.bulkWrite(phase2Ops, { ordered: false });

    logger.info(`已完成 orderIndex 一致性修正（isOpen=${isOpen}，異動 ${needsChange.length} 筆）`);
  } catch (error) {
    // D14：不再吞掉 E11000。撞號代表資料真的壞了，要 log error 並往外拋，
    // 讓呼叫端（admin controller）能依 D9 做友善錯誤分流、且問題可觀測。
    if (error && error.code === 11000) {
      logger.error('orderIndex 一致性修正撞號（E11000），資料可能已損壞，需人工檢查:', error);
      throw error;
    }
    // 其他非撞號錯誤維持原本「log 後不中斷主流程」的行為
    logger.error('確保 orderIndex 一致性時發生錯誤:', error);
  }
}

module.exports = { ensureOrderIndexConsistency, allocateOrderIndex };
