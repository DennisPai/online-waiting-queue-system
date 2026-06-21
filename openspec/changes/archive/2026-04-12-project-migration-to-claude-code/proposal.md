## Why

修玄宮候位系統的專案知識目前分散在三個地方：
1. OpenClaw 備份（`openclaw-backup/workspaces/workspace-xiuxuangong/`）— 最完整的教訓、里程碑、工具資訊
2. Claude Code memory（`project_xiuxuangong.md`）— 粗略摘要
3. 角色檔（`/home/node/roles/xiuxuangong.md`）— 基本規則

Credentials 更是散在 4+ 個地方（OpenClaw MEMORY.md / TOOLS.md / secrets.env / 腦中筆記），容易搞混測試/正式環境，有打錯 DB 的風險。

懷特要求完整移植，讓大總管（Claude Code）能直接接手這個專案的所有進度、任務、開發工作。

## What Changes

**Phase 1 — 讀取並整合所有 OpenClaw 備份資料**
- 讀 MEMORY.md（永久規則 8 條 + 開發教訓 17 條 + 里程碑 2 塊）
- 讀 5 份 memory 日誌
- 讀 TOOLS.md（Zeabur API credentials）
- 讀 docs/（API.md 37 endpoints、PRD.md、DEVELOPMENT_LOG.md、TODO.md）
- 清點 frontend/backend 模組結構

**Phase 2 — 建立專案級 CLAUDE.md**
在 repo 根目錄建立 `CLAUDE.md`，作為每次讀這個專案時的必讀文件，包含：
- 專案概述（目的 + 使用者 + 技術棧）
- 最高指導原則（正式/測試環境規則、懷特 4/12 版）
- 系統架構（前端 → API → MongoDB → Zeabur）
- 資料模型（MongoDB schema 清點）
- API 概覽（37 endpoints 分類）
- 環境設定（**正式/測試環境完整資訊 + credentials 位置指引**）
  - URL 等公開資訊直接寫在 CLAUDE.md
  - 密碼/token/URI 只寫「去 secrets.env 找哪個 key」（不寫明文，CLAUDE.md 是 git-tracked）
  - 正式環境 section 開頭 ⛔ 標記
- 開發規則（commit / push / deploy 流程）
- 正式環境更新流程（列 changelog → 懷特核可 → merge → deploy → 驗收 → 回報）
- 設計決策歷史（不用 transaction、先寫後刪、address 預設值等）
- 已知限制與技術債
- 待辦清單

**Phase 2.5 — 建立 DESIGN.md（UI 設計規範）**
在 repo 根目錄建立 `DESIGN.md`，只放 UI/UX 設計系統：
- 配色方案（從現有前端 code 提取）
- 字體規範
- 元件風格（按鈕、表單、卡片等）
- 響應式斷點
- 參考修玄宮問事單的視覺風格

**Phase 3 — 更新角色檔和 memory**
- `/home/node/roles/xiuxuangong.md` — 精簡為導航頁（專案位置 + 快速 context + 指向 CLAUDE.md）
- `project_xiuxuangong.md` — 更新為最新狀態

**Phase 3.5 — Credentials 統一整理**
- 把所有修玄宮 credentials 統一寫入 `secrets.env`，用專案前綴命名：
  - `XIUXUANGONG_TEST_MONGO_URI` / `XIUXUANGONG_PROD_MONGO_URI`
  - `XIUXUANGONG_TEST_ZEABUR_PROJECT_ID` / `XIUXUANGONG_PROD_ZEABUR_PROJECT_ID`
  - `XIUXUANGONG_ZEABUR_API_TOKEN`
  - 等等
- CLAUDE.md 的環境設定 section 指向這些 key name
- 確保不會搞混測試/正式

**Phase 4 — 設定工作環境驗證**
- 用 secrets.env 的 key 連測試環境 MongoDB / Zeabur API / git push / health check 全部測通
- 不碰正式環境（只驗證測試環境）

**Phase 5 — 待辦盤點 + 驗收**
- 4 個遺留待辦 done/not done 確認
- code TODO/FIXME 清點
- Discord 報告

## Impact

**影響檔案：**
- 新建：`CLAUDE.md`（repo 根目錄）— 專案規則和架構的 source of truth
- 新建：`DESIGN.md`（repo 根目錄）— UI 設計規範
- 更新：`/home/node/roles/xiuxuangong.md`（精簡為導航頁）
- 更新：`~/.claude/projects/-home-node/memory/project_xiuxuangong.md`
- 更新：`/home/node/.secrets/secrets.env`（新增 XIUXUANGONG_ 前綴的 credentials）

**不影響：** 任何 code / 正式環境 / 其他專案

**Rollback：** 純文件新增/更新，git revert 即可（secrets.env 有備份）

## 三層分工

| 層 | 檔案 | 用途 | 何時讀 |
|---|------|------|--------|
| 導航 | `roles/xiuxuangong.md` | 專案在哪 + 快速 context + 指向 CLAUDE.md | 懷特提到「修玄宮」時 |
| 手冊 | `CLAUDE.md`（repo 內） | 所有規則、架構、環境、開發流程 | 實際動手前 |
| 快照 | `memory/project_xiuxuangong.md` | 跨 session 狀態（上次做到哪、待辦）| 每次 session 自動載入 |
