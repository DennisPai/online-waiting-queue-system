> 全部任務只在測試 repo（`DennisPai/open-queue-test`）執行。每條附 findings 證據（`docs-inventory.md` / `conventions.md` / `drift-gaps.md`）。
> 本 change 不修業務 bug、不改 controller/service 行為（見 proposal「Scope 邊界」）。

## 1. WS1 — 架構知識入 git（解「clone 拿不到 how-it-works」）

- [ ] 1.1 建立 tracked `AGENTS.md`，從 `CLAUDE.md` 萃取「對外可分享」內容：系統架構（10 controller / 8 model）、資料模型重點、設計決策紀錄、慣例、API 概覽（指向 `docs/API.md`）。證據：inventory §5、drift B1（CLAUDE.md untracked，是唯一正確架構來源、clone 拿不到）
- [ ] 1.2 整併 `.cursor/rules/{backend,frontend,engineering}-rules.mdc` 三份內容進 `AGENTS.md` 並去重（三者後端/前端段大量重疊）。證據：inventory §1.C（#7-9 互相重疊）、drift C2
- [ ] 1.3 在萃取/整併時順手修掉所有失效引用：`docs/API_SPEC.md`→`docs/API.md`、刪 `docs/ENGINEERING_RULES.md` 自我引用、校正 `backend/src/middleware/`（實為 `utils/middleware.js`）與 `backend/src/models/queue.model.js`（實為 8 個 model 檔，無 queue.model）路徑速查表。證據：drift A6、A7、conventions §4 ⚠️、C8 死檔總表
- [ ] 1.4 確認敏感內容**留在 untracked `CLAUDE.md`、不進 `AGENTS.md`**：secrets.env 變數名、雙環境 Zeabur Project/Service ID、test↔prod repo 對應、`admin/admin123`、正式環境操作流程。證據：inventory §5（CLAUDE.md 含內部運作脈絡不宜原樣進 repo）、design D1
- [ ] 1.5 `AGENTS.md` 完成後 grep 敏感關鍵字（secrets / Zeabur ID / admin123 / PROD_ / 正式 repo 名）確認零洩漏。證據：design Risks（誤洩敏感）
- [ ] 1.6 把 `DESIGN.md` 納入 git（純 UI 規範、無敏感資訊、接手前端必讀；引用 `frontend/src/theme.js`、`docs/修玄宮問事單.jpg` 皆存在）。證據：inventory #4、drift B7（active spec，非封存對象）
- [ ] 1.7 把 tracked 檔內明文 `admin/admin123` 改佔位字串：`DEPLOYMENT.md`（L126-127/L237-238）、`README.md`（L184/L357）、`docs/USER_GUIDE_ADMIN.md`（L6）。證據：drift A15
- [ ] 1.8 刪除死檔 `CLAUDE.md.bak-2026-04-22`（untracked 4/22 備份殘留）。證據：inventory §0/§3、drift C5

## 2. WS2 — API.md 對帳成契約唯一來源

- [ ] 2.1 把 `docs/API.md` 補齊到實際 **57 條 v1 route**（admin 35 / auth 4 / customer 9 / queue 9）。現況文件化 50 條。證據：drift A2（實際 57、文件 50）、conventions §3 表
- [ ] 2.2 補上 `docs/API.md` 完全沒寫的 7 條 admin 端點：`POST /admin/settings/recalc-counters`、`POST /admin/dev/restore-waiting-records`、`GET /admin/backups`、`POST /admin/backups/:id/restore`、`POST /admin/backup/gdrive`、`GET /admin/backup/logs`、`POST /admin/migrate`。證據：drift A2（逐條 file:line：admin.routes.js:60/65/104/105/108/109/118）
- [ ] 2.3 在 `docs/API.md` 把 `/health`、`/ready`、`/` 標為「信封例外」明文標注（這三個不走 `v1-response` 信封、回原始 shape）。證據：drift A4（app.js:83-96/109-113/120-126 皆原始 shape，未經信封）
- [ ] 2.4 回應信封 `code` 列舉處理：補全 code 實際 emit 的額外值（`BACKUP_FAILED`/`CONFIRM_REQUIRED`/`INVALID_DATE`/`INVALID_SNAPSHOT`/`NOT_SUPPORTED`/`UNKNOWN_COLLECTION`）或改「開放集合 + 命名規約」。現況文件只列 7 種固定列舉。證據：drift A3（API.md:12/:370 固定列舉 vs code 多 emit 6 種）
- [ ] 2.5 全 repo 把 `docs/API_SPEC.md` 死引用統一改 `docs/API.md`：`.cursor/rules/engineering-rules.mdc`、`docs/CONTRIBUTING.md`、`docs/PRD.md`、`docs/TODO.md`、`README.md`、`docs/DEVELOPMENT_LOG.md`。證據：drift A6（5-6 檔引用幽靈檔）、inventory §3

