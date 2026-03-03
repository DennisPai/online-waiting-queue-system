# API 文檔

> **⚠️ 這是活文件，API 有任何新增/修改/刪除時必須同步更新此文件。**

Base URL: `/api/v1`  
認證：`Authorization: Bearer <token>`（管理端）

所有回應格式：
```json
{
  "success": true | false,
  "code": "OK | VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
  "message": "描述",
  "data": { ... }
}
```

---

## Auth API (`/api/v1/auth`)

### POST `/auth/login`
登入取得 JWT token。
- **Body:** `{ username, password }`
- **回傳:** `{ user: { id, username, email, role, mustChangePassword }, token }`
- **權限:** 公開

### GET `/auth/me`
取得當前登入者資訊。
- **回傳:** `{ id, username, email, role, mustChangePassword }`
- **權限:** 需登入（JWT）

### POST `/auth/register`
建立新使用者（僅管理員）。
- **Body:** `{ username, password, email, role? }`
- **回傳:** `{ id, username, email, role }`
- **權限:** 需登入

### PUT `/auth/change-password`
更改密碼。
- **Body:** `{ oldPassword, newPassword }`
- **驗證:** 新密碼 ≥ 8 字元、含字母與數字、不能與舊密碼相同
- **回傳:** `{ updatedAt }`
- **權限:** 需登入

---

## Queue API (`/api/v1/queue`) — 公開

### GET `/queue/status`
取得系統候位狀態（含設定值）。
- **回傳:** `{ isOpen, currentQueueNumber, maxOrderIndex, minutesPerCustomer, simplifiedMode, publicRegistrationEnabled, showQueueNumberInQuery, waitingCount, totalCustomerCount, lastCompletedTime, nextSessionDate, estimatedEndTime, currentMaxOrderIndex, isFull, eventBanner, scheduledOpenTime, autoOpenEnabled }`
- **說明:** `eventBanner` 含 `{ enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor }`；`scheduledOpenTime` 為 Date 或 null（null 表示使用系統自動計算）

### POST `/queue/register`
公開候位登記。
- **Body:** `{ name, phone, email?, gender?, gregorianBirthYear?, ... , addresses?, familyMembers?, consultationTopics?, otherDetails?, remarks? }`
- **回傳:** `{ queueNumber, orderIndex, waitingCount, estimatedWaitTime, zodiac?, ... }`
- **說明:**
  - 前台報名家人上限：**3 人**；管理員（帶 JWT）上限：**5 人**；超過回傳 400
  - `zodiac` 欄位由系統依農曆生日自動計算（鼠/牛/虎/兔/龍/蛇/馬/羊/猴/雞/狗/豬），前端不需傳入

### GET `/queue/number/:queueNumber`
依候位號碼查詢狀態。
- **回傳:** `{ queueNumber, status, statusMessage, currentQueueNumber, peopleAhead, estimatedStartTime, zodiac?, ... }`

### GET `/queue/search`
依姓名或電話搜尋候位記錄（含家人姓名搜尋）。
- **Query:** `name`, `phone`（至少一個）
- **回傳:** 匹配的候位記錄陣列（含 `zodiac` 欄位）
- **404:** 查無記錄時回傳 `{ success: false, code: 'NOT_FOUND', message: '查無候位記錄' }`

### POST `/queue/cancel`
客戶自行取消候位。
- **Body:** `{ queueNumber, name, phone }`

### GET `/queue/next-waiting`
取得下一個等待中的號碼。
- **Query:** `currentNumber`
- **回傳:** `{ nextWaitingNumber }`

### GET `/queue/ordered-numbers`
取得目前叫號順序（順序 1、2 的號碼）。
- **回傳:** `{ currentProcessingNumber, nextWaitingNumber }`

### GET `/queue/max-order`
取得目前最大 orderIndex。
- **回傳:** `{ maxOrderIndex, currentMaxOrderIndex, isFull }`

