const queueService = require('../services/QueueService');
const { catchAsync } = require('../utils/errorHandler');
const ApiError = require('../utils/ApiError');
const WaitingRecord = require('../models/waiting-record.model');
const SystemSetting = require('../models/system-setting.model');
const { autoFillDates, autoFillFamilyMembersDates, addZodiac, addVirtualAge } = require('../utils/calendarConverter');

/**
 * 重構後的候位系統控制器
 * 使用服務層處理業務邏輯，控制器僅負責 HTTP 層處理
 */

/**
 * 登記候位
 */
const registerQueue = catchAsync(async (req, res) => {
  console.log('接收到的登記數據:', req.body);
  
  // 驗證家人數量：前台用戶最多3人，管理員最多5人
  const isAdmin = req.user !== undefined; // 有 JWT token 則為管理員
  const familyMembers = req.body.familyMembers || [];
  const maxFamilyMembers = isAdmin ? 5 : 3;
  
  if (familyMembers.length > maxFamilyMembers) {
    throw new ApiError(400, `${isAdmin ? '管理員' : '前台報名'}最多可添加${maxFamilyMembers}位家人`, 'VALIDATION_ERROR');
  }
  
  const result = await queueService.registerQueue(req.body);
  
  res.status(201).json({
    success: true,
    message: '候位登記成功',
    data: result
  });
});

/**
 * 獲取候位列表
 */
const getQueueList = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20, sortBy = 'orderIndex', sortOrder = 1 } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder: sortOrder === 'desc' || sortOrder === '-1' ? -1 : 1
  };
  
  const result = await queueService.getQueueList(filters, options);
  
  res.status(200).json({
    success: true,
    data: result.records,
    pagination: result.pagination
  });
});
    
/**
 * 獲取特定候位號碼的狀態
 */
const getQueueNumberStatus = catchAsync(async (req, res) => {
  const { queueNumber } = req.params;
  
  const result = await queueService.getQueueStatus(parseInt(queueNumber));
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * 更新候位狀態
 */
const updateQueueStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, completedAt } = req.body;
  
  const result = await queueService.updateQueueStatus(id, status, completedAt);
  
  res.status(200).json({
    success: true,
    message: '狀態更新成功',
    data: result
  });
});

/**
 * 更新候位順序
 */
const updateQueueOrder = catchAsync(async (req, res) => {
  const { queueId, newOrder } = req.body;
  
  const result = await queueService.updateQueueOrder(queueId, newOrder);
  
  res.status(200).json({
    success: true,
    message: '順序更新成功',
    data: result
  });
});

/**
 * 刪除候位記錄
 */
const deleteQueue = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  await queueService.deleteQueue(id);
  
  res.status(200).json({
    success: true,
    message: '候位記錄已刪除'
  });
});

/**
 * 獲取最大叫號順序
 */
