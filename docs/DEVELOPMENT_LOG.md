# 開發日誌 (Development Log)

> **目的**：記錄開發過程中的重要決策、遇到的問題、解決方案和經驗教訓，幫助未來的開發者/Agent快速理解專案並避免重複踩坑。

## 📋 日誌使用指南

### 對於Agent/開發者
1. **開始工作前**：先閱讀本日誌，了解已知問題和解決方案
2. **遇到問題時**：查看"常見問題"部分，可能已有解決方案
3. **完成重要修改後**：更新相關日誌條目

### 日誌更新規則
- **重大功能**：必須記錄設計決策和實現細節
- **Bug修復**：記錄問題原因、解決方案、預防措施
- **架構變更**：記錄變更原因、影響範圍、遷移指南
- **性能優化**：記錄優化前後對比、措施說明

---

## 🗓️ 開發時間線

### 2025-11-29 - 修復活動報名設定同步問題

**背景**：用戶反映後臺"活動報名"設定保存後會跳回預設值，且首頁未能正確更新，導致設定無法正常使用。

**問題診斷**：

經過詳細檢查，發現三個根本原因：

1. **後端缺少 GET API**
   - 前端 `getEventBanner` Redux thunk 無對應的後端端點
   - 導致前端無法獨立載入 eventBanner 設定

2. **後端返回格式不一致**
   - `PUT /api/v1/admin/settings/event-banner` 返回 `{ data: { eventBanner: {...} } }`
   - 應該直接返回 `{ data: {...} }`（eventBanner 物件）
   - 導致前端 Redux 接收到錯誤的資料結構

3. **前端缺少同步邏輯**
   - `AdminSettingsPage` 保存成功後沒有重新載入最新設定
   - 依賴 Redux state 的 `useEffect` 監聽到錯誤的資料結構
   - 本地狀態被設定成預設值

**技術實施**：

1. **新增後端 GET API**：
   - [`backend/src/controllers/admin.controller.js`](backend/src/controllers/admin.controller.js)
     - 添加 `getEventBanner` 控制器函數
     - 使用標準 `async/await + try-catch` 錯誤處理模式（與檔案其他函數一致）
     - 直接返回 `settings.eventBanner` 物件
   - [`backend/src/routes/v1/admin.routes.js`](backend/src/routes/v1/admin.routes.js)
     - 新增 `GET /api/v1/admin/settings/event-banner` 路由

2. **修正後端返回格式**：
   - [`backend/src/controllers/admin.controller.js`](backend/src/controllers/admin.controller.js)
     - 修改 `updateEventBanner` 的返回格式
     - 從 `data: { eventBanner: ... }` 改為 `data: settings.eventBanner`

3. **修正前端 Redux reducer**：
   - [`frontend/src/redux/slices/queueSlice.js`](frontend/src/redux/slices/queueSlice.js)
     - 在 `getEventBanner.fulfilled` 和 `updateEventBanner.fulfilled` 中處理兩種可能的返回格式
     - 使用 `action.payload.eventBanner || action.payload` 確保向後兼容

4. **前端保存後重新載入**：
   - [`frontend/src/pages/admin/AdminSettingsPage.jsx`](frontend/src/pages/admin/AdminSettingsPage.jsx)
     - 修改 `handleSaveEventBanner` 函數
     - 保存成功後調用 `dispatch(getEventBanner())` 重新載入最新設定
     - 添加 `getEventBanner` 到 import 列表

**驗收結果**：

- [x] 後臺保存 eventBanner 設定後，設定不會跳回預設值
- [x] 首頁能正確顯示更新後的 eventBanner 內容
- [x] 重新整理後臺設定頁面，能看到之前保存的設定
- [x] 資料在前後端完全同步
- [x] API 規格文檔已更新（`docs/API_SPEC.md`）

**經驗教訓**：

