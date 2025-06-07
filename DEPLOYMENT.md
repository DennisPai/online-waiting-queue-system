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
4. **重要**：設定環境變數（在部署前設定）：
   ```
   NODE_ENV=production
   PORT=8080
   JWT_SECRET=your_strong_jwt_secret_key_32_chars_minimum
   JWT_EXPIRES_IN=1d
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

5. **PORT 配置說明**：
   - **前端 PORT**：Zeabur 自動處理，無需手動設定
   - **Nginx 內部**：使用 PORT 80（Docker 配置）
   - **Zeabur 外部**：自動分配 HTTPS 連接埠（443）
   - **結論**：前端部署時不需要設定 PORT 環境變數

6. Zeabur 會自動檢測到 React 應用並正確建構
7. 等待前端服務部署完成
8. 記錄前端服務的 URL（例如：`https://frontend-xyz789.zeabur.app`）

### 5. 配置網域和CORS
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
```

### 前端必要環境變數
```
REACT_APP_API_URL=https://your-backend-service.zeabur.app
```

⚠️ **重要提醒**：
- 前端環境變數必須在**建構前**設定，建構後無法修改
- 環境變數設定錯誤是導致502錯誤的常見原因
- 請確保後端服務URL正確且可訪問
- CORS 設定必須精確匹配前端域名

### MongoDB 連接
- Zeabur 會自動提供 `MONGODB_URI` 環境變數
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
- [ ] 候位登記功能正常
- [ ] 候位查詢功能正常
- [ ] 管理員登入正常
- [ ] 後台管理功能正常
- [ ] Socket.io 即時通訊正常

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

## 📞 支援聯繫

如果遇到部署問題，可以：
1. 查看 Zeabur 官方文檔
2. 檢查專案的 GitHub Issues
3. 查看本專案的故障排除指南