## 3. WS3 — 慣例規範收斂（消除文件↔code 矛盾）

- [ ] 3.1 把回應信封產生方式寫成單一事實來源（併入 `AGENTS.md`）：明定 controller 該不該自塞 `code:'OK'`（現況兩派並存：~35 handler 靠 v1-response 折疊、~15 handler 自塞）。證據：conventions §1（4 種變體表）
- [ ] 3.2 寫明錯誤處理「目標 vs 現況」：定目標（catchAsync + ApiError）並**承認現況僅 1/10 controller 用**（`queue.controller.js`），不假裝已統一。**不改 controller**（屬另一條 change）。證據：conventions §2 ⚠️、彙整表 #1🔴
- [ ] 3.3 確立 commit 格式 `[模組] 繁中描述` 為真規範（git log 20 筆全符合），廢除 `CONTRIBUTING.md` 的 Conventional Commits 死條款（0 筆符合）。證據：conventions §12 ⚠️、彙整表 #3🔴、design D5
- [ ] 3.4 寫明 status `active` 集合 `['waiting','processing']` 為慣例常數（現散落 20+ 處硬編字面量、無單一定義；本 change 只「記載慣例」，抽常數屬另一條 change）。證據：conventions §5、額外發現 §264
- [ ] 3.5 寫明命名分層慣例：service/repo 用 PascalCase 檔名（全 repo 唯一例外，`QueueService.js`/`QueueRepository.js`）、Repository 模式僅 queue 領域走滿三層（其餘 controller 直連 model）。證據：conventions §4
- [ ] 3.6 修 `CONTRIBUTING.md` 的矛盾：PR/develop 流程改為實際 OpenSpec + 雙環境流程、`API_SPEC.md`→`API.md`、port、刪除宣稱但不存在的 lint/build gate（backend package.json 只有 start/dev/test）。證據：drift A8（CONTRIBUTING:6-8/26 vs 現況）、A6
- [ ] 3.7 修 `backend/README.md`：舊 `/api/*` 改 `/api/v1/*`（L57-71）、Node 16→20（L86/L196，Dockerfile 實為 node:20-alpine）、`/health` shape 更新（L134-139 過時，實回 status:"ok"+uptime/startTime/db/lastBackup）。證據：drift A12
- [ ] 3.8 解 `frontend/README.md` vs `DEPLOYMENT.md` 前端 PORT 矛盾：擇 DEPLOYMENT.md 為真（前端必設 PORT=80，nginx 跑 80，否則 502），修正 frontend/README 的「無需手動設定」敘述。證據：drift A13
- [ ] 3.9 `README.md` 大改：功能清單對齊 57 endpoints + v1 路徑（補 end-session/客戶DB/Household/PDF/scheduled-open/event-banner/GDrive 備份/logs 等 ~8 個已上線功能）、清死引用（`AI_DEVELOPMENT_GUIDE.md`/`線上候位系統開發文檔.md`/`backend/final-test.js`）、結構區塊重畫（含 `controllers/admin/`、`repositories/`、`validators/`、雙 DB）。證據：drift A11、inventory #2

## 4. WS4 — 強制機制（治本：人治→機制）

- [ ] 4.1 實作 route↔API.md contract 測試：斷言實際掛載的 v1 route 清單 == `docs/API.md` 記載端點集合，任一方漂移即紅燈。證據：drift B2（無 contract test 是漂移成五個數字的根因）、design D2
- [ ] 4.2 實作死連結檢查測試：掃 docs 內引用的檔案/目錄路徑必須存在（擋 `API_SPEC.md`/`ENGINEERING_RULES.md`/`final-test.js` 類幽靈引用）。證據：drift C8 死檔總表、A6/A7
- [ ] 4.3 實作信封 code 登記檢查：controller emit 的 `code` 必須登記在 `docs/API.md` 白名單（或符合命名規約）。證據：drift A3、B2
- [ ] 4.4 在 backend `package.json` 補 lint script（ESLint）；現況 scripts 只有 start/dev/test、無 lint/build。證據：drift B2、A8（CONTRIBUTING 宣稱「綠燈 lint/build」實際不存在）
- [ ] 4.5 補一個 CI gate（`.github/workflows/*`）跑 test + lint + 上述 contract/死連結/code 登記測試；現況 repo 無 `.github/`、無任何 CI。證據：drift B2（無 CI）
- [ ] 4.6 已知 bug（rate-limiter 死掛載 A5、register 缺 restrictTo A1）以交叉引用 + skip/allow-list 標註，讓 contract 測試暴露但不阻擋本 change CI 綠（修正屬另一條「稽核修正」change）。證據：drift A1/A5、附「真 bug」§229-230、design D2/D4
- [ ] 4.7 確認全域 docs-sync hook（PostToolUse）對此 repo 生效（README↔code 脫節警告）。證據：本專案 memory「lint/type baseline」+ v6.2 docs-sync hook

