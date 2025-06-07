# 🚀 Zeabur 部署檢查清單

## 📋 部署前準備
- [ ] GitHub 代碼已推送至最新版本
- [ ] 已註冊 Zeabur 帳號
- [ ] 已連接 GitHub 帳號到 Zeabur

## 🗄️ 第一步：部署 MongoDB
- [ ] 在 Zeabur 創建新專案
- [ ] 添加 MongoDB 服務
- [ ] 等待 MongoDB 服務啟動完成
- [ ] 記錄 MongoDB 連接資訊（自動生成）

## ⚙️ 第二步：部署後端服務
- [ ] 添加 Git Repository 服務
- [ ] 選擇正確的 GitHub repository
- [ ] **重要**：設定 Root Directory 為 `backend`
- [ ] 設定環境變數：
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=8080`
  - [ ] `JWT_SECRET=[至少32字符的強密碼]`
  - [ ] `JWT_EXPIRES_IN=1d`
  - [ ] ⏸️ **暫不設定 CORS（等前端部署完成）**
- [ ] 等待後端服務部署完成
- [ ] 記錄後端服務域名：`https://[後端域名].zeabur.app`

## 🌐 第三步：部署前端服務
- [ ] 添加 Git Repository 服務
- [ ] 選擇相同的 GitHub repository
- [ ] **重要**：設定 Root Directory 為 `frontend`
- [ ] 設定環境變數：
  - [ ] `REACT_APP_API_URL=https://[後端域名].zeabur.app`
- [ ] 等待前端服務部署完成
- [ ] 記錄前端服務域名：`https://[前端域名].zeabur.app`

## 🔗 第四步：配置 CORS
- [ ] 回到後端服務的環境變數設定
- [ ] 添加 CORS 環境變數：
  - [ ] `CORS_ORIGIN=https://[前端域名].zeabur.app`
  - [ ] `SOCKET_CORS_ORIGIN=https://[前端域名].zeabur.app`
- [ ] 重新部署後端服務

## 👥 第五步：初始化管理員
- [ ] 進入後端服務的 Console（終端機）
- [ ] 執行命令：`node init-admin.js`
- [ ] 確認看到成功訊息
- [ ] 記錄預設登入資訊：`admin / admin123`

## ✅ 第六步：功能驗證

### 後端健康檢查
- [ ] 訪問：`https://[後端域名].zeabur.app/health`
- [ ] 應返回：`{"status":"OK","message":"線上候位系統API服務運行中",...}`

### 前端基本功能
- [ ] 訪問：`https://[前端域名].zeabur.app`
- [ ] 首頁正常載入
- [ ] 打開瀏覽器控制台檢查API配置資訊
- [ ] 檢查是否有 CORS 錯誤

### API 連接測試
- [ ] 嘗試候位登記功能
- [ ] 嘗試候位查詢功能
- [ ] 檢查控制台是否顯示 "Socket連接成功"

### 管理員功能
- [ ] 訪問：`https://[前端域名].zeabur.app/admin/login`
- [ ] 使用 `admin / admin123` 登入
- [ ] 後台功能正常運作
- [ ] **立即修改預設密碼**

## 🔧 故障排除

### 前端 502 錯誤
- [ ] 檢查 `REACT_APP_API_URL` 設定
- [ ] 確認後端服務正常運行
- [ ] 重新部署前端服務

### CORS 錯誤
- [ ] 檢查後端 `CORS_ORIGIN` 設定
- [ ] 確認前後端域名匹配
- [ ] 重新部署後端服務

### Socket.io 連接失敗
- [ ] 檢查前端控制台日誌
- [ ] 確認 `SOCKET_CORS_ORIGIN` 設定
- [ ] 重新部署後端服務

### 管理員無法登入
- [ ] 重新執行 `node init-admin.js`
- [ ] 檢查後端服務日誌
- [ ] 確認 MongoDB 連接正常

## 📝 部署完成記錄

**服務域名：**
- 前端：`https://[前端域名].zeabur.app`
- 後端：`https://[後端域名].zeabur.app`

**管理員帳號：**
- 帳號：`admin`
- 預設密碼：`admin123`
- 新密碼：`[請記錄修改後的密碼]`

**部署時間：** `[記錄部署完成時間]`

## 🔄 後續更新流程

每次代碼更新：
1. `git add .`
2. `git commit -m "更新說明"`
3. `git push`
4. Zeabur 自動重新部署
5. 如有環境變數變更，需手動更新並重新部署

---
**🎉 恭喜！候位系統已成功部署至 Zeabur！** 