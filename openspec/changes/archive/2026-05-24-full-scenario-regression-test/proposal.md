## 為什麼要做

2026-05-22 到 05-23 連續推進 4 個正式 OpenSpec Change（A 候位資料一致性 / B 家人地址 / C 全系統農曆 + 移除前台取消 / Follow-up patches）+ 多次 hotfix 部署後，測試環境累積了大量未跨情境驗證的變更。目前狀態：

1. **個別 Change 內部測試已綠**（90+ backend test、Playwright 局部驗收），但**跨情境整合行為從未統合驗過**
2. **懷特 5/22 已要求第二輪修補**（Change A Phase 6.4 阻斷性 bug：Mongoose `default: 0` 架空 migration → 報名全面失效），目前等待核可
3. **62 個使用者情境**（customer 26 + admin 36）由懷特 5/24 整理完成（`docs/USER_SCENARIOS_CUSTOMER.md` + `docs/USER_SCENARIOS_ADMIN.md`），這份是「測試版本完整情境回歸測試」的權威清單
4. **需要一份完整 regression baseline**：確認所有外部客戶可見功能 + 管理員後台功能在當前測試環境（`openqueue-test.zeabur.app`）跑全綠 → 才有資格進入「同步正式環境」階段

**核心目的**：建立一份「sub-agent 拿著就能執行」的完整回歸測試計畫，每個情境含**程式驗證 + API curl 端對端 + Playwright UI 三層覆蓋**，由執行階段另派 fresh agent 分批並行跑、結果匯總給懷特 review 後再決定正式環境同步。

## 要做什麼

### 範圍

**完整測試**：62 個使用者情境（customer 26 + admin 36），每情境含：
- **程式層**：grep 確認對應 endpoint / 元件 / Redux slice 存在且行為符合情境描述
- **API curl 層**：對應 endpoint 真送請求，看 HTTP 狀態 + response body + DB raw 值（用 `mongosh` 直連測試環境 MongoDB 看真實資料、不靠 controller 回傳信任值）
- **Playwright UI 層**：跑瀏覽器自動化，看截圖驗 UI 行為符合情境「預期結果」段；長者使用情境（大字 / 手機）額外驗 RWD
- **邊角案例**：情境文檔列的「邊角案例」逐項驗（含並發、額滿邊界、瞬間切換、token 過期）
- **失敗處理**：情境文檔列的「失敗處理」逐項觸發（如 API 5xx、Socket 斷線、表單漏填）

**跨情境整合測試**（階段 4 專責）：
- 客戶報名 → 管理員看到 → 管理員拖動排序 → 客戶查詢看到新位置
- 客戶報名 → 管理員叫號叫到 → 客戶查詢頁 Socket 自動跳數字
- 客戶報名 → 額滿邊界 → 管理員刪除一筆 → 客戶下一個能擠進來
- 後台「結束本期」→ 歸檔到 Customer / VisitRecord → 從客戶 DB 找得到（Change B 家人地址保留驗證）
- 管理員操作快照備份 → 「清除所有候位」誤觸 → 從快照恢復

### 不在範圍

- **純前端 UI polish**（顏色、間距、字體微調）— 不影響功能就不列入回歸
- **新功能開發**（如 LINE notify 整合、Email 副本）— 屬未來 OpenSpec
- **效能壓測**（10000 並發）— 屬獨立壓測 OpenSpec、非情境回歸
- **正式環境同步**（prod deploy）— 本 OpenSpec 跑完並懷特核可後另開 OpenSpec
- **修補性開發**（測試發現新 bug）— 阻斷時回報懷特、由懷特決定開新 Change

### 不會做

- **不執行測試**：本 OpenSpec 是「撰寫測試計畫」、實際執行由後續另派 fresh sub-agent 分批並行進行
- **不部署、不 commit、不 push**：純文件產出
- **不改 production code**：testing 也不改任何 production 程式碼，連 mock 都不准插入正式碼

### 完整端對端驗證原則（懷特 5/23 嚴令）

- **驗證 sub-agent ≠ 執行 sub-agent**：每階段派 fresh agent，禁止「實作的 sub-agent 自己驗收」
- **程式驗證 ≠ 實機測試**：實機操作驗證不准用「我看 code 寫對了」充數、必須 curl 真送 + 看 DB raw 值
- **DB raw 直連驗值**：所有 API 驗證在 mongo shell（`mongosh "$XIUXUANGONG_TEST_MONGO_URI"`）查 collection 原始欄位（不可只看 controller 回傳）
- **Playwright 截圖留證**：UI 類驗證一律留 PNG 在 `/tmp/regression-test-screenshots/`，sub-agent 回報必附路徑
- **不破壞既有驗證**：Change A / B / C / Follow-up 既有功能不可被 regression 打破（明列在跨情境階段 4）

## 影響

- **影響的能力**：候位報名 / 候位查詢 / 候位排序 / 候位取消 / 候位額滿 / 候位叫號 / 結束本期歸檔 / 客戶資料庫 CRUD / 來訪紀錄 CRUD / 系統設定 4 個 Tab / 操作快照備份 / Google Drive 備份 / API Log / 定時開放 / 活動橫幅
- **影響的程式**：零（純測試驗證、不改 production code）
- **需要 DB migration**：零
- **環境**：純測試環境（`openqueue-test.zeabur.app` + 測試 MongoDB）；正式環境不碰
- **執行時序**：本 OpenSpec 完成（4 檔生出 + 懷特 review）→ 另派執行 sub-agent → 階段化跑 → 完整匯總 → 懷特決定是否同步正式環境
