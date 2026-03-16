const logger = require('../utils/logger');
// Customer / VisitRecord / Household 用 getter 延遲取得，確保 initDbConnections rebind 後拿到正確 model
const getCustomer = () => require('../models/customer.model');
const getVisitRecord = () => require('../models/visit-record.model');
const getHousehold = () => require('../models/household.model');
const { saveSnapshot } = require('../utils/snapshot');
const { autoFillDates, addZodiac, addVirtualAge } = require('../utils/calendarConverter');

/**
 * 共用：處理生日欄位（支援 birthDate+calendarType 舊格式 + gregorian/lunar 新格式）
 * 傳入 data 物件，回傳補齊 gregorian/lunar/zodiac/virtualAge 的新物件
 * 同時從 data 中刪除 birthDate / calendarType（不存入 DB）
 */
function normalizeBirthData(data, existingData = {}) {
  const result = { ...existingData, ...data };

  // 移除不屬於 schema 的欄位
  delete result.birthDate;
  delete result.calendarType;
  // zodiac/virtualAge 不接受外部傳入
  delete result.zodiac;
  delete result.virtualAge;

  // 如果傳入的是 birthDate + calendarType 格式，先轉換
  if (data.birthDate) {
    const d = new Date(data.birthDate);
    if (!isNaN(d)) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      if (data.calendarType === 'lunar') {
        result.lunarBirthYear = year;
        result.lunarBirthMonth = month;
        result.lunarBirthDay = day;
        // 清掉 gregorian，讓 autoFillDates 重算
        delete result.gregorianBirthYear;
        delete result.gregorianBirthMonth;
        delete result.gregorianBirthDay;
      } else {
        // 預設視為 gregorian
        result.gregorianBirthYear = year;
        result.gregorianBirthMonth = month;
        result.gregorianBirthDay = day;
        // 清掉 lunar，讓 autoFillDates 重算
        delete result.lunarBirthYear;
        delete result.lunarBirthMonth;
        delete result.lunarBirthDay;
        delete result.lunarIsLeapMonth;
      }
    }
  } else {
    // 標準格式：如果有指定某曆法，清空另一曆法讓 autoFillDates 重算
    const hasGregorian = ['gregorianBirthYear','gregorianBirthMonth','gregorianBirthDay'].some(f => f in data);
    const hasLunar = ['lunarBirthYear','lunarBirthMonth','lunarBirthDay'].some(f => f in data);
    if (hasGregorian && !hasLunar) {
      delete result.lunarBirthYear;
      delete result.lunarBirthMonth;
      delete result.lunarBirthDay;
      delete result.lunarIsLeapMonth;
    } else if (hasLunar && !hasGregorian) {
      delete result.gregorianBirthYear;
      delete result.gregorianBirthMonth;
      delete result.gregorianBirthDay;
    }
  }

  // 有完整生日才做互轉 + 計算
  const hasBirth = (result.gregorianBirthYear && result.gregorianBirthMonth && result.gregorianBirthDay)
    || (result.lunarBirthYear && result.lunarBirthMonth && result.lunarBirthDay);

  if (hasBirth) {
    const filled = autoFillDates(result);
    const withZodiac = addZodiac(filled);
    const withAge = addVirtualAge(withZodiac);
    return withAge;
  }

  return result;
}

/**
 * 共用：依客戶現有第一筆地址自動歸組 Household
 * 邏輯：
 *   1. 取客戶第一筆非「臨時地址」的地址
 *   2. 查找同地址的其他客戶（排除自己）
 *   3. 有同地址客戶 → 加入或建立 household
 *   4. 無同地址客戶 → householdId = null
 */