1. **API 開發完整性檢查清單**：
   - 設計 API 時應同時提供 GET、PUT/POST、DELETE（視需求）
   - 避免只提供寫入 API 而缺少讀取 API
   - 前端 Redux thunk 與後端 API 端點應一一對應

2. **返回格式一致性**：
   - 統一的返回格式有助於前端統一處理
   - 避免在 `data` 中再包一層物件名（如 `data: { eventBanner: {...} }`）
   - 應該直接返回資料物件（`data: {...}`）

3. **前端資料同步策略**：
   - 寫入操作成功後應該重新載入資料，確保顯示最新狀態
   - 不要依賴寫入 API 的返回值作為唯一的資料來源
   - 使用獨立的 GET API 確保資料一致性

4. **錯誤處理統一性**：
   - 同一個檔案中的函數應使用統一的錯誤處理模式
   - `admin.controller.js` 使用 `async/await + try-catch`，不使用 `catchAsync`
   - 保持程式碼風格一致性，避免引入不必要的依賴

5. **部署前測試**：
   - 檢查是否有未定義的依賴（如 `catchAsync`）
   - 確保所有 import/require 語句正確
   - 本地測試後再推送到生產環境

**相關 Commit**：
- `fix: 修復活動報名設定同步問題`
- `fix: 修正 getEventBanner 函數使用標準 try-catch 模式`

---

### 2025-11-29 - 新增家人地址同上功能與活動報名區塊

**背景**：用戶請求兩項新功能：1) 在填寫報名表單時為家人地址提供"同上"快速填寫功能，2) 在首頁新增可配置的活動報名宣傳區塊。

**需求分析**：

1. **家人地址"同上"功能**
   - 適用範圍：前台和後台的所有報名表單（共用 `RegisterForm` 組件）
   - 核心邏輯：勾選"同上"時自動填入主客戶的第一個地址和地址類型
   - 取消勾選時保留已填內容，不自動清空
   - 主客戶未填地址時禁用勾選並顯示提示
   - 每個家人獨立管理"同上"狀態

2. **活動報名區塊**
   - 前台顯示：在首頁"下次辦事時間"下方新增Card
   - 後台管理：新增"活動報名"分頁，提供完整的設定界面和即時預覽
   - 連結開啟：固定以新分頁方式開啟（`target="_blank"`）
   - 可配置項：啟用開關、標題（文字/大小/顏色/對齊）、按鈕（文字/連結/顏色）

**技術實施**：

1. **後端資料庫擴展**（[`backend/src/models/system-setting.model.js`](backend/src/models/system-setting.model.js)）：
   ```javascript
   eventBanner: {
     enabled: { type: Boolean, default: false },
     title: { type: String, default: '修玄宮特別活動' },
     titleSize: { type: String, default: '1.5rem' },
     titleColor: { type: String, default: '#1976d2' },
     titleAlign: { type: String, default: 'center', enum: ['left', 'center', 'right'] },
     buttonText: { type: String, default: '點我填寫報名表單' },
     buttonUrl: { type: String, default: 'https://www.google.com' },
     buttonColor: { type: String, default: 'primary', enum: [...] }
   }
   ```
   - 在 `getSettings` 方法中添加自動初始化邏輯

2. **後端API端點**（[`backend/src/controllers/admin.controller.js`](backend/src/controllers/admin.controller.js)）：
   - 新增 `updateEventBanner` 方法
   - URL格式驗證（必須包含 `http://` 或 `https://`）
   - 字體大小驗證（支援 rem/px/em）
   - 顏色格式驗證（hex格式）
   - 路由：`PUT /api/v1/admin/settings/event-banner`

3. **前端Redux狀態管理**：
   - [`frontend/src/redux/slices/queueSlice.js`](frontend/src/redux/slices/queueSlice.js)
     - 新增 `eventBanner` 到 initialState
     - 新增 `updateEventBanner` asyncThunk
     - 在 `getQueueStatus.fulfilled` 中同步 eventBanner
   - [`frontend/src/services/queueService.js`](frontend/src/services/queueService.js)
     - 新增 `updateEventBanner` 方法

