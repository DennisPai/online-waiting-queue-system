# API 規格（v1）

## 通用
- Base Path: `/api/v1`
- 認證：`Authorization: Bearer <token>`（管理端）
- 成功：`{ success: true, code: 'OK', message, data }`
- 失敗：`{ success: false, code: 'VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL_ERROR', message, errors? }`
- 分頁格式：`{ page, limit, total, pages }`

## Auth
- POST `/api/v1/auth/login`
  - body: `{ username, password }`
  - 200: `{ success, code, data: { user: { id, username, email, role, mustChangePassword }, token } }`
- GET `/api/v1/auth/me`
  - 200: `{ success, code, data: { id, username, email, role, mustChangePassword } }`
- POST `/api/v1/auth/register` [admin]
  - body: `{ username, password, email, role? }`
  - 201: `{ success, code, data: { id, username, email, role } }`
- PUT `/api/v1/auth/change-password` [login required]
  - body: `{ oldPassword, newPassword }`
  - 200: `{ success, code, message: '密碼已更新', data: { updatedAt } }`

## Queue（公開）
- GET `/api/v1/queue/status`
  - 200: `{ success, code, data: { isOpen, currentQueueNumber, waitingCount, nextSessionDate, maxOrderIndex, minutesPerCustomer, simplifiedMode, publicRegistrationEnabled, autoOpenEnabled, totalCustomerCount, lastCompletedTime, estimatedEndTime, currentMaxOrderIndex, isFull, eventBanner: { enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor }, scheduledOpenTime, message } }`
  - 說明：回傳完整的系統狀態，包含活動報名區塊設定（eventBanner）和下次開科辦事開放報名時間（scheduledOpenTime，Date 型別，可能為 null 表示使用動態計算）、定時開放開關（autoOpenEnabled），確保前端重新整理時不會丟失設定
- POST `/api/v1/queue/register`
  - body: `{ name, phone, email?, gender, addresses, familyMembers?, consultationTopics?, ... }`
  - 201: `{ success, code, data: { queueNumber, orderIndex, waitingCount, estimatedWaitTime, zodiac?, ... } }`
  - 說明：回應中的 `zodiac` 欄位為系統自動根據農曆出生年份計算的生肖
- GET `/api/v1/queue/number/:queueNumber`
  - 200: `{ success, code, data: { queueNumber, status, orderIndex, statusMessage, zodiac?, ... } }`
  - 說明：回應中的 `zodiac` 欄位為客戶的生肖
- GET `/api/v1/queue/search?name&phone`
  - query: `name` (string, optional) - 客戶姓名（支持家人姓名搜尋）
  - query: `phone` (string, optional) - 客戶電話
  - 注意：name 和 phone 至少須提供一個
  - 200: `{ success, code, data: [{ queueNumber, orderIndex, status, statusMessage, peopleAhead, estimatedStartTime, name, phone, zodiac?, ... }], message }`
  - 404: `{ success: false, code: 'NOT_FOUND', message: '查無候位記錄，請確認姓名和電話是否正確' }`
  - 說明：回應中的 `zodiac` 欄位為客戶的生肖
- GET `/api/v1/queue/ordered-numbers`
  - 200: `{ success, code, data: { currentProcessingNumber, nextWaitingNumber } }`
- GET `/api/v1/queue/max-order`
  - 200: `{ success, code, data: { maxOrderIndex, message } }`
- POST `/api/v1/queue/cancel`
  - body: `{ queueNumber, phone }`
  - 200: `{ success, code, message: '取消成功' }`
- PUT `/api/v1/queue/update`
  - body: `{ queueNumber, phone, ...updateData }`
  - 200: `{ success, code, message: '更新成功', data: updatedRecord }`
  - 說明：更新客戶資料時，系統會自動重新計算生肖（若出生日期有變更）

## Admin（需 Bearer）
- GET `/api/v1/admin/queue/list?status=&page=&limit=`
  - 說明：回應中的每筆客戶資料包含 `zodiac` 欄位
