# AGENTS.md — 修玄宮線上候位系統

> 跨工具中立的 agent / 接手工程師入口文件（Claude Code、Cursor 等共用）。
> 內容＝系統架構 + 資料模型 + 設計決策 + 工程慣例 + API 概覽。
> API 完整規格唯一權威：`docs/API.md`。UI 設計規範：`DESIGN.md`。

---

## 專案概述

修玄宮線上候位系統，供修玄宮宮廟使用。客戶線上報名候位，管理員控制叫號流程。

- **使用者**：客戶（報名/查詢候位）+ 管理員（管理候位/叫號/結束本期/客戶資料庫）
- **使用頻率**：每月辦事前後 1 週密集使用，報名日為負載高峰。網站不停機，隨時有客戶查詢
- **結束本期**：每次辦事結束後執行一次（歸檔候位記錄到永久客戶資料庫）
- **技術棧**：React + Redux / Node.js + Express / MongoDB / Zeabur 部署

---

## 系統架構

### 後端（`backend/src/`）

**Controllers（10 個）：**

| 分類 | Controller | 說明 |
|------|-----------|------|
| Admin | `queue.admin.controller.js` | 候位列表管理、叫號、狀態變更、拖動排序 |
| Admin | `end-session.admin.controller.js` | 結束本期（歸檔→客戶DB→清空→重設） |
| Admin | `settings.admin.controller.js` | 系統設定（開關、日期、模式） |
| Admin | `event.admin.controller.js` | 活動公告橫幅 |
| Admin | `schedule.admin.controller.js` | 定時開放 |
| Admin | `household.admin.controller.js` | 家庭自動分組重建 |
| Admin | `backup.admin.controller.js` | 備份管理 + Google Drive 備份 |
| Admin | `log.admin.controller.js` | 操作日誌 |
| Auth | `auth.controller.js` | 登入/登出/改密碼 |
| Customer | `customer.controller.js` | 客戶 CRUD + 來訪記錄 |
| Queue | `queue.controller.js` | 公開候位 API（報名/查詢/狀態） |

**Models（8 個，位於 `backend/src/models/`）：**

| Model 檔 | Collection | 說明 |
|----------|-----------|------|
| `waiting-record.model.js` | waitingrecords | 當期候位記錄（結束本期後清空） |
| `customer.model.js` | customer_profiles | 永久客戶資料（歸檔累積） |
| `visit-record.model.js` | customer_visits | 來訪記錄 |
| `household.model.js` | households | 家庭分組（同地址自動歸組） |
| `system-setting.model.js` | systemsettings | 系統設定（單一 document） |
| `user.model.js` | users | 管理員帳號 |
| `log-entry.model.js` | log_entries | API 操作日誌 |
| `backup-snapshot.model.js` | backup_snapshots | 操作前快照備份 |

> 注意：沒有 `queue.model.js`，候位資料的 model 是 `waiting-record.model.js`。

**Services / Utils（`backend/src/services/`、`backend/src/utils/`）：**

- `QueueService.js` + `QueueRepository.js` — 候位業務邏輯 + 資料存取分離（service/repo 用 PascalCase 檔名，是全 repo 唯一例外）
- `socket.service.js` — Socket.io 即時更新
- `scheduler.service.js` — 定時開放排程
- `utils/snapshot.js` — fire-and-forget 操作前快照
- `utils/calendarConverter.js` — 農曆/國曆轉換
- `utils/middleware.js` — 路由中介層（auth/protect、驗證等；**不是** `backend/src/middleware/`，沒有那個目錄）
- `utils/v1-response.js` — 回應信封封裝
- `utils/errorHandler.js` — 統一錯誤處理（`catchAsync`、`ApiError`）

### 前端（`frontend/src/`）

**主要頁面：**

- 客戶端：報名頁（RegisterForm）→ 成功頁 → 查詢頁（StatusPage）
- 管理端：登入 → Dashboard（候位管理）→ 客戶資料庫 → 設定
- 匯出：Excel 預覽 / PDF 問事單預覽

**元件架構：**

- `components/registration/` — 報名表單 5 區塊（BasicInfo / Address / Family / Consultation / Success）
- `components/admin/` — 管理端元件（QueueTable / CustomerDetail / ExcelPreview / FormTemplate）
- `components/common/` — 通用元件（ConfirmDialog / DataTable / FormField / ProtectedRoute）
- `hooks/admin/` — 管理邏輯 hooks（useQueueData / useQueueActions / useQueueSettings / useQueueUI / useQueueValidation），上層組合為 `useQueueManagementRefactored`

