# 工程規範（Rules）

## 版本與分支
- 分支：main（穩定）、develop（整合）、feature/*、hotfix/*
- PR 必須通過：lint + test + build
- API 破壞性變更走 /api/vN，SemVer 僅於必要時升 MAJOR

## API 設計
- 路徑：資源名+動作（如 `PUT /admin/queue/:id/status`）
- 統一回應：`{ success, code, message, data }`
- 錯誤碼：UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL_ERROR
- 分頁：`{ page, limit, total, pages }`
- Deprecation：新增 v1 → 雙跑 → 前端切換 → 標記 Deprecated → 移除

## 安全
- JWT_SECRET 強度；加 Helmet
- 速率限制：`/auth/login`, `/queue/register`
- CORS 僅允許設定網域
- 登入後強制改密（mustChangePassword）

## 資料庫
- 索引：orderIndex、status、phone、queueNumber（普通索引）
- migration：`backend/scripts/migrations/*`，先灰度與備份

## 可觀測性
- 結構化日誌：JSON，含 traceId/route/latency/errorCode
- `/health` 與 `/ready`

## 測試
- 後端：Jest + supertest（Auth、Queue 核心流程）
- 前端：RTL（表單驗證、條件路由）
- E2E（選配）：Playwright（登記→查詢、管理員叫號）

## CI/CD
- GitHub Actions：lint/test/build 分 job
- 部署順序：先後端（上 v1）→ 再前端切換 v1 → 觀察 24h

## 目錄
- `backend/scripts/`：移動 `init-admin.js`、`removeUniqueIndex.js`、`api-test*.js`
- 同步 `.cursor/rules/guidelines.md` 與本規範關鍵條目

