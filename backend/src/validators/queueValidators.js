const { body, param, query } = require('express-validator');

/**
 * 候位系統請求驗證器
 * 定義各種 API 端點的輸入驗證規則
 */

/**
 * 登記候位驗證
 */
const validateRegisterQueue = [
  body('name')
    .notEmpty()
    .withMessage('姓名不能為空')
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名長度必須在1-50字符之間'),
    
  body('phone')
    .notEmpty()
    .withMessage('電話號碼不能為空')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('電話號碼格式不正確'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('電子郵件格式不正確'),
    
  body('gender')
    .optional()
    .isIn(['male', 'female'])
    .withMessage('性別必須是 male 或 female'),
    
  body('gregorianBirthYear')
    .optional()
    .isInt({ min: 1, max: 150 })
    .withMessage('出生年必須是1-150之間的整數'),
    
  body('gregorianBirthMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('出生月必須是1-12之間的整數'),
    
  body('gregorianBirthDay')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('出生日必須是1-31之間的整數'),
    
  body('addresses')
    .optional()
    .isArray()
    .withMessage('地址必須是陣列格式'),
    
  body('addresses.*.address')
    .optional()
    .notEmpty()
    .withMessage('地址不能為空'),
    
  body('addresses.*.addressType')
    .optional()
    .isIn(['home', 'work', 'hospital', 'other'])
    .withMessage('地址類型必須是 home、work、hospital 或 other'),
    
  body('familyMembers')
    .optional()
    .isArray()
    .withMessage('家人資訊必須是陣列格式'),
    
  body('consultationTopics')
    .optional()
    .isArray()
    .withMessage('諮詢主題必須是陣列格式'),
    
  body('consultationTopics.*')
    .optional()
    .isIn(['body', 'fate', 'karma', 'family', 'career', 'relationship', 'study', 'blessing', 'other'])
    .withMessage('諮詢主題選項無效')
];

/**
 * 候位號碼參數驗證
 */
const validateQueueNumber = [
  param('queueNumber')
    .isInt({ min: 1 })
    .withMessage('候位號碼必須是正整數')
];

/**
 * 候位ID參數驗證
 */
const validateQueueId = [
  param('id')
    .isMongoId()
    .withMessage('候位ID格式不正確')
];

/**
 * 更新候位狀態驗證
 */
const validateUpdateStatus = [
  ...validateQueueId,
  body('status')
    .isIn(['waiting', 'processing', 'completed', 'cancelled'])
    .withMessage('狀態必須是 waiting、processing、completed 或 cancelled'),
    
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('完成時間必須是有效的日期格式')
];

/**
 * 更新候位順序驗證
 */
const validateUpdateOrder = [
  body('queueId')
    .isMongoId()
    .withMessage('候位ID格式不正確'),
    
  body('newOrder')
    .isInt({ min: 1 })
    .withMessage('新順序必須是正整數')
];

/**
 * 獲取候位列表查詢參數驗證
 */
const validateQueueListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('頁碼必須是正整數'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每頁數量必須是1-100之間的整數'),
    
  query('status')
    .optional()
    .isIn(['waiting', 'processing', 'completed', 'cancelled'])
    .withMessage('狀態篩選值無效'),
    
  query('sortBy')
    .optional()
    .isIn(['orderIndex', 'queueNumber', 'createdAt', 'name'])
    .withMessage('排序字段無效'),
    
  query('sortOrder')
    .optional()
    .isIn(['1', '-1', 'asc', 'desc'])
    .withMessage('排序方式無效')
];

/**
 * 搜索候位記錄驗證
 */
const validateQueueSearch = [
  query('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓名長度必須在1-50字符之間'),
    
  query('phone')
    .optional()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('電話號碼格式不正確')
];

module.exports = {
  validateRegisterQueue,
  validateQueueNumber,
  validateQueueId,
  validateUpdateStatus,
  validateUpdateOrder,
  validateQueueListQuery,
  validateQueueSearch
};
