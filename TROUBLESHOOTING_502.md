# 🚨 502 錯誤完整故障排除指南

## 🎯 問題診斷步驟

### 第一步：檢查環境變數設定

1. **前端服務環境變數**
   ```
   Key: REACT_APP_API_URL
   Value: https://your-backend-service.zeabur.app
   ```
   ⚠️ **重要**：請確保將 `your-backend-service.zeabur.app` 替換為您實際的後端服務網域

2. **後端服務環境變數**
   ```
   CORS_ORIGIN=https://your-frontend-service.zeabur.app
   SOCKET_CORS_ORIGIN=https://your-frontend-service.zeabur.app
   ```

### 第二步：重新部署前端服務

環境變數設定後，**必須重新觸發前端建構**：
1. 在 Zeabur 控制台中找到前端服務
2. 點擊 "Redeploy" 或 "Deploy" 按鈕
3. 等待建構完成

### 第三步：檢查建構日誌

在 Zeabur 控制台查看前端建構日誌，確認：
- ✅ 建構過程無錯誤
- ✅ nginx 容器成功啟動
- ✅ 沒有文件權限錯誤

### 第四步：檢查控制台輸出

打開瀏覽器開發者工具（F12），查看 Console 標籤：
```
=== API 配置資訊 ===
NODE_ENV: production
REACT_APP_API_URL: https://your-backend-service.zeabur.app
最終API Base URL: https://your-backend-service.zeabur.app
==================
```

如果看到 `REACT_APP_API_URL: undefined`，表示環境變數設定不正確。

## 🔧 常見問題解決方案

### 問題1：環境變數未生效

**症狀**：控制台顯示 `REACT_APP_API_URL: undefined`

**解決方案**：
1. 確認環境變數名稱完全正確（區分大小寫）
2. 確認在前端服務（不是後端服務）中設定
3. 重新部署前端服務

### 問題2：後端服務無法訪問

**症狀**：前端可以載入，但API請求失敗

**解決方案**：
1. 確認後端服務URL是否正確
2. 直接訪問後端健康檢查：`https://your-backend-service.zeabur.app/api/queue/status`
3. 檢查後端日誌是否有錯誤

### 問題3：CORS 錯誤

**症狀**：控制台顯示CORS相關錯誤

**解決方案**：
1. 檢查後端 `CORS_ORIGIN` 環境變數
2. 確保前端域名完全匹配
3. 重新部署後端服務

### 問題4：建構失敗

**症狀**：Zeabur建構過程中出現錯誤

**解決方案**：
1. 檢查 package.json 格式是否正確
2. 確認所有依賴都可以正常安裝
3. 檢查是否有語法錯誤

## 🧪 測試方法

### 基本連接測試

1. **前端健康檢查**
   ```
   https://your-frontend-service.zeabur.app/health
   ```
   應該返回：`OK`

2. **後端健康檢查**
   ```
   https://your-backend-service.zeabur.app/api/queue/status
   ```
   應該返回JSON格式的數據

3. **網路測試**
   在瀏覽器控制台執行：
   ```javascript
   fetch('/health').then(r => r.text()).then(console.log)
   ```

### 詳細調試

1. **啟用詳細日誌**
   - 打開瀏覽器開發者工具
   - 切換到 Network 標籤
   - 重新載入頁面
   - 查看是否有失敗的請求

2. **檢查響應狀態**
   - 502：上游服務器錯誤（nginx無法連接到應用）
   - 404：路由問題
   - 500：應用內部錯誤

## 🔄 完整重置流程

如果上述方法都無效，嘗試完整重置：

### 方法1：重新建構服務

1. 在 Zeabur 控制台中刪除前端服務
2. 重新創建前端服務
3. 正確設定環境變數
4. 重新部署

### 方法2：檢查代碼同步

1. 確認 GitHub 代碼已同步最新修復
2. 確認 Zeabur 使用的是正確的分支
3. 手動觸發重新部署

### 方法3：分步驟測試

1. 先只部署一個靜態HTML頁面測試nginx
2. 再加入React應用
3. 最後加入API連接

## 📞 獲取幫助

如果問題仍然存在，請提供以下資訊：

1. **Zeabur服務URL**
   - 前端服務URL
   - 後端服務URL

2. **環境變數截圖**
   - 前端服務的Variables配置
   - 後端服務的Variables配置

3. **日誌資訊**
   - 前端建構日誌
   - 前端運行日誌
   - 後端運行日誌

4. **瀏覽器控制台錯誤**
   - Console標籤的錯誤訊息
   - Network標籤的失敗請求

---

📝 **記住**：大多數502錯誤都是由於環境變數配置不正確或建構時未正確傳遞環境變數造成的。請確保按照步驟仔細檢查每個配置項目。