**Redux：**

- 使用 Redux Toolkit（slices pattern）：`redux/slices/`（authSlice / queueSlice / uiSlice）
- 注意：fulfilled handler 的 payload 是已解開的 data，不要多加 `.data`
- 注意：`updateQueueStatus` thunk 同時接受 `{ queueId }` 和 `{ id }`（2026-03-02 修復）

---

## 資料模型重點

### WaitingRecord（當期候位）

- `name` / `phone` / `gender` / `zodiac` — 基本資料
- `lunarBirthYear/Month/Day` + `gregorianBirthYear/Month/Day` — 農曆/國曆生日
- `addresses[]` — 地址陣列，addressType: home/work/hospital/other
- `familyMembers[]` — 家人陣列（各有獨立 name/gender/zodiac/birth/address）
- `consultationTopics[]` — 諮詢主題 enum: body/fate/karma/family/career/relationship/study/blessing/other
- `queueNumber` / `orderIndex` / `status` — 候位號碼 / 排序 / 狀態（waiting/processing/completed/cancelled）
- **⚠️ familyMember.address 預設值是字串 `'臨時地址'`**，判斷有無真實地址時必須排除

### Customer（永久客戶）

- 比對邏輯：`name` + `lunarBirthYear/Month/Day`（農曆年為 null 時只用 name）
- `totalVisits` / `firstVisitDate` / `lastVisitDate` — 自動累計
- `householdId` — 指向 Household（同地址 ≥2 人自動歸組）

### SystemSetting（單一 document）

- `isQueueOpen` / `nextSessionDate` / `currentQueueNumber` / `maxOrderIndex`
- `totalCustomerCount` / `lastCompletedTime` — 預估時間計算用
- `autoOpenEnabled` / `scheduledOpenTime` — 定時開放
- `publicRegistrationEnabled` / `showQueueNumberInQuery` — 前端控制開關
- `simplifiedMode` — 精簡模式
- `minutesPerCustomer` — 每位客戶預估時間（分鐘）

### status `active` 集合

候位「進行中」狀態慣例為 `['waiting', 'processing']`（目前散落多處硬編字面量，無單一常數定義）。

---

## API 概覽

完整規格唯一權威：**`docs/API.md`**。以下僅為快速導覽。

| 分類 | 路徑前綴 | 說明 |
|------|---------|------|
| Auth | `/api/v1/auth` | login / me / register / change-password |
| Queue（公開） | `/api/v1/queue` | status / register / number/:num / search |
| Admin Queue | `/api/v1/admin/queue` | list / next / status / delete / reorder / end-session / clear-all / ordered-numbers |
| Admin Settings | `/api/v1/admin/settings` | next-session / queue-status / max-order / minutes / simplified / public-reg / show-number / customer-count / completed-time / event-banner / scheduled-open / auto-open |
| Admin Other | `/api/v1/admin` | logs / backups / restore / gdrive-backup / backup-logs / migrate / rebuild-households |
| Customer | `/api/v1/customers` | list / get / create / update / delete / visits / create-visit / update-visit / delete-visit |
| Health | `/health` `/ready` | 健康檢查 |

> 端點逐條清單、請求/回應格式、額滿語意（issuedCount）、名額表（cancelled/deleted）一律以 `docs/API.md` 為準。

---

## 工程慣例（整併自 `.cursor/rules/*`）

### v1 API 原則

- 路徑：統一使用 `/api/v1/*`（舊端點已完全移除，v1 為唯一標準）
- 回應信封：最終送到網路上的形狀統一為 `{ success, code, message, data }`。所有有效載荷歸入 `data`，不在頂層再放 `token`、`pagination` 等鍵
- 路由命名：統一 kebab-case（如 `/settings/max-order-index`、`/queue/order`）
- 中介層：`backend/src/routes/v1/index.js` 內已掛載封裝；controller 仍須主動輸出 `{ success, data, message? }`

### 回應信封產生方式（目標慣例 vs 現況）

**目標慣例（建議統一）：** controller 只送鬆散的 `{ success: true, data, message? }`，由 `utils/v1-response.js` 中介層統一補上 `code:'OK'` 並把任何頂層非標準鍵（`token`/`pagination` 等）折進 `data`。controller **不應自己塞 `code:'OK'`**，交給中介層折疊是單一事實來源。