### PUT `/queue/update`
管理員更新候位資料（更新後自動重新計算 zodiac）。
- **Body:** 候位記錄欄位
- **權限:** 需登入

---

## Admin API (`/api/v1/admin`) — 全部需登入

### 候位管理（queue.admin.controller）

#### GET `/admin/queue/list`
取得候位列表（含 `zodiac` 欄位與新客戶標示）。
- **Query:** `status`（可選，逗號分隔多狀態）、`page`、`limit`
- **回傳:** `{ records: [...], pagination: { total, page, limit, pages } }`
- 每筆 record 含 `isNewCustomer: true | false | null`（三層匹配查 customer_profiles：農曆年月日 → 電話 → 同名同年；無可匹配資料時為 null）

#### GET `/admin/queue/ordered-numbers`
取得叫號順序（同 Queue API）。

#### PUT `/admin/queue/next`
叫號下一位（標記完成 + orderIndex 遞補）。
- **回傳:** `{ completedCustomer, nextCustomer, currentQueueNumber, lastCompletedTime }`

#### PUT `/admin/queue/:queueId/status`
更新候位狀態。
- **Body:** `{ status }` — `waiting` | `processing` | `completed` | `cancelled`

#### PUT `/admin/queue/:queueId/update`
更新客戶資料（姓名、生日、地址、家人等；更新出生日期後自動重新計算 zodiac）。
- **Body:** 候位記錄允許更新的欄位

#### DELETE `/admin/queue/:queueId/delete`
永久刪除客戶記錄。

#### PUT `/admin/queue/order`
更新候位順序（拖曳排序）。
- **Body:** `{ queueId, newOrder }`
- **回傳:** `{ record, allRecords }`（allRecords 只包含 waiting/processing，不含 completed/cancelled）
- **注意:** `countDocuments`/`updateMany` 只操作 waiting/processing 狀態，不影響其他記錄

#### POST `/admin/queue/end-session`
**結束本期** — 將所有非取消候位記錄歸檔至客戶永久資料庫，並清空候位資料。
- **Body:** 無
- **回傳:** `{ totalProcessed, newCustomers, returningCustomers, newHouseholds, skippedCancelled, sessionDate }`
- **409:** 無需歸檔的記錄（候位已清空）

#### GET `/admin/logs`
查詢 API Log。
- **Query:** `page`、`limit`（預設 50）、`method`、`path`（模糊）、`tag`、`from`/`to`（ISO 8601）、`statusCode`
- **回傳:** `{ logs: [...], pagination: { total, page, limit, pages } }`
- 每筆 log 含：`timestamp`, `method`, `path`, `statusCode`, `responseTimeMs`, `ip`, `userId`, `requestBody`（敏感欄位已遮蔽）, `tags`, `error`
- Tags 說明：`admin`（管理端）、`write`（POST/PUT/DELETE）、`danger`（DELETE/end-session）、`error`（statusCode ≥ 400）

#### POST `/admin/customers/rebuild-households`
重建 Household 歸組（修正臨時地址污染後使用）。
- **Body:** 無
- **動作:** 刪除所有 Household → 清除所有客戶的 householdId → 按真實地址重新歸組（跳過「臨時地址」，同地址 ≥ 2 人才建立）
- **回傳:** `{ deletedHouseholds, newHouseholds, assignedCustomers, skippedTempAddress }`

#### DELETE `/admin/queue/clear-all`
⚠️ **已棄用（Deprecated）** — 請改用 `POST /admin/queue/end-session`。  
緊急清空所有候位資料（不歸檔）。回應 header 含 `X-Deprecated: Use POST /admin/queue/end-session instead`。

### 系統設定（settings.admin.controller）

#### PUT `/admin/settings/next-session`
設定下次辦事時間。
- **Body:** `{ nextSessionDate }` — ISO 8601

#### PUT `/admin/settings/queue-status`
開關辦事服務。
- **Body:** `{ isOpen }` — boolean

