## Context

文檔現況（三份掃描 findings 的綜合）：25 份文檔散落 root / `docs/` / `docs/specs/` / `.cursor/rules/` + `openspec/`。最完整、最正確的兩份（`CLAUDE.md` 架構、`DESIGN.md` UI 規範）untracked，clone 拿不到。對外可見的 tracked 文檔（README、CONTRIBUTING、`.cursor/rules`、backend/frontend README）大量過時、彼此矛盾、引用幽靈檔。沒有任何自動機制阻止漂移：

```
無 .github/         → 無 CI
backend/package.json scripts: { start, dev, test }  → 無 lint、無 build gate
backend/tests/ 12 個 jest 檔  → 無 route↔doc contract 測試、無死連結檢查
root 無 package.json / husky  → 無 pre-commit
```

CLAUDE.md「最高指導原則第 6 條：API 修改後必須同步更新 docs/API.md」是**純人治**，這正是 API 端點數漂移成 47/49/50/55/57 五個數字的根因。本 change 的核心設計取捨圍繞「如何把人治換成機制」與「如何在不洩敏感資訊的前提下讓架構知識進 git」。

## Goals / Non-Goals

**Goals**
- 文檔對齊 code 真實狀態（57 endpoints、正確檔名、正確路徑、消除矛盾）
- 架構知識可被 clone 取得（tracked `AGENTS.md`）
- 把「文檔同步」從人治轉為機制（contract 測試 + 死連結檢查 + CI gate）
- OpenSpec 衛生（project.md baseline、已交付 change archive、全進版控）
- 慣例單一事實來源（消除文件↔code 矛盾）

**Non-Goals**
- 不改任何 backend/frontend 業務 code 行為（catchAsync 全面化、接孤兒驗證器、抽 status enum、修 rate limiter、修 register 提權、修 Redux double-wrap 都歸另一條「稽核修正」change）
- 不改資料 schema、不改 API 實際合約（只改「描述 API 的文檔」）
- 不自動推正式環境（測試 repo 做、人工驗收後另議）

## Decisions

### D1：用 tracked `AGENTS.md` 承載架構知識，而非直接 commit `CLAUDE.md`

**取捨**：`CLAUDE.md`（270 行）是 repo 最完整的架構文件，但混入內部運作脈絡——secrets.env 變數名、雙環境 Zeabur Project/Service ID 名稱、test↔prod repo 對應、`admin/admin123`、正式環境操作流程。直接 commit 會把這些洩進公開/可分享 repo。

**決策**：拆兩半。
- 對外可分享、接手必讀的內容（系統架構 10 controller/8 model、資料模型、設計決策紀錄、慣例、API 概覽指向 `docs/API.md`）→ 下沉成 tracked 的 `AGENTS.md`。
- 敏感/環境/正式操作流程 → 留在 untracked `CLAUDE.md`（本機脈絡）。

**為何選 `AGENTS.md` 而非「直接 commit CLAUDE.md」或「塞進 README」**：
1. **敏感資訊分離**：`CLAUDE.md` 含 secrets/Zeabur ID/預設密碼，原樣進 git 是安全問題；拆分是唯一安全解。
2. **跨工具中立**：`AGENTS.md` 是工具中立的 agent 入口慣例（Claude Code / Cursor / 其他皆讀），正好取代過時的 `.cursor/rules`（後者標 `alwaysApply: true` 卻指向不存在路徑、是 Cursor 時代殘留）。把三份 `.mdc` 去重整併進 `AGENTS.md`，順手修失效引用，一次解決「.cursor 殘留」+「架構 clone 不到」兩個問題。
3. **與既有 feedback 一致**：呼應「內部討論不入對外 doc」+「always-on 可 grep 內容下沉」。

`.cursor/` 去留在 WS5 決定（內容遷入 `AGENTS.md` 後，移除或保留薄轉址，二擇一於 apply 階段定）。

