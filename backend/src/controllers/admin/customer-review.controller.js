const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { saveSnapshotOrThrow } = require('../../utils/snapshot');

// 延遲取得 model，確保 initDbConnections rebind 後拿到正確 model
const getCustomer = () => require('../../models/customer.model');
const getVisitRecord = () => require('../../models/visit-record.model');

/**
 * GET /api/v1/admin/customers/duplicates
 * 查詢所有 needsReview:true 的客戶，並附上其 possibleDuplicateOf 指向的疑似對象基本資料
 */
exports.listDuplicateCandidates = async (req, res) => {
  try {
    const candidates = await getCustomer()
      .find({ needsReview: true })
      .lean();

    // 逐筆查 possibleDuplicateOf 指向的疑似對象基本資料
    const enriched = await Promise.all(
      candidates.map(async (customer) => {
        const possibleDuplicatesEnriched = await Promise.all(
          (customer.possibleDuplicateOf || []).map(async (entry) => {
            const target = await getCustomer()
              .findById(entry.customerId)
              .select('_id name phone totalVisits gregorianBirthYear gregorianBirthMonth gregorianBirthDay lunarBirthYear lunarBirthMonth lunarBirthDay')
              .lean();
            return {
              customerId: entry.customerId,
              score: entry.score,
              reason: entry.reason,
              customerData: target || null
            };
          })
        );
        return {
          ...customer,
          possibleDuplicateOf: possibleDuplicatesEnriched
        };
      })
    );

    return res.status(200).json({
      success: true,
      code: 'OK',
      data: { customers: enriched }
    });
  } catch (error) {
    logger.error('查詢待複核重複客戶錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

/**
 * POST /api/v1/admin/customers/:id/merge
 * body: { targetId }
 * 確認 :id（來源）與 targetId（保留目標）為同一人 → 合併
 * 先 saveSnapshotOrThrow 備份來源，再刪來源，最後清 target 的 needsReview
 */
exports.mergeCustomer = async (req, res) => {
  const { id } = req.params;
  const { targetId } = req.body;

  // 防呆：targetId 為必填
  if (!targetId) {
    return res.status(400).json({ success: false, message: 'targetId 為必填' });
  }

  // ObjectId 格式驗證
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ success: false, message: '無效的 ObjectId 格式' });
  }

  // 防呆：id 與 targetId 不可相同
  if (id.toString() === targetId.toString()) {
    return res.status(400).json({ success: false, message: '來源與目標客戶不可相同' });
  }

  try {
    // 確認兩者都存在
    const [source, target] = await Promise.all([
      getCustomer().findById(id).lean(),
      getCustomer().findById(targetId).lean()
    ]);

    if (!source) {
      return res.status(400).json({ success: false, message: '找不到來源客戶（:id）' });
    }
    if (!target) {
      return res.status(400).json({ success: false, message: '找不到目標客戶（targetId）' });
    }

    // 先寫後刪：saveSnapshotOrThrow 保存來源資料（若備份失敗就拋錯，不進行刪除）
    await saveSnapshotOrThrow({
      operation: 'merge-customer-source',
      collection: 'customer_profiles',
      documentId: String(source._id),
      beforeData: source,
      operatorId: req.user?.id,
      metadata: {
        description: `合併客戶（來源 ${source.name} → 目標 ${target.name}）`,
        targetId: String(targetId)
      }
    });

    // 1. 轉移 VisitRecord：把來源的 VisitRecord.customerId 改成 target
    await getVisitRecord().updateMany(
      { customerId: source._id },
      { $set: { customerId: target._id } }
    );

    // 2. 累加 totalVisits 到 target，若 target 無 householdId 而來源有則繼承
    const additionalVisits = source.totalVisits || 0;
    const targetUpdate = {
      $inc: { totalVisits: additionalVisits },
      $set: {
        needsReview: false,
        possibleDuplicateOf: []
      }
    };

    if (!target.householdId && source.householdId) {
      targetUpdate.$set.householdId = source.householdId;
    }

    // H-3：合併首訪/末訪日期，避免刪除來源時丟失較早首訪或較晚末訪
    const pickDate = (a, b, keepEarlier) => {
      if (!a) return b;
      if (!b) return a;
      const earlier = new Date(a) < new Date(b) ? a : b;
      const later = new Date(a) > new Date(b) ? a : b;
      return keepEarlier ? earlier : later;
    };
    const mergedFirst = pickDate(source.firstVisitDate, target.firstVisitDate, true);
    const mergedLast = pickDate(source.lastVisitDate, target.lastVisitDate, false);
    if (mergedFirst) targetUpdate.$set.firstVisitDate = mergedFirst;
    if (mergedLast) targetUpdate.$set.lastVisitDate = mergedLast;

    // 3. 更新 target
    await getCustomer().findByIdAndUpdate(targetId, targetUpdate);

    // 4. 刪除來源客戶（先寫後刪，snapshot 已完成）
    await getCustomer().findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      code: 'OK',
      data: { merged: true, targetId }
    });
  } catch (error) {
    logger.error('合併客戶錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

/**
 * POST /api/v1/admin/customers/:id/dismiss-duplicate
 * 確認不同人 → 清除 needsReview 旗標
 */
exports.dismissDuplicate = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: '無效的 ObjectId 格式' });
  }

  try {
    const customer = await getCustomer().findByIdAndUpdate(
      id,
      { $set: { needsReview: false, possibleDuplicateOf: [] } },
      { new: true }
    ).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: '查無此客戶' });
    }

    return res.status(200).json({
      success: true,
      code: 'OK',
      data: { dismissed: true }
    });
  } catch (error) {
    logger.error('駁回重複標記錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};
