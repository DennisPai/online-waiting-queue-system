## 1. Phase 1 — 問題 1：取消候位定位改 `_id` + 身分驗證

- [x] 1.1 `queue.controller.js:cancelQueueByCustomer` — 改用 `_id` 定位記錄（不再用 `queueNumber`）
- [x] 1.2 取消前加身分驗證：比對 request 帶的「姓名 + 電話」與 DB 記錄一致才允許
- [x] 1.3 驗證後台管理員取消/狀態變更路徑（`queue.admin.controller.js:updateQueueStatus`）已用 `_id`，確認無 queueNumber 定位殘留
- [x] 1.4 修附帶 bug：`queue.admin.controller.js:357-365`（`updateQueueData`）catch 區塊引用 try 內 block-scope `record` 的 `ReferenceError`
- [x] 1.5 **移除/改寫 `updateQueueData` catch 區塊的 `dropIndex` 邏輯**（G7）：該 catch 看到 `error.code === 11000` 會主動 `dropIndex('queueNumber_1')`——「遇 11000 就 drop index」的思路本身是地雷，partial unique index 上線後可能被一次撞號自動拆掉防線。不只修 1.4 的 `ReferenceError`，要把「自動 drop index」邏輯整段移除，改成 D9 的友善錯誤分流

## 2. Phase 2 — 問題 2：額滿改用 `issuedCount` 原子閘門

- [x] 2.1 `system-setting.model.js` — 新增 `issuedCount` 欄位（累計發出名額，只增不減；型別 Number、預設 0）
- [x] 2.2 報名流程第一步改為 `issuedCount` 原子閘門（D8）：`SystemSetting.findOneAndUpdate({ issuedCount: { $lt: maxOrderIndex } }, { $inc: { issuedCount: 1 } }, { new: true })`——回傳 `null` = 已額滿，直接回友善訊息「今日候位已滿」；回傳文件 = 已原子地佔到名額。**移除**原 `QueueService.checkQueueAvailability` 那套「查 active 數量 → 比 maxOrderIndex」的非原子先查再寫邏輯（那只是把浮動值換算法，並發仍超收）
- [x] 2.3 確認前端 `isFull` 旗標邏輯與後端「佔用名額」定義一致
- [x] 2.4 管理員「刪除」記錄（delete）時 `issuedCount` 對應 `$inc -1`（D8：唯一允許 `issuedCount` 下降的情況，呼應 D2「刪除才釋出名額」）
- [x] 2.5 釐清並文件化：`cancelled` vs `deleted` 的語意差異（cancelled 仍佔名額、deleted 釋出名額）
- [x] 2.6 DB migration：`SystemSetting` 新增 `issuedCount` 後，以「目前 active + cancelled 記錄數」初始化（否則閘門基準錯誤）

## 3. Phase 3 — 問題 3：恢復報名一致性 + orderIndex 原子分配

