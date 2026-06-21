## Why

2026-06-08 約 22:38（台北）正式環境 MongoDB 服務連線中斷／重啟。backend 進程雖持續存活，但因連線層缺乏韌性設計，把一次「本可自動恢復的短暫 DB 中斷」放大成「全站癱瘓約 1.5 小時、需人工重啟才能救」。完整事故報告見 `docs/incident-2026-06-08-mongodb-outage.md`。

### 根因（backend 連線設計三大缺陷）

1. **無自動重連動作**
   `backend/src/app.js` 僅 `mongoose.connection.on('disconnected'/'reconnected')` 寫 log，**無任何主動重連/恢復邏輯**。MongoDB 斷線後沒能可靠恢復。

2. **無連線逾時設定 → 查詢無限 hang**
   `mongoose.connect(uri, { dbName })` 未設 `serverSelectionTimeoutMS` / `socketTimeoutMS` / `connectTimeoutMS`。斷線時查詢進入 mongoose buffering 無限等待、不報錯，請求 hang 死而非快速失敗。

3. **server 啟動綁死在 DB 連線成功**
   `app.listen()` 寫在 `mongoose.connect().then()` 內部 — 連上 DB 才開始監聽。導致重啟時若 DB 尚未恢復，backend 永遠不 listen、連 `/health` 都回 502，無法觀測、無法部分服務。

### 影響

- 管理員無法登入、前台首頁無法顯示候位狀態，約 1.5 小時。
- 表面所有服務 RUNNING（不需 DB 的請求正常），難以第一時間判斷。
- 資料無遺失。發生於非辦事期，未直接衝擊現場辦事。
- 未來 MongoDB 任何短暫抖動都會重演同樣的全站癱瘓 + 需人工重啟。

## What Changes

> 範圍僅限 backend 連線層韌性。不改任何業務邏輯、資料結構、API 合約。先於測試環境（open-queue-test）實作驗證。

### 變更 1：mongoose 連線加逾時設定（fail-fast）

`backend/src/app.js` 的 `mongoose.connect(uri, { dbName })` 加上：
- `serverSelectionTimeoutMS`（如 5000）：選不到可用 server 時快速失敗
- `socketTimeoutMS`、`connectTimeoutMS`：避免 socket 層無限等待

讓 DB 不可用時請求快速失敗（回 503），而非無限 hang。

### 變更 2：server 啟動與 DB 連線解耦

`app.listen()` 移出 `mongoose.connect().then()`，**server 先啟動監聽**；DB 連線獨立進行。DB 尚未連上時：
- `/health`、`/ready` 回報 DB `readyState`（未連上回 503 + 狀態，而非整個 502）
- 業務 API 在 DB 未就緒時回明確錯誤（503），不 hang

### 變更 3：DB 斷線自動重連

啟動非阻塞的連線函式，斷線時自動重試（指數退避），MongoDB 恢復後 backend 自動接回 — 不需人工重啟。`mongoose.connection.on('disconnected')` 觸發重連流程。

### 變更 4：確保 db.js 雙 DB rebind 在重連後仍正確

`db.js` 用 `mainConn.useDb()` 衍生 queue/customer 連線 + model rebind。需驗證 mongoose 重連後（同一 connection 物件 reconnect）衍生連線與 model 綁定維持有效；必要時於 `reconnected` 事件後重新 `initDbConnections()`。

## Impact

- 影響檔案：`backend/src/app.js`（主要）、`backend/src/config/db.js`（重連後 rebind 驗證）
- 不影響：業務邏輯、資料 schema、API 合約、前端
- 風險：連線層為核心路徑，須在測試環境含「模擬 MongoDB 重啟」驗證 backend 自動恢復後，才評估同步正式環境
