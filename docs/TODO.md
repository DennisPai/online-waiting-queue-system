# 重構 To-Do 清單（單一真相來源）

> 本清單為 Cursor 與人工協作的權威任務列表。請以此為準同步 Cursor To-Do。

## Backend（API 與平台）
- [x] v1 回應封裝 middleware（統一回應格式已套用於 `/api/v1` 入口）
- [x] v1 端點全部統一 `{ success, code, message, data }`（auth/queue/admin 覆蓋；token 置於 `data.token`）
- [ ] 結構化日誌（JSON + traceId + latency + route）；保留 morgan 做相容過渡
- [x] Index migrations：`status`、`orderIndex`、`phone`、`queueNumber`（普通索引；腳本已加入 `backend/scripts/migrations/001_add_indexes.js`，待上線環境執行）
- [x] /ready 擴充：檢查 Mongo 連線健康（`mongoose.connection.readyState`）
- [ ] 安全策略調參：rate-limit 白名單/滑動窗口；Helmet policy 依部署域名調整
- [ ] 單元/整合測試（Jest+supertest）：Auth（login/change-password）、Queue（register/status/number）
- [ ] Deprecated header 策略：舊端點回傳 `Deprecation: true` 與 `Link` 指向 v1

## Frontend（應用與 UX）
- [x] `API_VERSION='v1'` 預設；以 `.env` 可切回舊端點（必要時灰度）
- [x] `services/*` 統一回傳 `data`，slice 單層解包；修正 auth/queue 主要呼叫點
- [ ] 拆分巨型頁：`RegisterPage`、`AdminDashboardPage` → 元件 + hooks（表格區、編輯對話框、匯出等）
- [ ] 表單驗證 schema（yup/zod），與後端錯誤碼對齊（顯示友善訊息）
- [x] 管理端 UI：取消「首次登入強制改密」，改為手動使用變更密碼

## Docs（文件與流程）
- [x] 精煉 `DEPLOYMENT.md`（補充 Zeabur PORT 與環境變數重點、部署後檢查清單）
- [x] `AI_DEVELOPMENT_GUIDE.md` 內容已涵蓋，新增 `CONTRIBUTING.md`（提交規範、分支策略、流程）
- [x] `管理員使用教學.md` → `docs/USER_GUIDE_ADMIN.md`（任務導向）
- [ ] `線上候位系統開發文檔.md` → `docs/archive/…` 歸檔；將有效內容合併至 PRD/API/Rules
- [x] 在 `PRD.md` 更新改密策略（改為手動，不強制首次登入）

## CI/CD（品質與部署）
- [ ] GitHub Actions：前後端分 job（lint/test/build），報告覆蓋率
- [x] Zeabur：確認自動部署追蹤 `main`；feature 分支改用 PR 合併觸發
- [ ] 線上觀察腳本：健康檢查與關鍵 API 探測（curl）

## 驗收檢查（合併 main 前必過）
- [x] 後端：v1 路由全覆蓋、統一回應格式、變更密碼流程測試通過（手動驗證）
- [x] 前端：`API_VERSION=v1` 正常、改密對話框流程正確、核心頁面運作正常（手動驗證）
- [x] 文件：PRD/API_SPEC/CONTRIBUTING/DEPLOYMENT/USER_GUIDE 完整
- [ ] CI 綠燈；手動驗證 `healthy/ready`、註冊/查詢/叫號/排序/編輯/刪除/匯出


