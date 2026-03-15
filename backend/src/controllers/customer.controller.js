const logger = require('../utils/logger');
const Customer = require('../models/customer.model');
const VisitRecord = require('../models/visit-record.model');
const Household = require('../models/household.model');
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
      Customer.find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Customer.countDocuments(query)
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
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    // 附帶 household 成員（排除自己）
    let householdMembers = [];
    if (customer.householdId) {
      const household = await Household.findById(customer.householdId).lean();
      if (household && household.memberIds.length > 0) {
        const memberIds = household.memberIds.filter(
          mid => mid.toString() !== customer._id.toString()
        );
        if (memberIds.length > 0) {
          householdMembers = await Customer.find(
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
    const customer = await Customer.create(data);
    res.status(201).json({ success: true, message: '客戶新增成功', data: customer.toJSON() });
  } catch (error) {
    logger.error('新增客戶錯誤:', error);
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 編輯客戶
exports.updateCustomer = async (req, res) => {
  try {
    const before = await Customer.findById(req.params.id).lean();
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

    const customer = await Customer.findByIdAndUpdate(req.params.id, updateBody, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: '客戶資料已更新', data: customer.toJSON() });
  } catch (error) {
    logger.error('編輯客戶錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 修改單筆來訪記錄
exports.updateVisitRecord = async (req, res) => {
  try {
    const { id, visitId } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await VisitRecord.findOne({ _id: visitId, customerId: id });
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

    const updated = await VisitRecord.findByIdAndUpdate(visitId, updateFields, { new: true, runValidators: true });

    // 如果 sessionDate 有改，重算 customer firstVisitDate / lastVisitDate
    if (sessionDate !== undefined) {
      const allVisits = await VisitRecord.find({ customerId: id }).sort({ sessionDate: 1 }).lean();
      const customerUpdates = {
        firstVisitDate: allVisits.length > 0 ? allVisits[0].sessionDate : null,
        lastVisitDate: allVisits.length > 0 ? allVisits[allVisits.length - 1].sessionDate : null
      };
      await Customer.findByIdAndUpdate(id, customerUpdates);
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

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await VisitRecord.findOne({ _id: visitId, customerId: id });
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
    await VisitRecord.findByIdAndDelete(visitId);

    // 重新計算 totalVisits / firstVisitDate / lastVisitDate
    const remaining = await VisitRecord.find({ customerId: id }).sort({ sessionDate: 1 }).lean();
    const updates = {
      totalVisits: remaining.length,
      firstVisitDate: remaining.length > 0 ? remaining[0].sessionDate : null,
      lastVisitDate: remaining.length > 0 ? remaining[remaining.length - 1].sessionDate : null
    };
    await Customer.findByIdAndUpdate(id, updates);

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

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const visit = await VisitRecord.create({
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
    await Customer.findByIdAndUpdate(id, updates);

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
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    // 操作前快照（先備份客戶資料）
    // 先查 visits 數量以便 description 使用
    const visitsToDelete = await VisitRecord.countDocuments({ customerId: id });

    await saveSnapshot({
      operation: 'delete-customer',
      collection: 'customer_profiles',
      documentId: String(customer._id),
      beforeData: customer.toObject ? customer.toObject() : customer,
      operatorId: req.user?.id,
      metadata: { description: `刪除客戶（${customer.name}，含 ${visitsToDelete} 筆來訪記錄）` }
    });

    // 先刪 visits，再刪 customer
    const { deletedCount } = await VisitRecord.deleteMany({ customerId: id });
    await Customer.findByIdAndDelete(id);

    // 若屬於 household，從 memberIds 移除
    if (customer.householdId) {
      const Household = require('../models/household.model');
      await Household.findByIdAndUpdate(customer.householdId, {
        $pull: { memberIds: customer._id }
      });
    }

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

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: '查無此客戶' });

    const [visits, total] = await Promise.all([
      VisitRecord.find({ customerId: id }).sort({ sessionDate: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      VisitRecord.countDocuments({ customerId: id })
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
