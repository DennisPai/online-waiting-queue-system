## Why

修玄宮候位系統不是「沒有文檔」——它有 25 份文檔 + 完整 .cursor 規則 + OpenSpec。問題是**所有文檔↔code 的同步全靠人治**，沒有任何強制機制（無 CI、無 contract 測試、無 lint、無 pre-commit），結果是大面積、長期、靜默的漂移。三份 READ-ONLY 掃描（`docs-inventory.md` / `conventions.md` / `drift-gaps.md`，皆逐檔 Read 無抽樣）以 file:line 證據揪出以下硬傷：

- **API 端點數五個數字並存、無一正確**：實際 `backend/src/routes/v1/` 有 **57** 條 route（admin 35 / auth 4 / customer 9 / queue 9），但 CLAUDE.md 寫 47、`docs/API.md` 文件化 50、TODO/CLAUDE 待辦寫「55 vs 49」。接手者拿 `docs/API.md` 當契約會漏掉 7 條 admin/維運端點（含危險的 `recalc-counters` / `restore-waiting-records` / `migrate`）。
- **幽靈檔 `docs/API_SPEC.md` 被 5–6 個檔反覆引用，但它根本不存在**（真檔是 `docs/API.md`）：`.cursor/rules/engineering-rules.mdc`、`docs/CONTRIBUTING.md`、`docs/PRD.md`、`docs/TODO.md`、`README.md`、`docs/DEVELOPMENT_LOG.md`。CONTRIBUTING「必走流程」第 2 步要人更新一個不存在的檔。
- **唯一正確記載架構/資料模型/設計決策的 `CLAUDE.md` 與唯一 UI 規範 `DESIGN.md` 都 untracked**（非被 `.gitignore` 擋掉，是從未 commit）：任何人 clone 正式/測試 repo 都拿不到這兩份最完整的「how-it-works」文件。
- **`.cursor/rules` 殘留且過時**：速查表指向不存在的 `backend/src/middleware/`、`backend/src/models/queue.model.js`（models 早拆成 8 檔），且仍 `alwaysApply: true`，會把接手 agent/人導向空目錄。
- **5 個已交付的 OpenSpec change（2026-05-22 ~ 05-24）早該 archive 卻仍躺在 active 區、且整個 `openspec/`（含 archive）幾乎全 untracked**：接手者看 `openspec/changes/` 會誤判成「有 4–5 個進行中、幾乎沒動的大型 change」（含 120 項回歸測試）。
- **文件宣稱的「統一」在 code 是少數派**：`backend-rules.mdc` + `engineering-rules.mdc` 宣稱「controller 統一用 catchAsync + ApiError」，實際只有 **1/10** controller（`queue.controller.js`）用；其餘 9 個全手刻 try/catch。
- **`CONTRIBUTING.md` 宣稱 Conventional Commits（英文 `feat:`）**，但實際 git log 20 筆**全是 `[模組] 繁中描述`、0 筆符合**——CONTRIBUTING 的 commit 條款是死文件，真規範在 CLAUDE.md。

這些不是孤立 typo，而是「無強制同步機制」這個結構性根因的症狀。本 change 的目的：把文檔治理從**人治轉為機制**，並把分散、漂移、untracked 的文檔收斂成可信任的單一事實來源。

## What Changes

本 change 切成 5 個 workstream（詳見 `tasks.md` 逐項證據；驗收需求見 `specs/documentation-governance/spec.md`）：

