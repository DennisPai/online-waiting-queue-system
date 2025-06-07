# 前端環境變數配置

## Zeabur 部署環境變數

在 Zeabur 部署時，需要設定以下環境變數：

### 必要環境變數

```
REACT_APP_API_URL=https://your-backend-service.zeabur.app
```

### 設定步驟

1. 在 Zeabur Dashboard 中找到前端服務
2. 點擊 "Variables" 標籤
3. 添加環境變數：
   - Key: `REACT_APP_API_URL`
   - Value: 你的後端服務URL（例如：`https://backend-service.zeabur.app`）

⚠️ **重要提醒**：
- 前端環境變數必須在**建構前**設定，建構後無法修改
- 如果需要修改環境變數，必須重新觸發建構
- 環境變數設定錯誤是導致502錯誤的常見原因

### 本地開發

本地開發時，前端會自動使用 `http://localhost:8080` 作為API URL。

### 調試

前端啟動時會在控制台輸出當前使用的API Base URL，可用於調試連接問題。

## 前端部署配置

### PORT 設定

- **Zeabur 自動檢測**：Zeabur 會自動檢測 React 應用並使用適當的 PORT
- **Nginx 配置**：前端使用 Nginx 在 PORT 80 上提供服務
- **無需手動設定**：Zeabur 會自動處理 PORT 配置

### 建構配置

前端使用多階段 Docker 建構：
1. **建構階段**：使用 Node.js 建構 React 應用
2. **運行階段**：使用 Nginx 提供靜態文件服務

### 健康檢查

前端包含健康檢查端點：
- `/health` - 返回 "OK" 狀態
- 可用於 Zeabur 的健康檢查配置

## 故障排除

### 常見問題

1. **502 錯誤**
   - 檢查 `REACT_APP_API_URL` 是否正確設定
   - 確認後端服務是否正常運行
   - 查看瀏覽器控制台的網路請求

2. **CORS 錯誤**
   - 確認後端 `CORS_ORIGIN` 設定正確
   - 檢查前端域名是否與後端 CORS 設定匹配

3. **Socket.io 連線失敗**
   - 確認 `REACT_APP_API_URL` 指向正確的後端服務
   - 檢查後端 `SOCKET_CORS_ORIGIN` 設定

### 調試工具

前端包含內建的健康檢查組件，可以：
- 檢測後端連線狀態
- 顯示當前 API URL 配置
- 提供連線錯誤詳細資訊