#### PUT `/admin/settings/max-order-index`
設定候位上限。
- **Body:** `{ maxOrderIndex }` — integer ≥ 1

#### PUT `/admin/settings/minutes-per-customer`
設定每位客戶預估處理時間。
- **Body:** `{ minutesPerCustomer }` — integer 1~120

#### PUT `/admin/settings/simplified-mode`
開關簡化模式。
- **Body:** `{ simplifiedMode }` — boolean

#### PUT `/admin/settings/public-registration-enabled`
開關公開候位登記。
- **Body:** `{ publicRegistrationEnabled }` — boolean

#### PUT `/admin/settings/show-queue-number-in-query`
開關查詢頁號碼顯示。
- **Body:** `{ showQueueNumberInQuery }` — boolean

#### PUT `/admin/settings/total-customer-count`
設定客戶總數。
- **Body:** `{ totalCustomerCount }` — integer ≥ 0

#### POST `/admin/settings/reset-customer-count`
重設客戶總數（自動計算 waiting + processing + completed）。

#### PUT `/admin/settings/last-completed-time`
設定上一位辦完時間。
- **Body:** `{ lastCompletedTime }` — ISO 8601

#### POST `/admin/settings/reset-completed-time`
重設上一位辦完時間（自動查找最後已完成客戶）。

### 排程設定（schedule.admin.controller）

#### GET `/admin/settings/scheduled-open-time`
取得定時開放報名時間設定。
- **回傳:** `{ scheduledOpenTime, isExpired, autoOpenEnabled }`
- **說明:** `scheduledOpenTime` 為 Date 或 null；null 表示使用系統自動計算（辦事日 +1 天 中午 12:00）

#### PUT `/admin/settings/scheduled-open-time`
更新定時開放報名時間。
- **Body:** `{ scheduledOpenTime }` — ISO 8601 或 null（null 恢復自動計算）
- **說明:** 設定後後端自動重新設定排程任務

#### PUT `/admin/settings/auto-open-enabled`
開關定時自動開放。
- **Body:** `{ autoOpenEnabled }` — boolean
- **說明:** 啟用時系統在 scheduledOpenTime 到達後自動開啟 publicRegistrationEnabled

### 活動報名（event.admin.controller）

#### GET `/admin/settings/event-banner`
取得活動報名區塊設定。
- **回傳:** `{ enabled, title, titleSize, titleColor, titleAlign, fontWeight, backgroundColor, buttonText, buttonUrl, buttonColor, buttonTextColor }`

#### PUT `/admin/settings/event-banner`
更新活動報名區塊設定。
- **Body:** `{ enabled?, title?, titleSize?, titleColor?, titleAlign?, fontWeight?, backgroundColor?, buttonText?, buttonUrl?, buttonColor?, buttonTextColor? }`
- **驗證:** URL 格式、hex 顏色格式、字體大小格式

---

## Customer API (`/api/v1/customers`) — 全部需登入

### GET `/customers`
客戶列表（分頁 + 搜尋）。
- **Query:** `page`（預設 1）、`limit`（預設 20）、`search`（姓名/電話模糊搜尋）、`tag`
- **回傳:** `{ customers: [...], pagination: { total, page, limit, pages } }`

### GET `/customers/:id`
客戶詳情（含同住家人）。
- **回傳:** Customer 物件 + `householdMembers: [{ _id, name, gender, zodiac, totalVisits }]`（排除自己）

### DELETE `/customers/:id`
刪除客戶。
- **動作:** 刪除客戶本身 + 所有 customer_visits 記錄 + 從 Household.memberIds 移除
- **回傳:** `{ message: "客戶已刪除（同時刪除 N 筆來訪記錄）" }`

### POST `/customers`
新增客戶。
- **Body:** `{ name (必填), phone?, email?, gender?, lunarBirthYear?, ..., addresses?, householdId?, tags?, notes? }`
- **回傳:** Customer 物件（使用 `.toJSON()`，不含 mongoose 內部欄位）