- [x] 3.1 恢復報名路徑（`queue.admin.controller.js` status 改回 waiting）補呼叫 `ensureOrderIndexConsistency()`
- [x] 3.2 `orderIndex` 分配改原子操作（findOneAndUpdate `$inc` 或等價，消除「讀 max +1」競態）
- [x] 3.2a **列明所有「分配 orderIndex」的 code 位置並逐一改原子**（G6）：(a) `QueueService.registerQueue` 新報名分配 — 原「`countActiveCustomers()+1`」改 `allocateOrderIndex()`；(b) `queue.admin.controller.js:updateQueueStatus` 恢復報名路徑 — 原「`maxOrderRecord.orderIndex + 1`」改 `allocateOrderIndex()`；(c) 後台「新增候位」— 經路由查證走 `POST /api/v1/queue/register` → `queueService.registerQueue`，與 (a) 同一段 code，已隨 (a) 一併改原子（系統無獨立的 admin 新增候位 endpoint）
- [x] 3.2b **恢復報名沿用原名額、只重發 orderIndex**（D14）：`updateQueueStatus` 恢復路徑只 `allocateOrderIndex()` 重發 orderIndex，全程不碰 `issuedCount`（恢復不 `$inc issuedCount`）
- [x] 3.2c **取消 / 恢復的狀態切換順序**（D13）：恢復報名「先 `allocateOrderIndex()` 發安全的新 orderIndex → 再改 status 成 waiting」；取消時 `record.orderIndex = null`
- [x] 3.3 `waiting-record.model.js` — `orderIndex` 加 partial unique index `orderIndex_active_unique`（`partialFilterExpression: { status: { $in: ['waiting','processing'] } }`）
- [~] 3.3a **驗證 Zeabur MongoDB 版本支援 `partialFilterExpression` 的 `$in` 形式**（G11）：開發環境連測試 DB 失敗（TCP 可達但 MongoDB handshake 被 reset，Zeabur DB 僅允許內網連線），無法 read-only 查 `db.version()`。需在 Zeabur 測試環境內（如部署後或 Zeabur shell）驗證——詳見回報
- [x] 3.4 DB migration：`scripts/migrations/003_check_orderindex_collisions.js`——加 index 前掃描 active 記錄 orderIndex 撞號 / null，預設 dry-run，`--fix` 才修正（未對 DB 實跑）
- [x] 3.5 **`ensureOrderIndexConsistency` 改批量寫入 + 不吞 `E11000`**（D14）：改為「兩階段 offset `bulkWrite`」（取代 for 迴圈逐筆 `save()`），排序加次鍵 `_id`（D7）保證 deterministic；catch 區塊偵測 `E11000` 時 `logger.error` + 往外拋（不再靜默吞掉）
- [x] 3.6 額外任務（Phase 1 發現，歸 Phase 3 處理）：移除 `app.js` 開機時主動 `dropIndex('queueNumber_1')` 的常駐邏輯（與 Phase 3 partial unique index 思路衝突、且為 G7 同款地雷）。`utils/removeUniqueIndex.js` 保留為手動一次性腳本（精確索引名定位，不會誤拆新 index），不再掛開機流程

## 4. Phase 4 — 問題 4：reorder 競態 + 後端驗證 + admin 撞號處理

- [x] 4.1 前端 `useQueueActions` / `useQueueData` — 拖動排序後鎖住 UI 直到列表刷新完成（或改以 reorder 回傳列表為準，不依賴非同步 `loadQueueList`）
- [x] 4.1a **徹底移除 `loadQueueList` 對排序 state 的覆蓋路徑**（G12）：不只「鎖 UI」（鎖 UI 只縮小窗口、沒消除競態）。要把舊的非同步 `loadQueueList()` 對 `queueList` / 排序 state 的覆蓋路徑徹底移除，改以 reorder API 回傳的列表為唯一更新來源
- [x] 4.2 後端 `reorderQueue` — 驗證收到的 id 列表 = DB 當前全部 active 記錄（數量 + 內容比對），不一致則拒絕
- [x] 4.3 `utils/orderIndex.js:ensureOrderIndexConsistency` — 排序加次鍵 `_id`，撞號時排序仍穩定（已由 Phase 3 / Task 3.5 一併完成，`orderIndex.js:68` 的 `.sort({ orderIndex: 1, _id: 1 })`）
- [x] 4.4 **reorder 改「兩階段 offset 寫入」**（D10）：原 4.4「驗證 `Promise.all` 並行寫不會產生中間態撞號」的假設不成立——非平凡置換的並行 set 必然出現中間態撞 partial unique index → `E11000` → 500。改成兩階段：第一階段把要動的記錄 set 成「大偏移臨時值」（離開 `1..N` 區間、彼此唯一），第二階段再 set 成最終 `1..N`，全程不撞號
- [x] 4.5 **callNext 不用 `updateMany $inc -1` 全體平移**（D11）：原 callNext「第一筆 completed + `updateMany({status active}, {$inc:{orderIndex:-1}})`」與並發新報名一起跑會撞 unique index 且 `updateMany` 半殘 → 500。改成第一筆設 `completed`（離開 index 約束），其餘記錄 orderIndex **不動**（留空洞無妨），連續的 `1..N` 由 `ensureOrderIndexConsistency()` 在安全時機壓回
- [x] 4.5a **`deleteCustomer` 併修同款 `updateMany $inc -1` 全體平移地雷**（D11 同款，懷特 2026-05-22 核可）：`deleteCustomer` 原保留一段 `updateMany({orderIndex>deleted}, {$inc:-1})` 全體平移——與 4.5 callNext 修掉的是同款地雷（並發報名時新報名者也在 active 集合會被一起 -1 → 撞 partial unique index；`updateMany` 遇衝突半殘）。比照 4.5 改法：刪除該筆後其餘記錄 orderIndex **不平移**（留空洞無妨），連續 `1..N` 交給後面緊接的 `ensureOrderIndexConsistency()` 壓回。流程：刪除 →（不平移）→ `ensureOrderIndexConsistency()` → `issuedCount $inc -1`
- [x] 4.6 **admin controller 全線補 `E11000` catch 分流**（D9 / G1）：`callNext` / `updateQueueStatus` / `updateQueueOrder` / `reorderQueue` / `deleteCustomer` 目前 catch 一律回 HTTP 500「伺服器內部錯誤」。全線在 catch 補 `error.code === 11000` 分流：撞號 → 回友善訊息（如「排序衝突，請重新整理後再操作」）或依操作性質 retry，**不再裸吐 500**；非 11000 才走 500。另確認 `globalErrorHandler` 對 11000 不直接吐欄位名（「orderIndex 已存在」對客戶是天書）
- [x] 4.7 **定義 `E11000` 撞號處理策略**（D12 / G5）：明定「原子發號為主、retry 為輔」。retry 須有 (a) 上限 3 次；(b) 指數退避 + jitter；(c) 每次 retry 前重新判額滿；(d) 用盡後回友善訊息「報名人數眾多，請稍後再送出一次」；(e) 報名最終失敗時補償——把 D8 已 `$inc` 的 `issuedCount` 補回 `$inc -1`
- [x] 4.8 **後台「新增候位」成功後刷新候位列表**（兵推 4-Q2 新 bug）：後台管理員新增候位成功後目前只關閉對話框、漏呼叫 `loadQueueList()` → 新客戶不立刻出現。修正為新增候位成功後觸發候位列表刷新，與其他變更候位的操作一致

