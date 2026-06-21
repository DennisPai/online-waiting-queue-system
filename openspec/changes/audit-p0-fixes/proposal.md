## Why

2026-06-20 對測試 repo 做了一次全專案稽核：5 個 READ-ONLY 檢查 agent 共報 94 條，再由一個**獨立**評估員（非檢查者）逐條 Read code 驗證、去重、裁決，確認去重後約 40 條實際問題，其中 **10 條列為 P0**（資安 / 資料正確性 / 阻斷功能）。本 change 只修這 10 條 P0；P1×16、P2×13 屬後續另案。

這條 change 正是 `docs-governance` 的 proposal「Scope 邊界」明確 forward-reference 的「稽核 P0/P1 修正 change」——文檔治理只「承認現況 + 由 contract/lint 偵測」，實際修 bug 留給本 change。

**懷特實際回報的 bug（辦事中點核取方框→「伺服器內部錯誤」500）的真正根因是 P0-1**（前端參數錯位、每次必中），不是後端併發 VersionError（known-bug 的誤判，獨立評估員已裁正）。

10 條 P0（皆已親自 Read code 逐行核對 file:line 屬實）：

| # | 一句話問題 | 位置（已核對 2026-06-20）|
|---|---|---|
| P0-1 | 候位列表勾選框「完成」`onChange` 傳 3 參數，handler 只收 2 參數 → `recordId` 收到 event 物件 → URL 變 `/queue/[object Object]/status` → CastError → 500（懷特看到的 bug） | `QueueTable.jsx:347` vs `useQueueActions.js:103` |
| P0-2 | 客戶對話框「標記為已完成」綁 `handleCompleteFromDialog`，但**無任何 hook 定義或 return 此 handler** → 解構為 `undefined` → 點擊拋 `onCompleteFromDialog is not a function` | `AdminDashboardPage.jsx:101,354` + `useQueueActions.js` return 缺定義 |
| P0-3 | `/api/v1/auth/register` 只 `protect` 未 `restrictTo('admin')`，且 controller 直接吃 `body.role` → 任何已登入者可自建 admin（提權 Blocker） | `auth.routes.js:21-29` + `auth.controller.js:63,85` |
| P0-4 | rate limiter 掛 `/api/auth`、`/api/queue/register`，但實際路由前綴是 `/api/v1` → 限流器掛在不存在的路徑、形同虛設，登入端點可無限暴力 | `app.js:58-59`（路由在 `:132 /api/v1`）|
| P0-5 | register route 零 express-validator，文字欄位無長度/字元驗證直接入庫（孤兒驗證器 `validateRegisterQueue` 已存在卻未掛載）| `queue.routes.js:8` + `validators/queueValidators.js:11`（未引用）|
| P0-6 | 結束本期重設 `$set` 只歸零 `currentQueueNumber`，**漏歸零 `issuedCount`/`orderIndexCounter`** → 下一期一開即可能誤判「已額滿」 | `end-session.admin.controller.js:217-223` |
| P0-7 | 結束本期無冪等鎖，雙擊/重送 → 在第一個 `deleteMany` 前進來的第二請求會重複歸檔 → `totalVisits` 翻倍 + 重複 `VisitRecord`（永久客戶庫污染）| `end-session.admin.controller.js:85-214` |
| P0-8 | `autoGroupHouseholds` 取地址分組時**漏排除佔位值 `'臨時地址'`/空字串**（與 VisitRecord 建立階段 `:176` 的正確排除不一致）→ 不相干客戶被錯組成一家人 | `end-session.admin.controller.js:264-267` |
| P0-9 | `findOrCreateCustomer` 在農曆年為 null 時退化為 **name-only 比對** → 同名不同人被併成同一客戶、無法自動拆回 | `end-session.admin.controller.js:25-32` |
| P0-10 | `clearAllQueue` 直接 `deleteMany({})` 整批候位，**無快照、無歸檔**（違反「先寫後刪」鐵律與 2026-03-02 資料遺失事故教訓）| `queue.admin.controller.js:567-591` |

所有 P0 的程式碼在正式環境 `fc043ef` 同樣存在；本 change 一律先在測試 repo 修，驗收 + 懷特核可後才同步正式。

## What Changes

切成 5 個 workstream（逐項證據與驗收見 `tasks.md` / `specs/`）：

