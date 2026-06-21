## Why

2026-05-22 code review 問題 5（完整檢測報告見 `/tmp/xiuxuangong_code_review_2026-05-22.md` line 85-100）— **後台管理員編輯客戶資料時，無法把家人地址填進去**。Change A 處理候位流程一致性、Change C 處理生日農曆/移除前台取消，本 Change B 獨立處理這個前後端結構不一致的 bug。

### 根因

**「新增家人」物件結構在系統中不一致**：

| 路徑 | 家人物件地址欄位 | 是否能存進 DB |
|---|---|---|
| 前台 `RegisterForm.jsx` 新增家人（一般民眾報名）| 純量 `address` | ✓ 對應 schema 純量 `address` |
| 後台 `useQueueUI.js:140` `addFamilyMember`（管理員新增家人）| **陣列 `addresses: [{address, addressType}]`** | ❌ schema 沒這欄位、被 Mongoose 靜默丟棄 |
| `waiting-record.model.js` familyMember 子 schema | 純量 `address`（default `'臨時地址'`）| — |
| `visit-record.model.js` familyMember 子 schema | **完全沒有 address 欄位** | ❌ 結束本期歸檔時家人地址永久消失 |

### 症狀

1. **後台「新增家人」必踩**：管理員想加第 4-5 位家人時走後台流程（前台上限 3 是需求、後台 5 給管理員加多）→ `addFamilyMember` 建立的新家人物件用陣列 `addresses[]`，TextField `value={member.address}` 永遠空白、管理員填了也沒對應 state → 送出後陣列被 Mongoose schema 靜默丟棄 → **DB 完全沒存到家人地址**
2. **結束本期歸檔時家人地址永久消失**：即使前台填好 1-3 位家人含地址（pass schema），`end-session` 歸檔到 `VisitRecord` 時 `visit-record.model.js` 的 familyMembers 子 schema 只有 `{name, zodiac}`，**所有家人 address 隨歸檔被丟棄**，未來查歷史紀錄看不到家人地址
3. **`waiting-record` 子 schema default `'臨時地址'` 誤導**：管理員打開編輯 dialog 看到「臨時地址」字串顯示在欄位裡，會誤以為「已有地址」而不去填真正的地址

### 影響範圍

- 後台新增的第 4-5 位家人 100% 失功能（必踩）
- 前台 1-3 位家人地址雖能存進 waiting record，但歸檔到 visit record 後永久消失（歷史查詢看不到）
- waiting record 上未填地址的家人會被 default `'臨時地址'` 填字串、誤導後續編輯

## What Changes

### 修正 1：後台「新增家人」物件結構改純量 `address`（前端）

`frontend/src/hooks/admin/useQueueUI.js:140` 的 `addFamilyMember` 把
```js
addresses: [{ address: '', addressType: 'home' }]
```
改成跟前台 `RegisterForm.jsx` / waiting-record schema 一致的純量結構：
```js
address: '',
addressType: 'home'
```

### 修正 2：visit-record familyMember 子 schema 補齊欄位（後端）

`backend/src/models/visit-record.model.js:24-27` 的 familyMember 子 schema
```js
familyMembers: [{
  name: String,
  zodiac: String
}]
```
擴充對齊 `waiting-record.model.js` familyMember 子 schema 的所有欄位（name / gender / 國曆生日 / 農曆生日 / virtualAge / zodiac / **address** / addressType），確保歸檔時家人完整資料不丟。

### 修正 3：移除 waiting-record 子 schema `address` default `'臨時地址'`（後端）

`backend/src/models/waiting-record.model.js:78` 把 `default: '臨時地址'` 改成 `default: ''`。**僅改 default 不動歷史資料**（歷史 record 的 `'臨時地址'` 字串保留作 audit trail）。前端編輯欄位改用 `placeholder='請輸入地址'` 提示。

### 端對端驗證（Phase 6）

依懷特 5/23 指令「OpenSpec 要包含完整的驗證階段與驗證清單，驗證要包含實際進去系統操作來確定功能正常」：

- **API 類**：直接 curl 報名帶完整家人地址、查 DB raw 文件確認地址有存
- **UI 類**：實際登入測試環境後台、走完管理員「新增家人 → 填地址 → 送出 → 重新打開編輯 → 看地址在」
- **regression**：前台一般報名（1-3 家人含地址）+ 編輯既有家人地址（review 報告說端到端通的、要 regression）
- **歸檔流程**：admin 結束本期 → VisitRecord 是否完整保留家人 address（破壞性、規劃還原方式）
- **本期累計**：Change A 的 issuedCount / orderIndex 不受影響（regression）

## 不在 Change B Scope（明確排除）

- 前後台家人上限差異（前台 3 / 後台 5）— **是需求、不是 bug**（懷特 5/22 糾正過 code review）
- 歷史 record 已存的 `'臨時地址'` 字串清理 — 保留作 audit trail，不在本 Change scope
- VisitRecord 既有資料補家人地址 — 歷史已歸檔的資料缺地址無法回填（資料當下就沒存），不在本 Change scope
- 客戶資料庫（Customer model）的家人結構 — 沒被 code review 點名問題，且若有需要由 Change D 處理