## 5. Phase 5 — 本地測試

- [x] 5.1 寫/補後端單元測試（覆蓋問題 1-4 的修正邏輯）。新增/補強：
  - `tests/queue.controller.test.js`（新檔，12 測）— 問題 1：取消候位 `_id` 定位 + 姓名/電話身分驗證（D1）
  - `tests/queue.service.test.js`（新檔，9 測）— 問題 2：`issuedCount` 原子閘門額滿、問題 3：`allocateOrderIndex` 原子分配、問題 4：E11000 retry 上限 + 補償（D8/D3/D12）
  - `tests/orderIndex.test.js`（新檔，11 測）— `allocateOrderIndex` 原子發號、`ensureOrderIndexConsistency` 兩階段 offset bulkWrite + 不吞 E11000 + 次鍵 `_id`（D14/D3/D7）
  - `tests/queue.admin.test.js`（補 6 測）— `callNext` 不平移 + null orderIndex、reorder 兩階段、admin E11000 回 409、`deleteCustomer` 補修不平移 + `issuedCount $inc -1`、`updateQueueStatus` 恢復順序 + E11000、`updateQueueData` 11000 友善訊息不 dropIndex
- [x] 5.2 跑既有測試套件確認無 regression — 既有 52 全綠 + 新增 38 = **90 個全綠**，0 regression
- [~] 5.3 本地起測試環境跑「測試 checklist」—— **環境限制：本機無 docker / 無 mongodb-memory-server / Zeabur 測試 DB 公開 endpoint 拒外部連線，無法起完整測試環境**。改為「能本地驗的盡量寫成 5.1 單元測試涵蓋、需真 DB 的留 Phase 6」。逐項評估見下方 checklist 標注（`[x]` = 已由 5.1 單元測試涵蓋；`[~]` = 必須 Phase 6 真 DB / 真瀏覽器才能驗）
- [~] 5.4 本地能驗的測試全綠（90/90）→ checklist 中標 `[~]` 的項目須在 Phase 6 補驗後才算完整綠

## 6. Phase 6 — 測試環境部署驗證