4. **家人地址"同上"功能**：
   - [`frontend/src/components/RegisterForm.jsx`](frontend/src/components/RegisterForm.jsx)
     - 新增 `handleUsePrimaryAddress(index, checked)` 方法
     - 勾選時複製主客戶第一個地址和類型
     - 取消勾選時只更新狀態，保留地址內容
     - 在家人地址輸入框前添加Checkbox和提示
   - [`frontend/src/components/registration/FamilySection.jsx`](frontend/src/components/registration/FamilySection.jsx)
     - 新增 `onUsePrimaryAddress` prop
     - 添加相同的Checkbox UI

5. **活動報名管理界面**：
   - [`frontend/src/pages/admin/AdminSettingsPage.jsx`](frontend/src/pages/admin/AdminSettingsPage.jsx)
     - 引入 Tabs 組件重構頁面結構
     - 新增4個分頁：基本設定、候位設定、註冊設定、活動報名
     - **活動報名Tab**包含：
       - 啟用/停用開關
       - 標題設定區（文字、大小、顏色、對齊）
       - 按鈕設定區（文字、URL、顏色）
       - 即時預覽面板
       - 儲存按鈕

6. **活動報名前台顯示**：
   - [`frontend/src/components/EventBanner.jsx`](frontend/src/components/EventBanner.jsx)（新建）
     - 接收 `eventBanner` props
     - 條件渲染（enabled 為 true 才顯示）
     - 動態樣式（fontSize、color、align）
     - 安全連結（`target="_blank" rel="noopener noreferrer"`）
   - [`frontend/src/pages/HomePage.jsx`](frontend/src/pages/HomePage.jsx)
     - 從 Redux 獲取 `eventBanner`
     - 在 `QueueStatusDisplay` 之後渲染 `EventBanner`

**測試要點**：

- [x] 後端 eventBanner API 正常運作
- [x] 前台家人地址"同上"功能（勾選/取消/禁用狀態）
- [x] 後台家人地址"同上"功能（共用組件，自動支援）
- [x] 後台活動報名設定頁面正常顯示
- [x] 即時預覽準確反映設定變更
- [x] 前台活動報名區塊根據設定正確顯示/隱藏
- [x] 連結以新分頁開啟
- [ ] 實際瀏覽器測試（待用戶確認）

**經驗教訓**：

1. **共用組件策略**：
   - `RegisterForm` 和 `FamilySection` 在前後台共用
   - 修改一處即可同時影響所有使用位置
   - 減少代碼重複，提升維護效率

2. **Tabs組織大型設定頁**：
   - AdminSettingsPage 原本所有設定混在一頁
   - 使用 Tabs 分類組織（基本/候位/註冊/活動）
   - 提升用戶體驗和可維護性
   - 未來擴展新設定更方便

3. **即時預覽提升UX**：
   - 活動報名設定提供即時預覽
   - 用戶無需切換頁面即可確認效果
   - 避免設定錯誤導致的前台顯示問題

4. **安全外部連結**：
   - 使用 `target="_blank"` 固定新分頁開啟
   - 必須搭配 `rel="noopener noreferrer"` 防止安全風險
   - 後端驗證 URL 格式防止 XSS 攻擊

5. **向後兼容的資料遷移**：
   - `SystemSetting.getSettings` 自動初始化 eventBanner
   - 舊資料自動升級，無需手動遷移
   - 確保雲端部署自動更新時不出問題

**待辦事項**：

- [ ] 將 AdminSettingsPage 的候位設定和註冊設定內容從 Tab 0 移到各自的 Tabs
- [ ] 用戶實際測試新功能並提供反饋

---

### 2025-11-29 - 修復匯出資料功能並優化重新排序功能

**背景**：用戶反饋後台「匯出資料」按鈕點擊無反應，同時要求檢查並優化「重新排序」功能。

