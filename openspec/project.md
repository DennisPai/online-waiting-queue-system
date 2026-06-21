# 修玄宮線上候位系統 — 專案脈絡（OpenSpec project.md）

> OpenSpec 專案層脈絡檔。任何 propose / apply 前先讀此檔建立共同基準。
> 記載「目前實際怎麼運作 + 慣例」，不寫工程權衡或內部討論。

---

## 1. 專案概述

修玄宮線上候位系統，供宮廟使用。客戶線上報名候位，管理員控制叫號流程、結束本期歸檔。

- **使用者**：客戶（報名 / 查詢候位）+ 管理員（候位管理 / 叫號 / 結束本期 / 客戶資料庫）。
- **使用頻率**：每月辦事前後 1 週密集使用，報名日為負載高峰；網站不停機。
- **結束本期**：每次辦事結束執行一次，把當期候位記錄歸檔到永久客戶資料庫後清空。

---

## 2. 技術棧

| 層 | 技術 |
|---|---|
| 前端 | React + Redux Toolkit（slices + createAsyncThunk）、Material UI、Socket.io client、axios |
| 後端 | Node.js + Express、Mongoose、Socket.io、JWT 驗證、express-validator |
| 資料庫 | MongoDB（雙 DB：候位 DB + 客戶 DB，同一連線以 collection 區隔；單節點，**不支援 ACID transaction**）|
| 部署 | Zeabur（測試 / 正式兩個獨立 Zeabur 專案，前端 nginx、後端 Node）|
| 測試 | Jest（後端 unit；前端 CRA react-scripts + React Testing Library）|

後端分層：`routes/v1/`（薄轉發）→ `controllers/`（HTTP + 回應組裝）→ `services/`（業務邏輯）→ `repositories/`（資料存取）→ `models/` → `utils/` → `config/`。

- Controllers 10 個（8 個 admin 子域在 `controllers/admin/`）。
- Models 8 個（waiting-record / customer / visit-record / household / system-setting / user / log-entry / backup-snapshot）。
- **三層 service+repository 只有 queue 領域走滿**（`QueueService.js` / `QueueRepository.js`）；customer / auth / admin 等領域是 controller 直連 Mongoose model（薄 service 那層省略）。`backend-rules.mdc` 自承 service 層「可選」。

---

## 3. 核心慣例

### 3.1 API 回應信封（v1 envelope）

- 信封定義在 `backend/src/utils/v1-response.js`，攔截 `res.json` 正規化為 `{ success, code, message, data }`，**只作用在 `/api/v1/*`**。
  - 成功：`{ success:true, code:'OK', message:'OK', data }`（任何非標準頂層 key 會被折進 `data`）。
  - 失敗：`{ success:false, code, message, errors? }`。
- **`/health`、`/ready`、`/`（root）為信封例外**：回原始 shape，不經 v1-response。
- **現況 controller 端有兩派寫法並存**（記為現況，非待辦）：約 35 個 handler 只送鬆散 `{ success:true, data }` 靠中介層折疊；約 15 個 handler 自己塞 `code:'OK'`。成功路徑的 `code` 實務上一律 `'OK'`。
- `code` 欄位錯誤時帶語意碼（VALIDATION_ERROR / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / INTERNAL_ERROR），另有 controller 實際 emit 的擴充值（BACKUP_FAILED / CONFIRM_REQUIRED / INVALID_DATE / INVALID_SNAPSHOT / NOT_SUPPORTED / UNKNOWN_COLLECTION）。視為「開放集合 + 命名規約」。
- **API 變更後必須同步 `docs/API.md`**（現行 API 唯一權威；舊引用 `docs/API_SPEC.md` 為幽靈檔，不存在）。

### 3.2 錯誤處理（現況）

- 目標形態：controller 用 `catchAsync` + `throw ApiError.xxx()` 委派 `globalErrorHandler`。
- **現況僅 1/10 controller 達標**（`queue.controller.js`）；其餘 9 個（auth + customer + 8 個 admin）為手刻 `try/catch` + `res.status().json({ success:false, message })`，未走 ApiError。`admin/queue.admin.controller.js` 另有 `handleAdminError` helper（E11000→409、其餘→500）。
- 此文件如實記載「目標 vs 現況」，不假裝已統一；**controller 行為的對齊屬另一條 change，本層不改 controller**。

### 3.3 commit 格式