const getMaxOrderIndex = catchAsync(async (req, res) => {
  const result = await queueService.getMaxOrderIndex();
  
  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * 叫號功能
 */
const callNextQueue = catchAsync(async (req, res) => {
  const result = await queueService.callNextQueue();
  
  res.status(200).json({
    success: true,
    message: '叫號成功',
    data: result
  });
});

/**
 * 搜索候位記錄（支持家人姓名搜尋）
 */
const searchQueue = catchAsync(async (req, res) => {
  const { name, phone } = req.query;
  
  const result = await queueService.searchQueueByNameAndPhone(name, phone);
  
  res.status(200).json({
    success: true,
    data: result.records,
    message: result.message
  });
});

/**
 * 獲取候位系統狀態
 */
const getQueueStatus = catchAsync(async (req, res) => {
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    // 若辦事服務已停止，返回相關資訊但仍包含publicRegistrationEnabled狀態
    if (!settings.isQueueOpen) {
      // 即使系統關閉，也計算目前最大的 orderIndex
      const maxOrderIndexRecord = await WaitingRecord.findOne({
        status: { $in: ['waiting', 'processing'] }
      }).sort({ orderIndex: -1 });
      const currentMaxOrderIndex = maxOrderIndexRecord ? maxOrderIndexRecord.orderIndex : 0;
      
      return res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          maxOrderIndex: settings.maxOrderIndex,
          minutesPerCustomer: settings.minutesPerCustomer,
          simplifiedMode: settings.simplifiedMode,
          publicRegistrationEnabled: settings.publicRegistrationEnabled,
          showQueueNumberInQuery: settings.showQueueNumberInQuery !== false,
          nextSessionDate: settings.nextSessionDate,
          currentQueueNumber: 0,
          waitingCount: 0,
          totalCustomerCount: settings.totalCustomerCount || 0,
          lastCompletedTime: settings.lastCompletedTime,
          currentMaxOrderIndex,
          isFull: currentMaxOrderIndex >= settings.maxOrderIndex,
        eventBanner: settings.eventBanner,
        scheduledOpenTime: settings.scheduledOpenTime || null,
          autoOpenEnabled: settings.autoOpenEnabled || false,
          message: '辦事服務目前已停止'
        }
      });
    }
    
    // 獲取叫號順序1的客戶（目前叫號）
    const currentProcessingRecord = await WaitingRecord.findOne({ 
      orderIndex: 1, 
      status: { $in: ['waiting', 'processing'] }
    });
    
    // 更新系統設定中的當前叫號為順序1的客戶號碼
    const currentQueueNumber = currentProcessingRecord ? currentProcessingRecord.queueNumber : 0;
    if (currentProcessingRecord && settings.currentQueueNumber !== currentQueueNumber) {
      settings.currentQueueNumber = currentQueueNumber;
      await settings.save();
    }
    
    // 計算等待中的候位數量（後台管理中狀態為"等待中"的總數）
    const waitingCount = await WaitingRecord.countDocuments({ 
      status: 'waiting'
    });
    
    // 計算目前最大的 orderIndex（用於額滿檢查）
    const maxOrderIndexRecord = await WaitingRecord.findOne({
      status: { $in: ['waiting', 'processing'] }
    }).sort({ orderIndex: -1 });
    const currentMaxOrderIndex = maxOrderIndexRecord ? maxOrderIndexRecord.orderIndex : 0;
    
    // 計算預估結束時間（基於新邏輯：totalCustomerCount * minutesPerCustomer）
    let estimatedEndTime = null;
    if (settings.nextSessionDate && settings.isQueueOpen) {
      // 開始辦事時：使用 totalCustomerCount 計算固定的預估結束時間
      const totalEstimatedTime = (settings.totalCustomerCount || 0) * settings.minutesPerCustomer;
      estimatedEndTime = new Date(settings.nextSessionDate);
      estimatedEndTime.setMinutes(estimatedEndTime.getMinutes() + totalEstimatedTime);
    }
    
    res.status(200).json({
      success: true,
      data: {
        isOpen: settings.isQueueOpen,
        currentQueueNumber: currentQueueNumber,
        maxOrderIndex: settings.maxOrderIndex,
        minutesPerCustomer: settings.minutesPerCustomer,
        simplifiedMode: settings.simplifiedMode,
        publicRegistrationEnabled: settings.publicRegistrationEnabled,
        showQueueNumberInQuery: settings.showQueueNumberInQuery !== false,
        waitingCount,
        totalCustomerCount: settings.totalCustomerCount || 0,
        lastCompletedTime: settings.lastCompletedTime,
        nextSessionDate: settings.nextSessionDate,
        estimatedEndTime: estimatedEndTime ? estimatedEndTime.toISOString() : null,
        currentMaxOrderIndex,
        isFull: currentMaxOrderIndex >= settings.maxOrderIndex,
      eventBanner: settings.eventBanner,
      scheduledOpenTime: settings.scheduledOpenTime || null,
      autoOpenEnabled: settings.autoOpenEnabled || false,
        message: `目前叫號: ${currentQueueNumber}, 等待組數: ${waitingCount}`
      }
    });
});

/**
 * 獲取下一個等待號碼
 */
const getNextWaitingNumber = catchAsync(async (req, res) => {
    const { currentNumber } = req.query;
    
    if (!currentNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供當前號碼'
      });
    }
    
    const currentNum = parseInt(currentNumber);
    
    // 查找當前號碼之後的第一個等待中的號碼
    const nextWaiting = await WaitingRecord.findOne({
      status: 'waiting',
      queueNumber: { $gt: currentNum }
    }).sort({ queueNumber: 1 });
    
    if (!nextWaiting) {
      return res.status(200).json({
        success: true,
        data: {
          nextWaitingNumber: null,
          message: '沒有等待中的號碼'
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        nextWaitingNumber: nextWaiting.queueNumber,
        name: nextWaiting.name,
        phone: nextWaiting.phone
      }
    });
});

