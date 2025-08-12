# 貢獻指南（CONTRIBUTING）

## 分支與提交流程
- 分支策略：`main`（穩定）、`feat/*`（功能）、`fix/*`（修補）、`chore/*`（雜項）。
- PR 檢核：lint/test/build 全綠；附上變更摘要、驗收清單與回滾方式。

## 開發準則
- 後端：新增 API 走 `/api/v1/*`，回應格式 `{ success, code, message, data }`。
- 前端：`services/*` 統一回傳 `data`；slice 不再二次解包。
- 安全：`helmet`、`rate-limit` 針對敏感端點；CORS 嚴格限制來源。

## 任務來源
- 以 `docs/TODO.md` 為單一真相來源；PR 必須同步勾選對應任務。

## 文件更新
- 需求變更：更新 `docs/PRD.md`
- API 變更：更新 `docs/API_SPEC.md`
- 操作教學：更新 `docs/USER_GUIDE_ADMIN.md`