### PUT `/customers/:id`
編輯客戶。
- **Body:** 任意 Customer 欄位
- **回傳:** 更新後的 Customer 物件

### GET `/customers/:id/visits`
客戶歷史來訪記錄。
- **Query:** `page`、`limit`
- **回傳:** `{ visits: [...], pagination: { total, page, limit, pages } }`

### POST `/customers/:id/visits`
建立來訪記錄（歷史資料匯入 / 手動補登）。
- **Body:** `{ sessionDate (必填, ISO 8601), consultationTopics?, remarks?, queueNumber?, otherDetails? }`
- **動作:** 建立 VisitRecord + 自動更新 totalVisits+1、firstVisitDate、lastVisitDate
- **回傳:** 建立的 VisitRecord 物件

### DELETE `/customers/:id/visits/:visitId`
刪除單筆來訪記錄。
- **動作:** 刪除 VisitRecord + 重新計算 totalVisits、firstVisitDate、lastVisitDate
- **回傳:** `{ deletedVisitId, totalVisits, firstVisitDate, lastVisitDate }`

---

## 資料模型

### Customer（collection: `customer_profiles`）
| 欄位 | 型別 | 說明 |
|------|------|------|
| name | String | 姓名（必填） |
| phone | String | 電話 |
| email | String | 電子郵件 |
| gender | String | male / female / 空 |
| lunarBirthYear/Month/Day | Number | 農曆生日 |
| gregorianBirthYear/Month/Day | Number | 國曆生日 |
| lunarIsLeapMonth | Boolean | 農曆閏月 |
| zodiac | String | 生肖（系統自動計算） |
| addresses | Array | 地址（address, addressType） |
| householdId | ObjectId | 所屬家庭 ID |
| tags | [String] | 標籤 |
| notes | String | 備註 |
| totalVisits | Number | 累計來訪次數 |
| firstVisitDate | Date | 首次來訪日期 |
| lastVisitDate | Date | 最近來訪日期 |

### VisitRecord（collection: `customer_visits`）
| 欄位 | 型別 | 說明 |
|------|------|------|
| customerId | ObjectId | 關聯 Customer |
| sessionDate | Date | 辦事日期 |
| consultationTopics | [String] | 諮詢主題 |
| otherDetails | String | 其他說明 |
| remarks | String | 備註 |
| queueNumber | Number | 該次候位號碼 |
| familyMembers | [{ name, zodiac }] | 本次同行家人 |
| sourceQueueId | ObjectId | 來源候位記錄 ID（可追溯） |

### Household（collection: `customer_households`）
| 欄位 | 型別 | 說明 |
|------|------|------|
| address | String | 住家地址（index） |
| addressType | String | home / work / hospital / other |
| memberIds | [ObjectId] | 成員的 Customer ID |

---

## 生肖欄位（zodiac）
- 系統自動根據農曆生日計算，前端**不應手動傳入**
- 計算時機：候位登記、編輯出生日期後自動重算
- 可能值：鼠、牛、虎、兔、龍、蛇、馬、羊、猴、雞、狗、豬

---

## 錯誤回應格式
```json
{
  "success": false,
  "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_ERROR",
  "message": "錯誤描述"
}
```

HTTP 狀態碼：
- `200` 成功
- `201` 新增成功
- `400` 參數錯誤（VALIDATION_ERROR）
- `401` 未授權（UNAUTHORIZED）
- `403` 禁止存取（FORBIDDEN）
- `404` 找不到資源（NOT_FOUND）
- `409` 衝突（CONFLICT）
- `500` 伺服器錯誤（INTERNAL_ERROR）
- `503` 服務不可用

---

## 注意事項
- 所有路由使用 v1 API，舊路由已移除
- 路由命名統一使用 kebab-case（如 `max-order-index`）
- `zodiac` 為自動計算欄位，前端不需傳入
