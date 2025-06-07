# 後端環境變數配置

## Zeabur 部署環境變數

在 Zeabur 部署時，需要設定以下環境變數：

### 必要環境變數

```
NODE_ENV=production
PORT=8080
JWT_SECRET=your_strong_jwt_secret_key_here
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
SOCKET_CORS_ORIGIN=https://your-frontend-domain.zeabur.app
```

### 環境變數說明

- **NODE_ENV**: 設定為 `production` 啟用生產模式
- **PORT**: 後端服務運行的連接埠，Zeabur 預設為 8080
- **JWT_SECRET**: JWT 簽名密鑰，必須是強密碼（建議32字符以上）
- **JWT_EXPIRES_IN**: JWT 過期時間，預設為 1 天
- **CORS_ORIGIN**: 允許的前端域名，設定為實際的前端 URL
- **SOCKET_CORS_ORIGIN**: Socket.io 允許的前端域名
- **MONGODB_URI**: MongoDB 連接字串（Zeabur 自動提供）

### 設定步驟

1. 在 Zeabur Dashboard 中找到後端服務
2. 點擊 "Variables" 標籤
3. 添加上述環境變數

⚠️ **安全提醒**：
- JWT_SECRET 必須使用強密碼，不要使用預設值
- 生產環境中不要暴露敏感資訊
- CORS 設定要精確匹配前端域名

## 本地開發

本地開發時的預設配置：
```
NODE_ENV=development
PORT=8080
CORS_ORIGIN=http://localhost:3100
SOCKET_CORS_ORIGIN=http://localhost:3100
MONGODB_URI=mongodb://localhost:27017/queue_system
```

## API 端點

### 健康檢查
- `GET /health` - 服務健康狀態檢查
- `GET /` - 基本服務資訊

### 認證 API
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/me` - 獲取當前用戶資訊
- `POST /api/auth/register` - 註冊新用戶（管理員限定）

### 候位 API
- `GET /api/queue/status` - 獲取候位狀態
- `POST /api/queue/register` - 登記候位
- `GET /api/queue/status/:number` - 獲取特定號碼狀態
- `GET /api/queue/search` - 查詢候位號碼

### 管理員 API
- `GET /api/admin/queue/list` - 獲取候位列表
- `PUT /api/admin/queue/next` - 呼叫下一位
- `PUT /api/admin/queue/:id/status` - 更新候位狀態
- `PUT /api/admin/settings/*` - 系統設定

## Socket.io 事件

### 客戶端事件
- `queue:subscribe` - 訂閱候位號碼更新
- `queue:update` - 候位狀態更新通知
- `queue:status` - 特定號碼狀態更新

### 管理員事件
- `admin:update` - 管理員專用更新通知

## 部署配置

### Docker 配置
- 基於 Node.js 16 Alpine 映像
- 生產環境優化的依賴安裝
- 自動暴露 8080 連接埠

### 資料庫連接
- 支援多種 MongoDB 連接字串格式
- 自動重試連接機制
- 連接失敗時優雅退出

### 初始化
- 自動執行資料初始化
- 創建預設管理員帳號
- 設定系統預設值

## 故障排除

### 常見問題

1. **MongoDB 連接失敗**
   - 檢查 MONGODB_URI 環境變數
   - 確認 MongoDB 服務是否正常運行
   - 查看連接字串格式是否正確

2. **CORS 錯誤**
   - 檢查 CORS_ORIGIN 是否匹配前端域名
   - 確認包含正確的協議（https://）
   - 檢查是否有多餘的斜線

3. **JWT 錯誤**
   - 確認 JWT_SECRET 已正確設定
   - 檢查 JWT_EXPIRES_IN 格式
   - 驗證 token 是否過期

### 日誌查看

在 Zeabur 控制台中：
1. 選擇後端服務
2. 點擊 "Logs" 標籤
3. 查看即時日誌輸出

### 健康檢查

使用健康檢查端點監控服務狀態：
```bash
curl https://your-backend-service.zeabur.app/health
```

預期回應：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "queue-system-backend"
}
``` 