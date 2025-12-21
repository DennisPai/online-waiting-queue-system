const WaitingRecord = require('../models/waiting-record.model');
const SystemSetting = require('../models/system-setting.model');
const { autoFillDates, autoFillFamilyMembersDates, addVirtualAge, autoConvertToMinguo, convertMinguoForStorage } = require('../utils/calendarConverter');

// 確保 orderIndex 的一致性和連續性 - 與queue.controller.js保持完全一致
async function ensureOrderIndexConsistency() {
  try {
    console.log('開始檢查和修正 orderIndex 一致性...');
    
    // 獲取所有活躍狀態的客戶，保持現有的orderIndex順序
    const activeRecords = await WaitingRecord.find({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: 1 }); // 按照現有的orderIndex排序，保持相對順序
    
    console.log(`找到 ${activeRecords.length} 個活躍客戶記錄`);
    
    // 重新分配連續的 orderIndex (1, 2, 3, ...)，但保持相對順序
    let needsUpdate = false;
    for (let i = 0; i < activeRecords.length; i++) {
      const correctOrderIndex = i + 1;
      if (activeRecords[i].orderIndex !== correctOrderIndex) {
        console.log(`修正客戶 ${activeRecords[i].queueNumber} 的 orderIndex: ${activeRecords[i].orderIndex} → ${correctOrderIndex}`);
        activeRecords[i].orderIndex = correctOrderIndex;
        await activeRecords[i].save();
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      console.log('已完成 orderIndex 一致性修正（保持原有相對順序）');
    } else {
      console.log('orderIndex 已是連續狀態，無需修正');
    }
  } catch (error) {
    console.error('確保 orderIndex 一致性時發生錯誤:', error);
  }
}

// 獲取候位列表
exports.getQueueList = async (req, res) => {
  try {
    // 列表查看時不重新排序，保持管理員手動調整的順序
    
    // 獲取過濾參數
    const { status, page, limit } = req.query;
    
    // 構建查詢條件
    const query = {};
    if (status) {
      // 支援多狀態查詢
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        // 支援逗號分隔的狀態字串
        const statusArray = status.split(',').map(s => s.trim());
        query.status = { $in: statusArray };
      } else {
        // 單一狀態查詢
        query.status = status;
      }
    } else {
      // 如果沒有指定狀態，則排除已取消和已完成的記錄（主列表）
      query.status = { $in: ['waiting', 'processing'] };
    }
    
    // 使用聚合管道，主要按orderIndex排序
    const pipeline = [
      { $match: query },
      {
        $sort: {
          orderIndex: 1      // 主要按orderIndex排序
        }
      }
    ];
    
    // 如果有分頁參數，則添加分頁邏輯
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });
    }
    
    const records = await WaitingRecord.aggregate(pipeline);
    
    // 計算總記錄數
    const total = await WaitingRecord.countDocuments(query);
    
    // 構建響應數據
    const responseData = {
      records,
      pagination: {
        total,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : total,
        pages: limit ? Math.ceil(total / parseInt(limit)) : 1
      }
    };
    
    res.status(200).json({
      success: true,
      data: responseData
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

// 呼叫下一位（一鍵完成：標記完成 + 更新時間 + orderIndex遞補）
exports.callNext = async (req, res) => {
  try {
    // 確保 orderIndex 的一致性
    await ensureOrderIndexConsistency();
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 查找 orderIndex=1 的客戶（第一位候位客戶）
    const firstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });
    
    if (!firstRecord) {
      return res.status(404).json({
        success: false,
        message: '目前沒有可叫號的客戶'
      });
    }
    
    // 設置完成時間
    const now = new Date();
    firstRecord.status = 'completed';
    firstRecord.completedAt = now;
    await firstRecord.save();
    
    // 更新系統設定：當前叫號和上一位辦完時間
    settings.currentQueueNumber = firstRecord.queueNumber;
    settings.lastCompletedTime = now;
    await settings.save();
    
    // 批量更新其他客戶的 orderIndex（所有活躍客戶 orderIndex - 1）
    await WaitingRecord.updateMany(
      { 
        status: { $in: ['waiting', 'processing'] },
        _id: { $ne: firstRecord._id }  // 排除已完成的客戶
      },
      { $inc: { orderIndex: -1 } }
    );
    
    // 重新確保 orderIndex 一致性
    await ensureOrderIndexConsistency();
    
    // 查找新的第一位客戶（用於返回資訊）
    const newFirstRecord = await WaitingRecord.findOne({
      orderIndex: 1,
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 返回叫號結果
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
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 更新候位狀態
exports.updateQueueStatus = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { status } = req.body;
    
    // 檢查狀態值是否有效
    if (!['waiting', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值'
      });
    }
    
    // 查找並更新候位記錄
    const record = await WaitingRecord.findById(queueId);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    // 記錄原始狀態
    const originalStatus = record.status;
    
    // 更新狀態
    record.status = status;
    
    // 如果標記為完成，設置完成時間並更新系統設定
    if (status === 'completed') {
      const now = new Date();
      record.completedAt = now;
      
      // 同時更新系統設定中的上一位辦完時間
      const settings = await SystemSetting.getSettings();
      settings.lastCompletedTime = now;
      await settings.save();
    }
    
    // 如果從已完成狀態變為其他狀態，清空完成時間
    if (originalStatus === 'completed' && status !== 'completed') {
      record.completedAt = null;
    }
    
    // 如果恢復到等待狀態，需要重新分配 orderIndex
    if (status === 'waiting' && ['completed', 'cancelled'].includes(originalStatus)) {
      // 獲取目前最大的 orderIndex
      const maxOrderRecord = await WaitingRecord.findOne({
        status: { $in: ['waiting', 'processing'] }
      }).sort({ orderIndex: -1 });
      
      const newOrderIndex = maxOrderRecord ? maxOrderRecord.orderIndex + 1 : 1;
      record.orderIndex = newOrderIndex;
    }
    
    await record.save();
    
    res.status(200).json({
      success: true,
      message: '候位狀態更新成功',
      data: record
    });
  } catch (error) {
    console.error('更新候位狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設置下次辦事時間
exports.setNextSessionDate = async (req, res) => {
  try {
    const { nextSessionDate } = req.body;
    
    // 驗證日期格式
    if (!nextSessionDate || isNaN(new Date(nextSessionDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: '無效的日期格式'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新下次辦事時間
    settings.nextSessionDate = new Date(nextSessionDate);
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: '下次辦事時間設置成功',
      data: {
        nextSessionDate: settings.nextSessionDate
      }
    });
  } catch (error) {
    console.error('設置下次辦事時間錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 開關候位功能
exports.toggleQueueStatus = async (req, res) => {
  try {
    const { isOpen } = req.body;
    
    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOpen 必須是布爾值'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新開放狀態
    settings.isQueueOpen = isOpen;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `辦事服務已${isOpen ? '開始' : '停止'}`,
      data: {
        isQueueOpen: settings.isQueueOpen
      }
    });
  } catch (error) {
    console.error('切換候位狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定最大叫號順序上限
exports.setMaxOrderIndex = async (req, res) => {
  try {
    const { maxOrderIndex } = req.body;
    
    if (!Number.isInteger(maxOrderIndex) || maxOrderIndex < 1) {
      return res.status(400).json({
        success: false,
        message: '最大叫號順序上限必須是大於0的整數'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 檢查目前最大的 orderIndex 是否超過新設定的上限
    const maxOrderIndexRecord = await WaitingRecord.findOne({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: -1 });
    const currentMaxOrderIndex = maxOrderIndexRecord ? maxOrderIndexRecord.orderIndex : 0;
    
    if (currentMaxOrderIndex > maxOrderIndex) {
      return res.status(400).json({
        success: false,
        message: `無法設定，目前最大叫號順序為 ${currentMaxOrderIndex}，新上限不能小於此數字`
      });
    }
    
    // 更新最大叫號順序上限
    settings.maxOrderIndex = maxOrderIndex;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `最大叫號順序上限已設定為 ${maxOrderIndex}`,
      data: {
        maxOrderIndex: settings.maxOrderIndex
      }
    });
  } catch (error) {
    console.error('設定最大叫號順序上限錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 更新候位順序
exports.updateQueueOrder = async (req, res) => {
  try {
    console.log('接收到更新順序請求:', req.body);
    const { queueId, newOrder } = req.body;
    
    if (!queueId || newOrder === undefined || newOrder === null) {
      console.error('請求參數無效:', req.body);
      return res.status(400).json({
        success: false,
        message: '請求缺少必要參數：queueId 或 newOrder'
      });
    }

    if (typeof newOrder !== 'number' || newOrder < 1) {
      console.error('newOrder參數無效:', newOrder);
      return res.status(400).json({
        success: false,
        message: 'newOrder必須是正整數'
      });
    }

    // 查找要更新的記錄
    const recordToUpdate = await WaitingRecord.findById(queueId);
    if (!recordToUpdate) {
      console.error(`找不到ID為 ${queueId} 的記錄`);
      return res.status(404).json({
        success: false,
        message: '找不到該候位記錄'
      });
    }

    console.log(`找到記錄:`, {
      _id: recordToUpdate._id,
      queueNumber: recordToUpdate.queueNumber,
      orderIndex: recordToUpdate.orderIndex,
      status: recordToUpdate.status
    });
    
    // 拖曳更新順序時不需要重新排序整個列表，直接使用現有的orderIndex進行調整
    
    // 確保recordToUpdate有orderIndex
    const currentOrder = recordToUpdate.orderIndex || 0;
    console.log(`目前順序: ${currentOrder}, 新順序: ${newOrder}`);
    
    if (currentOrder === newOrder) {
      return res.status(200).json({
        success: true,
        message: '順序未變更',
        data: { record: recordToUpdate }
      });
    }

    // 檢查newOrder是否超出範圍
    const totalRecords = await WaitingRecord.countDocuments();
    if (newOrder > totalRecords) {
      console.error(`新順序 ${newOrder} 超出了總記錄數 ${totalRecords}`);
      return res.status(400).json({
        success: false,
        message: `新順序 ${newOrder} 超出了總記錄數 ${totalRecords}`
      });
    }
    
    // 執行重新排序
    try {
      if (currentOrder < newOrder) {
        // 向下移動：currentOrder和newOrder之間的記錄順序減1
        console.log(`向下移動: 更新介於 ${currentOrder} 和 ${newOrder} 之間的記錄`);
        await WaitingRecord.updateMany(
          { 
            orderIndex: { $gt: currentOrder, $lte: newOrder },
            _id: { $ne: queueId }
          },
          { $inc: { orderIndex: -1 } }
        );
      } else {
        // 向上移動：newOrder和currentOrder之間的記錄順序加1
        console.log(`向上移動: 更新介於 ${newOrder} 和 ${currentOrder} 之間的記錄`);
        await WaitingRecord.updateMany(
          { 
            orderIndex: { $gte: newOrder, $lt: currentOrder },
            _id: { $ne: queueId }
          },
          { $inc: { orderIndex: 1 } }
        );
      }
      
      // 更新目標記錄的順序
      recordToUpdate.orderIndex = newOrder;
      await recordToUpdate.save();
      
      console.log(`記錄 ${queueId} 順序已更新為 ${newOrder}`);
    } catch (sortError) {
      console.error('排序操作失敗:', sortError);
      return res.status(500).json({
        success: false,
        message: '排序操作失敗',
        error: sortError.message
      });
    }
    
    // 獲取更新後的記錄，排除已取消的客戶（只返回候位列表中應該顯示的記錄）
    const updatedRecords = await WaitingRecord.find({
      status: { $ne: 'cancelled' }  // 排除已取消的記錄，與getQueueList的過濾邏輯保持一致
    }).sort({ orderIndex: 1 });
      
    console.log('返回更新後的記錄列表，數量:', updatedRecords.length);
    
    res.status(200).json({
      success: true,
      message: '候位順序更新成功',
      data: {
        record: recordToUpdate,
        allRecords: updatedRecords
      }
    });
  } catch (error) {
    console.error('更新候位順序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: error.message || '未知錯誤'
    });
  }
};

// 更新客戶資料
exports.updateQueueData = async (req, res) => {
  try {
    const { queueId } = req.params;
    let updateData = req.body;
    
    // 查找候位記錄
    const record = await WaitingRecord.findById(queueId);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    // 允許重複號碼，不進行檢查 - 由前端視覺提醒處理
    
    // 仿效登記候位的處理流程：前端已處理年份轉換，後端只需進行日期轉換
    
    // 在保存前進行日期自動轉換（國曆轉農曆或農曆轉國曆）
    updateData = autoFillDates(updateData);
    
        // 處理家人資料的日期轉換
    if (updateData.familyMembers && updateData.familyMembers.length > 0) {
      // 清理家人資料中的 _id 欄位（如果存在）
      updateData.familyMembers = updateData.familyMembers.map(member => {
        const cleanMember = { ...member };
        delete cleanMember._id; // 移除可能干擾更新的 _id
        return cleanMember;
      });
      
      const familyData = autoFillFamilyMembersDates({ familyMembers: updateData.familyMembers });
      updateData.familyMembers = familyData.familyMembers;
    }

    // 計算虛歲
    updateData = addVirtualAge(updateData);

    // 更新允許的欄位
    const allowedFields = [
      'queueNumber',
      'name', 'email', 'phone', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'addresses', 'familyMembers', 'consultationTopics', 'otherDetails', 'remarks', 'virtualAge'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        record[field] = updateData[field];
      }
    });

    await record.save();
    
    res.status(200).json({
      success: true,
      message: '客戶資料更新成功',
      data: record
    });
  } catch (error) {
    console.error('更新客戶資料錯誤:', error);
    console.error('錯誤詳情:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // 處理MongoDB重複鍵錯誤 (舊的唯一索引仍存在的情況)
    if (error.code === 11000) {
      console.log('檢測到重複鍵錯誤，嘗試移除唯一索引...');
      
      // 嘗試移除queueNumber的唯一索引
      try {
        const WaitingRecord = require('../models/waiting-record.model');
        await WaitingRecord.collection.dropIndex('queueNumber_1');
        console.log('成功移除queueNumber唯一索引');
        
        // 重新嘗試保存
        await record.save();
        return res.status(200).json({
          success: true,
          message: '客戶資料更新成功（已移除重複限制）',
          data: record
        });
      } catch (dropError) {
        console.error('移除索引失敗:', dropError);
        
        return res.status(400).json({
          success: false,
          message: '資料庫索引問題：系統已偵測到重複號碼限制，請聯繫管理員移除資料庫的唯一索引限制。'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {},
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        keyPattern: error.keyPattern
      } : {}
    });
  }
};

// 獲取按排序順序的候位號碼
exports.getOrderedQueueNumbers = async (req, res) => {
  try {
    // 查詢順序1和順序2的記錄
    const order1Record = await WaitingRecord.findOne({ 
      orderIndex: 1, 
      status: { $in: ['waiting', 'processing'] }
    });

    const order2Record = await WaitingRecord.findOne({ 
      orderIndex: 2, 
      status: 'waiting'
    });

    const result = {
      success: true,
      data: {
        currentProcessingNumber: order1Record ? order1Record.queueNumber : null,
        nextWaitingNumber: order2Record ? order2Record.queueNumber : null
      }
    };

    // 更新系統設定中的當前叫號
    if (order1Record) {
      await SystemSetting.updateOne({}, { currentQueueNumber: order1Record.queueNumber });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('獲取排序候位號碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 刪除客戶資料
exports.deleteCustomer = async (req, res) => {
  try {
    const { queueId } = req.params;
    
    // 查找候位記錄
    const record = await WaitingRecord.findById(queueId);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    // 記錄刪除信息用於日誌
    const customerInfo = {
      queueNumber: record.queueNumber,
      name: record.name,
      phone: record.phone,
      orderIndex: record.orderIndex
    };
    
    console.log(`管理員刪除客戶記錄: ${customerInfo.name} (${customerInfo.queueNumber}號)`);
    
    // 獲取被刪除記錄的orderIndex
    const deletedOrderIndex = record.orderIndex;
    
    // 刪除記錄
    await WaitingRecord.findByIdAndDelete(queueId);
    
    // 更新其他記錄的orderIndex，填補空缺
    await WaitingRecord.updateMany(
      { orderIndex: { $gt: deletedOrderIndex } },
      { $inc: { orderIndex: -1 } }
    );
    
    // 確保orderIndex的一致性
    await ensureOrderIndexConsistency();
    
    res.status(200).json({
      success: true,
      message: `客戶 ${customerInfo.name} 的記錄已永久刪除`,
      data: {
        deletedCustomer: customerInfo
      }
    });
  } catch (error) {
    console.error('刪除客戶記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定每位客戶預估處理時間
exports.setMinutesPerCustomer = async (req, res) => {
  try {
    const { minutesPerCustomer } = req.body;
    
    if (!Number.isInteger(minutesPerCustomer) || minutesPerCustomer < 1 || minutesPerCustomer > 120) {
      return res.status(400).json({
        success: false,
        message: '每位客戶預估處理時間必須是1-120分鐘之間的整數'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新每位客戶預估處理時間
    settings.minutesPerCustomer = minutesPerCustomer;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `每位客戶預估處理時間已設定為 ${minutesPerCustomer} 分鐘`,
      data: {
        minutesPerCustomer: settings.minutesPerCustomer
      }
    });
  } catch (error) {
    console.error('設定每位客戶預估處理時間錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定簡化模式
exports.setSimplifiedMode = async (req, res) => {
  try {
    const { simplifiedMode } = req.body;
    
    if (typeof simplifiedMode !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'simplifiedMode 必須是布爾值'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新簡化模式設定
    settings.simplifiedMode = simplifiedMode;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `簡化模式已${simplifiedMode ? '開啟' : '關閉'}`,
      data: {
        simplifiedMode: settings.simplifiedMode
      }
    });
  } catch (error) {
    console.error('設定簡化模式錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定公開候位登記功能
exports.setPublicRegistrationEnabled = async (req, res) => {
  try {
    const { publicRegistrationEnabled } = req.body;
    
    if (typeof publicRegistrationEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'publicRegistrationEnabled 必須是布爾值'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新公開候位登記設定
    settings.publicRegistrationEnabled = publicRegistrationEnabled;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `公開候位登記功能已${publicRegistrationEnabled ? '開啟' : '關閉'}`,
      data: {
        publicRegistrationEnabled: settings.publicRegistrationEnabled
      }
    });
  } catch (error) {
    console.error('設定公開候位登記功能錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取活動報名區塊設定
exports.getEventBanner = async (req, res) => {
  try {
    const settings = await SystemSetting.getSettings();
    
    res.status(200).json({
      success: true,
      message: '獲取活動報名設定成功',
      data: settings.eventBanner
    });
  } catch (error) {
    console.error('獲取活動報名區塊設定錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 更新活動報名區塊設定
exports.updateEventBanner = async (req, res) => {
  try {
    const { enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor } = req.body;
    
    // 驗證 URL 格式（如果提供）
    if (buttonUrl) {
      const urlRegex = /^https?:\/\/.+/i;
      if (!urlRegex.test(buttonUrl)) {
        return res.status(400).json({
          success: false,
          message: 'URL 格式不正確，必須以 http:// 或 https:// 開頭'
        });
      }
    }
    
    // 驗證字體大小格式（如果提供）
    if (titleSize) {
      const sizeRegex = /^\d+(\.\d+)?(rem|px|em)$/;
      if (!sizeRegex.test(titleSize)) {
        return res.status(400).json({
          success: false,
          message: '字體大小格式不正確，請使用 rem、px 或 em 單位'
        });
      }
    }
    
    // 驗證顏色格式（如果提供）
    if (titleColor) {
      const colorRegex = /^#[0-9A-F]{6}$/i;
      if (!colorRegex.test(titleColor)) {
        return res.status(400).json({
          success: false,
          message: '顏色格式不正確，請使用 hex 格式（例如：#1976d2）'
        });
      }
    }
    
    // 驗證背景顏色格式（如果提供）
    if (backgroundColor) {
      const colorRegex = /^#[0-9A-F]{6}$/i;
      if (!colorRegex.test(backgroundColor)) {
        return res.status(400).json({
          success: false,
          message: '背景顏色格式不正確，請使用 hex 格式（例如：#ffffff）'
        });
      }
    }
    
    // 驗證按鈕顏色格式（如果提供）
    if (buttonColor) {
      const colorRegex = /^#[0-9A-F]{6}$/i;
      if (!colorRegex.test(buttonColor)) {
        return res.status(400).json({
          success: false,
          message: '按鈕顏色格式不正確，請使用 hex 格式（例如：#1976d2）'
        });
      }
    }
    
    // 驗證按鈕文字顏色格式（如果提供）
    if (buttonTextColor) {
      const colorRegex = /^#[0-9A-F]{6}$/i;
      if (!colorRegex.test(buttonTextColor)) {
        return res.status(400).json({
          success: false,
          message: '按鈕文字顏色格式不正確，請使用 hex 格式（例如：#ffffff）'
        });
      }
    }
    
    // 驗證對齊方式（如果提供）
    if (titleAlign && !['left', 'center', 'right'].includes(titleAlign)) {
      return res.status(400).json({
        success: false,
        message: '對齊方式必須是 left、center 或 right'
      });
    }
    
    // 驗證字體粗細（如果提供）
    if (fontWeight && !['normal', 'bold'].includes(fontWeight)) {
      return res.status(400).json({
        success: false,
        message: '字體粗細必須是 normal 或 bold'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新活動報名區塊設定
    settings.eventBanner = settings.eventBanner || {};
    if (enabled !== undefined) settings.eventBanner.enabled = enabled;
    if (title !== undefined) settings.eventBanner.title = title;
    if (titleSize !== undefined) settings.eventBanner.titleSize = titleSize;
    if (titleColor !== undefined) settings.eventBanner.titleColor = titleColor;
    if (titleAlign !== undefined) settings.eventBanner.titleAlign = titleAlign;
    if (fontWeight !== undefined) settings.eventBanner.fontWeight = fontWeight;
    if (backgroundColor !== undefined) settings.eventBanner.backgroundColor = backgroundColor;
    if (buttonText !== undefined) settings.eventBanner.buttonText = buttonText;
    if (buttonUrl !== undefined) settings.eventBanner.buttonUrl = buttonUrl;
    if (buttonColor !== undefined) settings.eventBanner.buttonColor = buttonColor;
    if (buttonTextColor !== undefined) settings.eventBanner.buttonTextColor = buttonTextColor;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: '活動報名區塊設定已更新',
      data: settings.eventBanner
    });
  } catch (error) {
    console.error('更新活動報名區塊設定錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 清除所有候位資料
exports.clearAllQueue = async (req, res) => {
  try {
    // 記錄操作前的客戶數量用於日誌
    const totalCustomers = await WaitingRecord.countDocuments();
    
    console.log(`管理員清除所有候位資料，共 ${totalCustomers} 筆記錄`);
    
    // 刪除所有候位記錄
    await WaitingRecord.deleteMany({});
    
    // 重置系統設定中的當前叫號，確保maxOrderIndex為合理值
    const settings = await SystemSetting.getSettings();
    settings.currentQueueNumber = 0;
    // 確保maxOrderIndex不為0，如果為0則重置為預設值100
    if (settings.maxOrderIndex <= 0) {
      settings.maxOrderIndex = 100;
    }
    await settings.save();
    
    console.log('所有候位資料已清除，系統設定已重置');
    
    res.status(200).json({
      success: true,
      message: `已成功清除所有候位資料，共刪除 ${totalCustomers} 筆記錄`,
      data: {
        deletedCount: totalCustomers,
        resetSystemSettings: {
          currentQueueNumber: 0,
          maxOrderIndex: settings.maxOrderIndex
        }
      }
    });
  } catch (error) {
    console.error('清除所有候位資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定客戶總數
exports.setTotalCustomerCount = async (req, res) => {
  try {
    const { totalCustomerCount } = req.body;
    
    if (!Number.isInteger(totalCustomerCount) || totalCustomerCount < 0) {
      return res.status(400).json({
        success: false,
        message: '客戶總數必須是大於等於0的整數'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新客戶總數
    settings.totalCustomerCount = totalCustomerCount;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `客戶總數已設定為 ${totalCustomerCount}`,
      data: {
        totalCustomerCount: settings.totalCustomerCount
      }
    });
  } catch (error) {
    console.error('設定客戶總數錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 重設客戶總數（自動計算）
exports.resetTotalCustomerCount = async (req, res) => {
  try {
    // 計算當前總客戶數（等待中 + 處理中 + 已完成）
    const waitingCount = await WaitingRecord.countDocuments({ status: 'waiting' });
    const processingCount = await WaitingRecord.countDocuments({ status: 'processing' });
    const completedCount = await WaitingRecord.countDocuments({ status: 'completed' });
    const totalCount = waitingCount + processingCount + completedCount;
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新客戶總數
    settings.totalCustomerCount = totalCount;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: `客戶總數已重設為 ${totalCount}（等待中: ${waitingCount}，處理中: ${processingCount}，已完成: ${completedCount}）`,
      data: {
        totalCustomerCount: settings.totalCustomerCount,
        breakdown: {
          waiting: waitingCount,
          processing: processingCount,
          completed: completedCount
        }
      }
    });
  } catch (error) {
    console.error('重設客戶總數錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定上一位辦完時間
exports.setLastCompletedTime = async (req, res) => {
  try {
    const { lastCompletedTime } = req.body;
    
    // 驗證時間格式
    if (!lastCompletedTime || isNaN(new Date(lastCompletedTime).getTime())) {
      return res.status(400).json({
        success: false,
        message: '無效的時間格式'
      });
    }
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新上一位辦完時間
    settings.lastCompletedTime = new Date(lastCompletedTime);
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: '上一位辦完時間設置成功',
      data: {
        lastCompletedTime: settings.lastCompletedTime
      }
    });
  } catch (error) {
    console.error('設置上一位辦完時間錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 重設上一位辦完時間（自動查找）
exports.resetLastCompletedTime = async (req, res) => {
  try {
    // 查找最後一位已完成的客戶
    const lastCompleted = await WaitingRecord.findOne(
      { status: 'completed', completedAt: { $exists: true, $ne: null } },
      {},
      { sort: { completedAt: -1 } }
    );
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    let newLastCompletedTime;
    let message;
    
    if (lastCompleted) {
      newLastCompletedTime = lastCompleted.completedAt;
      message = `上一位辦完時間已重設為最後一位已完成客戶的時間: ${newLastCompletedTime}`;
    } else {
      // 如果沒有已完成客戶，使用 nextSessionDate 或當前時間
      newLastCompletedTime = settings.nextSessionDate || new Date();
      message = `沒有已完成客戶記錄，上一位辦完時間已重設為: ${newLastCompletedTime}`;
    }
    
    // 檢查是否早於 nextSessionDate
    if (settings.nextSessionDate && newLastCompletedTime < settings.nextSessionDate) {
      newLastCompletedTime = settings.nextSessionDate;
      message = `上一位辦完時間已重設為下次辦事時間: ${newLastCompletedTime}（因早於開始辦事時間）`;
    }
    
    // 更新上一位辦完時間
    settings.lastCompletedTime = newLastCompletedTime;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      message: message,
      data: {
        lastCompletedTime: settings.lastCompletedTime,
        hasCompletedCustomers: !!lastCompleted,
        nextSessionDate: settings.nextSessionDate
      }
    });
  } catch (error) {
    console.error('重設上一位辦完時間錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取下次開科辦事開放報名時間設定
exports.getScheduledOpenTime = async (req, res) => {
  try {
    const settings = await SystemSetting.getSettings();
    return res.status(200).json({
      success: true,
      code: 'OK',
      message: '獲取開放報名時間設定成功',
      data: {
        scheduledOpenTime: settings?.scheduledOpenTime || null
      }
    });
  } catch (error) {
    console.error('獲取開放報名時間設定錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '獲取設定時發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 更新下次開科辦事開放報名時間設定
exports.updateScheduledOpenTime = async (req, res) => {
  try {
    const { scheduledOpenTime } = req.body;
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 更新設定（允許 null 值，表示使用系統自動計算）
    settings.scheduledOpenTime = scheduledOpenTime ? new Date(scheduledOpenTime) : null;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    // 重新設定排程
    const { rescheduleRegistrationOpening } = require('../services/scheduler.service');
    await rescheduleRegistrationOpening();
    
    return res.status(200).json({
      success: true,
      code: 'OK',
      message: '開放報名時間設定已更新',
      data: {
        scheduledOpenTime: settings.scheduledOpenTime
      }
    });
  } catch (error) {
    console.error('更新開放報名時間設定錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '更新設定時發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 設定定時開放開關
exports.setAutoOpenEnabled = async (req, res) => {
  try {
    const { autoOpenEnabled } = req.body;
    const settings = await SystemSetting.getSettings();
    
    settings.autoOpenEnabled = autoOpenEnabled;
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    // 重新設定排程
    const { rescheduleRegistrationOpening } = require('../services/scheduler.service');
    await rescheduleRegistrationOpening();
    
    return res.status(200).json({
      success: true,
      code: 'OK',
      message: `定時開放已${autoOpenEnabled ? '啟用' : '停用'}`,
      data: {
        autoOpenEnabled: settings.autoOpenEnabled
      }
    });
  } catch (error) {
    console.error('設定定時開放錯誤:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '設定失敗'
    });
  }
}; 