### D2：強制機制選型——route↔doc contract 測試為核心，CI 用 GitHub Actions

**取捨**：要擋的最大宗 drift 是「API.md 與實際 route 不同步」（五個數字無一正確、漏 7 條 admin 端點）。可選機制：人工 review（現況，已證明失敗）／文件產生器（從 route 自動生 doc，但會丟失人工註解語意）／contract 測試（斷言 route 清單 == doc 記載）。

**決策**：以 **route↔API.md contract 測試**為核心——最小成本擋最大宗 drift。它斷言「實際掛載的 route 集合 == `docs/API.md` 記載的端點集合」，任一方漂移即紅燈。輔以兩個低成本檢查：死連結檢查（docs 內引用的檔案路徑必須存在，擋 `API_SPEC.md` 類幽靈引用）、信封 code 登記檢查（controller emit 的 `code` 必須登記在 `docs/API.md` 白名單，擋 A3 那類漏列舉）。

**CI 用 GitHub Actions**：repo 在 GitHub（`DennisPai/*`）、用 Zeabur 部署，GitHub Actions 是零額外基礎設施的自然選擇。CI gate 跑 `test + lint + 上述 contract 測試`。backend `package.json` 補 lint script（現況完全沒有，連 CONTRIBUTING 宣稱的「綠燈 lint/build」都是空話）。

**邊界**：contract 測試只「偵測」漂移與「標紅」已知 bug（如 rate-limiter 掛載前綴錯、register 缺 restrictTo），**不修**那些 bug——修正屬另一條 change。本 change 負責「讓 bug 無所遁形」，不負責「補 bug」。

### D3：封存策略——`docs/archive/` 保留史料但移出活躍區

**取捨**：6 份 `docs/specs/*` + `INTEGRATION_GUIDE` + `20250915_queuefull_TODO` 都是「已完成的一次性歷史計畫」，有史料價值但會誤導接手者（以未來式描述已完成工作、含舊欄位名、指向已刪檔）。直接刪會丟史料；留在活躍區會被誤用。

**決策**：建 `docs/archive/`（TODO 三處早就計畫搬檔過去但目錄從未建立）並移入死檔，保留史料同時移出活躍區。

**特別點名 `customer-archive-tech-spec.md` 最優先封存**：它 L120-137/L262-263 規定用 **MongoDB transaction 做 end-session**，但 `CLAUDE.md` 明載此法因 2026-03-02 `abortTransaction()` 不回滾 deleteMany 造成**資料永久遺失事故**已被刻意移除、改「先寫後刪」。這份 spec 主動牴觸已上線設計、且正好教人重蹈肇事 pattern——留在活躍區的危險性遠高於其他死檔，必須最優先移出。

### D4：scope 邊界——治理 vs bug 修正分流

**取捨**：掃描同時揪到真 code bug（rate-limiter 死掛載、register 提權、Redux double-wrap、孤兒驗證器、status enum 未抽）。誘惑是「順手一起修」。

**決策**：嚴格分流。本 change 只做「治理」（文檔/慣例/機制/OpenSpec 衛生），bug 修正歸另一條「稽核 P0/P1 修正」change。

**理由**：
1. **驗收尺規不同**：治理的驗收是「文檔對齊 + 機制就位」（讀 doc、跑 contract 測試），bug 修正的驗收是「行為改變 + 回歸測試」（改 controller、跑整合測試、可能要部署驗證）。混在一起會讓 review 失焦、回滾粒度變粗。
2. **風險不同**：治理動的是 doc/測試/CI（低風險、可大膽），bug 修正動的是核心連線/安全路徑（高風險、需謹慎部署驗證）。混一起會被高風險項拖住低風險項。
3. **本 change 仍對 bug 負責的部分**：WS4 的 contract/lint 機制會把這些 bug 標紅（例如 register 權限、rate-limiter 前綴會在 contract 測試中暴露），等於「交叉引用 + 偵測」，把修正乾淨交棒給下一條 change。

