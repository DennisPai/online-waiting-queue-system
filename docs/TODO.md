# 重構 To-Do 清單（單一真相來源）

> 本清單為 Cursor 與人工協作的權威任務列表。請以此為準同步 Cursor To-Do。

## 核心重構階段（優先完成）

### Frontend 重構（當前重點）
- [x] **拆分 AdminDashboardPage**：將候位管理頁面拆分為多個元件
  - [x] QueueTable 元件（候位清單表格）
  - [x] CustomerDetailDialog 元件（客戶詳細資料對話框）
  - [x] ExportDialog 元件（匯出功能）- 已存在於 components/
  - [x] useQueueManagement hook（候位管理邏輯）
- [x] **拆分 RegisterPage**：將註冊頁面拆分為多個元件
  - [x] BasicInfoSection 元件（基本資料區塊）
  - [x] AddressSection 元件（地址資訊區塊）  
  - [x] FamilySection 元件（家人資訊區塊）
  - [x] ConsultationSection 元件（諮詢主題區塊）
  - [x] useRegistrationForm hook（表單邏輯）
  - [x] RegistrationSuccess 元件（成功頁面）
- [ ] **表單驗證統一化**：建立 validation schema（使用 yup 或 zod）
  - [ ] 註冊表單驗證 schema
  - [ ] 客戶編輯表單驗證 schema
  - [ ] 與後端錯誤碼對齊，顯示友善錯誤訊息

### Backend 最佳化（次要）  
- [ ] **結構化日誌**：實作 JSON 格式日誌（traceId + latency + route）
- [ ] **單元測試**：Auth 和 Queue 核心功能測試（Jest + supertest）

## 架構優化階段（新增）

### 階段一：代碼清理與標準化（立即執行）
- [x] **清理重複文件**：移除重複的 RegisterForm、備份文件、冗餘文檔
- [x] **統一工具函數庫**：建立 utils/index.js 統一匯出
- [x] **標準化目錄結構**：重組 backend services/repositories，前端 components 分類
- [x] **文檔整合**：移除 docs/ENGINEERING_RULES.md，統一使用 .cursor/rules

### 階段二：後端服務層重構
- [x] **建立 Service 層**：抽取業務邏輯到 services/，controllers 僅處理 HTTP
- [x] **Repository 模式**：建立數據訪問層，分離 Models 和業務邏輯
- [x] **統一錯誤處理**：建立 ApiError 類和全局錯誤處理中間件
- [x] **請求驗證器**：統一的 validators/ 目錄和驗證邏輯

### 階段三：前端架構優化
- [x] **拆分複雜 Hooks**：將 useQueueManagement(745行) 拆分為專門 hooks
- [x] **統一表單驗證**：建立原生 JS schemas 和 useFormValidation hook
- [x] **通用組件庫**：建立 FormField、DataTable、ConfirmDialog 等通用組件
- [x] **前端工具重組**：validation/、formatting/、constants/ 分類整理

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

## 候位預估時間優化（✅ 已完成）

> **功能狀態**：所有階段已完成實作，功能已上線

### 階段一：後端資料結構調整
- [x] **擴展 SystemSetting 模型**：新增 `totalCustomerCount`、`lastCompletedTime` 欄位
- [x] **擴展 WaitingRecord 模型**：新增 `completedAt` 欄位  
- [x] **資料庫遷移腳本**：建立欄位遷移和預設值設定
- [x] **驗證資料結構**：確保新欄位正確儲存和讀取

### 階段二：後端 API 功能擴展
- [x] **擴展系統設定 API**：基於現有 admin.controller.js 新增客戶總數和完成時間管理
- [x] **修改狀態更新邏輯**：updateQueueStatus 增加 completedAt 自動設定
- [x] **實作 orderIndex 遞補**：叫號完成後自動更新所有客戶排序
- [x] **建立重設功能 API**：客戶總數重設和完成時間重設
- [x] **修改預估時間計算**：基於 lastCompletedTime 和 orderIndex 的新邏輯

### 階段三：前端管理介面優化  
- [x] **擴展候位管理頁面**：在 AdminDashboardPage 新增客戶總數和完成時間控制項
- [x] **修改叫號邏輯**：保持一鍵操作，整合標記完成和時間更新
- [x] **實作重設按鈕**：客戶總數重設和上一位辦完時間重設功能
- [x] **優化 UI 佈局**：確保新控制項與現有介面協調
- [x] **整合自動更新機制**：基於 isQueueOpen 狀態的智能更新

### 階段四：前端預估時間顯示
- [x] **修改首頁邏輯**：基於 totalCustomerCount 的固定預估結束時間
- [x] **優化客戶查詢**：基於 lastCompletedTime 和 orderIndex 的動態預估時間  
- [x] **更新狀態管理**：Redux slice 支援新的系統設定欄位
- [x] **改進即時更新**：叫號後所有相關顯示自動刷新

