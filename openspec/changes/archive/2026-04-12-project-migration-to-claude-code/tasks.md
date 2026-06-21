## 1. Phase 1 — 讀取整合所有 OpenClaw 備份

- [ ] 1.1 讀 `openclaw-backup/workspaces/workspace-xiuxuangong/MEMORY.md`（完整）
- [ ] 1.2 讀 5 份 memory 日誌：
  - [ ] `memory/2026-02-13.md`
  - [ ] `memory/2026-02-14.md`
  - [ ] `memory/2026-02-24.md`
  - [ ] `memory/2026-03-02.md`
  - [ ] `memory/scan-report-2026-02-15.md`
- [ ] 1.3 讀 `TOOLS.md`（Zeabur API credentials）
- [ ] 1.4 讀 `project/docs/API.md`（37 endpoints）
- [ ] 1.5 讀 `project/docs/PRD.md`
- [ ] 1.6 讀 `project/docs/DEVELOPMENT_LOG.md`
- [ ] 1.7 讀 `project/docs/TODO.md`
- [ ] 1.8 讀 `project/docs/specs/`（如有）
- [ ] 1.9 清點 frontend/ 模組結構（React components / pages / Redux slices）
- [ ] 1.10 清點 backend/ 模組結構（controllers / models / routes / utils / middleware）
- [ ] 1.11 整理 key facts 清單（所有 phase 後續步驟的 input）

## 2. Phase 2 — 建立專案級 CLAUDE.md

- [ ] 2.1 專案概述（一段話：目的 + 使用者 + 技術棧 + 使用頻率）
- [ ] 2.2 最高指導原則
  - [ ] 正式環境保護規則（懷特 4/12 版：除非懷特核可否則不碰正式）
  - [ ] 先寫後刪（2026-03-02 教訓）
  - [ ] 不用 transaction（Zeabur 單節點限制）
- [ ] 2.3 系統架構
  - [ ] 前端：React + Redux 模組清單
  - [ ] 後端：Express controllers / models / routes 清單
  - [ ] 資料庫：MongoDB collections + schema 概覽
  - [ ] 部署：Zeabur auto-deploy 流程
- [ ] 2.4 資料模型（從 backend/src/models/ 讀取所有 Schema）
- [ ] 2.5 API 概覽（37 endpoints 分類：auth / queue / admin / customer / system）
- [ ] 2.6 環境設定
  - [ ] 測試環境（URL + repo + 「見 secrets.env `XIUXUANGONG_TEST_*`」）
  - [ ] 正式環境（⛔ 標記 + URL + repo + 「見 secrets.env `XIUXUANGONG_PROD_*`」）
  - [ ] 所需環境變數清單（後端需要的所有 env vars）
- [ ] 2.7 開發規則
  - [ ] commit 規範（中文、一件事一 commit）
  - [ ] push 流程（只 push 測試 repo）
  - [ ] deploy 後驗收 checklist
  - [ ] API 修改後更新 docs/API.md
- [ ] 2.8 正式環境更新流程
  - [ ] 對比測試 vs 正式 repo 差異
  - [ ] 列 changelog → Discord 回報 → 懷特核可
  - [ ] merge → push → Zeabur deploy → 驗收 → 回報
  - [ ] 出問題 → revert → 回報
- [ ] 2.9 設計決策紀錄
  - [ ] 不用 transaction + 先寫後刪
  - [ ] familyMember address 預設值 '臨時地址'
  - [ ] 客戶比對邏輯（name + lunarBirth）
  - [ ] autoGroupHouseholds 同地址分組
  - [ ] Snapshot fire-and-forget 備份
- [ ] 2.10 已知限制與技術債
- [ ] 2.11 待辦清單（Phase 5 產出後回填）
- [ ] 2.12 寫入 repo 根目錄 `CLAUDE.md`

## 3. Phase 2.5 — 建立 DESIGN.md（UI 設計規範）

- [ ] 3.1 從前端 code 提取現有配色（primary / secondary / accent / background）
- [ ] 3.2 從前端 code 提取字體規範
- [ ] 3.3 元件風格清點（按鈕、表單、卡片、modal、表格）
- [ ] 3.4 響應式斷點（mobile / tablet / desktop）
- [ ] 3.5 參考 `docs/修玄宮問事單.jpg` 的視覺風格
- [ ] 3.6 寫入 repo 根目錄 `DESIGN.md`

## 4. Phase 3 — 更新角色檔和 memory

- [ ] 4.1 更新 `/home/node/roles/xiuxuangong.md`：
  - [ ] 精簡為導航頁（專案位置 + 快速 context + 環境 URL）
  - [ ] 指向 CLAUDE.md 為 source of truth
  - [ ] 保留使用頻率 + 辦事週期說明
- [ ] 4.2 更新 `project_xiuxuangong.md`：
  - [ ] 里程碑完整紀錄
  - [ ] 最新 commit + 系統狀態
  - [ ] 待辦清單
- [ ] 4.3 更新 `MEMORY.md` 索引行

## 5. Phase 3.5 — Credentials 統一整理

- [ ] 5.1 盤點所有散落的 credentials（OpenClaw MEMORY.md / TOOLS.md / 其他位置）
- [ ] 5.2 統一寫入 `secrets.env`，使用專案前綴命名：
  - [ ] `XIUXUANGONG_TEST_MONGO_URI`
  - [ ] `XIUXUANGONG_PROD_MONGO_URI`
  - [ ] `XIUXUANGONG_TEST_ZEABUR_PROJECT_ID`
  - [ ] `XIUXUANGONG_PROD_ZEABUR_PROJECT_ID`
  - [ ] `XIUXUANGONG_ZEABUR_API_TOKEN`
  - [ ] `GITHUB_PAT_TEST`（如果還沒有的話）
  - [ ] 其他需要的 key
- [ ] 5.3 確認 CLAUDE.md 環境設定 section 正確指向每個 key
- [ ] 5.4 備份 secrets.env（以防改壞）

## 6. Phase 4 — 設定工作環境驗證

- [ ] 6.1 用 `XIUXUANGONG_TEST_MONGO_URI` 連測試 MongoDB
- [ ] 6.2 用 `XIUXUANGONG_ZEABUR_API_TOKEN` 查 Zeabur deployment status
- [ ] 6.3 用 `GITHUB_PAT_TEST` 測試 git push 到測試 repo
- [ ] 6.4 打測試環境後端 /health endpoint
- [ ] 6.5 打測試環境前端頁面
- [ ] 6.6 記錄所有驗證結果到日誌
- [ ] 6.7 如有環境不通 → 記錄 blocker 等懷特協助
- [ ] 6.8 **不碰正式環境**（本 phase 只驗測試環境）

## 7. Phase 5 — 待辦盤點 + 驗收

- [ ] 7.1 檢查 4 個 OpenClaw 遺留待辦是否已完成：
  - [ ] 表單驗證統一化（grep yup/zod）
  - [ ] PDF 樣式重設計（比對修玄宮問事單.jpg）
  - [ ] PDF 中文亂碼
  - [ ] API 文檔更新（比對 API.md vs 實際 routes）
- [ ] 7.2 grep 所有 TODO/FIXME/HACK in code
- [ ] 7.3 回填 CLAUDE.md 待辦清單（2.11）
- [ ] 7.4 Discord 最終報告（移植完成 + 待辦清單 + 工作環境狀態 + 三層分工說明）
- [ ] 7.5 archive OpenSpec