async function autoAssignHousehold(customerId) {
  try {
    const customer = await getCustomer().findById(customerId).lean();
    if (!customer) return;

    const firstAddr = (customer.addresses || []).find(
      a => a.address && a.address.trim() && a.address.trim() !== '臨時地址'
    );

    if (!firstAddr) {
      // 無有效地址，確保 householdId 是 null
      await getCustomer().findByIdAndUpdate(customerId, { householdId: null });
      return;
    }

    const address = firstAddr.address.trim();

    // 查找同地址的其他客戶（排除自己）
    const sameAddrCustomers = await getCustomer().find({
      _id: { $ne: customerId },
      'addresses.address': address
    }).select('_id householdId').lean();

    if (sameAddrCustomers.length === 0) {
      // 獨居 → 無 household
      await getCustomer().findByIdAndUpdate(customerId, { householdId: null });
      return;
    }

    // 有同地址客戶：找看看有沒有已存在的 household
    let household = await getHousehold().findOne({ address }).lean();

    if (!household) {
      // 建立新 household
      const allMemberIds = [customerId, ...sameAddrCustomers.map(c => c._id)];
      household = await getHousehold().create({ address, memberIds: allMemberIds });
      await getCustomer().updateMany(
        { _id: { $in: allMemberIds } },
        { $set: { householdId: household._id } }
      );
    } else {
      // 加入已有 household
      await getHousehold().findByIdAndUpdate(household._id, {
        $addToSet: { memberIds: customerId }
      });
      await getCustomer().findByIdAndUpdate(customerId, { householdId: household._id });
    }
  } catch (err) {
    logger.error(`[autoAssignHousehold] 客戶 ${customerId} 歸組失敗:`, err);
  }
}

/**
 * 共用：從 household 移除客戶，如果 household 剩 0-1 人就解散
 */
async function removeFromHousehold(customerId, householdId) {
  if (!householdId) return;
  try {
    const household = await getHousehold().findByIdAndUpdate(
      householdId,
      { $pull: { memberIds: customerId } },
      { new: true }
    ).lean();

    if (!household) return;

    // 剩 0-1 人 → 解散 household
    if ((household.memberIds || []).length <= 1) {
      if (household.memberIds.length === 1) {
        await getCustomer().findByIdAndUpdate(household.memberIds[0], { householdId: null });
      }
      await getHousehold().findByIdAndDelete(householdId);
    }
  } catch (err) {
    logger.error(`[removeFromHousehold] 移除失敗 customer=${customerId}:`, err);
  }
}