- PUT `/api/v1/admin/queue/next`
- PUT `/api/v1/admin/queue/:queueId/status`
- PUT `/api/v1/admin/queue/:queueId/update`
  - 說明：更新客戶資料時，系統會自動重新計算生肖（若出生日期有變更）
- DELETE `/api/v1/admin/queue/:queueId/delete`
- PUT `/api/v1/admin/queue/order`
  - body: `{ queueId, newOrder }`
  - 200: `{ success, code, message: '順序更新成功', data: updatedRecord }`
- PUT `/api/v1/admin/settings/next-session`
  - body: `{ nextSessionDate }`
- PUT `/api/v1/admin/settings/queue-status`
  - body: `{ isOpen }`
- PUT `/api/v1/admin/settings/max-order-index`
  - body: `{ maxOrderIndex }`
- PUT `/api/v1/admin/settings/minutes-per-customer`
  - body: `{ minutesPerCustomer }`
- PUT `/api/v1/admin/settings/simplified-mode`
  - body: `{ simplifiedMode }`
- PUT `/api/v1/admin/settings/public-registration-enabled`
  - body: `{ publicRegistrationEnabled }`
- PUT `/api/v1/admin/settings/total-customer-count`
  - body: `{ totalCustomerCount }`
- POST `/api/v1/admin/settings/reset-customer-count`
- PUT `/api/v1/admin/settings/last-completed-time`
  - body: `{ lastCompletedTime }`
- POST `/api/v1/admin/settings/reset-completed-time`
- GET `/api/v1/admin/settings/event-banner`
  - 200: `{ success, code, message: '獲取活動報名設定成功', data: { enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor } }`
- PUT `/api/v1/admin/settings/event-banner`
  - body: `{ enabled?, title?, titleSize?, titleColor?, titleAlign?, fontWeight?, backgroundColor?, buttonText?, buttonUrl?, buttonColor?, buttonTextColor? }`
  - 200: `{ success, code, message: '活動報名區塊設定已更新', data: { enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor } }`
- GET `/api/v1/admin/settings/scheduled-open-time`
  - 200: `{ success, code, message: '獲取開放報名時間設定成功', data: { scheduledOpenTime } }`
  - 說明：返回 null 表示使用系統自動計算（開科辦事日 + 1天 + 中午12:00整），返回 Date 型別表示使用自訂值
- PUT `/api/v1/admin/settings/scheduled-open-time`
  - body: `{ scheduledOpenTime }` (ISO8601 格式字串或 null)
  - 200: `{ success, code, message: '開放報名時間設定已更新', data: { scheduledOpenTime } }`
  - 說明：傳入 null 恢復使用系統自動計算，傳入 ISO8601 日期字串設定為自訂值，後端會自動重新設定排程任務
- PUT `/api/v1/admin/settings/auto-open-enabled`
  - body: `{ autoOpenEnabled }` (boolean)
  - 200: `{ success, code, message: '定時開放已啟用/停用', data: { autoOpenEnabled } }`
  - 說明：設定是否啟用定時自動開放公開候位登記功能，當啟用時，系統會在 scheduledOpenTime 指定的時間自動開啟 publicRegistrationEnabled，後端會自動重新設定排程任務
- DELETE `/api/v1/admin/queue/clear-all`

## 客戶資料欄位說明
### 生肖欄位（zodiac）
- **類型**：String（可選）
- **說明**：系統自動根據客戶的農曆出生年份計算生肖
- **計算時機**：
  - 客戶報名時自動計算
  - 編輯客戶出生日期後自動重新計算
  - 家人資料也支援生肖計算
- **可能值**：鼠、牛、虎、兔、龍、蛇、馬、羊、猴、雞、狗、豬
- **注意**：生肖計算依賴農曆年份，系統會先進行國農曆轉換（若需要），再計算生肖

## 注意事項
- 所有路由已統一使用 v1 API，舊路由已移除
- 路由命名統一使用 kebab-case（如 `max-order-index`）
- 所有回應格式已統一為 `{ success, code, message, data }`
- 生肖欄位為自動計算欄位，前端不需要也不應該手動設定此欄位