- [x] 6.1 push 到測試 repo `DennisPai/open-queue-test`
- [x] 6.2 等 Zeabur 測試環境自動部署（~90s），用 Zeabur API 確認 deployment status = RUNNING
- [x] 6.3 打 `/health` 確認後端存活
- [x] 6.4 **實際登入測試環境網站操作**（懷特 5/22 要求）：用瀏覽器登入測試環境前端 + 管理後台（admin 帳號），實際點擊/拖曳/填表單，跑下方「測試 checklist」完整一輪——不可只打 API，要真的在 UI 上操作確認功能正常
- [x] 6.5 驗收全綠 → Discord 回報懷特，等核可才規劃同步正式環境

---

## 測試 Checklist（Phase 5 本地 + Phase 6 測試環境都要跑一輪）

> 標記說明（Phase 5 評估，2026-05-22）：
> - `[x]` = 修正「邏輯」已由 Phase 5.1 單元測試（mock DB）涵蓋驗證
> - `[~]` = 必須 Phase 6（部署 Zeabur 測試環境 + 真 DB / 真瀏覽器 / 真並發）才能驗，原因附於該項
> 環境限制：本機無 docker / 無 mongodb-memory-server / Zeabur 測試 DB 公開 endpoint 拒外部連線 → 無法本地起完整測試環境，未硬起。

### A. 問題 1 — 取消候位定位
- [x] A1 用正確「號碼 + 姓名 + 電話」取消自己的候位 → 成功取消 — `queue.controller.test.js`「姓名+電話皆相符應成功取消」
- [x] A2 用「某個號碼 + 不符的姓名/電話」嘗試取消 → 被拒絕（不會取消到別人）— `queue.controller.test.js`「姓名不符/電話不符應回 403」
- [~] A3 結束本期使號碼漂移後，舊號碼不會誤指到新記錄（用 _id 定位驗證）— 需真 DB 跑完整「結束本期→重新報名→號碼漂移」流程；單元測試僅能驗「用 `findById` 不用 `findOne(queueNumber)` 定位」（已驗，見「取消是用 _id 定位」測試），漂移後實際行為留 Phase 6
- [~] A4 後台管理員取消候位 → 正確取消指定那筆 — 後台取消走 `updateQueueStatus`（status→cancelled，單元測試已驗 orderIndex=null）；「正確取消指定那筆」的端到端定位留 Phase 6 真瀏覽器操作

### B. 問題 2 — 額滿控制（`issuedCount` 原子閘門）
- [x] B1 報名到剛好額滿（`issuedCount` 達 maxOrderIndex）→ 下一個報名被擋，回友善訊息「今日候位已滿」— `queue.service.test.js`「閘門回傳 null（額滿）應丟出友善的『今日候位已滿』錯誤」
- [~] B2 額滿後取消一筆候位（status→cancelled）→ 額滿狀態維持，新人仍報不進來（`issuedCount` 不下降）— `cancelled` 路徑不碰 `issuedCount`（code 確認），但「額滿維持、新人報不進」需真 DB 連續操作驗證
- [x] B3 額滿後管理員「刪除」一筆候位 → `issuedCount` `$inc -1`，名額釋出 — `queue.admin.test.js`「刪除客戶應對 issuedCount $inc -1 釋出名額」（已驗 `$inc -1` 動作）；「釋出後可再報名 1 人」的端到端留 Phase 6
- [~] B4 兩個請求同時報名最後一個名額 → 只有一個成功，不會雙雙超額 — 真並發競態，`findOneAndUpdate` 原子性靠 MongoDB 保證，必須真 DB 並發驗
- [~] B5 前端「已額滿」提示與後端判斷一致 — 前端 UI 行為，需真瀏覽器
- [~] B6 高並發報名（30 並行搶 5 名額）→ 只有 5 個成功、不超收、不噴 index error — 真並發 + 真 partial unique index，必須 Phase 6
- [x] B7 報名最終失敗（retry 用盡）→ `issuedCount` 有被補償 `$inc -1` — `queue.service.test.js`「報名最終失敗應補償 issuedCount $inc -1」