// 客戶列表（分頁 + 搜尋）
exports.listCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tag } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (tag) query.tags = tag;

    const [customers, total] = await Promise.all([
      getCustomer().find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      getCustomer().countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    logger.error('查詢客戶列表錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 客戶詳情（含 household 成員）
exports.getCustomer = async (req, res) => {
  try {
    const customer = await getCustomer().findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    // 附帶 household 成員（排除自己）
    let householdMembers = [];
    if (customer.householdId) {
      const household = await getHousehold().findById(customer.householdId).lean();
      if (household && household.memberIds.length > 0) {
        const memberIds = household.memberIds.filter(
          mid => mid.toString() !== customer._id.toString()
        );
        if (memberIds.length > 0) {
          householdMembers = await getCustomer().find(
            { _id: { $in: memberIds } },
            { _id: 1, name: 1, gender: 1, zodiac: 1, totalVisits: 1 }
          ).lean();
        }
      }
    }

    res.status(200).json({ success: true, data: { ...customer, householdMembers } });
  } catch (error) {
    logger.error('查詢客戶詳情錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 新增客戶
exports.createCustomer = async (req, res) => {
  try {
    const data = normalizeBirthData(req.body, {});
    const customer = await getCustomer().create(data);

    // Bug 4 修復：新增後自動歸組 household
    if ((customer.addresses || []).length > 0) {
      await autoAssignHousehold(customer._id);
    }

    const updated = await getCustomer().findById(customer._id).lean();
    res.status(201).json({ success: true, message: '客戶新增成功', data: updated });
  } catch (error) {
    logger.error('新增客戶錯誤:', error);
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 編輯客戶
exports.updateCustomer = async (req, res) => {
  try {
    const before = await getCustomer().findById(req.params.id).lean();
    if (!before) return res.status(404).json({ success: false, message: '查無此客戶' });

    await saveSnapshot({
      operation: 'update-customer',
      collection: 'customer_profiles',
      documentId: String(before._id),
      beforeData: before,
      operatorId: req.user?.id,
      metadata: { description: `編輯客戶資料（${before.name}）` }
    });

    // normalizeBirthData 處理 birthDate/calendarType 格式轉換 + zodiac/virtualAge 重算
    // existingData = before，讓國農曆互轉有完整的舊值可以參考
    const updateBody = normalizeBirthData(req.body, before);

    await getCustomer().findByIdAndUpdate(req.params.id, updateBody, { new: true, runValidators: true });

    // Bug 1 修復：地址有變更時，重新歸組 household
    if ('addresses' in req.body) {
      // 先從舊 household 移除
      await removeFromHousehold(before._id, before.householdId);
      // 再依新地址重新歸組
      await autoAssignHousehold(before._id);
    }

    const customer = await getCustomer().findById(req.params.id).lean();
    res.status(200).json({ success: true, message: '客戶資料已更新', data: customer });
  } catch (error) {
    logger.error('編輯客戶錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 修改單筆來訪記錄
exports.updateVisitRecord = async (req, res) => {
  try {
    const { id, visitId } = req.params;

    const customer = await getCustomer().findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await getVisitRecord().findOne({ _id: visitId, customerId: id });
    if (!visit) return res.status(404).json({ success: false, message: '查無此來訪記錄' });

    // 操作前快照
    const visitDateStr = visit.sessionDate ? new Date(visit.sessionDate).toLocaleDateString('zh-TW') : '未知日期';
    await saveSnapshot({
      operation: 'update-visit-record',
      collection: 'customer_visits',
      documentId: String(visit._id),
      beforeData: visit.toObject ? visit.toObject() : visit,
      operatorId: req.user?.id,
      metadata: { customerId: id, description: `編輯來訪記錄（${customer.name}，${visitDateStr}）` }
    });

    const { sessionDate, consultationTopics, remarks, queueNumber, otherDetails, familyMembers } = req.body;
    const updateFields = {};
    if (sessionDate !== undefined) updateFields.sessionDate = new Date(sessionDate);
    if (consultationTopics !== undefined) updateFields.consultationTopics = consultationTopics;
    if (remarks !== undefined) updateFields.remarks = remarks;
    if (queueNumber !== undefined) updateFields.queueNumber = queueNumber;
    if (otherDetails !== undefined) updateFields.otherDetails = otherDetails;
    if (familyMembers !== undefined) updateFields.familyMembers = familyMembers;

    const updated = await getVisitRecord().findByIdAndUpdate(visitId, updateFields, { new: true, runValidators: true });

    // 如果 sessionDate 有改，重算 customer firstVisitDate / lastVisitDate
    if (sessionDate !== undefined) {
      const allVisits = await getVisitRecord().find({ customerId: id }).sort({ sessionDate: 1 }).lean();
      const customerUpdates = {
        firstVisitDate: allVisits.length > 0 ? allVisits[0].sessionDate : null,
        lastVisitDate: allVisits.length > 0 ? allVisits[allVisits.length - 1].sessionDate : null
      };
      await getCustomer().findByIdAndUpdate(id, customerUpdates);
    }

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: '來訪記錄已更新',
      data: updated.toJSON()
    });
  } catch (error) {
    logger.error('修改來訪記錄錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 刪除單筆來訪記錄，並更新 totalVisits/firstVisitDate/lastVisitDate
exports.deleteVisitRecord = async (req, res) => {
  try {
    const { id, visitId } = req.params;

    const customer = await getCustomer().findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await getVisitRecord().findOne({ _id: visitId, customerId: id });
    if (!visit) return res.status(404).json({ success: false, message: '查無此來訪記錄' });

    // 操作前快照
    const delVisitDateStr = visit.sessionDate ? new Date(visit.sessionDate).toLocaleDateString('zh-TW') : '未知日期';
    await saveSnapshot({
      operation: 'delete-visit-record',
      collection: 'customer_visits',
      documentId: String(visit._id),
      beforeData: visit.toObject ? visit.toObject() : visit,
      operatorId: req.user?.id,
      metadata: { customerId: id, description: `刪除來訪記錄（${customer.name}，${delVisitDateStr}）` }
    });

    // 刪除
    await getVisitRecord().findByIdAndDelete(visitId);

    // 重新計算 totalVisits / firstVisitDate / lastVisitDate
    const remaining = await getVisitRecord().find({ customerId: id }).sort({ sessionDate: 1 }).lean();
    const updates = {
      totalVisits: remaining.length,
      firstVisitDate: remaining.length > 0 ? remaining[0].sessionDate : null,
      lastVisitDate: remaining.length > 0 ? remaining[remaining.length - 1].sessionDate : null
    };
    await getCustomer().findByIdAndUpdate(id, updates);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: '來訪記錄已刪除',
      data: { deletedVisitId: visitId, ...updates }
    });
  } catch (error) {
    logger.error('刪除來訪記錄錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 建立來訪記錄（歷史資料匯入 / 手動補登）
exports.createVisitRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionDate, consultationTopics, remarks, queueNumber, otherDetails } = req.body;

    if (!sessionDate) {
      return res.status(400).json({ success: false, message: 'sessionDate 為必填' });
    }

    const customer = await getCustomer().findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await getVisitRecord().create({
      customerId: id,
      sessionDate: new Date(sessionDate),
      consultationTopics: consultationTopics || [],
      remarks: remarks || '',
      queueNumber: queueNumber || null,
      otherDetails: otherDetails || ''
    });

    // 操作快照（建立後記錄）
    const createVisitDateStr = new Date(sessionDate).toLocaleDateString('zh-TW');
    await saveSnapshot({
      operation: 'create-visit-record',
      collection: 'customer_visits',
      documentId: String(visit._id),
      beforeData: null,
      operatorId: req.user?.id,
      metadata: { customerId: id, description: `新增來訪記錄（${customer.name}，${createVisitDateStr}）` }
    });

    // 更新 totalVisits、firstVisitDate、lastVisitDate
    const visitDate = new Date(sessionDate);
    const updates = { $inc: { totalVisits: 1 }, lastVisitDate: visitDate };
    if (!customer.firstVisitDate || visitDate < customer.firstVisitDate) {
      updates.firstVisitDate = visitDate;
    }
    await getCustomer().findByIdAndUpdate(id, updates);

    return res.status(201).json({
      success: true,
      code: 'OK',
      message: '來訪記錄已建立',
      data: visit.toJSON()
    });
  } catch (error) {
    logger.error('建立來訪記錄錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 刪除客戶（同時刪除所有 VisitRecord）
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await getCustomer().findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    // 操作前快照（先備份客戶資料）
    // 先查 visits 數量以便 description 使用
    const visitsToDelete = await getVisitRecord().countDocuments({ customerId: id });

    await saveSnapshot({
      operation: 'delete-customer',
      collection: 'customer_profiles',
      documentId: String(customer._id),
      beforeData: customer.toObject ? customer.toObject() : customer,
      operatorId: req.user?.id,
      metadata: { description: `刪除客戶（${customer.name}，含 ${visitsToDelete} 筆來訪記錄）` }
    });

    // Bug 3 修復：先從 household 移除（含解散判斷），再刪除客戶
    if (customer.householdId) {
      await removeFromHousehold(customer._id, customer.householdId);
    }

    // 先刪 visits，再刪 customer
    const { deletedCount } = await getVisitRecord().deleteMany({ customerId: id });
    await getCustomer().findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `客戶已刪除（同時刪除 ${deletedCount} 筆來訪記錄）`
    });
  } catch (error) {
    logger.error('刪除客戶錯誤:', error);
    return res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 客戶歷史來訪記錄
exports.getVisitHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customer = await getCustomer().findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const [visits, total] = await Promise.all([
      getVisitRecord().find({ customerId: id }).sort({ sessionDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      getVisitRecord().countDocuments({ customerId: id })
    ]);

    res.status(200).json({
      success: true,
      data: {
        visits,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
      }
    });
  } catch (error) {
    logger.error('查詢來訪記錄錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};