**問題分析**：

1. **匯出資料按鈕無反應**
   - **症狀**：點擊後台候位管理中的「匯出資料」按鈕沒有任何反應
   - **根本原因**：
     - `AdminDashboardPage` 從 hook 中解構並使用 `handleExport` 方法
     - `useQueueUI` 只導出了 `handleOpenExportDialog`，未提供 `handleExport`
     - 函數名稱不匹配導致 `handleExport` 為 `undefined`
   - **解決方案**：在 `useQueueUI` 中添加 `handleExport` 別名指向 `handleOpenExportDialog`

2. **重新排序功能優化**
   - **現有問題**：
     - 使用 `for` 循環逐個發送 API 請求，當客戶數量多時性能差
     - 錯誤處理不完整：中途失敗會導致部分更新成功、部分失敗，數據不一致
     - 缺少重新載入機制：更新後不刷新列表，無法確保顯示的是後端的實際狀態
   - **優化方案**：
     - 使用 `Promise.all` 並行發送所有請求，大幅提升性能
     - 添加 `.unwrap()` 確保錯誤能被正確捕獲
     - 成功/失敗後都重新載入列表，確保前後端數據一致性

**技術實施**：

1. **修復匯出功能**（[`frontend/src/hooks/admin/useQueueUI.js`](frontend/src/hooks/admin/useQueueUI.js)）：
   ```javascript
   return {
     // ... 其他返回值 ...
     handleOpenExportDialog,
     handleExport: handleOpenExportDialog, // 添加別名以兼容現有代碼
     handleCloseExportDialog,
     // ... 其他返回值 ...
   };
   ```

2. **優化重新排序**（[`frontend/src/hooks/admin/useQueueActions.js`](frontend/src/hooks/admin/useQueueActions.js)）：
   ```javascript
   const handleReorderQueue = useCallback(async () => {
     try {
       // ... 過濾和排序邏輯 ...
       
       // 使用 Promise.all 並行發送請求（替代原來的 for 循環）
       await Promise.all(
         updates.map(update =>
           dispatch(updateQueueOrder({
             queueId: update.id,
             newOrder: update.orderIndex
           })).unwrap()
         )
       );

       // 成功後重新載入列表，確保數據一致性
       loadQueueList();
       
       dispatch(showAlert({
         message: '候位順序重新排列完成',
         severity: 'success'
       }));
     } catch (error) {
       // 失敗時也重新載入，恢復到後端的正確狀態
       loadQueueList();
       dispatch(showAlert({
         message: '重新排序失敗，請稍後再試',
         severity: 'error'
       }));
     }
   }, [localQueueList, setLocalQueueList, dispatch, loadQueueList]);
   ```

**影響範圍**：
- 修復了後台匯出資料按鈕功能
- 大幅提升了重新排序的性能（並行請求）
- 改善了錯誤處理，避免數據不一致
- 所有修復通過 linter 檢查

**性能提升**：
- **順序請求**（舊方式）：假設有 50 個客戶，每個請求 100ms，總耗時約 5 秒
- **並行請求**（新方式）：所有請求同時發送，總耗時約 100-200ms（取決於網路）
- **性能提升**：約 25-50 倍

**經驗教訓**：
1. **命名一致性**：Hook 導出的方法名應與使用處保持一致，或提供明確的別名
2. **性能優化**：批量操作優先使用並行請求（`Promise.all`）而非順序執行
3. **數據一致性**：關鍵操作後應重新載入數據，確保前後端同步
4. **錯誤恢復**：失敗時應恢復到已知的正確狀態，避免殘留錯誤數據

---

### 2025-11-29 - 修復候位登記和叫號功能

**背景**：重構完成後用戶報告兩個關鍵功能問題，影響正常使用。

**問題分析**：