### C. 問題 3 — 恢復報名排序
- [x] C1 取消一筆候位 → 恢復報名 → 該筆排到隊尾，前面順序不變 — `queue.admin.test.js`「恢復報名應原子發號並補一致性重算」（恢復路徑邏輯）；orderIndex 發號值膨脹→排隊尾，consistency 壓回
- [~] C2 連續恢復兩筆候位 → 兩筆 orderIndex 不撞號、各自排到隊尾 — `allocateOrderIndex` 單調遞增已單元驗（`orderIndex.test.js`），但「兩筆實際不撞號」需真 DB
- [~] C3 恢復後檢查全列表 orderIndex 連續無重複 — 需真 DB 觀察 `ensureOrderIndexConsistency` 壓回後的實際資料
- [~] C4 orderIndex unique index 生效（嘗試造撞號 → DB 擋下）— partial unique index 是 DB 層機制，必須真 DB 驗（且 D3/Task 3.3a 的 MongoDB 版本 `$in` 支援度也在此一併驗）
- [x] C5 恢復報名不會重複佔名額（`issuedCount` 不因恢復而增加）— `queue.admin.test.js` 恢復路徑測試已確認 `updateQueueStatus` 恢復分支不碰 `issuedCount`（code 路徑無 `findOneAndUpdate issuedCount`）
- [~] C6 恢復報名與新報名同時發生 → 兩者 orderIndex 不撞號、恢復操作不回 500 — 真並發，必須 Phase 6
- [x] C7 取消候位後該筆 orderIndex 被設為 `null` — `queue.admin.test.js`「取消候位應把 orderIndex 設為 null」

### D. 問題 4 — 拖動排序 + 後台操作
- [~] D1 拖動後面幾筆調整順序 → 前面沒動的記錄順序完全不變 — 前端拖動 UI，需真瀏覽器
- [~] D2 快速連續拖動兩次（跨拖動競態）→ 順序正確、不亂 — 前端競態，需真瀏覽器連續操作
- [~] D3 列表有 cancelled/completed 記錄時拖動 active 記錄 → 排序正確 — 需真瀏覽器 + 真 DB
- [x] D4 reorder 送不完整列表給後端 → 後端拒絕、不照錯列表重算 — `queue.admin.test.js`「id 數量/內容不符應回 409」「含重複項應回 400」
- [~] D5 拖動後重整頁面 → 順序持久正確 — 需真瀏覽器 + 真 DB 持久化驗證
- [~] D6 reorder 期間有並發報名 → 兩階段 offset 寫入不撞 unique index、不回 500 — 真並發 + 真 partial unique index；單元測試已驗「兩階段 bulkWrite + 臨時值大偏移」（`queue.admin.test.js` D10 測試），實際不撞號留 Phase 6
- [~] D7 叫號（callNext）與並發報名同時 → 不撞 unique index、不回 500、隊伍不撕裂 — 真並發；單元測試已驗「callNext 不用 updateMany 平移 + orderIndex=null」，實際並發行為留 Phase 6
- [x] D8 admin 操作撞到 orderIndex 撞號 → 收到友善訊息（非赤裸 500）— `queue.admin.test.js` callNext / updateQueueStatus / reorder / deleteCustomer 的「E11000 應回 409 友善訊息」共 4 測
- [~] D9 後台「新增候位」成功後 → 候位列表立即刷新 — 前端 UI 行為（Task 4.8），需真瀏覽器

### E. Regression — 不可弄壞既有功能
- [~] E1 一般報名流程正常（前台報名 → 成功頁 → 查詢）— 端到端流程，需真瀏覽器；報名 service 邏輯已由 `queue.service.test.js` 驗
- [~] E2 叫號（next）流程正常 — 端到端，需真瀏覽器；`callNext` 邏輯已單元驗
- [~] E3 結束本期流程正常（歸檔 → 客戶DB → 清空）— 端到端，需真 DB；`end-session.test.js` 既有單元測試已涵蓋邏輯
- [x] E4 既有單元測試全綠 — 既有 52 個 + Phase 5 新增 38 個 = **90 個全綠，0 regression**（注：原 tasks 寫「42 個」為舊數字，Change A 前已是 52 個）
- [x] E5 `updateQueueData` 不再因 11000 自動 `dropIndex`，partial unique index 不被舊 code 拆除 — `queue.admin.test.js`「更新客戶資料撞號（11000）回 409 友善訊息、不丟 ReferenceError、不 dropIndex」
