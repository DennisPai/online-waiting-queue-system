const logger = require('../utils/logger');
const Customer = require('../models/customer.model');
const VisitRecord = require('../models/visit-record.model');
const Household = require('../models/household.model');
const { saveSnapshot } = require('../utils/snapshot');

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
    const customer = await Customer.create(req.body);
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
      operatorId: req.user?.id
    });

    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: '客戶資料已更新', data: customer });
  } catch (error) {
    logger.error('編輯客戶錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
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
    await saveSnapshot({
      operation: 'delete-visit-record',
      collection: 'customer_visits',
      documentId: String(visit._id),
      beforeData: visit.toObject ? visit.toObject() : visit,
      operatorId: req.user?.id,
      metadata: { customerId: id }
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
      data: visit
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
    await saveSnapshot({
      operation: 'delete-customer',
      collection: 'customer_profiles',
      documentId: String(customer._id),
      beforeData: customer.toObject ? customer.toObject() : customer,
      operatorId: req.user?.id
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