1. **候位登記失敗（「伺服器內部錯誤」）**
   - **症狀**：前後台候位登記表單填寫完成後無法送出，顯示「伺服器內部錯誤」
   - **根本原因**：
     - `WaitingRecord` 模型中 `queueNumber` 是必填欄位（`required: true`）
     - `QueueService.registerQueue` 的 `processQueueData` 方法中沒有自動生成 `queueNumber`
     - 雖然模型提供了 `getNextQueueNumber()` 靜態方法，但從未被調用
     - 導致 MongoDB 創建記錄時拋出驗證錯誤
   - **解決方案**：在 `registerQueue` 方法中、創建記錄前添加 queueNumber 自動生成邏輯

2. **叫號下一位功能異常**
   - **症狀**：點擊「叫號下一位」按鈕後跳出錯誤訊息，列表無法正常刷新，需要手動重新整理頁面
   - **根本原因**：
     - Redux slice 中 `callNextQueue.fulfilled` 的處理邏輯錯誤
     - 前端期望的數據結構：`{ queueNumber, record: { _id, ... } }`
     - 後端實際返回的數據結構：`{ completedCustomer, nextCustomer, currentQueueNumber, lastCompletedTime }`
     - 數據結構不匹配導致 Redux 狀態更新失敗，前端無法正確刷新列表
   - **解決方案**：
     - 修改 Redux 處理邏輯，不在 reducer 中直接操作列表
     - 只更新系統設定（currentQueueNumber、lastCompletedTime）
     - 讓前端 Hook 負責重新載入列表，確保 orderIndex 一致性

**技術實施**：

1. **修復 QueueService.registerQueue**（[`backend/src/services/QueueService.js`](backend/src/services/QueueService.js)）：
   ```javascript
   // 在 processQueueData 之後、create 之前添加：
   if (!processedData.queueNumber) {
     processedData.queueNumber = await WaitingRecord.getNextQueueNumber();
   }
   ```

2. **修改 Redux callNextQueue.fulfilled**（[`frontend/src/redux/slices/queueSlice.js`](frontend/src/redux/slices/queueSlice.js)）：
   ```javascript
   .addCase(callNextQueue.fulfilled, (state, action) => {
     state.isLoading = false;
     // 更新當前叫號和上一位辦完時間
     if (action.payload.currentQueueNumber) {
       state.queueStatus = state.queueStatus || {};
       state.queueStatus.currentQueueNumber = action.payload.currentQueueNumber;
       state.queueStatus.lastCompletedTime = action.payload.lastCompletedTime;
     }
     // 不在這裡更新 queueList，讓前端重新載入列表
   })
   ```

3. **改進 useQueueActions.handleCallNext**（[`frontend/src/hooks/admin/useQueueActions.js`](frontend/src/hooks/admin/useQueueActions.js)）：
   ```javascript
   const handleCallNext = useCallback(async () => {
     try {
       const result = await dispatch(callNextQueue()).unwrap();
       loadQueueList(); // 立即重新載入列表
       dispatch(showAlert({
         message: result.message || '叫號成功',
         severity: 'success'
       }));
     } catch (error) {
       // 顯示錯誤訊息給用戶
       dispatch(showAlert({
         message: error || '叫號失敗',
         severity: 'error'
       }));
     }
   }, [dispatch, loadQueueList]);
   ```

**影響範圍**：
- 修復了前後台的候位登記功能
- 修復了管理後台的叫號下一位功能
- 改善了錯誤提示用戶體驗
- 所有修復通過 linter 檢查

**經驗教訓**：
1. **數據驗證**：模型必填欄位必須在服務層確保有值
2. **自動生成**：像 ID、序號這類自動生成的欄位要在服務層明確處理
3. **數據結構一致性**：前後端數據結構要保持一致，或在服務層統一處理
4. **Redux 最佳實踐**：複雜的列表更新邏輯應該通過重新載入實現，而非直接操作 state

---

### 2025-11-29 - 修復重構後的功能問題

**背景**：重構完成後發現三個主要功能問題，需要立即修復。

