# 貢獻指南（CONTRIBUTING）

> 本文件說明本專案的開發流程、分支策略、提交規範與驗收流程。請搭配 `.cursor/rules/*.mdc` 與 `docs/TODO.md` 使用。

## 分支與版本
- 主要分支：`main`（線上）、`develop`（整合，可選）
- 功能分支：`feat/<feature-name>`；修補分支：`hotfix/<issue>`
- 嚴禁直接推送 `main`；所有變更以 PR 合併

## 提交訊息（Conventional Commits）
- `feat: ...` 新功能
- `fix: ...` 修錯
- `docs: ...` 文件
- `chore: ...` 其他維護
- 範例：`feat(api-v1): unify auth responses to single data shape`

## 新功能/變更流程（必走）
1. 在 `docs/PRD.md` 補上背景、需求、AC（驗收條件）
2. 在 `docs/API_SPEC.md` 補上/更新端點（若涉及 API）
3. 在 `docs/TODO.md` 增列任務，拆成能在 0.5~1 天完成的粒度
4. 建立 `feat/*` 分支實作；遵循：
   - 後端 v1 規範：`/api/v1/*`、回應 `{ success, code, message, data }`
   - 前端 `services/*` 單層 `data` 回傳；`API_VERSION=v1`
5. 本地或容器內測試（Jest/RTL/手動）：覆蓋 AC
6. 更新文件：PRD/API_SPEC/變更說明（PR 描述必附回滾方式）
7. 開 PR → 綠燈（lint/test/build）→ 驗收 → 合併 `main`

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

## 驗收清單（合併前必過）
- 後端：v1 路由覆蓋、回應統一、/ready OK
- 前端：`API_VERSION=v1`、services 單層 data、主要流程全通
- 文件：PRD/API_SPEC/CONTRIBUTING/DEPLOYMENT/USER_GUIDE_ADMIN 完整
- CI 綠燈；手動驗證健康檢查與核心功能
