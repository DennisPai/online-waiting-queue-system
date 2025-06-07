# Zeabur 環境變數設定指南

## 🌐 完整部署配置

### 1. MongoDB 服務配置
- 在Zeabur中添加MongoDB服務
- 會自動生成 `MONGODB_URI` 環境變數
- 無需手動設定

### 2. 後端服務環境變數

```env
NODE_ENV=production
PORT=8080
JWT_SECRET=your_very_secure_jwt_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
```

**重要說明：**
- `JWT_SECRET` 必須使用強密碼（至少32個字符）
- `CORS_ORIGIN` 和 `SOCKET_CORS_ORIGIN` 設定為前端域名
- `MONGODB_URI` 由Zeabur自動提供，無需手動設定

### 3. 前端服務環境變數

```env
REACT_APP_API_URL=https://your-backend-domain.zeabur.app
```

**重要說明：**
- 必須在前端服務**建構前**設定
- 設定為後端服務的完整URL
- 前端建構後無法修改此變數

### 4. 部署順序

1. **先部署MongoDB** → 獲得連接字符串
2. **再部署後端** → 設定後端環境變數
3. **最後部署前端** → 設定前端環境變數（指向後端URL）
4. **配置CORS** → 更新後端的CORS設定（指向前端URL）

### 5. 環境變數設定步驟

#### 後端服務：
1. 在Zeabur Dashboard找到後端服務
2. 點擊 "Variables" 標籤
3. 添加所有後端環境變數
4. 重新部署服務

#### 前端服務：
1. 在Zeabur Dashboard找到前端服務
2. 點擊 "Variables" 標籤  
3. 添加 `REACT_APP_API_URL`
4. 重新部署服務

### 6. 驗證部署

#### 檢查後端：
- 訪問 `https://your-backend-domain.zeabur.app/health`
- 應該返回 `{"status":"OK","message":"線上候位系統API服務運行中",...}`

#### 檢查前端：
- 訪問 `https://your-frontend-domain.zeabur.app`
- 檢查瀏覽器控制台是否有API連接錯誤

#### 檢查Socket.io：
- 在前端頁面檢查控制台是否顯示 "Socket連接成功"

### 7. 故障排除

**前端502錯誤：**
- 檢查 `REACT_APP_API_URL` 是否正確設定
- 確保後端服務正常運行

**CORS錯誤：**
- 檢查後端 `CORS_ORIGIN` 是否指向正確的前端域名
- 確保沒有協議（http/https）不一致

**Socket.io連接失敗：**
- 檢查前端控制台的Socket.io URL日誌
- 確保後端 `SOCKET_CORS_ORIGIN` 設定正確

### 8. 初始化管理員帳號

部署完成後：
1. 進入後端服務的終端機（Console）
2. 執行：`node init-admin.js`
3. 預設帳號：admin / admin123

**安全提醒：** 首次登入後請立即修改預設密碼！ 