### D5：commit 格式——確立 `[模組]` 繁中為真規範，廢 CONTRIBUTING 的 Conventional Commits

**取捨**：兩份文件矛盾——`CONTRIBUTING.md` 宣稱英文 Conventional Commits（`feat:`），`CLAUDE.md` 寫 `[模組]` 繁中。git log 20 筆全是 `[模組]` 繁中、0 筆符合 Conventional Commits。

**決策**：以**實際 git log 為準**，確立 `[模組] 繁中描述` 為真規範，寫進 `AGENTS.md`，廢除 `CONTRIBUTING.md` 的 Conventional Commits 死條款。慣例的單一事實來源原則：**code/實際行為為準，文件追隨之**，而非反過來。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| README 大改範圍大（896 行、缺 ~8 個已上線功能、多處死引用、pre-v1 路徑） | 拆成獨立工項逐段對齊 57 endpoints；以 `docs/API.md`（對帳後）+ DEPLOYMENT.md（env 真值基底）為來源；apply 後派獨立驗證 agent 逐條核 |
| `AGENTS.md` 萃取時誤洩敏感資訊（secrets 變數名 / Zeabur ID / 預設密碼 / 正式操作流程） | 明列「必須留 untracked CLAUDE.md」的敏感清單；AGENTS.md 完成後 grep 敏感關鍵字（secrets/Zeabur ID/admin123/PROD_）確認無洩漏；commit 前最後一道人工檢查 |
| contract 測試把已知 bug 標紅 → CI 一上來就紅 | 設計為「先讓 doc 對齊真實 57 route」再啟用 gate；已知 bug（rate-limiter/register）以 allow-list 或 skip 標註並交叉引用到「稽核修正」change，不讓它阻擋本 change 的 CI 綠 |
| 封存死檔時誤封存「當前有效」文件（DESIGN.md / API.md / USER_SCENARIOS_CUSTOMER / incident report） | 封存前明列「active spec 保留清單」；`DESIGN.md` 明標「進 git 且非封存對象」 |
| archive 5 個 change 時誤判完成度（tasks.md 0% 勾選 grep 假象，非真未完成） | 完成度以專案 deep memory「已上線」狀態為準，非 grep checkbox；archive 前逐個對照 memory 確認已交付 |
| 改 `.cursor/rules` / 移除 .cursor 影響仍用 Cursor 的人 | 內容先完整遷入 `AGENTS.md` 再決定去留；若移除則留薄轉址指向 AGENTS.md，不留空 |

## Migration / Rollout

1. 測試 repo（`open-queue-test`）上依 5 個 workstream apply。
2. 每個 workstream 完成後本地驗證（contract 測試綠、死連結檢查綠、`openspec validate` 綠、敏感資訊 grep 無洩漏）。
3. WS4 CI gate 在 doc 對齊（WS2）完成後才啟用，避免一上來就紅。
4. push 測試 repo → Zeabur 不受影響（純文檔/測試/CI 變更，不動 runtime）。
5. 懷特人工驗收測試 repo（AGENTS.md 內容、README 對齊、CI 綠）OK。
6. 再評估同步正式 repo（不在本 change 自動執行）。

## Open Questions（apply 階段定）

- `.cursor/` 最終去留：完全移除 vs 保留薄轉址（內容遷 AGENTS.md 後二擇一）。
- 信封 `code` 採「補全列舉」vs「開放集合 + 命名規約」：後者較有彈性但 contract 檢查需改寫成「命名規約 lint」。
- `USER_GUIDE_ADMIN.md`：補齊完整管理員手冊 vs 明確降級其在 CONTRIBUTING 驗收清單的地位（25 行缺 20+ 功能）。
- `DEVELOPMENT_LOG.md`（1027 行）：瘦身保留為唯一變更日誌 vs 整份封存。
