# 重構 To-Do 清單（單一真相來源）

> 本清單為 Cursor 與人工協作的權威任務列表。請以此為準同步 Cursor To-Do。

## 核心重構階段（優先完成）

### Frontend 重構（當前重點）
- [ ] **拆分 AdminDashboardPage**：將候位管理頁面拆分為多個元件
  - [ ] QueueTable 元件（候位清單表格）
  - [ ] CustomerDetailDialog 元件（客戶詳細資料對話框）
  - [ ] ExportDialog 元件（匯出功能）
  - [ ] useQueueManagement hook（候位管理邏輯）
- [ ] **拆分 RegisterPage**：將註冊頁面拆分為多個元件
  - [ ] BasicInfoSection 元件（基本資料區塊）
  - [ ] AddressSection 元件（地址資訊區塊）  
  - [ ] FamilySection 元件（家人資訊區塊）
  - [ ] ConsultationSection 元件（諮詢主題區塊）
  - [ ] useRegistrationForm hook（表單邏輯）
- [ ] **表單驗證統一化**：建立 validation schema（使用 yup 或 zod）
  - [ ] 註冊表單驗證 schema
  - [ ] 客戶編輯表單驗證 schema
  - [ ] 與後端錯誤碼對齊，顯示友善錯誤訊息

### Backend 最佳化（次要）  
- [ ] **結構化日誌**：實作 JSON 格式日誌（traceId + latency + route）
- [ ] **單元測試**：Auth 和 Queue 核心功能測試（Jest + supertest）

## 文檔維護
- [x] 建立 README 同步更新工作流程（已加入 engineering-rules.mdc）
- [x] 確認需求開發流程（PRD 先行規劃機制已建立）  
- [ ] 歸檔舊開發文檔：將 `線上候位系統開發文檔.md` 移至 `docs/archive/`

## 已完成項目（v1 統一 API 階段）
- [x] v1 回應封裝 middleware（統一回應格式已套用於 `/api/v1` 入口）
- [x] v1 端點全部統一 `{ success, code, message, data }`（auth/queue/admin 覆蓋；token 置於 `data.token`）
- [x] Index migrations：`status`、`orderIndex`、`phone`、`queueNumber`（普通索引腳本完成）
- [x] /ready 擴充：檢查 Mongo 連線健康（`mongoose.connection.readyState`）
- [x] `API_VERSION='v1'` 預設；`services/*` 統一回傳 `data`，slice 單層解包
- [x] 管理端 UI：取消「首次登入強制改密」，改為手動使用變更密碼
- [x] 文檔精煉：DEPLOYMENT/CONTRIBUTING/USER_GUIDE_ADMIN 完成
- [x] Zeabur 自動部署追蹤 `main` 確認

## 延後項目（非核心）
- 安全策略調參：rate-limit 白名單/滑動窗口；Helmet policy 依部署域名調整
- GitHub Actions：前後端分 job（lint/test/build），報告覆蓋率  
- 線上觀察腳本：健康檢查與關鍵 API 探測（curl）
- Deprecated header 策略：舊端點回傳 `Deprecation: true` 與 `Link` 指向 v1


