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
    // 簡化模式只需姓名、phone 選填（與前台登記一致）；若有填才驗格式
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('電話號碼格式不正確'),
    
  // 信箱不做格式驗證（選填、隨便填都放行；2026-06-21 懷特要求拿掉信箱驗證）
  body('email')
    .optional(),
    
  body('gender')
    // 對齊 model enum [male,female,other]——驗證器不可比 model 嚴（否則擋掉 model 認定合法的值）
    // 2026-06-23 修：原 isIn([male,female]) 缺 other、比 model 嚴，與 P0-5 電話/地址/信箱同類漏網
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('性別必須是 male、female 或 other'),
    
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
    // 簡化模式登記送空地址（model address 預設 ''、允許空）；有填才驗格式，空字串跳過
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('地址格式不正確'),
    
  body('addresses.*.addressType')
    .optional()
    .isIn(['home', 'work', 'hospital', 'other'])
    .withMessage('地址類型必須是 home、work、hospital 或 other'),
    
  body('familyMembers')
    .optional()
    .isArray()
    .withMessage('家人資訊必須是陣列格式'),

  // 2026-06-24（WS5）：家人加了就該填完整——對齊 model familyMemberSchema 的 name required:true。
  // 沒加家人完全不觸發（wildcard 無元素不迭代，簡化模式照常）；加了家人卻沒填姓名
  // → 友善 400 而非 model 撞 required → 500。name 無法合理補假值（會變成沒名字的假人）。
  body('familyMembers.*.name')
    .notEmpty()
    .withMessage('家人姓名不能為空')
    .isLength({ min: 1, max: 50 })
    .withMessage('家人姓名長度必須在1-50字符之間'),

  // 2026-06-24（WS5）：家人性別缺漏由後端補 'other'（待填），故 optional；但有填就驗 enum，
  // 對齊 model familyMemberSchema gender enum，避免無效值繞過驗證器後撞 model enum → 500。
  body('familyMembers.*.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('家人性別必須是 male、female 或 other'),

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