**現況（據實記載，尚未統一）：** 兩派寫法並存，新接手者無法從現有 code 推斷「該不該自己塞 code」——
- 第一派（約 35 個 handler）：只送 `{ success, data }`，靠 `v1-response` 中介層事後折疊。範例 `auth.controller.js`（login 頂層放 token）、`customer.controller.js`、`queue.controller.js`（頂層放 pagination）。
- 第二派（約 15 個 handler）：controller 自己塞成形的 `{ success:true, code:'OK', message, data }`，中介層原樣放行。範例 `customer.controller.js`、各 `admin/*.controller.js`（end-session / household / log / backup）。

> 成功路徑的 `code` 實務上一律是 `'OK'`，沒有任何 controller 在成功時用過非 `'OK'` 的 code。新增 handler 時請走「目標慣例」（只送 `{success, data}`），不要再擴大第二派。

### 回應信封錯誤碼

- 基本錯誤碼：`UNAUTHORIZED` / `FORBIDDEN` / `NOT_FOUND` / `CONFLICT` / `VALIDATION_ERROR` / `INTERNAL_ERROR`
- 成功時：`{ success: true, data: <object|array>, message?: string }`
- 失敗時：`{ success: false, message, errors? }`（必要時帶 `code`）
- Login 例：`data` 內須包含 `token` 與使用者欄位，以利前端 services 單層回傳

### 後端目錄約定

- `backend/src/routes/v1/*`：v1 路由，僅轉發到 controller，不在路由內組 payload
- `backend/src/controllers/*`：商業邏輯與回應組裝（遵循 v1 回應規範）
- `backend/src/services/*`：業務邏輯層（如 `QueueService`）
- `backend/src/repositories/*`：數據訪問層（Repository 模式封裝 Model 操作，如 `QueueRepository`）
- `backend/src/utils/v1-response.js`：回應封裝
- `backend/src/utils/errorHandler.js`：統一錯誤處理（`catchAsync`、`ApiError`）

### 後端架構模式

- 控制器層：僅處理 HTTP 請求/回應，薄層設計
- 服務層：處理業務邏輯（部分簡單操作可在控制器直接處理）
- 資料庫層：Repository 模式封裝 Model 操作
- 命名分層：service/repo 採 PascalCase 檔名（`QueueService.js` / `QueueRepository.js` 為全 repo 唯一例外）；Repository 模式目前僅 queue 領域走滿三層，其餘 controller 直連 model

### 錯誤處理（目標慣例 vs 現況）

**目標慣例：** controller 一律以 `catchAsync`（`utils/errorHandler.js`）包裝、業務錯誤 `throw ApiError.xxx()`，委派全域 `globalErrorHandler` 統一輸出 `{ success:false, code, message, errors? }`。新增 controller 請走此慣例。

**現況（據實記載，尚未統一——不要當成「已統一」）：** 三套機制並存——
- 機制 A（catchAsync + ApiError）：**只有 1/10 個 controller 檔（`queue.controller.js`）採用**，且即使被 catchAsync 包裝，多數 handler 內仍手刻 `res.status().json`，真正 `throw ApiError` 的只有 2 個 handler。
- 機制 B（手刻 `try/catch` + `res.status().json({success:false,message})`，**不**經 ApiError）：約 45 個 handler，是目前的主流——`auth.controller.js` 全部、`customer.controller.js` 全部、所有 `admin/*.controller.js`。
- 機制 C（`handleAdminError` helper，E11000→409 / 其餘→500）：僅 `admin/queue.admin.controller.js` 用，5 個呼叫點。

> 即「統一用 catchAsync」是**目標**而非現狀。同一類 E11000 撞號錯誤目前在 `errorHandler.js`、`QueueRepository.create`、`handleAdminError` 三處各寫一份，尚未集中。修既有 controller 屬另一條 change，本文件只據實記載現況。

### 認證與安全

- JWT：以 `Authorization: Bearer <token>` 驗證；`protect` 作為路由守衛
- 密碼變更：`PUT /api/v1/auth/change-password`；不強制首次登入改密，由管理員自行操作
- 安全：`helmet`、`express-rate-limit`（用於 `/auth/*`、`/queue/register`）、CORS 限定
- 日誌：`morgan`（dev/combined）

### 索引與遷移

- 目標索引：`status`、`orderIndex`、`phone`、`queueNumber`（普通索引）
- 遷移腳本：`backend/scripts/migrations/001_add_indexes.js`

### 健康檢查

- `/health`：服務活性
- `/ready`：含 MongoDB 連線狀態（`readyState === 1` 回 200，否則 503）