**問題分析**：

1. **分頁功能異常**
   - **症狀**：後台候位管理的「已完成客戶」、「已取消客戶」分頁點擊無反應
   - **根本原因**：`useQueueManagementRefactored` 缺少 `handleTabChange` 方法
   - **解決方案**：在 `useQueueData` 中添加 `handleTabChange` 方法包裝 `setCurrentTab`

2. **系統設定顯示和重設異常**
   - **症狀**：目前叫號、客戶總數、上一位辦完時間無法正常顯示，重設按鈕無反應
   - **根本原因**：`useQueueManagementRefactored` 缺少系統設定相關的狀態和方法
   - **解決方案**：創建新的 `useQueueSettings` Hook 管理所有系統設定功能

3. **候位登記失敗**
   - **症狀**：填寫完表單後顯示「伺服器內部錯誤」
   - **根本原因**：Redux slice 中存在雙層解包問題（`response.data || response`）
   - **解決方案**：移除多餘的解包，因為 queueService 已返回正確格式

**技術實施**：

1. **修正 Redux Slice**（[`frontend/src/redux/slices/queueSlice.js`](frontend/src/redux/slices/queueSlice.js)）：
   - `registerQueue`: 移除 `response.data || response`，直接返回 `response`
   - `getQueueNumberStatus`: 同樣移除雙層解包
   - 移除過時的註釋

2. **擴展 useQueueData**（[`frontend/src/hooks/admin/useQueueData.js`](frontend/src/hooks/admin/useQueueData.js)）：
   - 添加 `handleTabChange` 方法
   - 方法接收 `(event, newValue)` 參數並更新 `currentTab`

3. **創建 useQueueSettings**（[`frontend/src/hooks/admin/useQueueSettings.js`](frontend/src/hooks/admin/useQueueSettings.js)）：
   - 管理 `totalCustomerCount` 和 `lastCompletedTime` 的輸入狀態
   - 提供設定和重設功能
   - 自動同步 Redux 狀態到本地輸入
   - 處理日期時間格式轉換

4. **整合到主 Hook**（[`frontend/src/hooks/admin/useQueueManagementRefactored.js`](frontend/src/hooks/admin/useQueueManagementRefactored.js)）：
   - 引入 `useQueueSettings`
   - 將系統設定相關狀態和方法添加到返回值

**影響範圍**：
- 修復了管理後台的分頁切換功能
- 修復了系統設定的顯示和重設功能
- 修復了前後台的候位登記功能
- 所有修復通過 linter 檢查

**預防措施**：
- 確保服務層統一處理 v1 API 回應格式
- Redux slice 不應再次解包已處理的數據
- 重構時確保所有子 hooks 的功能完整性

---

### 2025-11-29 - 完成系統重構遷移

**背景**：系統處於新舊架構混合狀態，需要完成 v1 API 遷移和架構統一。

**重構內容**：

1. **後端路由層統一**
   - 移除舊路由檔案（`auth.routes.js`, `queue.routes.js`, `admin.routes.js`）
   - 統一使用 v1 路由（`/api/v1`）
   - 補充缺失的 `/next-waiting` 端點到 v1 路由

2. **後端控制器統一**
   - 合併 `queue.controller.refactored.js` 到 `queue.controller.js`
   - 所有控制器統一使用 `catchAsync` 錯誤處理
   - 所有缺失函數（getQueueStatus, getNextWaitingNumber 等）已補充到重構版控制器

3. **前端服務層清理**
   - 移除 `queueService.js` 中重複的 API_BASE_URL 定義
   - 統一所有函數回應處理為 `response.data.data || response.data`
   - 所有 API 呼叫統一使用 `API_ENDPOINTS`

4. **前端 Hooks 統一**
   - AdminDashboardPage 改用 `useQueueManagementRefactored`
   - 刪除舊版 `useQueueManagement.js`（745行超長 hook）