- **WS1 架構知識入 git**：把 `CLAUDE.md` 拆兩半——對外可分享的架構/資料模型/設計決策/慣例下沉成 tracked、跨工具中立的 `AGENTS.md`（整併並去重 `.cursor/rules` 三份、順手修掉失效引用），敏感環境脈絡（secrets 變數名、雙環境 Zeabur ID、預設密碼、正式操作流程）留在 untracked `CLAUDE.md`；`DESIGN.md` 進 git；tracked 檔內明文 `admin/admin123` 改佔位；刪死檔 `CLAUDE.md.bak-2026-04-22`。
- **WS2 API.md 對帳成契約唯一來源**：補齊到實際 57 條 v1 route（含漏掉的 7 條 admin 端點）、`/health`/`/ready`/`/` 標為信封例外、回應信封 `code` 列舉補全或改「開放集合 + 命名規約」、全 repo `docs/API_SPEC.md` 死引用統一改 `docs/API.md`。
- **WS3 慣例規範收斂**：把實際慣例寫成單一事實來源（併入 `AGENTS.md`）並消除文件↔code 矛盾（回應信封產生方式、錯誤處理目標與現況、commit 格式、active 集合定義、命名分層例外）；修 `CONTRIBUTING.md`、`backend/README.md`、`frontend/README.md` 與 `README.md` 的過時/矛盾敘述。
- **WS4 強制機制（治本）**：實作 route↔API.md contract 測試、死連結檢查測試、信封 code 登記檢查、補 backend lint script、補一個 CI gate（GitHub Actions），確認全域 docs-sync hook 對此 repo 生效。
- **WS5 OpenSpec 衛生 + 死檔封存**：補 `openspec/project.md`、把 5 個已交付 change 勾選 + archive + 進 git、建 `docs/archive/` 移入死檔（`customer-archive-tech-spec.md` 最優先——它還在教釀成 2026-03-02 資料遺失事故的 transaction 法）、收斂 TODO 單一來源、決定 `.cursor/` 去留、`USER_GUIDE_ADMIN.md` 補齊或明確降級。

### Scope 邊界（MUST 明確）

- **本 change 負責**：文檔/慣例/強制機制/OpenSpec 衛生的「治理」——把文檔對齊真實狀態，並用機制防止再漂移。
- **本 change 不負責**：修業務 bug 與 code 合規重構。具體不在此實作的項目（屬另一條「稽核 P0/P1 修正」change）：
  - `catchAsync`/`ApiError` 全面化（現況僅 1/10 controller，本 change 只「承認現況 + 定目標 + 由 contract/lint 偵測」，不改 controller）
  - 接上孤兒驗證器 `backend/src/validators/queueValidators.js`（`queue.routes.js` 0 驗證缺口）
  - 抽出 `['waiting','processing']` active 集合 status enum（散落 20+ 處）
  - 修 rate limiter 死掛載（`app.js:58-59` 掛 `/api/auth` 但實際路徑 `/api/v1/...` → 限流失效）
  - 修 `/auth/register` 缺 `restrictTo('admin')` 提權（staff 可自建 admin）
  - 修 4 個 Redux thunk 的 double-wrap 潛伏 bug
- 本提案對上述 bug 只做「交叉引用 + 由 WS4 強制機制偵測（例如 rate-limiter 掛載前綴、register 權限會被 contract/lint 標紅）」，**不在此修正**。

### 執行環境邊界

- 全部變更**只在測試 repo（`DennisPai/open-queue-test`）做**，依專案最高指導原則「測試環境驗收通過才同步正式」。apply 完成、懷特人工驗收後，才評估同步正式 repo（`DennisPai/online-waiting-queue-system`）。本 change 不自動推正式。

## Impact

- 影響檔案（apply 階段，非本提案）：新增 `AGENTS.md`、`openspec/project.md`、`docs/archive/`、`.github/workflows/*`、backend lint 設定與多個 contract 測試檔；改寫 `docs/API.md`、`README.md`、`backend/README.md`、`frontend/README.md`、`docs/CONTRIBUTING.md`、`.cursor/rules/*`；移動 6+ 份死檔；archive 5 個 change。
- 不影響：任何 backend/frontend 業務 code 行為、資料 schema、API 實際合約（本 change 是「讓文檔追上 code」，不是「改 code」）。
- 風險：README 大改範圍大（896 行、多處死引用）；`AGENTS.md` 內容萃取需小心不洩敏感（secrets 變數名/Zeabur ID/預設密碼必須留在 untracked `CLAUDE.md`）。詳見 `design.md`。
