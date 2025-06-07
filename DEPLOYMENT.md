# Zeabur 部署指南

## 📋 部署前準備清單

### 必要條件
- [x] GitHub 帳號
- [x] Zeabur 帳號 ([zeabur.com](https://zeabur.com))
- [x] 程式碼已上傳至 GitHub repository

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
4. 設定環境變數：
   ```
   NODE_ENV=production
   PORT=8080
   JWT_SECRET=您的安全密鑰（請使用強密碼）
   JWT_EXPIRES_IN=1d
   ```
5. MongoDB 連接將自動配置

### 4. 部署前端服務
1. 點擊「Add Service」→「Git Repository」
2. 選擇相同的 GitHub repository
3. 選擇「frontend」資料夾作為根目錄
4. **重要**：在部署前設定環境變數：
   ```
   REACT_APP_API_URL=https://your-backend-service.zeabur.app
   ```
   ⚠️ 注意：請將 `your-backend-service.zeabur.app` 替換為您實際的後端服務網域
5. Zeabur 會自動檢測到 React 應用並正確建構

### 5. 配置網域和CORS
1. 前端部署完成後，Zeabur 會提供一個網域（例如：`your-app.zeabur.app`）
2. 更新後端環境變數：
   ```
   CORS_ORIGIN=https://your-frontend-domain.zeabur.app
   SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
   ```

### 6. 初始化管理員帳號
1. 等待所有服務啟動完成
2. 進入後端服務的終端機
3. 執行以下指令：
   ```bash
   npm install
   node init-admin.js
   ```

## 🔧 環境變數設定

### 後端必要環境變數
```
NODE_ENV=production
PORT=8080
JWT_SECRET=您的強密碼JWT密鑰
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
```

### 前端必要環境變數
```
REACT_APP_API_URL=https://your-backend-service.zeabur.app
```

⚠️ **重要提醒**：
- 前端環境變數必須在**建構前**設定，建構後無法修改
- 環境變數設定錯誤是導致502錯誤的常見原因
- 請確保後端服務URL正確且可訪問

### MongoDB 連接
- Zeabur 會自動提供 `MONGODB_URI` 環境變數
- 通常格式為：`mongodb://username:password@host:port/database`

## 🎯 部署後檢查清單

### 基本功能測試
- [ ] 前端頁面正常載入
- [ ] 候位登記功能正常
- [ ] 候位查詢功能正常
- [ ] 管理員登入正常
- [ ] 後台管理功能正常

### 管理員登入資訊
- **網址**：`https://your-frontend-domain.zeabur.app/admin/login`
- **帳號**：`admin`
- **密碼**：`admin123`

⚠️ **重要**：首次登入後請立即修改預設密碼！

## 🛠️ 故障排除

### 常見問題

**1. 前端顯示502錯誤**
- **最常見原因**：前端環境變數 `REACT_APP_API_URL` 未設定或設定錯誤
- 檢查前端服務的環境變數是否包含正確的後端URL
- 確認後端服務是否正常運行
- 在瀏覽器控制台查看API請求是否成功

**2. 前端無法連接後端**
- 檢查 CORS 環境變數是否正確設定
- 確認前端和後端的網域配置
- 驗證 `REACT_APP_API_URL` 指向正確的後端服務

**3. MongoDB 連接失敗**
- 檢查 MongoDB 服務是否正常運行
- 確認 MONGODB_URI 環境變數正確

**4. 管理員無法登入**
- 確認 `init-admin.js` 腳本已執行
- 檢查後端日誌是否有錯誤

### 查看服務日誌
1. 在 Zeabur 控制台中點擊對應服務
2. 選擇「Logs」頁籤查看運行日誌
3. 如有錯誤，根據錯誤訊息進行排除

## 📞 支援聯繫

如果遇到部署問題，可以：
1. 查看 Zeabur 官方文檔
2. 檢查專案的 GitHub Issues
3. 參考本專案的 `README.md` 和 `AI_DEVELOPMENT_GUIDE.md`

## 🔄 更新部署

當程式碼有更新時：
1. 推送新代碼到 GitHub
2. Zeabur 會自動重新部署相關服務
3. 如有環境變數變更，需要手動更新