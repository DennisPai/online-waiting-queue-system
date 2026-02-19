const WaitingRecord = require('../../models/waiting-record.model');
const SystemSetting = require('../../models/system-setting.model');
const { autoFillDates, autoFillFamilyMembersDates, addZodiac, addVirtualAge } = require('../../utils/calendarConverter');
const { ensureOrderIndexConsistency } = require('../../utils/orderIndex');

// 獲取候位列表
exports.getQueueList = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    
    const query = {};
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        query.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        query.status = status;
      }
    } else {
      query.status = { $in: ['waiting', 'processing'] };
    }
    
    const pipeline = [
      { $match: query },
      { $sort: { orderIndex: 1 } }
    ];
    
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });
    }
    
    const records = await WaitingRecord.aggregate(pipeline);
    const total = await WaitingRecord.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : total,
          pages: limit ? Math.ceil(total / parseInt(limit)) : 1
        }
      }
    });
  } catch (error) {
    console.error('獲取候位列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 呼叫下一位
exports.callNext = async (req, res) => {
  try {
    await ensureOrderIndexConsistency();
    const settings = await SystemSetting.getSettings();
    
    const firstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });
    
    if (!firstRecord) {
      return res.status(404).json({ success: false, message: '目前沒有可叫號的客戶' });
    }
    
    const now = new Date();
    firstRecord.status = 'completed';
    firstRecord.completedAt = now;
    await firstRecord.save();
    
    settings.currentQueueNumber = firstRecord.queueNumber;
    settings.lastCompletedTime = now;
    await settings.save();
    
    await WaitingRecord.updateMany(
      { status: { $in: ['waiting', 'processing'] }, _id: { $ne: firstRecord._id } },
      { $inc: { orderIndex: -1 } }
    );
    
    await ensureOrderIndexConsistency();
    
    const newFirstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });
    
    res.status(200).json({
      success: true,
      message: `已完成 ${firstRecord.queueNumber} 號，移至已完成分頁`,
      data: {
        completedCustomer: {
          queueNumber: firstRecord.queueNumber,
          name: firstRecord.name,
          completedAt: now
        },
        nextCustomer: newFirstRecord ? {
          queueNumber: newFirstRecord.queueNumber,
          name: newFirstRecord.name,
          orderIndex: newFirstRecord.orderIndex
        } : null,
        currentQueueNumber: firstRecord.queueNumber,
        lastCompletedTime: now
      }
    });
  } catch (error) {
    console.error('叫號下一位錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 更新候位狀態
exports.updateQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;
    
    if (!['waiting', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: '無效的狀態值' });
    }
    
    const record = await WaitingRecord.findById(queueId);
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }
    
    const originalStatus = record.status;
    record.status = status;
    
    if (status === 'completed') {
      const now = new Date();
      record.completedAt = now;
      const settings = await SystemSetting.getSettings();
      settings.lastCompletedTime = now;
      await settings.save();
    }
    
    if (originalStatus === 'completed' && status !== 'completed') {
      record.completedAt = null;
    }
    
    if (status === 'waiting' && ['completed', 'cancelled'].includes(originalStatus)) {
      const maxOrderRecord = await WaitingRecord.findOne({
        status: { $in: ['waiting', 'processing'] }
      }).sort({ orderIndex: -1 });
      record.orderIndex = maxOrderRecord ? maxOrderRecord.orderIndex + 1 : 1;
    }
    
    await record.save();
    
    res.status(200).json({ success: true, message: '候位狀態更新成功', data: record });
  } catch (error) {
    console.error('更新候位狀態錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 更新候位順序
exports.updateQueueOrder = async (req, res) => {
  try {
    const { queueId, newOrder } = req.body;
    
    if (!queueId || newOrder === undefined || newOrder === null) {
      return res.status(400).json({ success: false, message: '請求缺少必要參數：queueId 或 newOrder' });
    }
    if (typeof newOrder !== 'number' || newOrder < 1) {
      return res.status(400).json({ success: false, message: 'newOrder必須是正整數' });
    }

    const recordToUpdate = await WaitingRecord.findById(queueId);
    if (!recordToUpdate) {
      return res.status(404).json({ success: false, message: '找不到該候位記錄' });
    }
    
    const currentOrder = recordToUpdate.orderIndex || 0;
    if (currentOrder === newOrder) {
      return res.status(200).json({ success: true, message: '順序未變更', data: { record: recordToUpdate } });
    }

    const totalRecords = await WaitingRecord.countDocuments();
    if (newOrder > totalRecords) {
      return res.status(400).json({ success: false, message: `新順序 ${newOrder} 超出了總記錄數 ${totalRecords}` });
    }
    
    if (currentOrder < newOrder) {
      await WaitingRecord.updateMany(
        { orderIndex: { $gt: currentOrder, $lte: newOrder }, _id: { $ne: queueId } },
        { $inc: { orderIndex: -1 } }
      );
    } else {
      await WaitingRecord.updateMany(
        { orderIndex: { $gte: newOrder, $lt: currentOrder }, _id: { $ne: queueId } },
        { $inc: { orderIndex: 1 } }
      );
    }
    
    recordToUpdate.orderIndex = newOrder;
    await recordToUpdate.save();
    
    const updatedRecords = await WaitingRecord.find({ status: { $ne: 'cancelled' } }).sort({ orderIndex: 1 });
    
    res.status(200).json({
      success: true,
      message: '候位順序更新成功',
      data: { record: recordToUpdate, allRecords: updatedRecords }
    });
  } catch (error) {
    console.error('更新候位順序錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: error.message || '未知錯誤' });
  }
};

// 更新客戶資料
exports.updateQueueData = async (req, res) => {
  try {
    const { queueId } = req.params;
    let updateData = req.body;
    
    const record = await WaitingRecord.findById(queueId);
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }
    
    updateData = autoFillDates(updateData);
    
    if (updateData.familyMembers && updateData.familyMembers.length > 0) {
      updateData.familyMembers = updateData.familyMembers.map(member => {
        const cleanMember = { ...member };
        delete cleanMember._id;
        return cleanMember;
      });
      const familyData = autoFillFamilyMembersDates({ familyMembers: updateData.familyMembers });
      updateData.familyMembers = familyData.familyMembers;
    }

    updateData = addZodiac(updateData);
    updateData = addVirtualAge(updateData);

    const allowedFields = [
      'queueNumber', 'name', 'email', 'phone', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'addresses', 'familyMembers', 'consultationTopics', 'otherDetails', 'remarks', 'virtualAge', 'zodiac'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        record[field] = updateData[field];
      }
    });

    await record.save();
    
    res.status(200).json({ success: true, message: '客戶資料更新成功', data: record });
  } catch (error) {
    console.error('更新客戶資料錯誤:', error);
    
    if (error.code === 11000) {
      try {
        await WaitingRecord.collection.dropIndex('queueNumber_1');
        await record.save();
        return res.status(200).json({ success: true, message: '客戶資料更新成功（已移除重複限制）', data: record });
      } catch (dropError) {
        return res.status(400).json({ success: false, message: '資料庫索引問題：請聯繫管理員移除唯一索引限制。' });
      }
    }
    
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 獲取按排序順序的候位號碼
exports.getOrderedQueueNumbers = async (req, res) => {
  try {
    const order1Record = await WaitingRecord.findOne({ orderIndex: 1, status: { $in: ['waiting', 'processing'] } });
    const order2Record = await WaitingRecord.findOne({ orderIndex: 2, status: 'waiting' });

    if (order1Record) {
      await SystemSetting.updateOne({}, { currentQueueNumber: order1Record.queueNumber });
    }

    res.status(200).json({
      success: true,
      data: {
        currentProcessingNumber: order1Record ? order1Record.queueNumber : null,
        nextWaitingNumber: order2Record ? order2Record.queueNumber : null
      }
    });
  } catch (error) {
    console.error('獲取排序候位號碼錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 刪除客戶資料
exports.deleteCustomer = async (req, res) => {
  try {
    const { queueId } = req.params;
    const record = await WaitingRecord.findById(queueId);
    
    if (!record) {
      return res.status(404).json({ success: false, message: '查無此候位記錄' });
    }
    
    const customerInfo = {
      queueNumber: record.queueNumber,
      name: record.name,
      phone: record.phone,
      orderIndex: record.orderIndex
    };
    
    console.log(`管理員刪除客戶記錄: ${customerInfo.name} (${customerInfo.queueNumber}號)`);
    
    const deletedOrderIndex = record.orderIndex;
    await WaitingRecord.findByIdAndDelete(queueId);
    await WaitingRecord.updateMany({ orderIndex: { $gt: deletedOrderIndex } }, { $inc: { orderIndex: -1 } });
    await ensureOrderIndexConsistency();
    
    res.status(200).json({
      success: true,
      message: `客戶 ${customerInfo.name} 的記錄已永久刪除`,
      data: { deletedCustomer: customerInfo }
    });
  } catch (error) {
    console.error('刪除客戶記錄錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};

// 清除所有候位資料
exports.clearAllQueue = async (req, res) => {
  try {
    const totalCustomers = await WaitingRecord.countDocuments();
    console.log(`管理員清除所有候位資料，共 ${totalCustomers} 筆記錄`);
    
    await WaitingRecord.deleteMany({});
    
    const settings = await SystemSetting.getSettings();
    settings.currentQueueNumber = 0;
    if (settings.maxOrderIndex <= 0) settings.maxOrderIndex = 100;
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `已成功清除所有候位資料，共刪除 ${totalCustomers} 筆記錄`,
      data: {
        deletedCount: totalCustomers,
        resetSystemSettings: { currentQueueNumber: 0, maxOrderIndex: settings.maxOrderIndex }
      }
    });
  } catch (error) {
    console.error('清除所有候位資料錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤', error: process.env.NODE_ENV === 'development' ? error.message : {} });
  }
};
