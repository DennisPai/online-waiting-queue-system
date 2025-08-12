# Cursor 全域規範（本專案專用，Agent 必讀）

## API 與錯誤（全域）
- 新介面一律使用 `/api/v1`；舊端點保留相容期
- 回應格式：`{ success, code, message, data }`
- 錯誤碼：UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/VALIDATION_ERROR/INTERNAL_ERROR

## 後端約定（全域）
- 新增路由放入 `/api/v1/*`（可先轉接既有 controller，再逐步統一回應）
- 登入後強制改密：`User.mustChangePassword` + `PUT /api/v1/auth/change-password`
- 安全：`helmet`、`express-rate-limit`（`/auth/*`, `/queue/register`）、CORS 限定
- 日誌：`morgan`（dev/combined），未來改為結構化 JSON

## 前端約定（全域）
- `API_VERSION = 'v1'`（切換時統一 `/api/${API_VERSION}`）；`services/*` 一律回傳 `data`
- 若 `mustChangePassword=true`，在後台強制彈出 ChangePasswordDialog 阻擋其他操作
- 拆分巨型頁為元件與 hooks；表單驗證抽 schema

## 文件與提交（全域）
- 每次功能變更同步更新 `docs/PRD.md`（背景/AC）與 `docs/API_SPEC.md`
- PR 必附：變更摘要、驗收清單、回滾方式
  - 工程規範全文：即本檔（取代 `docs/ENGINEERING_RULES.md`）

## To-Do 單一來源（全域）
- 所有重構任務以 `docs/TODO.md` 為權威清單，並同步到 Cursor 的 To-Do。
- Cursor/Agent 執行時，先讀 `docs/TODO.md` 確認當前任務，再動手改。

## 重構期間暫時規則（完成後可移除）
- 一律優先補齊 v1 端點與回應格式，舊端點保持相容，不做破壞性修改。
- 前端預設 `API_VERSION=v1`，如需回退以 `.env` 覆蓋。
- 變更密碼流程為強制流程（mustChangePassword=true 時鎖住所有管理端操作）。