- **真規範：`[模組] 繁中描述`**（如 `[連線韌性] backend DB 自動重連`、`[fix] admin 取消候位...`）。git log 全部符合。
- 括號標籤混用「類型」（fix / feat / chore / hotfix / docs / UI）與「專案階段」（Change A/B/C、Follow-up patches），非固定枚舉。
- 每個 commit 只做一件事；部署失敗立即 revert。
- `docs/CONTRIBUTING.md` 宣稱的 Conventional Commits（英文 `feat:`）是死條款，0 筆符合，不採用。

### 3.4 status active 集合

- 合法 status enum：`['waiting','processing','completed','cancelled']`（`waiting-record.model.js`）。
- **「active 集合」= `['waiting','processing']`** 為全系統慣例常數，現散落 20+ 處硬編字面量、無單一定義（抽常數屬另一條 change，本層只記載慣例）。
- 無集中狀態機 / transition 表；轉換副作用（恢復重發 orderIndex、取消清 orderIndex、完成寫 completedAt）綁在 controller 流程裡。

### 3.5 命名分層

- model：`{kebab-name}.model.js`，匯出 `module.exports = Model` + `_schema`（供 db.js rebind 雙 DB）。
- controller：`{domain}.controller.js`；admin 子域 `{domain}.admin.controller.js`。
- **service / repo 用 PascalCase 檔名**（`QueueService.js` / `QueueRepository.js`）— 全 repo 唯一例外。
- route 路徑 base `/api/v1`，全 kebab-case，REST 名詞與 RPC 動詞混用（`/queue`、`/end-session`、`/recalc-counters`）。
- 前端 thunk / service 方法命名 `{verb}{Noun}` camelCase。

### 3.6 前端解包約定

- service 層回 `response.data.data || response.data`（先取 v1 內層 data，取不到回退整包）。
- Redux slice **只解一次，禁止 `.data.data` 雙層解包**；fulfilled handler 的 payload 是已解開的 data。

---

## 4. 雙環境開發流程

1. **所有編輯只在測試環境做**（測試 repo / 測試 Zeabur / 測試 MongoDB）。
2. 測試環境做到一個階段、通過驗收後，才「版本更新」同步到正式環境。
3. **正式環境的更動 / push 必須先取得人工核可**，不得擅自操作。
4. push 測試後流程：等 Zeabur 自動部署 → Zeabur API 確認 deployment RUNNING → 打 `/health` → 前端頁面 → 管理後台功能測試。
5. 正式同步：對比測試 vs 正式 repo 差異 commits → 整理 changelog → 回報並等核可 → cherry-pick/merge → 部署 → 驗收 → 出問題立即 revert。

> 環境連線字串、Zeabur Project/Service ID、管理員密碼等敏感資訊**不寫入本檔**，保存在本機 `secrets.env` 與專案 untracked CLAUDE.md。

---

## 5. 測試慣例

- 框架 Jest（後端 unit）/ CRA + React Testing Library（前端）。
- **後端全部用 `jest.mock()` mock Mongoose model，不連真 DB，無 `mongodb-memory-server`**。
- **無整合測試**（`supertest` 列在 devDependencies 但無任何測試實際使用）。
- 檔名 `*.test.js` / `*.test.jsx`，無 `.spec.js`。
- describe 區塊多英文，**test 描述一律繁體中文**（如 `test('用戶不存在應回 404')`）。
- 覆蓋偏斜：queue / 報名核心邏輯紮實；customer / household / backup / event-banner / log 等多無測試。

---

## 6. 關鍵設計決策（安全約束）

- **絕對不用 MongoDB transaction**：Zeabur 單節點不支援 ACID，`abortTransaction()` 不會回滾 `deleteMany`。2026-03-02 曾因此造成候位資料永久遺失事故。
- **刪除操作一律「先寫後刪」**：確認所有寫入（歸檔 / 備份）成功後才 `deleteMany`，失敗時回傳「候位資料未被清除」不靜默失敗。
- **禁止 `mongoose.createConnection()` 建獨立連線**：在 Zeabur 會導致部署崩潰；改用主連線 + schema `collection` 選項。
- `familyMember.address` 預設值是字串 `'臨時地址'`（非 null）：判斷家人有無真實地址時必須排除 `'臨時地址'` 與空字串。

---

## 7. OpenSpec 慣例

- `openspec/changes/{change}/` 含 `proposal.md` + `design.md` + `tasks.md`（+ `specs/`）。
- 已交付並上線的 change → tasks 勾選 + `mv` 到 `openspec/changes/archive/`。
- 進行中（含待人工驗收）的 change 留在 active 區。
- 完成度以「功能是否已上線」為準，不以 grep checkbox 為準（舊 change checkbox 格式曾不一致）。
