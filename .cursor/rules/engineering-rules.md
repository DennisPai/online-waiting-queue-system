# Cursor 規範（重構專案專用）

## API 與錯誤
- 新介面一律使用 `/api/v1`；舊端點保留相容期
- 回應格式：`{ success, code, message, data }`
- 錯誤碼：UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL_ERROR

## 後端約定
- 新增路由放入 `/api/v1/*`（可先轉接既有 controller，再逐步統一回應）
- 登入後強制改密：`User.mustChangePassword` + `PUT /api/v1/auth/change-password`
- 安全：`helmet`、`express-rate-limit`（`/auth/*`, `/queue/register`）、CORS 限定
- 日誌：`morgan`（dev/combined），未來改為結構化 JSON

## 前端約定
- `API_VERSION = 'v1'`（切換時統一 `/api/${API_VERSION}`）；`services/*` 一律回傳 `data`
- 若 `mustChangePassword=true`，在後台強制彈出 ChangePasswordDialog 阻擋其他操作
- 拆分巨型頁為元件與 hooks；表單驗證抽 schema

## 文件與提交
- 每次功能變更同步更新 `docs/PRD.md`（背景/AC）與 `docs/API_SPEC.md`
- PR 必附：變更摘要、驗收清單、回滾方式

## To-Do 單一來源
- 所有重構任務請以 `docs/TODO.md` 為權威清單，並同步到 Cursor 的 To-Do。Cursor Agent 執行時，請優先讀取 `docs/TODO.md` 來決定當前任務。