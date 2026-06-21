## Context

backend 啟動流程（現況，`app.js`）：
```js
mongoose.connect(uri, { dbName }).then(async () => {
  initDbConnections();        // useDb 衍生雙連線 + model rebind
  await initializeData();
  await schedulePublicRegistrationOpening();
  startGDriveBackupScheduler();
  app.listen(PORT);            // ← 綁死在 connect 成功後
});
```
`db.js` 用 `mongoose.connection.useDb(name, {useCache:true})` 衍生 queue/customer 連線，並把 model 重新綁定到對應衍生連線（替換 require cache）。

## Goals / Non-Goals

**Goals**
- DB 短暫中斷時 backend 自動恢復，不需人工重啟
- DB 不可用時請求 fail-fast（503），不無限 hang
- 服務啟動不被 DB 連線阻塞；health 能反映 DB 真實狀態

**Non-Goals**
- 不改業務邏輯、資料 schema、API 合約
- 不處理 MongoDB 服務本身的穩定性（Zeabur 託管層）
- 不引入新依賴

## Decisions

### D1：連線選項（fail-fast）
`mongoose.connect` options 加：
```js
{
  dbName,
  serverSelectionTimeoutMS: 5000,   // 選不到 server 5s 內失敗（預設 30s）
  socketTimeoutMS: 45000,           // socket 閒置上限
  connectTimeoutMS: 10000,          // 初次建立連線上限
  heartbeatFrequencyMS: 10000,      // 心跳偵測（預設 10s，明示）
}
```
- `serverSelectionTimeoutMS` 是關鍵：斷線時查詢在 5s 內拋 `MongooseServerSelectionError`，而非無限 buffering。
- 保留 `bufferCommands` 預設（true）：5s buffer 視窗讓「重啟瞬間的請求」有機會等到重連，超過才失敗，比直接關閉 buffer 體驗更好。

### D2：server 與 DB 解耦（先 listen）
```js
const server = app.listen(PORT, () => logger.info(`listening ${PORT}`));
connectWithRetry();   // 非阻塞，內部自行重試
```
- server 立即 listen → `/health`、`/ready` 永遠可達（即使 DB 未連上）。
- `initializeData()`、scheduler 等「需 DB」的初始化移到「連線成功後」執行（在 `connected` 事件 / connect resolve 的 callback）。
- DB 未就緒時業務 API 因 D1 的 5s 逾時回 503，不 hang。

### D3：自動重連
```js
async function connectWithRetry(attempt = 1) {
  try {
    await mongoose.connect(uri, options);
    // connected handler 負責 initDbConnections + 一次性初始化
  } catch (e) {
    const delay = Math.min(30000, 1000 * 2 ** (attempt - 1)); // 1,2,4...max30s
    logger.error(`MongoDB 連線失敗 attempt=${attempt}，${delay}ms 後重試: ${e.message}`);
    setTimeout(() => connectWithRetry(attempt + 1), delay);
  }
}
mongoose.connection.on('disconnected', () => {
  logger.error('MongoDB 斷線，啟動自動重連');
  // mongoose 內建 driver 會自動重連同一 connection；此處作為保險與可觀測
});
```
- mongoose driver 預設對「已建立的 connection」會自動重連（topology 維護）。重點是「初次連線失敗」也要重試（connectWithRetry 涵蓋），且斷線可觀測。

### D4：db.js rebind 在重連後的正確性
- mongoose 重連是**同一個 `mongoose.connection` 物件**做 reconnect（非新物件），`useDb` 衍生連線與其上的 model 綁定**理論上維持有效**，不需重做。
- 保險作法：`initDbConnections()` 設計為**冪等**，並在 `connected`（含重連後再次 connected）事件呼叫一次。需驗證重複呼叫 `useDb({useCache:true})` + model rebind 不會出錯或洩漏。
- 驗收以「模擬 MongoDB 重啟後，雙 DB 讀寫（候位 + 客戶）皆正常」為準。

### D5：health/ready 語意
- `/health`：回 200 + `db.readyState`（即使 DB 斷線也回 200，body 標示 db 狀態，供觀測；或視現有契約調整）。
- `/ready`：DB readyState=1（connected）才回 200，否則 503 — 給負載均衡/監控判斷「可服務」。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| 改核心連線路徑，可能影響啟動 | 測試環境完整驗證 + 模擬 DB 重啟；保留 rollback |
| model rebind 在重連後失效 | initDbConnections 冪等 + reconnected 後重綁；雙 DB 讀寫驗收 |
| 解耦後初始化順序錯誤 | 「需 DB 的初始化」嚴格放在 connected 後；啟動 log 逐步確認 |
| bufferCommands 仍可能短暫 hang（<5s） | serverSelectionTimeoutMS=5s 限制上限，可接受 |

## Migration / Rollout

1. 測試環境（open-queue-test）實作 + 部署
2. 驗證：health/ready/queue-status/login 正常；**模擬 MongoDB 重啟（Zeabur restart mongodb）→ 確認 backend 自動恢復、不需重啟 backend**
3. 懷特人工驗收測試環境 OK
4. 再評估同步正式環境（不在本 change 自動執行）

## Test Strategy

- 既有 backend 測試全綠（0 regression）
- 新增/手動：模擬「DB 不可用啟動」→ server 仍 listen、/ready 回 503
- 整合驗證：測試環境 restart mongodb → 觀測 backend log 自動重連 → queue/status 與 login 恢復、雙 DB 資料讀寫正常