/**
 * 客戶取消候位
 */
const cancelQueueByCustomer = catchAsync(async (req, res) => {
    const { queueNumber } = req.body;
    
    if (!queueNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供候位號碼'
      });
    }
    
    // 使用候位號碼查找記錄（候位號碼是唯一標識，不需要額外驗證）
    const record = await WaitingRecord.findOne({ 
      queueNumber: parseInt(queueNumber)
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    if (record.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '此候位已被取消'
      });
    }
    
    if (record.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '此候位已完成，無法取消'
      });
    }
    
    // 更新狀態為已取消
    record.status = 'cancelled';
    await record.save();
    
    res.status(200).json({
      success: true,
      message: '預約取消成功',
      data: record
    });
});

/**
 * 客戶更新候位資料
 */
const updateQueueByCustomer = catchAsync(async (req, res) => {
    const { queueNumber, ...updateData } = req.body;
    
    if (!queueNumber) {
      return res.status(400).json({
        success: false,
        message: '請提供候位號碼'
      });
    }
    
    // 使用候位號碼查找記錄（候位號碼是唯一標識，不需要額外驗證）
    const record = await WaitingRecord.findOne({ 
      queueNumber: parseInt(queueNumber)
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: '查無此候位記錄'
      });
    }
    
    if (record.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '已取消的候位無法修改'
      });
    }
    
    if (record.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '已完成的候位無法修改'
      });
    }
    
    // 仿效登記候位的處理流程：前端已處理年份轉換，後端只需進行日期轉換
    
    // 在保存前進行日期自動轉換（國曆轉農曆或農曆轉國曆）
    let processedUpdateData = autoFillDates(updateData);
    
    // 處理家人資料的日期轉換
    if (processedUpdateData.familyMembers && processedUpdateData.familyMembers.length > 0) {
      const familyData = autoFillFamilyMembersDates({ familyMembers: processedUpdateData.familyMembers });
      processedUpdateData.familyMembers = familyData.familyMembers;
    }

    // 計算生肖
    processedUpdateData = addZodiac(processedUpdateData);

    // 計算虛歲
    processedUpdateData = addVirtualAge(processedUpdateData);
    
    // 允許修改的欄位
    const allowedFields = [
      'name', 'phone', 'email', 'gender',
      'gregorianBirthYear', 'gregorianBirthMonth', 'gregorianBirthDay',
      'lunarBirthYear', 'lunarBirthMonth', 'lunarBirthDay', 'lunarIsLeapMonth',
      'addresses', 'familyMembers', 'consultationTopics', 'otherDetails', 'remarks', 'virtualAge', 'zodiac'
    ];
    
    // 更新資料
    allowedFields.forEach(field => {
      if (processedUpdateData[field] !== undefined) {
        record[field] = processedUpdateData[field];
      }
    });
    
    await record.save();
    
    res.status(200).json({
      success: true,
      message: '資料修改成功',
      data: record
    });
});

/**
 * 獲取順序1和順序2的候位號碼
 */
const getOrderedNumbers = catchAsync(async (req, res) => {
    // 查詢順序1和順序2的記錄
    const order1Record = await WaitingRecord.findOne({ 
      orderIndex: 1, 
      status: { $nin: ['completed', 'cancelled'] }
    });

    const order2Record = await WaitingRecord.findOne({ 
      orderIndex: 2, 
      status: { $nin: ['completed', 'cancelled'] }
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
});

// 別名函數（向後相容）
const getQueueByNameAndPhone = searchQueue;

module.exports = {
  registerQueue,
  getQueueList,
  getQueueNumberStatus,
  updateQueueStatus,
  updateQueueOrder,
  deleteQueue,
  getMaxOrderIndex,
  callNextQueue,
  searchQueue,
  getQueueStatus,
  getNextWaitingNumber,
  cancelQueueByCustomer,
  updateQueueByCustomer,
  getOrderedNumbers,
  getQueueByNameAndPhone
};
