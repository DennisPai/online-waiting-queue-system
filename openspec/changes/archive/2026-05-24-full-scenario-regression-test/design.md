## 背景

修玄宮候位系統測試環境（`openqueue-test.zeabur.app`）在 2026-05-22 / 05-23 連續落地 4 個 OpenSpec Change 後，**所有個別 Change 的內部測試已綠**，但「整個系統作為一個跨情境整合產品」的回歸從未統合驗收過。懷特 5/24 整理出 62 個權威使用者情境（customer 26 + admin 36），是本回歸測試的清單來源。

本 Change 的設計挑戰：**怎麼讓「62 個情境 × 3 層測試（程式 + API + UI）」既可分工平行又不彼此污染、且每階段結果可獨立檢驗**。

## 主要決策

### D1：情境驅動 vs endpoint 驅動測試結構

**選項**：
- A. 按 62 個使用者情境組織測試（情境 1 → 全套程式 + API + UI 驗證） ✓（採用）
- B. 按 47 個 endpoint 組織測試（每 endpoint 完整覆蓋所有路徑）
- C. 按 controller / model 組織測試（純技術視角）

**為何選 A**：
- 跟懷特整理的情境文檔結構對齊（一目了然「情境 N 跑哪個 sub-agent」）
- 自然涵蓋 endpoint 驅動 + UI 互動 + 跨元件流程（情境本身就是「使用者實際走的路徑」）
- 失敗訊息回報「情境 14 失敗」比「`POST /queue/register` 失敗」對懷特友善 100 倍
- 跨情境整合測試（階段 4）可以引用已驗證情境作前置條件（如「假設情境 3 已綠 → 在此基礎驗整合」）

**代價**：相同 endpoint 在多個情境內可能被多次測試（如 `/queue/register` 在情境 3 / 4 / 14 / 32 都會打）— 用「sub-agent 並行分批」降低時間成本

### D2：三層測試（程式 + API + UI）並行 vs 串行

**選項**：
- A. 三層全並行（程式 grep + curl + Playwright 同時跑） ✓（採用）
- B. 串行：先程式驗證 → 過了才 API → 過了才 UI（失敗早停）
- C. 只跑 UI（最完整、但慢且 flaky）

**為何選 A**：
- 三層覆蓋不同 risk 面：程式驗證抓「code 對齊情境描述」、API 抓「endpoint 真實行為」、UI 抓「整合 + 視覺 + UX」
- 同情境內三層並行可大幅縮短總時間（sub-agent 平行）
- 失敗訊息分層更精準：「程式對、API 對、UI 壞」就指向前端 / Playwright 環境問題
- B 的「失敗早停」對回歸沒幫助（回歸目標是「全部跑完看哪些壞」、不是「找一個就停」）

### D3：派多個 sub-agent 並行分批 vs 單一 sub-agent 順序跑

**選項**：
- A. 多個 sub-agent 並行分批（如 customer 26 情境分 5 個 sub-agent、admin 36 情境分 6 個 sub-agent） ✓（採用）
- B. 單一 sub-agent 順序跑完 62 情境
- C. 一個情境一個 sub-agent（62 個 sub-agent）

**為何選 A**：
- 時間：估每情境約 5-10 分鐘（程式 + curl + Playwright），62 情境 ÷ 1 = 5-10 小時、÷ 11 sub-agent ≈ 30 分鐘到 1 小時
- 隔離：每個 sub-agent 拿到「情境清單 + 測試 brief」獨立工作，互不污染 context
- C 的「62 個 sub-agent」太碎、context 開銷大、Discord 通知噪音；A 的「每批 5-6 個情境」是甜蜜點
- B 太慢且單點失敗風險高

**分批原則**：
- customer 26 情境 → 5 個 sub-agent（情境 1-5 / 6-10 / 11-15 / 16-21 / 22-26）
- admin 36 情境 → 6 個 sub-agent（情境 1-6 / 7-12 / 13-18 / 19-24 / 25-30 / 31-36）
- 跨情境整合 → 2 個 sub-agent（5 個整合場景拆 2-3 + 2-3）