## 5. WS5 — OpenSpec 衛生 + 死檔封存

- [ ] 5.1 補 `openspec/project.md`：技術棧（React+Redux/Express/Mongoose/Zeabur）、慣例（信封/錯誤處理/commit/active 集合）、雙環境流程、測試慣例（jest.mock + 繁中 test 名 + 純單元、無 mongodb-memory-server）。證據：drift B3（無 project.md、無 specs baseline）、conventions §11
- [ ] 5.2 把 5 個已交付 change（2026-05-22 ~ 05-24）逐個對照 deep memory「已上線」狀態勾選 tasks，**完成度以 memory 為準非 grep checkbox**（grep 0% 是 checkbox 格式假象）。證據：inventory §2 表+§90、drift B4/C3
- [ ] 5.3 archive 上述 5 個已交付 change，並把整個 `openspec/`（含 `changes/archive/` 與既有 `archive/2026-04-12-project-migration-to-claude-code`）納入版控。現況除 `db-connection-resilience` 外幾乎全 untracked。證據：drift B4（git status 證據）、inventory §2
- [ ] 5.4 確認 `db-connection-resilience` 維持 active（進行中、待人工驗收，不 archive）。證據：inventory §2 表、drift C3
- [ ] 5.5 建立 `docs/archive/` 目錄（TODO 三處早計畫搬檔但目錄從未建立）。證據：drift C4、inventory §3
- [ ] 5.6 **最優先**移入 `docs/archive/`：`docs/specs/customer-archive-tech-spec.md`——它 L120-137/L262-263 教用 MongoDB transaction 做 end-session，正是釀成 2026-03-02 資料遺失事故、已被刻意移除的危險 pattern。證據：drift C7（最危險）、CLAUDE.md「不用 Transaction」、design D3
- [ ] 5.7 移入 `docs/archive/`：`docs/INTEGRATION_GUIDE.md`、其餘 5 份 `docs/specs/*`（EXCEL_EXPORT / EXPORT_FEATURES / PDF_FORMS / MOBILE_ADAPTATION / customer-archive-PRD）、`docs/20250915_queuefull_TODO.md`（功能皆已上線、純史料）。證據：inventory §1.D/§1.E、drift C6/C7
- [ ] 5.8 收斂 TODO 單一來源：OpenSpec 管「進行中」、`AGENTS.md`/`CLAUDE.md` backlog 管技術債；封存 `docs/TODO.md`（refactor 階段全勾、殘留項與現況脫節、引用 API_SPEC.md 幽靈檔）。證據：drift C1/C6、inventory §4
- [ ] 5.9 處理 `docs/DEVELOPMENT_LOG.md`（1027 行）：瘦身保留為唯一變更日誌 vs 整份封存（apply 階段定）；現況最後更新 2025-12、之後改走 openspec 未再寫、含已刪檔引用 + Windows 路徑殘留。證據：drift C6 verdict 表、inventory #13
- [ ] 5.10 決定 `.cursor/` 去留：內容遷入 `AGENTS.md` 後移除，或保留薄轉址指向 AGENTS.md（二擇一）。證據：drift C2、design D1 Open Questions
- [ ] 5.11 `docs/USER_GUIDE_ADMIN.md`（25 行）：補齊完整管理員手冊（缺 20+ 功能：end-session/客戶DB/橫幅/定時/備份/日誌/家庭分組/匯出）或明確降級其在 CONTRIBUTING 驗收清單地位（二擇一）。證據：drift B6/C6、inventory #17

## 6. 收尾與驗收

- [ ] 6.1 跑 `openspec validate docs-governance --strict` 確認本 change 文件結構合法
- [ ] 6.2 全 repo 重跑死連結檢查（WS4）確認零幽靈引用殘留；route↔API.md contract 測試綠
- [ ] 6.3 派獨立驗證 agent（非實作者）逐條核對：57 endpoints 對齊、AGENTS.md 無敏感洩漏、5 個 change 已 archive 且進 git、死檔已移入 docs/archive
- [ ] 6.4 push 測試 repo → 確認 Zeabur 部署不受影響（純文檔/測試/CI 變更）+ CI gate 綠
- [ ] 6.5 整理結果推 CC + Discord 回報懷特，等人工驗收測試 repo OK → 再評估同步正式（不在本 change 自動推正式）
