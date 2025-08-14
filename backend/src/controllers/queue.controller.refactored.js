const queueService = require('../services/QueueService');
const { catchAsync } = require('../utils/errorHandler');
const ApiError = require('../utils/ApiError');
const WaitingRecord = require('../models/waiting-record.model');

/**
 * 重構後的候位系統控制器
 * 使用服務層處理業務邏輯，控制器僅負責 HTTP 層處理
 */

/**
 * 登記候位
 */
const registerQueue = catchAsync(async (req, res) => {
  console.log('接收到的登記數據:', req.body);
  
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
  
  console.log('搜索請求參數:', { name, phone });
  
  try {
    const result = await queueService.searchQueueByNameAndPhone(name, phone);
    
    console.log('搜索結果:', result);
    
    res.status(200).json({
      success: true,
      data: result.records,
      message: result.message
    });
  } catch (error) {
    console.error('搜索過程中發生錯誤:', error);
    throw error;
  }
});

/**
 * 調試端點：直接查詢所有候位記錄
 */
const debugRecords = catchAsync(async (req, res) => {
  const allRecords = await WaitingRecord.find({}).limit(10);
  const totalCount = await WaitingRecord.countDocuments({});
  
  console.log('資料庫中的候位記錄數量:', totalCount);
  console.log('前10筆記錄:', allRecords);
  
  res.status(200).json({
    success: true,
    data: {
      totalCount,
      records: allRecords
    },
    message: `資料庫中共有 ${totalCount} 筆候位記錄`
  });
});

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
  debugRecords
};