- **WS1 完成功能修復（前端，解懷特看到的 500）**：P0-1 統一勾選框 `onChange` 簽名對齊 handler；P0-2 在 `useQueueActions` 補定義並 return `handleCompleteFromDialog`。
- **WS2 認證資安閘門**：P0-3 register 加 `restrictTo('admin')` + controller 對 `role` 做白名單（非 admin 強制 `staff`）；P0-4 limiter path 改 `/api/v1/auth`、`/api/v1/queue/register` + 設 `trust proxy`；P0-5 把既有 `validateRegisterQueue` 掛上 register route。
- **WS3 結束本期資料正確性**：P0-6 重設 `$set` 補 `issuedCount:0, orderIndexCounter:0`；P0-7 加 SystemSetting 原子互斥鎖（搶不到回 409）+ 前端送出即 disable；P0-8 `autoGroupHouseholds` 對齊正確排除 `'臨時地址'`/空字串 + optional chaining；P0-9 把 `findOrCreateCustomer` 從 exact match 升級為「加權模糊比對 + 信心分級 + 人工複核閉環」（容錯 phone typo/生日不一致不拆同人、資訊不足不錯併改標待複核），含新增 Customer 複核欄位、複核 API、最小複核 UI（見 design 決策 D-A；scope 較原案大、懷特已 Discord 知會可否決）。
- **WS4 destructive 操作快照防護**：P0-10 `clearAllQueue` 在 `deleteMany` 前補 `saveSnapshot`（**保留 endpoint，因前端 `useQueueActions.js:224` 實際在用——不可照原稽核「移除 route」建議做，否則壞功能；見 design 決策 D-B**）。
- **WS5 回歸測試 + 獨立驗證**：每條 P0 補對應測試（前端參數鏈 / 資安閘門 / end-session 冪等與歸零 / 快照），解除 `backend/tests/contract/known-issues.test.js` 既有的 2 個 `skip`，並依文檔維護 SOP 同步受影響文檔（`docs/API.md` 若端點行為變更）。

### Scope 邊界（MUST 明確）

- **本 change 負責**：上列 10 條 P0 的業務 code 修正 + 對應回歸測試 + 受影響文檔同步。
- **本 change 不負責**（屬後續另案）：P1×16（農曆民國顯示回歸、restore raw insert gate、錯誤訊息洩漏、帳號列舉、PDF XSS escape、Redux double-wrap、calendarConverter 西元/民國語意、N+1 等）、P2×13（技術債）。`catchAsync`/`ApiError` 全面化屬 P2-4，不在本 change。
- 本 change 對非 P0 項只在測試中順手交叉引用，不擴張修正範圍（避免 scope 蔓延）。

### 執行環境邊界

- 全部變更**只在測試 repo（`DennisPai/open-queue-test`）做**。apply + 測試環境驗收通過、懷特人工核可後，才評估同步正式 repo（`DennisPai/online-waiting-queue-system`）。本 change 不自動推正式。
- 禁用 MongoDB transaction（Zeabur 單節點不支援 ACID）；所有 destructive 操作走「先寫後刪」（先 `saveSnapshot` 再 `deleteMany`）。

## Impact

- 影響檔案（apply 階段，非本提案）：
  - 前端：`QueueTable.jsx`、`useQueueActions.js`、`AdminDashboardPage.jsx`（送出 disable）
  - 後端：`auth.routes.js`、`auth.controller.js`、`app.js`、`queue.routes.js`、`end-session.admin.controller.js`、`queue.admin.controller.js`、`system-setting.model.js`（P0-7 鎖欄位）、`customer.model.js`（P0-9 複核欄位）、`admin.routes.js` + customer/admin controller（P0-9 複核 API）
  - 前端：`QueueTable.jsx`、`useQueueActions.js`、`AdminDashboardPage.jsx`（P0-1/2/7）、新增「疑似重複客戶」最小複核頁（P0-9）
  - 測試：`backend/tests/` 新增/補多個回歸測試、解除 `known-issues.test.js` 2 skip
  - 文檔：受影響端點行為變更時同步 `docs/API.md`（含 P0-9 新增 3 條複核端點；CI contract 測試會擋）
- 風險：P0-7 冪等鎖 / P0-9 併單策略 / P0-3 提權修正涉及行為語意改變，需獨立驗證 agent 跑端對端整合測試（curl + DB 對比），不可只看單元測試綠。詳見 `design.md`。
- 不影響：資料 schema 既有欄位語意（P0-7 僅**新增**一個鎖 flag）、其餘未列端點合約。