**資料隔離**：每個 sub-agent 用獨立「測試客戶識別」（如姓名 prefix `_REGTEST_AGENT01_客戶名`）、跑完自動清自己的測試資料（DELETE WaitingRecord by name regex）；不同 sub-agent 互不影響彼此資料

### D4：優先級（P0 / P1 / P2）標記

**為何分級**：62 情境若全 P0，sub-agent 失敗一個就阻斷全部；分級後阻斷判斷更精準

- **P0（核心情境、必綠才能釋出）**：
  - customer：情境 3（報名完整流程）/ 6（查詢候位）/ 8（額滿）/ 9（取消已下架）/ 26（即時刷新）
  - admin：情境 5（叫號下一位）/ 6（拖動）/ 7（取消）/ 12（編輯客戶）/ 13（刪除釋出名額）/ 14（後台登記候位）/ 15（結束本期）/ 32（並發超收）
- **P1（重要邊角案例、阻斷一條釋出但可規劃下版修）**：
  - customer：情境 4（簡化模式）/ 14（缺農曆）/ 16（家人上限 3）/ 17（同上地址）/ 23（路由保護）/ 24（定時開放）
  - admin：情境 8（恢復）/ 10（標記完成）/ 16（清除所有）/ 17（重新排序）/ 19（匯出）/ 22（定時開放設定）/ 33（後台新增刷新）/ 34（Change B 驗收）/ 35（Phase 6.4 觀察）
- **P2（友善訊息 + UX、阻斷可入 follow-up）**：
  - customer：情境 1, 2, 5, 7, 10-13, 15, 18-22, 25
  - admin：情境 1-4, 9, 11, 18, 20, 21, 23-31, 36

**阻斷規則**：
- 任 1 個 P0 失敗 → **阻斷全 OpenSpec、立刻 Discord 回報、停下等懷特決定**
- 任 1 個 P1 失敗 → 該情境不通過、繼續跑其他、最終匯總列為「需修補」
- 任 1 個 P2 失敗 → 該情境不通過、繼續跑其他、最終匯總列為「nice-to-have follow-up」

### D5：失敗處理策略

**阻斷類失敗**（停下 + Discord 回報）：
- P0 情境失敗
- Zeabur 測試環境整個 down（`/health` 不通超過 5 分鐘）
- 測試 MongoDB 連不上
- Playwright 環境初始化失敗（如 chromium libs 缺）

**可重試類失敗**（自動 retry 3 次、退避 2/5/10 秒）：
- Zeabur fluky（cold start 慢、單次 timeout）
- Socket.io 連線 race（首次訂閱沒收到推播、第二次有）
- MongoDB connection pool 短暫滿載

**測試資料污染類失敗**（清資料後重跑）：
- sub-agent 跑完沒清 `_REGTEST_*` 殘留 → 下一批 sub-agent 看到髒資料
- 處理：每階段開始前跑一次「全清 _REGTEST_* 殘留」guard、再開跑

### D6：DB raw 直連驗證 vs 只看 API response

**為何 DB raw 直連**（懷特 5/23 嚴令）：
- 多次踩過「controller 回傳長對、DB 實際沒寫進去」的坑（Change A Phase 6.4 Mongoose default 架空 migration 就是典型）
- 看 controller 回傳 = 看自己 mock 的鏡子；看 DB raw = 看真實狀態
- 所有 API 類驗證必須附 mongosh 查詢 output 截圖 / log
- 用法：`mongosh "$XIUXUANGONG_TEST_MONGO_URI" --eval 'db.waitingrecords.findOne({name: /_REGTEST_AGENT01_張三/}).pretty()'`

### D7：Playwright 截圖留證 vs 純 assertion

**為何留截圖**：
- assertion 過 = 程式判斷過、不代表「使用者真的看得對」
- 截圖留證 = 懷特可以肉眼驗收「真的看到那行字」
- 阻斷類失敗截圖必看（如「Change C 已移除取消按鈕」要截 StatusPage 詳情對話框、看真的沒有按鈕）
- 路徑慣例：`/tmp/regression-test-screenshots/scenario-{NN}-{phase}.png`

### D8：sub-agent brief 寫法（懷特 5/16 嚴令）

