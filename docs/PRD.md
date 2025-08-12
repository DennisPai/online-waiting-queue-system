# 線上候位系統 PRD

## 背景與目標
- 不中斷服務情況下重構：統一 API、強化安全與可維護性、精煉文件，為後續快速擴充做準備。
- KPI：
  - 前台成功登記率 ≥ 98%
  - 登記/查詢流程錯誤率 ≤ 1%
  - 管理端日常操作錯誤率 ≤ 1%
  - 部署期間零停機（健康檢查 200 OK 維持）

## 角色與權限
- 訪客：登記候位（取決於 `publicRegistrationEnabled`）、查詢候位
- 管理員（admin/staff）：登入、查看列表、叫號、排序、編輯、取消/復原、刪除、匯出、系統設定

## 功能需求
1) 前台
- 候位登記（國曆/農曆、多地址、多家人、其他詳細內容、備註）
- 候位查詢（姓名或電話擇一，含家人姓名匹配）
- 導航與首頁依 `publicRegistrationEnabled` 或登入狀態顯示「我要候位」

2) 後台
- 候位列表（拖曳排序、快速完成移末尾、取消/復原、編輯、刪除、匯出）
- 叫號（更新 `currentQueueNumber`）
- 設定（`isQueueOpen`、`nextSessionDate`、`maxQueueNumber`、`minutesPerCustomer`、`simplifiedMode`、`publicRegistrationEnabled`）
- 變更密碼功能（保留預設 admin/admin123，登入後非強制）

3) 系統/平台
- 健康檢查 `/health`，就緒檢查 `/ready`（後續）
- Zeabur 前後端分離部署，前端 `PORT=80`，CORS 對應網域

## 非功能需求（NFR）
- 可用性：無停機滾動部署；健康/就緒探針
- 效能：主要查詢有索引（status、orderIndex、phone、queueNumber），TTFB < 500ms（P95）
- 安全：JWT 強密鑰、Helmet、速率限制
- 可維護性：API 規格統一、錯誤碼一致、結構化日誌、單元&整合測試

## 里程碑
- M0：建立 PRD/API 規格/Engineering Rules + `.cursor/rules`
- M1：後端新增 `/api/v1`（相容）、新增 `change-password`、安全強化
- M2：前端切到 v1、提供改密 UI（非強制）、服務層統一回傳格式、拆分大檔

## 驗收準則（本階段 v1 接入）
- 後端：`/api/v1` 路由全覆蓋、統一回應格式；`/ready` 包含 DB 就緒；索引 migration 腳本可執行。
- 前端：`API_VERSION=v1` 預設；`services/*` 統一回傳 data，slice 不再 `.data.data`。
- 文件：`CONTRIBUTING.md`、`DEPLOYMENT.md`、`USER_GUIDE_ADMIN.md` 完整；冗餘舊檔移除。
- M3：觀察 1~2 週 → 下線舊端點、清理相容碼；精煉文檔完成

## 風險
- 回應格式不一致導致前端解構錯誤 → 先以 v1 增量、環境可回退舊端點
- 強制改密阻塞操作 → 僅限制後台功能，保留登出/改密操作


