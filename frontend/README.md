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

### 本地開發

本地開發時，前端會自動使用 `http://localhost:8080` 作為API URL。

### 調試

前端啟動時會在控制台輸出當前使用的API Base URL，可用於調試連接問題。