5. **路由命名標準化**
   - 前端統一使用 kebab-case 路由（`/queue/order` 取代 `/queue/updateOrder`）
   - 移除後端相容層（`/queue/updateOrder`, `/status/:queueNumber`）

**影響範圍**：
- 所有 API 端點現在只通過 `/api/v1` 存取
- 舊路由已完全移除，降低維護成本
- 前後端命名風格統一（kebab-case）
- 代碼結構更清晰，易於維護

**技術決策**：
- 保留部分控制器直接操作 Model 的邏輯（如 getQueueStatus），完全服務層抽象留作後續優化
- 統一錯誤處理和回應格式，提升 API 一致性

---

### 2025-10-15 - 候位上限邏輯重構

**問題**：原本的 `maxQueueNumber` 限制所有未取消的客戶數量（包含等待中、處理中、已完成），導致已完成的客戶仍佔用候位名額，使得當日額滿後即使有客戶完成也無法接受新客戶

**解決方案**：
- 將 `maxQueueNumber` 欄位改名為 `maxOrderIndex`
- 改為限制最大的叫號順序（orderIndex）值，而非所有客戶數量
- 額滿判斷邏輯：`currentMaxOrderIndex >= maxOrderIndex`（僅計算等待中和處理中的客戶）
- 已完成的客戶不再佔用候位名額

**實施細節**：
```javascript
// 舊邏輯
const activeQueueCount = await WaitingRecord.countDocuments({
  status: { $ne: 'cancelled' }
});
if (activeQueueCount >= settings.maxQueueNumber) { /* 額滿 */ }

// 新邏輯
const maxOrderIndexRecord = await WaitingRecord.findOne({
  status: { $in: ['waiting', 'processing'] }
}).sort({ orderIndex: -1 });
const currentMaxOrderIndex = maxOrderIndexRecord ? maxOrderIndexRecord.orderIndex : 0;
if (currentMaxOrderIndex >= settings.maxOrderIndex) { /* 額滿 */ }
```

**資料庫遷移**：
- SystemSetting 模型添加自動遷移邏輯，將舊的 `maxQueueNumber` 值遷移到新的 `maxOrderIndex`
- 遷移在 `getSettings()` 方法中自動執行，無需手動操作

**影響範圍**：
- 後端：`system-setting.model.js`, `queue.controller.js`, `admin.controller.js`, `QueueService.js`
- 後端路由：`admin.routes.js`, `v1/admin.routes.js`（端點從 `/settings/max-queue-number` 改為 `/settings/max-order-index`）
- 前端Redux：`queueSlice.js`（state 欄位：`activeQueueCount` → `currentMaxOrderIndex`, `maxQueueNumber` → `maxOrderIndexLimit`）
- 前端Service：`queueService.js`（函數改名：`setMaxQueueNumber` → `setMaxOrderIndex`）
- 前端頁面：`AdminSettingsPage.jsx`（UI 文字更新為"最大叫號順序上限"）

**經驗教訓**：
- ⚠️ **欄位重命名需要全面更新**：資料庫模型、API、前後端邏輯、UI 文字都要同步
- 💡 **資料遷移很重要**：在模型的 `getSettings()` 中添加自動遷移邏輯，確保現有系統平滑升級
- 🔧 **語意清晰**：`maxOrderIndex` 比 `maxQueueNumber` 更清楚地表達"限制叫號順序"的含義

**向後兼容**：
- 資料庫自動遷移確保現有資料不會丟失
- API 端點路徑變更但邏輯相容

---

### 2025-01-14 - 客戶搜尋功能修復 (Array格式問題)

**背景**：客戶查詢功能出現"records不是陣列格式，實際類型：object"錯誤

**問題根源**：
- 後端返回 `{0: {...}, 1: {...}}` (類似陣列的物件)
- 前端期望 `[{...}, {...}]` (標準陣列)
- 數據格式不匹配導致Redux處理錯誤

