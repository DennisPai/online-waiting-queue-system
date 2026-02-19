const logger = require('../utils/logger');
const Customer = require('../models/customer.model');
const VisitRecord = require('../models/visit-record.model');

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
    if (tag) {
      query.tags = tag;
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Customer.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('查詢客戶列表錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 客戶詳情
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) {
      return res.status(404).json({ success: false, message: '查無此客戶' });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    logger.error('查詢客戶詳情錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 新增客戶
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, message: '客戶新增成功', data: customer });
  } catch (error) {
    logger.error('新增客戶錯誤:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 編輯客戶
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ success: false, message: '查無此客戶' });
    }
    res.status(200).json({ success: true, message: '客戶資料已更新', data: customer });
  } catch (error) {
    logger.error('編輯客戶錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 客戶歷史來訪記錄
exports.getVisitHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: '查無此客戶' });
    }

    const [visits, total] = await Promise.all([
      VisitRecord.find({ customerId: id })
        .sort({ sessionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      VisitRecord.countDocuments({ customerId: id })
    ]);

    res.status(200).json({
      success: true,
      data: {
        visits,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('查詢來訪記錄錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};
