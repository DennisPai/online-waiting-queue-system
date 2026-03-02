# Tech Spec：客戶永久資料庫 — Phase 1「結束本期」+ Household

> **狀態**：待開發  
> **PRD**：`memory/plans/customer-permanent-db-PRD.md`（大總管 workspace）  
> **日期**：2026-03-02  
> **性質**：一次性設計文件，開發完成後歸檔

---

## 概要

在現有 Customer CRUD（P2-4 已完成）基礎上，新增：
1. **「結束本期」API** — 取代 `DELETE /admin/queue/clear-all`，將候位記錄歸檔到客戶永久資料庫
2. **Household 家庭自動分組** — 地址相同的客戶自動歸為同一家庭
3. **前端「結束本期」按鈕** — 取代「清空全部」

---

## 1. DB Schema 變更

### 1.1 Customer model 擴充

在現有 `customer.model.js` 新增欄位：

```js
// 新增欄位
zodiac: { type: String, default: null },              // 生肖（從 WaitingRecord 帶入）
firstVisitDate: { type: Date, default: null },         // 首次來訪日期
lastVisitDate: { type: Date, default: null },          // 最近來訪日期

// 新增索引
customerSchema.index({ name: 1, lunarBirthYear: 1, lunarBirthMonth: 1, lunarBirthDay: 1 });
customerSchema.index({ householdId: 1 });
```

現有欄位不動（name, phone, addresses, tags, notes, totalVisits 等都保留）。

### 1.2 VisitRecord model 擴充

在現有 `visit-record.model.js` 新增欄位：

```js
// 新增欄位
familyMembers: [{                                      // 本次同行家人姓名
  name: String,
  zodiac: String
}],
sourceQueueId: {                                       // 來源候位記錄 ID（可追溯）
  type: mongoose.Schema.Types.ObjectId,
  default: null
}
```

### 1.3 新增 Household model

新建 `household.model.js`：

```js
const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'hospital', 'other'],
    default: 'home'
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }]
}, {
  timestamps: true,
  collection: 'customer_households'
});

module.exports = mongoose.model('Household', householdSchema);
```

---

## 2. 新增 API

### 2.1 POST `/api/v1/admin/queue/end-session`

**「結束本期」— 核心 API**

- **權限**：需管理員登入（JWT）
- **Request Body**：無（操作所有非已取消記錄）
- **Response 200**：
```json
{
  "success": true,
  "code": "OK",
  "message": "本期結束，已歸檔 15 位客戶",
  "data": {
    "totalProcessed": 15,
    "newCustomers": 8,
    "returningCustomers": 7,
    "newHouseholds": 3,
    "skippedCancelled": 2,
    "sessionDate": "2026-03-01T00:00:00.000Z"
  }
}
```
- **Response 409**（重複操作防護）：
```json
{
  "success": false,
  "code": "CONFLICT",
  "message": "目前沒有需要歸檔的候位記錄"
}
```

#### 執行邏輯（Transaction）

```
1. 開啟 MongoDB session + transaction
2. 查詢所有 WaitingRecord where status != 'cancelled'
3. 若為空 → 回傳 409
4. 取得 sessionDate（使用系統設定的 nextSessionDate，若無則用今天）
5. 對每一筆 WaitingRecord：
   a. 主客戶歸檔（見 2.1.1）
   b. 家人歸檔（見 2.1.2）
6. 家庭自動分組（見 2.1.3）
7. 刪除所有 WaitingRecord（包含 cancelled）
8. 重設系統設定：currentQueueNumber=0, totalCustomerCount=0, lastCompletedTime=null
9. Commit transaction
10. 回傳統計
```

若任何步驟失敗 → abort transaction，不改動任何資料。

#### 2.1.1 主客戶歸檔邏輯

```
輸入：一筆 WaitingRecord
比對條件：name（trim 後完全相同）+ lunarBirthYear + lunarBirthMonth + lunarBirthDay

IF 找到已存在的 Customer：
  - totalVisits += 1
  - lastVisitDate = sessionDate
  - 更新 phone（若有新值）
  - 更新 addresses（若有新值）
  - 更新 zodiac（若有新值）
  - 建立 VisitRecord
ELSE：
  - 建立新 Customer（從 WaitingRecord 複製所有欄位）
  - firstVisitDate = sessionDate
  - lastVisitDate = sessionDate
  - totalVisits = 1
  - 建立 VisitRecord
```

#### 2.1.2 家人歸檔邏輯

```
對 WaitingRecord.familyMembers 中的每一位家人：
  - 同樣用 name + lunarBirthYear/Month/Day 比對
  - 新客 → 建立 Customer + VisitRecord
  - 舊客 → 更新 + 建立 VisitRecord
  - 家人的 addresses 繼承主客戶的 addresses
  - 家人的 phone 繼承主客戶的 phone（若家人本身沒有）
```

注意：家人可能沒有完整農曆生日（部分欄位為 null）。若 lunarBirthYear 為 null，則只用 name 比對。若同名多人且無法區分，建立新客戶（寧可多建不漏建）。