**brief 必含**：
- 情境編號 + 完整情境描述（複製情境文檔對應段落）
- 該情境測試的「程式 / API / UI 三層具體步驟」（不能只寫「測 register」、要寫「跑 `POST /api/v1/queue/register` body 含 name / phone / lunarBirthYear / ...、預期 200 + queueNumber、用 mongosh 查 DB 確認 issuedCount += 1、跑 Playwright script `/tmp/scenario-03-playwright.js` 截圖確認跳到 `/status/:queueNumber`」）
- 測試資料命名規則（`_REGTEST_AGENT0X_客戶名`）+ 清資料指令
- 失敗回報格式（含截圖路徑、mongosh output、curl response、原因分析）
- 強制紀律：「派 fresh agent」「不寫 production code」「跑完清資料」「Discord 回報完整結果」
- 資料來源檔案路徑必明確指定（USER_SCENARIOS_CUSTOMER.md `/home/node/projects/open-queue-test/docs/USER_SCENARIOS_CUSTOMER.md` 等），避免拉 system prompt fallback

### D9：跨情境整合測試的「前置條件」設計

**為何要有「前置條件」段**：跨情境測試需要「乾淨環境」或「特定初始狀態」（如「issuedCount=99 / maxOrderIndex=100」才能測情境 32 並發超收邊界）

**前置條件 sub-agent 動作清單**：
1. mongosh 清 `_REGTEST_*` 殘留
2. mongosh `db.systemsettings.updateOne({}, {$set: {issuedCount: 0, maxOrderIndex: 100, ...}})` 重設
3. curl 預先報名 N 筆（建立測試所需的 baseline 狀態）
4. 才開始跑跨情境流程

## 風險

### R1：測試環境是「跟正式環境共用 codebase 但獨立 DB」

**處置**：
- 測試環境 MongoDB 在 `secrets.env` → `XIUXUANGONG_TEST_MONGO_URI`，跟正式環境完全隔離
- 但 codebase 是同一份 git repo（測試 repo `DennisPai/open-queue-test`）—— 若測試發現 production bug，意味正式環境 codebase 也有同樣 bug
- sub-agent 不准動 production code、發現 bug 只回報

### R2：Playwright 環境依賴 chromium libs

**處置**：
- 已記入 `reference_chromium_local_install`，sub-agent brief 內附「若 chromium libs 缺，先跑 `~/bin/install-chromium-deps-local`」
- 失敗時走 D5 阻斷路徑

### R3：Socket.io 即時刷新類情境（情境 26 / admin 5 / admin 6）難以 Playwright 自動化

**處置**：
- 用兩個 browser context 模擬「管理員操作 + 客戶 watcher」
- 管理員 context 觸發叫號 → watcher context 等待 5 秒看數字是否變
- 容忍 fluky（D5 retry 3 次）

### R4：62 情境 × 11 sub-agent 並行 → Zeabur 測試環境負載突增

**處置**：
- sub-agent 內部 sequential（同一 sub-agent 不並發打 API）
- sub-agent 之間並行
- 估計總並發 ~10-15 RPS、Zeabur 測試環境可承受
- 若 Zeabur 開始 throttle（429）→ sub-agent 降速 retry

### R5：測試發現「新 bug」（非 Change A/B/C 既有問題）

**處置**：
- sub-agent 不修、不寫 fix code
- 直接 Discord 回報「情境 N 發現新 bug：[症狀] / [根因初判] / [影響範圍]」
- 由懷特決定「開新 OpenSpec 修」或「列為 known issue 繼續釋出」

## 注意事項

- 每階段執行前確認測試環境 `/health` 通、Zeabur deployment status = RUNNING
- 跑完每階段先 mongosh 全清 `_REGTEST_*` 殘留再進下一階段
- 測試資料命名 `_REGTEST_AGENT{NN}_` prefix 是設計來「明顯非真人 / 容易 grep 清除」
- Playwright 截圖目錄 `/tmp/regression-test-screenshots/` 跑完匯總給懷特、留 24 小時後可清
- 完整匯總報告須含「62 情境 PASS/FAIL 矩陣」+ 「失敗原因分類」+ 「建議修補優先級」+ 「是否可同步正式環境的判斷」
