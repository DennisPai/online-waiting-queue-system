const WaitingRecord = require('../models/waiting-record.model');
const ApiError = require('../utils/ApiError');

/**
 * 候位系統數據訪問層
 * 負責所有與數據庫相關的候位操作
 */
class QueueRepository {
  /**
   * 創建新的候位記錄
   */
  async create(data) {
    try {
      return await WaitingRecord.create(data);
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('候位號碼已存在');
      }
      throw error;
    }
  }

  /**
   * 根據ID查找記錄
   */
  async findById(id) {
    const record = await WaitingRecord.findById(id);
    if (!record) {
      throw ApiError.notFound('候位記錄不存在');
    }
    return record;
  }

  /**
   * 根據候位號碼查找記錄
   */
  async findByQueueNumber(queueNumber) {
    return await WaitingRecord.findOne({ queueNumber: parseInt(queueNumber) });
  }

  /**
   * 獲取候位列表（支持分頁和篩選）
   */
  async findAll(filters = {}, options = {}) {
    const {
      status,
      page = 1,
      limit = 20,
      sortBy = 'orderIndex',
      sortOrder = 1
    } = options;

    // 構建查詢條件
    const query = { ...filters };
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }

    // 計算分頁
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder };

    // 執行查詢
    const [records, total] = await Promise.all([
      WaitingRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      WaitingRecord.countDocuments(query)
    ]);

    return {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 更新候位記錄
   */
  async updateById(id, updateData) {
    const record = await WaitingRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!record) {
      throw ApiError.notFound('候位記錄不存在');
    }
    
    return record;
  }

  /**
   * 刪除候位記錄
   */
  async deleteById(id) {
    const record = await WaitingRecord.findByIdAndDelete(id);
    if (!record) {
      throw ApiError.notFound('候位記錄不存在');
    }
    return record;
  }

  /**
   * 獲取下一個候位號碼
   */
  async getNextQueueNumber() {
    return await WaitingRecord.getNextQueueNumber();
  }

  /**
   * 計算活躍客戶數量
   */
  async countActiveCustomers() {
    return await WaitingRecord.countDocuments({
      status: { $in: ['waiting', 'processing'] }
    });
  }

  /**
   * 獲取指定 orderIndex 之前的記錄
   */
  async findRecordsAhead(orderIndex, status = ['waiting', 'processing']) {
    return await WaitingRecord.find({
      orderIndex: { $lt: orderIndex },
      status: { $in: status }
    });
  }

  /**
   * 批量更新 orderIndex
   */
  async bulkUpdateOrderIndex(updates) {
    const bulkOps = updates.map(({ id, orderIndex }) => ({
      updateOne: {
        filter: { _id: id },
        update: { orderIndex }
      }
    }));

    return await WaitingRecord.bulkWrite(bulkOps);
  }

  /**
   * 查找重複的候位號碼
   */
  async findDuplicateQueueNumbers() {
    const pipeline = [
      {
        $group: {
          _id: '$queueNumber',
          count: { $sum: 1 },
          records: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];

    return await WaitingRecord.aggregate(pipeline);
  }
}

module.exports = new QueueRepository();
