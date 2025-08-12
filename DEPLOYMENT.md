# 部署指南（Zeabur）

## 📋 部署前準備清單

### 必要條件
- [x] GitHub 帳號
- [x] Zeabur 帳號 ([zeabur.com](https://zeabur.com))
- [x] 程式碼已上傳至 GitHub repository

### 🌐 實際部署案例
本系統已成功部署範例：
- **前端服務**: https://online-waiting-queue-system.zeabur.app
- **後端API**: https://online-waiting-queue-system-backend.zeabur.app
- **管理後台**: https://online-waiting-queue-system.zeabur.app/admin/login

## ⚠️ 重要功能變更通知

### 公開候位登記開關功能 (2024年12月生效)
**變更內容**：
- 新增「公開候位登記設置」開關，可動態控制候位登記功能開放狀態
- 管理員可在系統設定中即時開啟或關閉一般民眾的候位登記權限
- 關閉時：僅管理員可透過後台「登記候位」浮動視窗進行登記
- 開啟時：一般民眾可在首頁直接進行候位登記
- **重要變更**：「開始辦事」狀態已與候位登記功能解耦，「開始辦事」僅控制叫號顯示，候位登記功能完全由「公開候位登記設置」控制

**部署注意事項**：
- 確保部署版本包含新的 `ConditionalRegistrationRoute` 條件路由組件
- 系統設定頁面需包含「公開候位登記設置」開關UI
- 系統設定頁面的「辦事狀態」功能已更新，控制是否顯示"開始辦事"或"停止辦事"
- 首頁和導航欄根據「公開候位登記設置」和認證狀態動態顯示候位按鈕
- 後端需包含 `publicRegistrationEnabled` 欄位和相關API
- AdminDashboardPage 需包含「登記候位」浮動視窗功能

**功能架構**：
- 後端：新增 `publicRegistrationEnabled` 系統設定欄位和 API
- 前端：條件式路由保護和動態UI顯示
- 管理後台：完整的開關控制和浮動視窗登記功能
- 所有候位登記功能架構完整保留，可靈活控制開放狀態

## 🚀 Zeabur 部署步驟

### 1. 登入 Zeabur 並創建專案
1. 前往 [Zeabur](https://zeabur.com) 並登入
2. 點擊「Create Project」創建新專案
3. 選擇合適的專案名稱（例如：queue-system）

### 2. 部署 MongoDB 服務
1. 在專案中點擊「Add Service」
2. 選擇「Database」→「MongoDB」
3. 等待 MongoDB 服務啟動完成
4. 記錄 MongoDB 連接資訊（Zeabur 會自動生成）

### 3. 部署後端服務
1. 點擊「Add Service」→「Git Repository」
2. 選擇您的 GitHub repository
3. 選擇「backend」資料夾作為根目錄
4. **重要**：設定環境變數（在部署前設定）：
   ```
   NODE_ENV=production
   PORT=8080
   JWT_SECRET=your_strong_jwt_secret_key_32_chars_minimum
   JWT_EXPIRES_IN=1d
   MONGO_CONNECTION_STRING=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}
   ```
   
   ⚠️ **JWT_SECRET 安全建議**：
   - 使用至少32字符的隨機字符串
   - 包含大小寫字母、數字和特殊字符
   - 範例：`Kj8#mP9$nQ2@vR5&wX7*zA3!bC6%dE9^`

5. MongoDB 連接將自動配置（MONGODB_URI）
6. 等待後端服務部署完成
7. 記錄後端服務的 URL（例如：`https://backend-abc123.zeabur.app`）

### 4. 部署前端服務
1. 點擊「Add Service」→「Git Repository」
2. 選擇相同的 GitHub repository
3. 選擇「frontend」資料夾作為根目錄
4. **重要**：在部署前設定環境變數：
   ```
   REACT_APP_API_URL=https://your-backend-service.zeabur.app
   ```
   ⚠️ 注意：請將 `your-backend-service.zeabur.app` 替換為步驟3中記錄的實際後端服務網域

5. **⚠️ 重要 PORT 配置說明**：
   - **前端 PORT**：必須手動設定為 `PORT=80`，避免與後端衝突
   - **原因**：同一GitHub專案部署時，Zeabur會自動分配相同PORT，導致衝突
   - **解決方案**：在前端服務環境變數中明確設定 `PORT=80`
   - **Nginx 內部**：使用 PORT 80（Docker 配置）
   - **Zeabur 外部**：自動分配 HTTPS 連接埠（443）
   - **衝突症狀**：未設定時前端會顯示502錯誤

6. Zeabur 會自動檢測到 React 應用並正確建構
7. 等待前端服務部署完成
8. 記錄前端服務的 URL（例如：`https://frontend-xyz789.zeabur.app`）

### 5. 配置網域和 CORS
1. 前端部署完成後，更新後端環境變數：
   ```
   CORS_ORIGIN=https://your-frontend-domain.zeabur.app
   SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
   ```
   將 `your-frontend-domain.zeabur.app` 替換為步驟4中記錄的實際前端網域

2. 在 Zeabur 後端服務中：
   - 點擊「Variables」標籤
   - 添加或更新 CORS 相關環境變數
   - 點擊「Redeploy」重新部署後端服務

### 6. 初始化管理員帳號
1. 等待所有服務啟動完成
2. 後端服務會自動執行初始化腳本
3. 預設管理員帳號：
   - 帳號：`admin`
   - 密碼：`admin123`

## 🔧 環境變數設定

### 後端必要環境變數
```
NODE_ENV=production
PORT=8080
JWT_SECRET=your_strong_jwt_secret_key_32_chars_minimum
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
MONGO_CONNECTION_STRING=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}
```

### 前端必要環境變數
```
REACT_APP_API_URL=https://your-backend-service.zeabur.app
PORT=80
```

⚠️ **PORT設定重要性**：
- 前端必須明確設定 `PORT=80`，否則與後端PORT 8080衝突會導致502錯誤
- 同一GitHub專案部署時，Zeabur預設會分配相同PORT給前後端服務

⚠️ **重要提醒**：
- 前端環境變數必須在**建構前**設定，建構後無法修改
- 環境變數設定錯誤是導致502錯誤的常見原因
- 請確保後端服務URL正確且可訪問
- CORS 設定必須精確匹配前端域名

### MongoDB 連接
- Zeabur 會自動提供 `MONGODB_URI` 環境變數
- 後端還需要 `MONGO_CONNECTION_STRING` 用於靈活的資料庫連接配置
- 格式：`MONGO_CONNECTION_STRING=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}`
- 通常格式為：`mongodb://username:password@host:port/database`

## 📊 PORT 配置詳細說明

### 後端 PORT 配置
- **環境變數**：`PORT=8080`
- **Docker 暴露**：`EXPOSE 8080`
- **Zeabur 處理**：自動映射到 HTTPS (443)
- **健康檢查**：`https://backend-service.zeabur.app/health`

### 前端 PORT 配置
- **Docker 內部**：Nginx 運行在 PORT 80
- **Docker 暴露**：`EXPOSE 80`
- **Zeabur 處理**：自動映射到 HTTPS (443)
- **無需設定**：前端不需要 PORT 環境變數

### 本地開發 PORT
- **後端**：`http://localhost:8080`
- **前端**：`http://localhost:3100`（Docker Compose）
- **前端開發**：`http://localhost:3000`（npm start）

## 🎯 部署後檢查清單

### 基本功能測試
- [ ] 前端頁面正常載入
- [ ] 後端健康檢查正常：`GET /health`
- [ ] **候位登記功能（管理員限定）**：
  - [ ] 一般訪客無法看到候位登記按鈕
  - [ ] 管理員登入後可看到「登記候位」按鈕
  - [ ] 管理員可正常使用浮動視窗進行候位登記
  - [ ] 登記完成後候位列表自動更新
  - [ ] **其他詳細內容功能測試**：候位登記時選擇「其他」諮詢主題可正常填寫詳細內容（最多500字符）
- [ ] 候位查詢功能正常（支持姓名或電話單一條件查詢，姓名查詢包含家人）
- [ ] **客戶自助編輯功能測試**：
  - [ ] 客戶可正常編輯姓名、電話、電子郵件等個人資料
  - [ ] 電子郵件欄位在候位登記中顯示為選填（非必填）
  - [ ] 修改資料後能正常保存並顯示更新內容
- [ ] 管理員登入正常
- [ ] 後台管理功能正常
- [ ] **管理員面板核心功能測試**：
  - [ ] 清除候位功能正常
  - [ ] 匯出資料功能正常（顯示正確客戶筆數）
  - [ ] **匯出資料包含其他詳細內容**：Excel/CSV匯出時包含客戶填寫的「其他」詳細問題內容
  - [ ] 刪除客戶功能正常
  - [ ] 設定下次辦事時間功能正常
  - [ ] **客戶號碼編輯功能測試**：★ **新功能測試**
    - [ ] 管理員可正常編輯客戶候位號碼
    - [ ] 重複號碼檢測功能正常運作，重複行顯示輕紅色背景
    - [ ] 頁面頂部正確顯示重複號碼警告Alert
    - [ ] 允許保存重複號碼，不阻斷操作
    - [ ] 編輯後候位列表即時更新顯示
  - [ ] **客戶詳細資料管理**：可查看和編輯客戶的「其他」詳細內容，顯示格式為「其他(詳細內容)」
  - [ ] **辦事狀態控制功能測試**：
    - [ ] 系統設定中可正常切換「開始辦事」/「停止辦事」狀態
    - [ ] 開始辦事時首頁正常顯示目前叫號和候位狀態
    - [ ] 停止辦事時首頁顯示基本資訊但候位登記功能不受影響
    - [ ] 狀態切換顯示正確的說明文字（"目前正在進行辦事服務"/"目前停止辦事服務"）
  - [ ] **簡化模式功能測試**：
    - [ ] 系統設定中可正常切換簡化模式開關
    - [ ] 簡化模式啟用時僅需填寫客戶姓名即可完成登記
    - [ ] 簡化模式停用時恢復完整資料驗證要求
    - [ ] 簡化模式下預設選擇「其他」諮詢主題時，自動填入「簡化模式快速登記」詳細內容
    - [ ] 模式切換顯示正確的警告和狀態提示
    - [ ] 自動填入機制正常運作（電子郵件、電話、地址、諮詢主題詳細內容等預設值）
  - [ ] **公開候位登記開關功能測試**：
    - [ ] 系統設定中可正常切換公開候位登記開關
    - [ ] 開啟時一般民眾可看到並使用首頁候位登記功能
    - [ ] 關閉時首頁隱藏候位登記按鈕，管理員仍可使用後台登記功能
    - [ ] 開關狀態與辦事狀態獨立運作，互不影響
- [ ] Socket.io 即時通訊正常

### 管理員登入資訊（預設）
- **網址**：`https://your-frontend-domain.zeabur.app/admin/login`
- **實際範例**：`https://online-waiting-queue-system.zeabur.app/admin/login`
- **帳號**：`admin`
- **密碼**：`admin123`

⚠️ 建議：登入後盡快於系統內使用「變更密碼」功能修改預設密碼

## 🛠️ 故障排除

### 常見問題

**1. 前端顯示502錯誤**
- **最常見原因1**：前端環境變數 `REACT_APP_API_URL` 未設定或設定錯誤
- **最常見原因2**：前端未設定 `PORT=80`，與後端PORT 8080衝突
- 檢查前端服務的環境變數是否包含：
  - `REACT_APP_API_URL=https://your-backend-service.zeabur.app`
  - `PORT=80`
- 確認後端服務是否正常運行
- 在瀏覽器控制台查看API請求是否成功

**2. 前端無法連接後端**
- 檢查 CORS 環境變數是否正確設定
- 確認前端和後端的網域配置
- 驗證 `REACT_APP_API_URL` 指向正確的後端服務
- 測試後端健康檢查：`curl https://backend-service.zeabur.app/health`

**3. MongoDB 連接失敗**
- 檢查 MongoDB 服務是否正常運行
- 確認 MONGODB_URI 環境變數正確
- 查看後端日誌中的連接錯誤訊息

**4. 管理員無法登入**
- 確認後端初始化腳本已執行
- 檢查後端日誌是否有錯誤
- 驗證 JWT_SECRET 環境變數已設定

**5. Socket.io 連線失敗**
- 檢查 `SOCKET_CORS_ORIGIN` 設定
- 確認前端 `REACT_APP_API_URL` 正確
- 查看瀏覽器控制台的 Socket.io 錯誤訊息

**6. 公開候位登記開關功能無法正常運作（最新功能）**
- **症狀**: 管理員無法控制候位登記開放狀態，或開關設定無效果
- **檢查項目**：
  - [ ] 系統設定頁面是否包含「公開候位登記設置」開關
  - [ ] 前端是否正確部署包含條件判斷的 HomePage.jsx 和 Layout.jsx
  - [ ] `/register` 路由是否使用 ConditionalRegistrationRoute 保護
  - [ ] 後端是否包含 `publicRegistrationEnabled` 欄位和相關API
  - [ ] AdminDashboardPage.jsx 是否包含「登記候位」浮動視窗功能
  - [ ] 開關狀態是否正確同步到前端UI顯示
- **解決方案**: 確認最新代碼已部署，檢查系統設定API和前端狀態管理

**7. 客戶出生日期顯示問題（最新修復）**
- **症狀**: 查詢候位時客戶無法正確顯示出生年月日欄位，或無法完整顯示國曆和農曆出生日期
- **原因**: 後端API返回舊格式欄位、前端顯示邏輯只顯示國曆或農曆其中一種
- **解決**: 系統已修復此問題，後端API返回新欄位格式，前端同時顯示國曆和農曆資料
- **檢查**: 確認部署版本為最新版本，包含出生日期顯示修復

**8. 編輯客戶資料時農曆民國年處理錯誤（最新修復）**
- **症狀**: 編輯客戶資料時，農曆輸入民國形式（如113年）保存後顯示的農曆出生年月日與輸入不符，且國曆轉換結果錯誤
- **原因**: 前後端年份轉換處理邏輯不一致，編輯時的年份轉換順序與登記候位時不同，導致農曆民國年被錯誤處理
- **具體問題**:
  - 編輯時：前端直接傳送原始年份 → 後端轉換 → 調用日期轉換函數（順序錯誤）
  - 登記時：前端轉換年份 → 後端接收正確年份 → 調用日期轉換函數（順序正確）
- **解決方案**: 
  - 統一前後端處理邏輯，編輯時也在前端進行年份轉換
  - 簡化後端邏輯，移除重複的年份轉換處理
  - 確保編輯和登記使用完全相同的處理流程
- **檢查**: 
  - 確認部署版本為最新版本，包含編輯邏輯修復
  - 測試農曆民國年編輯功能正常運作
  - 驗證編輯後的農曆資料與輸入一致

**9. 管理員面板功能失效問題（已修復）**
- **症狀**: 前後端分離部署後，"清除候位"、"匯出資料"、"刪除客戶"功能失效
- **原因**: API端點不匹配和組件Props傳遞錯誤
- **解決**: 系統已修復此問題，更新API端點調用和Props傳遞
- **檢查**: 確認部署版本為最新版本，包含管理員面板功能修復

**10. 後台管理「設定下次辦事時間」功能問題（已修復）**
- **症狀**: 點擊設定時間按鈕後出現白屏、Redux Error #7錯誤或「設置下次辦事時間失敗」
- **原因**: DateTimePicker組件與Redux序列化機制衝突
- **解決**: 系統已修復此問題，移除DateTimePicker依賴，使用原生HTML datetime-local輸入框
- **檢查**: 確認部署版本為最新版本，包含時間設定功能修復

**11. 系統術語統一優化（已修復）**
- **症狀**: 系統中使用"等待人數"可能造成理解混淆，後台"目前叫號"顯示邏輯不準確
- **原因**: 術語使用不一致，叫號顯示邏輯未與orderIndex同步
- **解決**: 全系統將"等待人數"統一改為"等待組數"，優化目前叫號顯示邏輯確保顯示orderIndex為1的客戶號碼
- **檢查**: 確認部署版本包含術語統一與叫號邏輯優化功能

**12. 簡化模式功能問題（最新功能）**
- **症狀**: 簡化模式切換無效果，或在簡化模式下仍要求完整資料驗證
- **檢查項目**：
  - [ ] 後端是否正確部署包含 `system-setting.model.js` 中的 `simplifiedMode` 欄位
  - [ ] `admin.controller.js` 是否包含 `setSimplifiedMode` 函數
  - [ ] `queue.controller.js` 的註冊邏輯是否根據簡化模式調整驗證
  - [ ] 前端 `AdminSettingsPage.jsx` 是否包含簡化模式切換界面
  - [ ] `RegisterForm.jsx` 是否正確實現條件驗證邏輯
- **解決方案**: 確認最新代碼已部署，檢查系統設定API是否正常運作
- **測試方法**:
  1. 登入管理後台，進入系統設定
  2. 切換簡化模式開關，確認狀態正常更新
  3. 測試候位登記功能在不同模式下的行為
  4. 驗證自動填入機制是否正常運作

**13. 客戶自助編輯功能問題（2024年12月修正）**
- **症狀**: 客戶無法修改姓名或電話，顯示「查無此候位紀錄或資料不符」或「候位記錄驗證失敗」錯誤
- **原因**: 後端驗證邏輯使用姓名+電話組合驗證，當客戶要修改這些欄位時驗證失敗
- **解決方案**: 
  - 修改後端驗證邏輯，主要使用候位號碼作為唯一標識
  - 移除姓名和電話的額外驗證邏輯
  - 允許客戶自由修改包括姓名、電話、電子郵件在內的所有個人資料
- **檢查**: 
  - 確認客戶可正常編輯和保存姓名、電話、電子郵件
  - 電子郵件已設為非必填欄位
  - 修改後台驗證使用候位號碼進行身份確認

### ESLint 建構錯誤處理（重要）
**症狀**: 部署時在build階段失敗，出現ESLint語法錯誤
**常見錯誤**:
```
Syntax error: Identifier 'Dialog' has already been declared
```

**解決方案**:
1. 檢查所有Material-UI組件導入是否有重複聲明
2. 特別注意Dialog、DialogTitle、DialogContent等組件
3. 確保AdminDashboardPage.jsx中的導入語句正確無重複
4. 重新檢查代碼後推送更新

### 查看服務日誌
1. 在 Zeabur 控制台中點擊對應服務
2. 選擇「Logs」頁籤查看運行日誌
3. 如有錯誤，根據錯誤訊息進行排除

### 健康檢查命令
```bash
# 檢查後端服務
curl https://your-backend-service.zeabur.app/health

# 檢查前端服務
curl https://your-frontend-service.zeabur.app/health

# 檢查 API 連通性
curl https://your-backend-service.zeabur.app/api/queue/status
```

## 🔄 更新部署

### 自動部署
- 推送程式碼到 GitHub 主分支
- Zeabur 會自動檢測變更並重新部署
- 查看部署日誌確認成功

### 手動重新部署
1. 在 Zeabur 控制台中選擇服務
2. 點擊「Redeploy」按鈕
3. 等待部署完成

### 環境變數更新
1. 修改環境變數後需要重新部署
2. 前端環境變數變更需要重新建構
3. 後端環境變數變更只需重啟服務

### 公開候位登記開關使用方式
**管理員可透過系統設定動態控制候位登記開放狀態**：
1. 登入管理後台 → 系統設定頁面
2. 找到「公開候位登記設置」區塊
3. 使用開關控制候位登記功能開放狀態：
   - **開啟時**：一般民眾可在首頁直接進行候位登記
   - **關閉時**：僅管理員可透過後台進行候位登記
4. 設定變更即時生效，無需重啟或重新部署
5. 管理員始終可使用後台「登記候位」浮動視窗功能

## 📞 支援聯繫

如果遇到部署問題，可以：
1. 查看 Zeabur 官方文檔
2. 檢查專案的 GitHub Issues
3. 查看本專案的故障排除指南