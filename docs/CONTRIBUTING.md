# 貢獻指南（CONTRIBUTING）

> 本文件說明本專案的實際開發流程、分支策略、提交規範與驗收流程。架構與工程慣例請搭配 `AGENTS.md` 使用，API 規格以 `docs/API.md` 為唯一權威。

## 開發流程（實際）

本專案採 **OpenSpec 計畫先行 + 測試/正式雙環境** 流程，**非** PR-based GitHub flow：

1. **計畫先行**：新功能 / 架構調整 / 腳本改寫一律先跑 OpenSpec（`openspec/changes/<change-id>/`，含 `proposal.md` / `design.md` / `tasks.md`）。「小事」也不跳過。
2. **在測試環境實作**：所有編輯只在測試環境做（測試 repo `DennisPai/open-queue-test`），直接 push 到測試 repo `main` 觸發 Zeabur 自動部署，**沒有 PR / develop 分支流程**。
3. **測試驗收**：`/health` 200 + 前端頁面 + 管理後台核心功能手動驗收 + Jest 單元測試綠。
4. **人工核可後同步正式**：對比測試 repo vs 正式 repo 差異 → 整理 changelog → 回報核可 → 正式 repo cherry-pick/merge → push → Zeabur 部署 → 驗收。**未經核可禁止動正式環境**。

> 完整雙環境細節（repo / Zeabur 專案 / MongoDB 對應、正式環境更新流程）見專案 `CLAUDE.md`（untracked，僅維護者持有）。

## 分支與版本
- 主要分支：`main`（測試/正式各自的線上分支）
- 功能分支：`feat/<feature-name>`；修補分支：`fix/<issue>` / `hotfix/<issue>`
- 測試 remote 走 `test/*`
- 沒有 `develop` 分支；沒有 PR 合併閘門（直推測試 repo `main`）

## 提交訊息（`[模組] 繁中描述`）
- 真規範：**bracket-prefixed 繁體中文** `[模組] 變更描述`（實際 `git log` 全部符合）
- 括號標籤可放類型（`[fix]` / `[feat]` / `[docs]` / `[chore]` / `[hotfix]` / `[UI]`）或專案階段（`[Change A]` / `[Follow-up patches]` / `[連線韌性]`），非固定枚舉
- 範例：`[feat] 新增 POST /admin/migrate`、`[hotfix] StatusPage 詳細資料對話框 3 個顯示 bug`
- 每個 commit 只做一件事；部署失敗立即 revert

## 新功能/變更流程（必走）
1. 在 `docs/PRD.md` 補上背景、需求、AC（驗收條件）
2. 在 `docs/API.md` 補上/更新端點（若涉及 API；`docs/API.md` 為 API 唯一權威）
3. 開 OpenSpec change（`openspec/changes/<change-id>/`），把任務拆成能在 0.5~1 天完成的粒度寫進 `tasks.md`
4. 在測試環境實作；遵循：
   - 後端 v1 規範：`/api/v1/*`、回應 `{ success, code, message, data }`
   - 前端 `services/*` 單層 `data` 回傳；`API_VERSION=v1`
5. 本地或容器內測試（Jest/RTL/手動）：覆蓋 AC
6. 更新文件：PRD / API.md / 變更說明
7. push 測試 repo `main` → Zeabur 部署綠 → 測試驗收 → 人工核可 → 同步正式

## 後端規範摘要
- Base 路徑：`/api/v1`
- 回應統一：成功 `{ success: true, code:'OK', message, data }`；失敗 `{ success:false, code, message, errors? }`
- 錯誤碼：UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL_ERROR
- 中介層：`backend/src/routes/v1/index.js` 已掛載回應封裝
- 健康探針：`/health`、`/ready`（含 Mongo 連線狀態）
- 安全：Helmet、RateLimit（`/auth/*`, `/queue/register`）

## 前端規範摘要
- `API_VERSION` 預設 `v1`；端點來自 `frontend/src/config/api.js`
- `services/*` 一律回傳單層 `response.data`；Redux slice 解一次
- 改密流程改為「手動變更密碼」（不強制首次登入）

## 本地開發（Docker）
```bash
docker-compose build && docker-compose up -d
# 首次初始化
cd backend && npm install && node init-admin.js
```
- 前端：`http://localhost:3100`
- 後端：`http://localhost:8080`

## Zeabur 部署要點
- 後端 PORT：8080；前端 PORT：80（必要）
- 前端需設定：`REACT_APP_API_URL=https://<backend-domain>`
- 後端 CORS：`CORS_ORIGIN/SOCKET_CORS_ORIGIN=https://<frontend-domain>`
- 推送 `main` 觸發自動部署；重構期間先保留於 `feat/*`，驗收後再合併

## 驗收清單（同步正式前必過）
- 後端：v1 路由覆蓋、回應信封統一、`/health` 200 + `/ready` OK
- 前端：`API_VERSION=v1`、services 單層 data、主要流程全通
- 文件：PRD / API.md / CONTRIBUTING / DEPLOYMENT / USER_GUIDE_ADMIN 已同步更新
- 測試：Jest 單元測試全綠；手動驗證健康檢查與核心功能

> **lint / CI 閘門**：backend `package.json` 目前 scripts 只有 `start` / `dev` / `test`，**尚無 lint / build / CI 閘門**。lint script 與 CI gate（route↔API.md 契約測試、死連結檢查、信封 code 登記檢查）由文檔治理 WS4 建立後生效；在那之前驗收以「Jest 綠 + 手動驗收」為準，不要假設有自動 lint/build 綠燈。