### 前端約定

- `API_VERSION` 固定為 `v1`，統一使用 `frontend/src/config/api.js` 提供的 `API_ENDPOINTS`
- `services/*` 一律回傳 `response.data.data || response.data`（統一處理 v1 回應格式）
- Redux slice 只解一次，禁止 `.data.data` 雙層解包
- Error 處理：以 `error.response?.data?.message` 為主，必要時回退為字串
- 管理面板使用 `useQueueManagementRefactored`（組合多個子 hooks）；子 hooks 分離職責，避免巨型 hook
- 管理端「變更密碼」為自主操作，不強制首次登入彈窗
- 大型頁面拆為元件與 hooks；表單驗證抽離 schema（yup/zod 皆可）
- Socket：`socketService` 僅負責事件橋接與通知，不在服務內寫業務邏輯

### 優先使用現有功能

新建任何 API 端點 / 系統設定參數 / 資料庫欄位 / hook / util 之前，先全面搜尋現有實作（`SystemSetting` 模型、`/api/v1/*` 端點、`docs/API.md`、`models/`、`utils/`、`hooks/`、`services/`），優先擴展現有功能。確認沒有現成解法才新建，且須遵循現有命名與結構慣例。

### 測試檔案管理

- 為測試/調試臨時建立的檔案（`test-*`、`*-test.*`、`api-test*`、`debug-*` 等）測試完成後立即刪除，禁止推入版控
- 例外：正式單元測試（`tests/` 或 `__tests__/`）、有明確用途的工具腳本（`init-admin.js`、`update-existing-customers.js`）

### Commit 慣例

- **真規範：`[模組] 繁中描述`**（bracket-prefixed 繁體中文）。實際 `git log` 全部符合此格式（樣本：`[連線韌性] backend DB 自動重連`、`[hotfix] StatusPage 顯示 bug`、`[feat] 新增 POST /admin/migrate`、`[chore] 新增正式環境資料遷移腳本`）。
- 括號標籤可放「類型」（fix/feat/chore/hotfix/docs/UI）或「專案階段」（Change A/B/C、Follow-up patches、連線韌性），非固定枚舉。
- 每個 commit 只做一件事；部署失敗時立即 revert。
- 分支：`main`（線上）、`feat/*`、`fix/*`、`hotfix/*`；測試 remote 走 `test/*`。
- ⚠️ `docs/CONTRIBUTING.md` 舊版宣稱的「Conventional Commits 英文 `feat:`」格式是**死條款**（git log 0 筆符合），已作廢，以本節為準。

---

## 文檔維護 SOP（改動 → 必同步的文檔）

> 動到下列項目時，**同一個 change 內必須同步更新對應文檔**，讓下一個接手的人/agent 讀文檔就能掌握 repo 最新狀態。標 ★ 的有 CI 自動把關（漏更新會紅燈、擋合併）。

| 你改了什麼 | 必須更新 | 強制機制 |
|-----------|---------|---------|
| 新增/移除/修改 API route（`backend/src/routes/v1/`）| ★ `docs/API.md`（端點 + 請求/回應 + 權限）| route↔API.md contract 測試 |
| controller emit 新的回應 `code` | ★ `docs/API.md` code 白名單 + `backend/tests/contract/code-registry.test.js` 的 `WHITELIST` | code 登記測試 |
| 在文檔內引用檔案/目錄路徑 | 確保被引用路徑存在 | ★ 死連結測試 |
| 新增/移除 controller / model / service | `AGENTS.md`「系統架構」段 | docs-sync hook 提醒 + review |
| 改資料 schema / 欄位 | `AGENTS.md`「資料模型重點」段 | docs-sync hook 提醒 + review |
| 新增重大設計決策（為何這樣做）| `AGENTS.md`「設計決策紀錄」段 | review |
| 改工程慣例（信封/錯誤處理/命名/分層）| `AGENTS.md`「工程慣例」段 | review |
| 對使用者可見的新功能 | `README.md` 功能清單；管理功能另補 `docs/USER_GUIDE_ADMIN.md` | docs-sync hook 提醒 |
| 改 UI 配色/字體/斷點 | `DESIGN.md` | review |
| 改部署流程 / 環境變數 | `DEPLOYMENT.md` | review |
| 同步到正式環境（release）| `CHANGELOG.md` 最上方加一段版本摘要 | review |

