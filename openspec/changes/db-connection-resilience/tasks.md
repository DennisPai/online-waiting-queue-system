## 1. Phase 1 — 連線選項 fail-fast（app.js）

- [ ] 1.1 `backend/src/app.js` 的 `mongoose.connect` options 加 `serverSelectionTimeoutMS: 5000` / `socketTimeoutMS: 45000` / `connectTimeoutMS: 10000` / `heartbeatFrequencyMS: 10000`（保留 dbName）
- [ ] 1.2 保留 `bufferCommands` 預設（true）；確認無其他地方覆寫連線設定
- [ ] 1.3 grep backend 確認沒有其他 `mongoose.connect` / `createConnection` 呼叫（CLAUDE.md：禁止獨立 createConnection）

## 2. Phase 2 — server 與 DB 連線解耦（app.js）

- [ ] 2.1 把 `app.listen(PORT)` 移出 `mongoose.connect().then()`，server 先啟動監聽
- [ ] 2.2 把「需 DB 的初始化」（`initDbConnections` / `initializeData` / `schedulePublicRegistrationOpening` / `startGDriveBackupScheduler`）移到「連線成功」callback（connect resolve 或 `connected` 事件），確保只在 DB 就緒後執行
- [ ] 2.3 確認初始化只執行一次（避免重連後重複跑 initializeData / 重複掛 scheduler）——用 flag 守衛
- [ ] 2.4 啟動 log 逐步可觀測（server listening / DB connecting / DB connected / init done）

## 3. Phase 3 — 自動重連（app.js）

- [ ] 3.1 實作 `connectWithRetry(attempt)`：connect 失敗時以指數退避（1s→2s→4s…上限 30s）`setTimeout` 重試
- [ ] 3.2 `mongoose.connection.on('disconnected')` log 斷線並確認 driver 自動重連；`on('reconnected')`/`on('connected')` log 恢復
- [ ] 3.3 確認 MongoDB 恢復後，需 DB 的初始化若尚未完成則補跑（首次連線曾失敗的情境）

## 4. Phase 4 — db.js 重連後 rebind 正確性

- [ ] 4.1 確認 `initDbConnections()` 冪等：重複呼叫（重連後再次 connected）不報錯、不洩漏（`useDb({useCache:true})` + model rebind 可重入）
- [ ] 4.2 在 `connected` 事件（含重連後）呼叫 `initDbConnections()`；驗證 queue/customer 雙連線與 model 綁定維持有效
- [ ] 4.3 確認重連後 `getQueueConn()` / `getCustomerConn()` 回傳的連線仍指向正確 DB

## 5. Phase 5 — health/ready 端點

- [ ] 5.1 `/health` 回報 `db.readyState`（即使 DB 斷線也回 200 + 狀態，供觀測）；維持既有 db.queue/db.customer 狀態欄位契約
- [ ] 5.2 `/ready`：readyState=1 才回 200，否則 503（給監控/LB 判斷可服務）
- [ ] 5.3 確認 health 端點本身不依賴會 hang 的 DB 查詢（用 readyState 而非實際 query，或查詢帶短逾時）

## 6. Phase 6 — 測試與驗證（測試環境 open-queue-test）

### 6.1 程式層
- [ ] 6.1.1 既有 backend 測試全綠（0 regression）
- [ ] 6.1.2 `CI=true npm run build`（前端）/ typecheck 無新增錯誤（依專案 baseline）

### 6.2 部署測試環境
- [ ] 6.2.1 push 到 test remote（DennisPai/open-queue-test）→ Zeabur 部署
- [ ] 6.2.2 確認 deployment RUNNING + `/health` 200 + `/ready` 200
- [ ] 6.2.3 queue/status、admin/login（真帳密）正常；雙 DB 資料讀寫正常

### 6.3 整合驗證（關鍵：模擬事故）
- [ ] 6.3.1 透過 Zeabur API restart 測試環境 MongoDB 服務
- [ ] 6.3.2 觀測 backend log：斷線 → 自動重連 → 恢復（**不重啟 backend**）
- [ ] 6.3.3 重連後 queue/status + login + 雙 DB 讀寫恢復正常
- [ ] 6.3.4 中斷期間打 API 確認 fail-fast（數秒回 503，非無限 hang）

## 7. Phase 7 — 回報等人工驗收

- [ ] 7.1 整理測試環境驗證結果（含模擬重啟前後對比）推 CC + Discord 回報懷特
- [ ] 7.2 等懷特人工確認測試環境 OK → 再評估正式環境同步（不在本 change 自動推正式）