### 階段五：整合測試與優化
- [x] **功能測試**：叫號流程、預估時間準確性、重設功能
- [x] **邊界測試**：無客戶、模式切換、大量操作等情境
- [x] **UI/UX 優化**：確保操作流暢和資訊清晰
- [x] **文檔更新**：更新 API_SPEC.md 和 PRD.md
- [x] **清理暫時文檔**：刪除 `docs/QUEUE_TIME_ESTIMATION_PLAN.md`

## 新匯出功能開發（當前重點）

### 階段一：基礎準備 ✅
- [x] **安裝PDF生成套件**：安裝 jspdf 和 html2canvas（參考 `docs/INTEGRATION_GUIDE.md` 第一步）
- [x] **修改匯出對話框**：在 ExportDialog.jsx 新增兩個選項：Excel表格範本和PDF問事單（參考 `docs/INTEGRATION_GUIDE.md` 第三步）
- [x] **擴展匯出工具**：在 exportUtils.js 新增表格範本相關函數（參考 `docs/INTEGRATION_GUIDE.md` 第四步和 `docs/EXCEL_EXPORT_IMPLEMENTATION.md`）

### 階段二：Excel表格範本功能 ✅
- [x] **建立Excel預覽表格元件**：建立 ExcelPreviewTable.jsx（參考 `docs/EXCEL_EXPORT_IMPLEMENTATION.md` ExcelPreviewTable部分）
- [x] **建立Excel預覽頁面**：建立 ExcelPreviewPage.jsx（參考 `docs/EXCEL_EXPORT_IMPLEMENTATION.md` ExcelPreviewPage部分）
- [x] **實作合併儲存格邏輯**：完成 formatCustomerDataForTemplate 和 exportToTemplateExcel 函數（參考 `docs/EXCEL_EXPORT_IMPLEMENTATION.md` 核心實作函數）

### 階段三：PDF問事單功能 ✅
- [x] **建立PDF生成工具**：建立 pdfGenerator.js 實現修玄宮問事單PDF生成（參考 `docs/PDF_FORMS_IMPLEMENTATION.md` pdfGenerator.js部分）
- [x] **建立問事單模板元件**：建立 FormTemplate.jsx（參考 `docs/PDF_FORMS_IMPLEMENTATION.md` FormTemplate.jsx部分）
- [x] **建立PDF預覽頁面**：建立 PDFPreviewPage.jsx（參考 `docs/PDF_FORMS_IMPLEMENTATION.md` PDFPreviewPage.jsx部分）

### 階段四：系統整合 ✅
- [x] **新增預覽頁面路由**：在 App.js 新增 /admin/excel-preview 和 /admin/pdf-preview 路由（參考 `docs/INTEGRATION_GUIDE.md` 第二步）
- [x] **更新元件索引檔案**：更新 components/admin/index.js 匯出新元件（參考 `docs/INTEGRATION_GUIDE.md` 第六步）

### 階段五：測試與驗證 ✅
- [x] **完整功能測試**：測試預覽機制、下載功能、資料篩選、合併儲存格等（參考 `docs/INTEGRATION_GUIDE.md` 第七步）
- [x] **Excel格式驗證**：確認合併儲存格正確、欄位順序符合需求、農曆日期格式正確（參考 `docs/EXCEL_EXPORT_IMPLEMENTATION.md` 測試檢查點）
- [x] **PDF佈局驗證**：確認A4橫式雙A5直式佈局、裁切線、問事單欄位填入正確（參考 `docs/PDF_FORMS_IMPLEMENTATION.md` 測試檢查點）

### 階段六：Bug修復與優化（緊急）🚨
- [x] **修復預覽頁面返回按鈕**：ExcelPreviewPage 和 PDFPreviewPage 的返回按鈕改用 navigate('/admin/dashboard')
- [x] **修復 Excel 下載錯誤**：保存原始客戶資料，解決資料丟失問題
- [x] **修復 Excel 合併儲存格**：改進合併邏輯，正確處理 rowSpan 和合併範圍顯示
- [ ] **重新設計 PDF 樣式**：完全按照修玄宮問事單.jpg 重新設計 PDF 佈局和美化
- [ ] **修復 PDF 中文亂碼**：解決 jsPDF 中文字體顯示問題，確保中文正常顯示
- [ ] **完整測試修復**：逐一驗證所有修復項目，確保功能正常

### 階段七：文檔更新與收尾 🎯
- [ ] **更新API文檔**：在 API_SPEC.md 中記錄新的匯出功能
- [ ] **更新功能說明**：在 README.md 中新增新匯出功能的說明
- [ ] **更新用戶指南**：在 USER_GUIDE_ADMIN.md 中新增操作說明
- [x] **推送程式碼變更**：執行 git commit 和 git push 部署到 Zeabur（重要：每次修改後都要推送）
- [ ] **清理開發文檔**：開發完成後將臨時開發文檔移至 docs/archive/ 目錄

## 延後項目（非核心）
- 安全策略調參：rate-limit 白名單/滑動窗口；Helmet policy 依部署域名調整
- GitHub Actions：前後端分 job（lint/test/build），報告覆蓋率  
- 線上觀察腳本：健康檢查與關鍵 API 探測（curl）
- Deprecated header 策略：舊端點回傳 `Deprecation: true` 與 `Link` 指向 v1