#### 2.1.3 家庭自動分組邏輯

```
歸檔完成後，對本次所有歸檔的 Customer：
1. 收集所有 Customer 的 addresses[0].address（取第一個地址）
2. 按地址分組（完全相同才分同組）
3. 對每一組：
   a. 查詢是否已有 Household.address == 此地址
   b. 有 → 將新成員加入 memberIds（避免重複）
   c. 沒有且成員 >= 2 人 → 建立新 Household，加入所有成員
   d. 只有 1 人 → 不建立 Household（單人不成家）
4. 更新每個 Customer 的 householdId
```

### 2.2 修改現有 API

#### DELETE `/api/v1/admin/queue/clear-all` → 保留但加警告

- 不刪除此 API（避免 breaking change）
- 加入 response header：`X-Deprecated: Use POST /admin/queue/end-session instead`
- 此 API **不會歸檔**，純清空（緊急用途）

### 2.3 Household 管理 API（Phase 2，本次暫不實作）

預留路徑：
- `GET /api/v1/customers/households` — 家庭列表
- `PUT /api/v1/customers/households/:id` — 手動編輯家庭成員
- `POST /api/v1/customers/households/merge` — 合併家庭
- `POST /api/v1/customers/households/:id/remove-member` — 拆分成員

---

## 3. 前端變更

### 3.1 管理後台 — 取代「清空全部」

**位置**：`AdminSettingsPage.jsx` 或候位列表頁面（視「清空全部」按鈕現在的位置）

- 「清空全部」按鈕 → 改為「結束本期」按鈕
- 點擊後彈出確認 Modal：
  ```
  標題：結束本期
  內容：確定要結束本期嗎？
        本期 {N} 位客戶（不含已取消）的資料將歸檔至永久客戶資料庫。
        此操作不可撤銷。
  按鈕：[取消] [確定結束本期]（紅色/警告色按鈕）
  ```
- 確認後顯示 loading 狀態
- 完成後顯示統計結果 Modal：
  ```
  標題：本期結束 ✅
  內容：
    總處理人數：15
    新客戶：8 人
    回頭客：7 人
    新建家庭：3 組
  按鈕：[確定]
  ```

### 3.2 客戶詳情頁 — 顯示家庭資訊（Phase 2，本次不實作）

`CustomerDetailPage.jsx` 已存在，Phase 2 時擴充家庭成員區塊。

---

## 4. 測試案例

### 4.1 正常流程
- [ ] 有 5 筆候位（3 waiting, 1 completed, 1 cancelled）→ 結束本期 → 4 人歸檔，1 cancelled 不歸檔，候位列表清空
- [ ] 新客戶出現在客戶列表中，totalVisits = 1
- [ ] VisitRecord 正確記錄 sessionDate、consultationTopics、remarks、queueNumber

### 4.2 新舊客比對
- [ ] 同名同農曆生日 → 舊客，totalVisits +1，lastVisitDate 更新
- [ ] 同名不同生日 → 新客
- [ ] 不同名同生日 → 新客
- [ ] 姓名前後有空格 → trim 後比對

### 4.3 家人處理
- [ ] 主客戶帶 2 位家人 → 3 筆 Customer + 3 筆 VisitRecord
- [ ] 家人無農曆生日 → 只用 name 比對
- [ ] 家人地址/電話繼承主客戶

### 4.4 家庭分組
- [ ] 2 個客戶同地址 → 自動歸為同一 Household
- [ ] 3 個客戶 2 個地址 → 2 個 Household
- [ ] 地址差一個字 → 不同 Household（精確匹配）
- [ ] 單人獨立地址 → 不建立 Household

### 4.5 原子性
- [ ] 歸檔中途錯誤 → 資料回滾，候位記錄不受影響
- [ ] 空候位列表 → 回傳 409
- [ ] 重複點擊 → 第二次回傳 409（候位已清空）

### 4.6 向下相容
- [ ] 現有客戶列表/詳情頁正常運作
- [ ] 現有候位登記/查詢不受影響
- [ ] `clear-all` API 仍可使用

---

## 5. 部署注意事項

- 新增 `household.model.js`，需在 app 啟動時 require
- Customer model 新增欄位都有 default，向下相容
- 建議先在 MongoDB 建好新索引再部署
- `clear-all` API 保留但標記 deprecated

---

## 6. 開發順序建議

```
Step 1: Schema 擴充（Customer + VisitRecord + 新建 Household model）
Step 2: end-session controller 核心邏輯（歸檔 + 比對 + transaction）
Step 3: 家庭自動分組邏輯
Step 4: end-session route 掛載 + clear-all deprecation header
Step 5: 前端「結束本期」按鈕 + 確認 Modal + 統計結果 Modal
Step 6: 測試（按 4.1-4.6 跑一遍）
Step 7: 更新 API.md（新增 end-session、Household 預留路徑、deprecated 標記）
```
