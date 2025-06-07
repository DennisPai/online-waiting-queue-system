# 前端環境變數配置

## Zeabur 部署環境變數

在 Zeabur 部署時，需要設定以下環境變數：

### 🔑 必要環境變數

```env
REACT_APP_API_URL=https://your-backend-service.zeabur.app
```

### 📋 設定步驟

1. 在 Zeabur Dashboard 中找到前端服務
2. 點擊 "Variables" 標籤
3. 添加環境變數：
   - **Key**: `REACT_APP_API_URL`
   - **Value**: 後端服務的完整URL（例如：`https://backend-service.zeabur.app`）

⚠️ **重要提醒**：
- 環境變數必須在**建構前**設定
- 建構後無法修改，需要重新部署
- URL不要包含尾隨的斜杠 `/`

### 🔧 本地開發

本地開發時，前端會自動使用 `http://localhost:8080` 作為API URL。

### 🐛 調試功能

前端啟動時會在控制台輸出詳細的配置資訊：

```
=== API 配置資訊 ===
NODE_ENV: production
REACT_APP_API_URL: https://your-backend.zeabur.app
最終API Base URL: https://your-backend.zeabur.app
==================
```

### ✅ 驗證步驟

1. **檢查配置輸出**：打開瀏覽器控制台查看API配置資訊
2. **測試API連接**：嘗試候位登記或查詢功能
3. **Socket.io連接**：查看控制台是否顯示 "Socket連接成功"

### 🚨 常見問題

**502 Bad Gateway錯誤**：
- 檢查 `REACT_APP_API_URL` 是否正確設定
- 確保後端服務正常運行
- 確認URL格式正確（包含 https://）

**CORS錯誤**：
- 確保後端服務已設定正確的 `CORS_ORIGIN`
- 檢查前後端域名匹配