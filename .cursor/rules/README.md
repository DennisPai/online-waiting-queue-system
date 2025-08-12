# Cursor 開發規範（本專案）

## 代碼與 API 規範
- 新介面一律走 `/api/v1`；回應格式 `{ success, code, message, data }`
- 統一錯誤碼：UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL_ERROR
- 後端：先在 adapter 封裝回應，再逐步收斂 controller；加 Helmet、RateLimit、Morgan
- 前端：`API_VERSION='v1'`（`/api/${API_VERSION}`）；services 統一回傳 `data`；slice 不做雙層解包

## 提交與 PR
- 分支：`feat/*`、`fix/*`、`chore/*`
- PR 需附：變更摘要、測試與驗收清單、回滾方式
- 文件：功能變更需同步 `docs/PRD.md` 與 `docs/API_SPEC.md`

## 常用待辦（Todo List）
- [ ] 建立 `/api/v1` 路由 adapter（不影響舊端點）
- [ ] 前端切換到 v1 並統一 services 回傳格式
- [ ] 新增索引與 migration 腳本（status/orderIndex/phone/queueNumber）
- [ ] 將 `init-admin.js`、`removeUniqueIndex.js` 移動到 `backend/scripts/`
- [ ] 精煉 `DEPLOYMENT.md`、`AI_DEVELOPMENT_GUIDE.md`、`管理員使用教學.md`（重點保留，餘者歸檔）
- [ ] E2E 覆蓋「登記→查詢」、「管理員叫號」

## 開發小抄
- 登入後若 `mustChangePassword=true`，前端需強制彈出改密對話框
- `/ready` 就緒檢查端點可做健康監控；`/health` 保持存活檢查

