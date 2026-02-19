# API 文檔

Base URL: `/api/v1`

所有回應格式：
```json
{
  "success": true|false,
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

### POST `/queue/register`
公開候位登記。
- **Body:** `{ name, phone, email?, gender?, gregorianBirthYear?, ... , addresses?, familyMembers?, consultationTopics?, otherDetails?, remarks? }`
- **回傳:** `{ queueNumber, orderIndex, ... }`

### GET `/queue/number/:queueNumber`
依候位號碼查詢狀態。
- **回傳:** `{ queueNumber, status, statusMessage, currentQueueNumber, peopleAhead, estimatedStartTime, ... }`

### GET `/queue/search`
依姓名或電話搜尋候位記錄。
- **Query:** `name`, `phone`（至少一個）
- **回傳:** 匹配的候位記錄陣列

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
管理員更新候位資料（需登入）。
- **Body:** 候位記錄欄位
- **權限:** 需登入

---

## Admin API (`/api/v1/admin`) — 全部需登入

### 候位管理（queue.admin.controller）

#### GET `/admin/queue/list`
取得候位列表。
- **Query:** `status`（可選，逗號分隔多狀態）、`page`、`limit`
- **回傳:** `{ records: [...], pagination: { total, page, limit, pages } }`

#### GET `/admin/queue/ordered-numbers`
取得叫號順序（同 Queue API）。

#### PUT `/admin/queue/next`
叫號下一位（標記完成 + orderIndex 遞補）。
- **回傳:** `{ completedCustomer, nextCustomer, currentQueueNumber, lastCompletedTime }`

#### PUT `/admin/queue/:queueId/status`
更新候位狀態。
- **Body:** `{ status }` — `waiting` | `processing` | `completed` | `cancelled`

#### PUT `/admin/queue/:queueId/update`
更新客戶資料（姓名、生日、地址、家人等）。
- **Body:** 候位記錄允許更新的欄位

#### DELETE `/admin/queue/:queueId/delete`
永久刪除客戶記錄。

#### PUT `/admin/queue/order`
更新候位順序（拖曳排序）。
- **Body:** `{ queueId, newOrder }`
- **回傳:** `{ record, allRecords }`

#### DELETE `/admin/queue/clear-all`
清除所有候位資料。

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

#### PUT `/admin/settings/scheduled-open-time`
更新定時開放報名時間。
- **Body:** `{ scheduledOpenTime }` — ISO 8601 或 null

#### PUT `/admin/settings/auto-open-enabled`
開關定時自動開放。
- **Body:** `{ autoOpenEnabled }` — boolean

### 活動報名（event.admin.controller）

#### GET `/admin/settings/event-banner`
取得活動報名區塊設定。

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
客戶詳情。
- **回傳:** Customer 物件

### POST `/customers`
新增客戶。
- **Body:** `{ name (必填), phone?, email?, gender?, lunarBirthYear?, ..., addresses?, householdId?, tags?, notes? }`
- **回傳:** Customer 物件

### PUT `/customers/:id`
編輯客戶。
- **Body:** 任意 Customer 欄位
- **回傳:** 更新後的 Customer 物件

### GET `/customers/:id/visits`
客戶歷史來訪記錄。
- **Query:** `page`、`limit`
- **回傳:** `{ visits: [...], pagination: { total, page, limit, pages } }`

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
| addresses | Array | 地址（address, addressType） |
| householdId | String | 戶籍關聯 ID |
| tags | [String] | 標籤 |
| notes | String | 備註 |
| totalVisits | Number | 累計來訪次數 |

### VisitRecord（collection: `customer_visits`）
| 欄位 | 型別 | 說明 |
|------|------|------|
| customerId | ObjectId | 關聯 Customer |
| sessionDate | Date | 辦事日期 |
| consultationTopics | [String] | 諮詢主題 |
| otherDetails | String | 其他說明 |
| remarks | String | 備註 |
| queueNumber | Number | 該次候位號碼 |

---

## 錯誤回應格式
```json
{
  "success": false,
  "message": "錯誤描述",
  "error": {}  // 僅 development 環境
}
```

HTTP 狀態碼：
- `200` 成功
- `201` 新增成功
- `400` 參數錯誤
- `401` 未授權 / 密碼錯誤
- `404` 找不到資源
- `500` 伺服器錯誤
- `503` 服務不可用（如客戶資料庫離線）
