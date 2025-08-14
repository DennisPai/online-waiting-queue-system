const queueService = require('../services/QueueService');
const { catchAsync } = require('../utils/errorHandler');
const ApiError = require('../utils/ApiError');

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
  
  const result = await queueService.searchQueueByNameAndPhone(name, phone);
  
  // 調試：檢查QueueService返回的結果格式
  console.log('QueueService returned:', {
    resultType: typeof result,
    resultKeys: Object.keys(result || {}),
    recordsType: typeof result?.records,
    recordsIsArray: Array.isArray(result?.records),
    recordsLength: result?.records?.length
  });
  
  // 更詳細的調試：檢查 result.records 的內容
  console.log('result.records detailed:', {
    records: result.records,
    recordsKeys: result.records ? Object.keys(result.records) : 'undefined',
    firstRecordType: result.records?.[0] ? typeof result.records[0] : 'undefined'
  });
  
  const responseData = {
    success: true,
    data: result.records,
    message: result.message
  };
  
  // 調試：檢查最終要發送的數據
  console.log('Final response data:', {
    dataType: typeof responseData.data,
    dataIsArray: Array.isArray(responseData.data),
    dataKeys: responseData.data ? Object.keys(responseData.data) : 'undefined'
  });
  
  res.status(200).json(responseData);
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
  searchQueue
};