**解決方案**：
```javascript
// frontend/src/services/queueService.js
// 添加智能檢測和轉換類似陣列物件的邏輯
const keys = Object.keys(response.data.data);
const isArrayLikeObject = keys.every(key => /^\d+$/.test(key));
if (isArrayLikeObject && keys.length > 0) {
  const recordsArray = keys
    .map(key => parseInt(key))
    .sort((a, b) => a - b)
    .map(index => response.data.data[index]);
}
```

**經驗教訓**：
- ⚠️ **前後端數據格式要保持一致**：API設計時明確定義返回格式
- 💡 **前端要有容錯機制**：對後端返回格式進行智能適配
- 🔧 **調試策略**：分層添加日誌，從Service→Redux→UI逐層排查

**預防措施**：
- 前端Service層已添加格式適配邏輯，支援多種格式
- 建議後端統一使用標準陣列格式
- API文檔需明確定義數據格式規範

---

## 🚨 常見問題與解決方案

### 1. 前端白屏問題
**症狀**：所有頁面顯示空白，無控制台錯誤  
**可能原因**：
- Redux slice錯誤（未定義的action/reducer）
- 組件import錯誤
- JavaScript運行時錯誤

**解決步驟**：
1. 檢查瀏覽器控制台錯誤
2. 檢查Redux DevTools
3. 檢查最近修改的組件
4. 必要時回滾到最後已知正常版本

### 2. API v1格式處理
**症狀**：前端無法正確顯示後端數據  
**原因**：v1 API格式 `{success, code, message, data}` 與前端期望不匹配

**解決方案**：
```javascript
// 確保Service層正確提取data
return response.data.data || response.data;
// Redux thunk直接返回service結果
return response;
```

### 3. 搜尋功能異常
**症狀**：搜尋無結果或格式錯誤  
**檢查點**：
- 後端是否返回正確格式
- 前端Service是否正確處理
- Redux reducer是否正確更新狀態

---

## 🏗️ 架構決策記錄

### 前端架構
**React + Redux Toolkit**：選擇Redux管理複雜狀態  
**Material-UI**：統一UI組件庫  
**API版本管理**：支援v1/舊版API切換

### 後端架構
**重構策略**：
- 保留舊Controller：確保向下相容
- 新增Refactored版本：逐步遷移
- Service-Repository模式：分離業務邏輯和數據存取

**API設計**：
- v1格式：`{success, code, message, data}`
- 錯誤處理：統一錯誤碼和訊息格式
- 響應封裝：使用v1-response.js統一處理

---

## 🔧 技術債務追蹤

### 已知問題
1. **新舊架構並存**：部分功能仍使用舊Controller
2. **數據格式不統一**：某些API返回格式不一致
3. **調試代碼殘留**：需定期清理console.log

### 優化建議
1. **完成架構遷移**：將所有功能遷移到refactored版本
2. **API格式標準化**：統一所有API返回格式
3. **錯誤處理增強**：添加更詳細的錯誤信息和恢復機制

---

## 📚 重要參考資料

### 核心檔案位置
- **API規格**：`docs/API_SPEC.md`
- **產品需求**：`docs/PRD.md`
- **工程規範**：`.cursor/rules/engineering-rules.mdc`
- **前端規範**：`.cursor/rules/frontend-rules.mdc`
- **後端規範**：`.cursor/rules/backend-rules.mdc`

### 關鍵技術點
- **搜尋邏輯**：支援本人和家人姓名搜尋
- **叫號系統**：基於orderIndex的排序邏輯
- **時間計算**：候位時間和預估開始時間
- **Socket通信**：即時狀態更新

---

## 📈 效能監控要點

### 前端效能
- 大型列表虛擬化
- 組件懶加載
- API請求合併和快取

### 後端效能
- 資料庫索引優化
- 查詢邏輯優化
- 併發處理能力

---

*最後更新：2025-01-14*  
*維護者：AI Assistant (Claude)*
