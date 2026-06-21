# 事故報告：2026-06-08 正式環境 MongoDB 連線中斷導致全站癱瘓

> 報告產出：2026-06-09 凌晨（事故處理後即時統整）
> 環境：正式環境（online-waiting-queue-system）
> 嚴重度：High（核心功能不可用，但資料無遺失）

---

## 一、事故摘要

2026-06-08 約 **22:38（台北）/ 14:38（UTC）**，正式環境的 MongoDB 服務發生連線中斷／重啟。backend 進程雖持續存活，但因 **缺乏資料庫自動重連與連線逾時機制**，所有需要查資料庫的請求全部進入 mongoose buffering 無限等待（不報錯、不回應）。

結果：**管理員無法登入、前台首頁無法顯示候位狀態（持續轉圈圈）**，但表面上所有 Zeabur 服務都顯示 RUNNING——這正是難以第一時間判斷的原因。

歷時約 **1.5 小時**（22:38 中斷 → 約 00:09 恢復），經「重啟 MongoDB + 重啟 backend」救回。**候位資料完整無遺失（48 筆）**。

---

## 二、影響範圍

| 項目 | 影響 |
|---|---|
| 前台首頁 | 「目前叫號」異常顯示、預估結束時間持續轉圈圈跑不出來 |
| 管理員後台 | 無法登入 |
| 所有需查 DB 的 API | 全部逾時無回應（queue/status、auth/login 等） |
| 不需 DB 的請求 | 正常（CORS preflight、靜態路由、404） |
| 資料 | **無遺失**（候位 48 筆、客戶資料、系統設定皆完整） |
| 發生時段 | 非辦事期（isQueueOpen=false），未直接衝擊現場辦事 |

---

## 三、時間線（台北時間）

| 時間 | 事件 |
|---|---|
| 22:38 | MongoDB 連線中斷／重啟（log 顯示此時間點湧入一批重新連線與認證），backend mongoose 連線斷開 |
| 22:38–23:13 | backend 所有 DB 操作進入 buffering hang，服務表面 RUNNING 但 API 全逾時 |
| 23:13 | 懷特發現異常並回報（「服務都在但管理員登不進、首頁轉圈圈」） |
| 23:1x | 診斷確認：backend/mongodb 容器都 RUNNING，但需 DB 的請求皆 15s 逾時；OPTIONS preflight 秒回 204；backend log 顯示請求進來但回應狀態為 `-`（hang 無回應）、無任何 DB error（典型 buffering） |
| 23:31 | 第一次重啟 backend（此時 MongoDB 尚未恢復 → backend 卡在 `mongoose.connect()` 無法 listen → 持續 502） |
| 23:47 | 重啟 MongoDB（API 觸發） |
| 23:59 | MongoDB 完成重啟、重新接受連線 |
| 00:00 | 懷特於 Zeabur dashboard 另手動重啟 MongoDB（「停止中」卡太久） |
| ~00:01 | backend 的 mongoose connect（持續重試中）在 MongoDB 恢復後自動連上 → 部分恢復 |
| 00:08 | 乾淨重啟 backend（清掉重啟交疊期間建立的壞連線） |
| ~00:09 | 系統恢復正常運作 |

---

## 四、根因分析

### 直接原因
MongoDB 服務在 22:38 發生連線中斷／重啟（Zeabur 託管 MongoDB 服務層事件）。

### 真正病根（為什麼「短暫 DB 中斷」變成「1.5 小時全站癱瘓」）
backend 的資料庫連線設計缺乏韌性，把一次本可自動恢復的短暫中斷，放大成需人工介入的長時間故障：

1. **無自動重連動作**
   `backend/src/app.js` 僅監聽 `mongoose.connection.on('disconnected'/'reconnected')` 事件並寫 log，**沒有任何主動重連邏輯**。連線斷掉後沒能可靠恢復。

2. **無連線逾時設定 → 查詢無限 hang**
   `mongoose.connect(uri, { dbName })` 未設 `serverSelectionTimeoutMS` / `socketTimeoutMS`。斷線時查詢進入 buffering 無限等待、不報錯，使請求 hang 死而非快速失敗。

3. **server 啟動綁死在 DB 連線成功**
   `app.listen()` 寫在 `mongoose.connect().then()` 內部 —— **連上 DB 才會開始監聽**。導致重啟時若 DB 尚未恢復，backend 永遠不 listen、連 `/health` 都回 502，無法觀測、也無法部分服務。

### 為什麼難以第一時間判斷
- 所有 Zeabur 服務都顯示 RUNNING（容器活著）
- 不需 DB 的請求（OPTIONS、404、靜態）正常回應
- backend 無 error log（buffering 不拋例外）
→ 表面「服務都好好的」，實則 DB 層全 hang。

---

## 五、log 證據

**backend（正式）**
- 中斷期間：`GET /api/v1/queue/status HTTP/1.1" - -`（狀態碼為 `-`，請求進來但 handler 卡住無回應）
- 無任何 MongoDB 連線錯誤訊息（buffering 特徵）
- 第一次重啟後：log 停在 `mongoose` 連線前、無「成功連接到MongoDB」、無「server listening」→ 證明卡在 connect

**mongodb（正式）**
- 中斷時間點起一批 `Received first command on ingress connection` + `Successfully authenticated`（連線重建跡象）
- 重啟後 `Shutting down` → `Created/Started container` → 正常運作（WiredTiger checkpoint）
- 恢復後 0 錯誤、0 慢查詢、0 記憶體警告（MongoDB 本身健康）

**對照測試環境**：全程 `/health` 200、`/queue/status` 200 正常（測試 DB 未中斷）。

---

## 六、處置經過與經驗

1. 先確認資料安全（重啟不丟資料：資料在持久化 volume + journal recovery + 中斷期間無新寫入）後才動手。
2. 重啟順序教訓：**必須先確保 MongoDB ready，再重啟 backend**。否則 backend 卡在 connect。
3. MongoDB 多次重啟（API 2 次 + 人工 1 次）交疊，造成 backend 連線池短暫含壞連線，最後一次乾淨重啟 backend 後徹底穩定。
4. 恢復後從伺服器端量測到偶發 timeout，經對比診斷（發 15 req / backend 僅收到成功的 12 筆、0 hang）確認為 **量測端網路抖動，非系統問題**。

---

## 七、根治方案（於測試環境實作驗證）

目標：未來 MongoDB 再短暫中斷時，backend 能**自動恢復、不需人工重啟**，且故障期間可觀測。

1. **server 與 DB 連線解耦**：`app.listen()` 先啟動，不綁死在 `connect().then()`；`/health`、`/ready` 回報 DB 即時狀態（DB 斷線時服務不死、回報 unhealthy）。
2. **連線逾時 fail-fast**：`mongoose.connect` 加 `serverSelectionTimeoutMS`、`socketTimeoutMS`、`connectTimeoutMS`，斷線時快速失敗而非無限 hang。
3. **自動重連**：確保 mongoose 斷線後自動重連並恢復服務（含重連退避）。
4. **buffer 行為**：評估 `bufferCommands=false` 或 `bufferTimeoutMS`，避免查詢無限 buffer。

驗證須包含：**模擬 MongoDB 重啟**，確認 backend 自動恢復、不需人工重啟。

---

## 八、經驗教訓

- 「服務 RUNNING」≠「服務健康」。需要能反映依賴狀態（DB）的 health 端點。
- 外部依賴（DB）中斷應「優雅降級 + 自動恢復」，而非整個服務 hang/掛掉。
- 連線層務必設逾時，避免無限 hang 把短暫故障放大成長時間癱瘓。