**合併鐵律**：每個 change push 前跑 `cd backend && npm test`（含 3 個 contract 測試：route↔API.md / 死連結 / code 登記）＋ `npm run lint`，全綠才推；`.github/workflows/ci.yml` 在 push / PR 時自動跑同一組閘門。**文檔漂移＝CI 紅燈**，不靠人記得。

---

## 設計決策紀錄

### 不用 Transaction（2026-03-02 事故）

Zeabur 單節點 MongoDB 不支援 ACID transaction。`startSession()` 可能成功但 `abortTransaction()` 不會回滾 deleteMany。end-session 原本用 transaction 包 deleteMany，abort 後候位資料永久遺失。改為應用層「先寫後刪」安全順序。**絕對不用 MongoDB transaction。**

### 先寫後刪

所有涉及資料清除的操作，必須確認所有寫入（歸檔/備份）成功後，才執行 deleteMany。失敗時回傳「候位資料未被清除」，不靜默失敗。

### familyMember address 預設值

`familyMemberSchema.address` 預設值是字串 `'臨時地址'`（不是 null）。判斷家人有無真實地址時，必須排除 `'臨時地址'` 和空字串，否則 `fm.address ? ...` 永遠 truthy。

### 客戶比對邏輯

`findOrCreateCustomer`：以 `name` + `lunarBirthYear/Month/Day` 比對。農曆年為 null 時只用 name（家人沒完整生日的情況）。

### autoGroupHouseholds

取每位客戶 `addresses[0].address.trim()` 作分組鍵，同地址 ≥2 人自動建立/更新 Household。字串完全一致才歸組。

### Snapshot 備份

`saveSnapshot()` 是 fire-and-forget（`.catch(e => console.error(...))`），主流程不等它完成。目的是高風險操作前留紀錄，但不讓備份失敗阻斷主流程。

### 獨立 mongoose 連線禁止

不要用 `mongoose.createConnection()` 建獨立連線——在 Zeabur 會導致部署崩潰。改用主連線 + schema `collection` 選項指定不同 collection name。

---

## 已知限制與技術債（backlog）

1. **候位列表每筆查 DB 判斷新客** — 32 筆 = 32 次查詢，人數多時效能堪慮
2. **PDF 問事單中文亂碼** — jsPDF 中文字體問題（目前以 html2canvas 截圖繞過）
3. **PDF 樣式未按 `docs/修玄宮問事單.jpg` 重設計**
4. **表單驗證未統一化** — 未導入 yup/zod schema
5. ~~結束本期無冪等保護~~ — ✅ 已修（P0-7：sessionEnding 原子鎖 + 前端送出即 disable）
6. **結束本期歸檔 waiting/processing 狀態的客戶** — 未真正辦事但被當成已辦理歸檔
7. ~~`docs/USER_GUIDE_ADMIN.md` 過薄（25 行）~~ — ✅ 已補齊完整管理員手冊（2026-06-21，涵蓋 end-session / 客戶DB / 疑似重複複核 / 定時開放 / 活動橫幅 / 備份 / 日誌 / 匯出 / 維運）

---

## 關鍵檔案速查

| 想知道什麼 | 看哪份 |
|-----------|--------|
| 整個 repo 怎麼運作、架構、資料模型、設計決策、工程慣例 | 本檔 `AGENTS.md` |
| API 端點/回應格式/額滿語意 | `docs/API.md`（唯一權威） |
| UI 配色/字體/斷點 | `DESIGN.md` |
| 怎麼部署上 Zeabur | `DEPLOYMENT.md` |
| 客戶端使用情境/驗收 | `docs/USER_SCENARIOS_CUSTOMER.md` |
| 管理員怎麼操作 | `docs/USER_GUIDE_ADMIN.md` |
| 事故/維運教訓 | `docs/incident-2026-06-08-mongodb-outage.md` |

### 後端探索入口

- 路由：`backend/src/routes/v1/`（auth / queue / admin）
- 控制器：`backend/src/controllers/`
- 模型：`backend/src/models/`（8 個，見上方對照表；無 `queue.model.js`）
- 中介層：`backend/src/utils/middleware.js`（無獨立 `middleware/` 目錄）
- 工具：`backend/src/utils/`（`v1-response.js`、`errorHandler.js`、`calendarConverter.js` 等）

### 前端探索入口

- 頁面：`frontend/src/pages/`
- 元件：`frontend/src/components/`（admin/ registration/ common/ layout/）
- 狀態：`frontend/src/redux/slices/`（authSlice / queueSlice / uiSlice）
- 服務：`frontend/src/services/`
- Hooks：`frontend/src/hooks/admin/`
