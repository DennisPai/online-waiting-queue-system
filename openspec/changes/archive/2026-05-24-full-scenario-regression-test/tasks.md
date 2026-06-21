## 1. 階段 1 — 前置確認（執行 sub-agent 開跑前必做）

派**獨立 sub-agent #0（前置確認專責）**。Discord 回報後再進階段 2。

### 1.1 環境健康度確認

- [x] 1.1.1 curl `https://openqueue-test-backend.zeabur.app/health` 確認 200 + JSON `{ status: 'ok' }`
- [x] 1.1.2 curl `https://openqueue-test-backend.zeabur.app/ready` 確認 200
- [x] 1.1.3 curl `https://openqueue-test.zeabur.app/` 確認 200 + HTML 含「修玄宮天上聖母」字串
- [x] 1.1.4 用 Zeabur API 確認測試環境 frontend / backend 兩個 service 的 latest deployment status = RUNNING（用 `$XIUXUANGONG_ZEABUR_API_TOKEN` 打 `https://api.zeabur.com/graphql`，service ID 在 `secrets.env` → `XIUXUANGONG_ZEABUR_FRONTEND_SID` / `XIUXUANGONG_ZEABUR_BACKEND_SID`）

### 1.2 端對端對齊 grep（程式驗證 ≠ 實機測試、這步是「先確認情境文檔提到的 endpoint / 元件實際存在於 codebase」）

- [x] 1.2.1 grep `POST /api/v1/queue/register` `POST /api/v1/queue/search` `GET /api/v1/queue/number/:num` `GET /api/v1/queue/status` 在 `backend/src/routes/` 全部出現位置、確認所有 customer 情境提到的 endpoint 都有定義
- [x] 1.2.2 grep `cancelQueueByCustomer` `registerQueue` `searchQueueByNameAndPhone` 在 `backend/src/controllers/` 確認 handler 存在
- [x] 1.2.3 grep `useQueueData` `useQueueActions` `useQueueSettings` `useQueueUI` 在 `frontend/src/hooks/admin/` 確認 admin hooks 存在
- [x] 1.2.4 grep `RegisterForm` `StatusPage` `BirthdayPicker` `FamilySection` `QueueTable` `CustomerDetailDialog` `VisitFormDialog` 在 `frontend/src/components/` 確認元件存在
- [x] 1.2.5 grep `issuedCount` 在 `backend/src/models/system-setting.model.js` 確認 Change A 欄位已加（Phase 6.4 阻斷性 bug 觀察點）
- [x] 1.2.6 grep `lunarOnly` 在 `BirthdayPicker.jsx` 確認 default = true（Change C v3 + follow-up #5 全系統農曆驗證）
- [x] 1.2.7 grep `partialFilterExpression` 在 `backend/src/models/waiting-record.model.js` 確認 orderIndex partial unique index 存在（Change A Phase 3）

### 1.3 測試資料污染清理（baseline cleanup）

- [x] 1.3.1 連測試 MongoDB：`mongosh "$XIUXUANGONG_TEST_MONGO_URI"`
- [x] 1.3.2 全清 `_REGTEST_*` 殘留：
  - `db.waitingrecords.deleteMany({name: /^_REGTEST_/})`
  - `db.customer_profiles.deleteMany({name: /^_REGTEST_/})`
  - `db.customer_visits.deleteMany({"customerName": /^_REGTEST_/})`
- [x] 1.3.3 確認測試環境 SystemSetting baseline：`db.systemsettings.findOne({})` → 記下當前 `issuedCount` `maxOrderIndex` `currentQueueNumber` `isQueueOpen` `publicRegistrationEnabled` `simplifiedMode`，作為「測試結束後復原基準」
- [x] 1.3.4 用 mongosh 把 SystemSetting 重設成測試友善值：
  - `db.systemsettings.updateOne({}, {$set: {isQueueOpen: true, publicRegistrationEnabled: true, simplifiedMode: false, maxOrderIndex: 100, issuedCount: 0, currentQueueNumber: 0, minutesPerCustomer: 13}})`
  - 記下原值以便階段 5 復原

### 1.4 Phase 6.4 阻斷性 bug 觀察（Change A 等核可的第二輪修補）

- [x] 1.4.1 嘗試報名一筆 `_REGTEST_AGENT00_BASELINE` → 看是否撞 Phase 6.4 阻斷性 bug（報名全面失效）
- [x] 1.4.2 若報名仍失效 → **直接 Discord 回報「Phase 6.4 阻斷性 bug 仍存在、無法進入階段 2」、等懷特核可的修補先落地**
- [x] 1.4.3 若報名成功 → 看 `mongosh "$XIUXUANGONG_TEST_MONGO_URI" --eval 'db.systemsettings.findOne({}, {issuedCount: 1})'` 確認 issuedCount += 1（驗證 Change A 原子閘門生效）

### 1.5 Playwright 環境驗證

- [x] 1.5.1 確認 chromium libs 存在：`ls ~/.local/lib/chromium-deps/` 應有 15 個 .deb 解壓檔（若缺、跑 `~/bin/install-chromium-deps-local`）
- [x] 1.5.2 跑最小 Playwright 健檢：`node -e "const {chromium} = require('playwright'); chromium.launch().then(b => { console.log('ok'); b.close(); })"`
- [x] 1.5.3 截圖目錄建立：`mkdir -p /tmp/regression-test-screenshots`

### 1.6 階段 1 回報

- [x] 1.6.1 Discord 回報懷特：「階段 1 前置確認 PASS / FAIL」+ 1.3.3 baseline 值 + 1.4 Phase 6.4 結論
- [x] 1.6.2 阻斷項目（1.1.x 健康度 / 1.4 Phase 6.4 / 1.5 Playwright）任 1 fail → 停下等懷特

---

## 2. 階段 2 — Customer 26 情境完整測試（派 5 個 sub-agent 並行）

每個 sub-agent brief 必含：
- 該 sub-agent 負責的情境編號清單
- 完整情境描述（複製 `/home/node/projects/open-queue-test/docs/USER_SCENARIOS_CUSTOMER.md` 對應段落）
- 測試資料命名規則：客戶名 prefix `_REGTEST_AGENT01_` / `_REGTEST_AGENT02_` ... 對應 sub-agent 編號
- mongosh 連線：`mongosh "$XIUXUANGONG_TEST_MONGO_URI"`
- API base URL：`https://openqueue-test-backend.zeabur.app`
- 前端 URL：`https://openqueue-test.zeabur.app`
- 失敗回報格式：見 D5
- 強制紀律：派 fresh agent / 不寫 production code / 跑完清自己的測試資料 / Discord 回報完整結果 / 截圖留 `/tmp/regression-test-screenshots/`

### 2.1 Sub-agent #1 — 情境 1-5（訪客首頁 + 報名完整流程）

- [x] 2.1.1 **情境 1（首頁公告期）**：
  - 程式層：grep `publicRegistrationEnabled` `nextSessionDate` `QueueStatusDisplay` 在 `HomePage.jsx` 確認條件渲染存在
  - API：curl `GET /api/v1/queue/status` 看回傳含 `nextSessionDate` `isQueueOpen` `publicRegistrationEnabled`、用 mongosh `db.systemsettings.findOne({})` 比對欄位值一致
  - UI：Playwright 開 `https://openqueue-test.zeabur.app/`、截圖 `scenario-01-homepage.png`、assert 看到「修玄宮天上聖母開科辦事」+「透過網路輕鬆登記候位」
  - 邊角：分別把 `publicRegistrationEnabled` mongosh set true / false、reload 看「我要候位」按鈕顯示 / 隱藏

- [x] 2.1.2 **情境 2（首頁辦事中目前叫號）**：
  - 程式層：grep `isQueueOpen` `currentQueueNumber` 在 `HomePage.jsx` 確認大字顯示邏輯
  - API：mongosh set `isQueueOpen: true, currentQueueNumber: 12`、curl `/queue/status` 確認回傳 12
  - UI：Playwright 開首頁、截圖 `scenario-02-current-queue.png`、assert 看到「目前叫號 12」大字
  - 邊角：set `currentQueueNumber: 0` → 應顯示 0 號（測試此邊角文字）

- [x] 2.1.3 **情境 3（報名完整流程）P0**：
  - 程式層：grep `validateRequiredFields` 在 `QueueService.js` 確認 lunar 三欄位已加（follow-up #3）；grep `autoFillDates` 在 `calendarConverter.js` 確認農曆→國曆反推（follow-up #5）
  - API：curl `POST /api/v1/queue/register` body:
    ```json
    {"name":"_REGTEST_AGENT01_張三","phone":"0912345678","gender":"male","lunarBirthYear":80,"lunarBirthMonth":1,"lunarBirthDay":15,"lunarIsLeapMonth":false,"addresses":[{"address":"台北市信義區忠孝東路1段1號","addressType":"home"}],"familyMembers":[],"consultationTopics":["body","fate"],"remarks":""}
    ```
    - 預期 200 + JSON `{queueNumber, _id, status: 'waiting'}`
    - mongosh `db.waitingrecords.findOne({name:'_REGTEST_AGENT01_張三'}).pretty()` 確認：
      - `lunarBirthYear: 80` `lunarBirthMonth: 1` `lunarBirthDay: 15`
      - `gregorianBirthYear: 1991` `gregorianBirthMonth: 2` `gregorianBirthDay: 28`（autoFillDates 反推、follow-up #5）
      - `issuedCount` 在 `db.systemsettings.findOne({})` 已 += 1（Change A 原子閘門）
      - `orderIndex` 連續 + status='waiting'
  - UI：Playwright 開 `/register` 完整填表（姓名 / 電話 / 農曆生日 80/1/15 / 地址 / 諮詢主題勾「身體 + 運途」）、點「完成登記」、截圖 `scenario-03-register-success.png`、assert 跳轉 `/status/:queueNumber` 看到候位號碼大字
  - 邊角：超過 80 號（預先 mongosh set `issuedCount: 80`）→ Playwright 截圖確認「超過 80 號預計將排至凌晨 1 點以後」警告
  - 失敗處理：必填漏填 → 截圖 `scenario-03-validation-error.png` 確認紅字提示
  - 清資料：mongosh 刪該筆 + issuedCount $inc -1（呼應 Change A 設計：delete 才釋出名額）

- [x] 2.1.4 **情境 4（簡化模式報名）P1**：
  - 前置：mongosh set `simplifiedMode: true`
  - API：curl `POST /queue/register` 只帶 `{name:'_REGTEST_AGENT01_長輩A', phone:'0911111111'}` → 預期 200（簡化模式不擋）
  - 邊角：只帶 `{name:''}` → 應仍 400（姓名 hard requirement）
  - mongosh 確認該筆 lunarBirth* = null、issuedCount += 1
  - UI：Playwright 開 `/register`、看到欄位都不再 required、只填姓名就送出 → 截圖 `scenario-04-simplified.png`
  - 後置：mongosh set `simplifiedMode: false`、清測試資料

- [x] 2.1.5 **情境 5（報名成功後查看號碼）P2**：
  - 前置：先跑情境 3 報名一筆、拿到 queueNumber
  - UI：Playwright 跳轉到 `/status/:queueNumber`、截圖 `scenario-05-success-page.png`、assert 看到「您的候位號碼：N」+「前面還有 N 組」+「預估等待 N 分鐘」+「預估輪到時間 HH:mm」+「您的排序第 N 位」

- [x] 2.1.6 sub-agent #1 跑完 Discord 回報：5 情境 PASS/FAIL 矩陣 + 截圖路徑 list + mongosh output 摘要 + 清資料完成確認

### 2.2 Sub-agent #2 — 情境 6-10（查詢候位 + 詳細資料 + 額滿）

- [x] 2.2.1 **情境 6（查詢候位姓名+電話）P0**：
  - 前置：sub-agent 內部先跑 `POST /queue/register` 報名 2 筆 `_REGTEST_AGENT02_查詢A` / `_REGTEST_AGENT02_查詢B`
  - API：
    - 只填姓名：curl `POST /api/v1/queue/search` body `{name:'_REGTEST_AGENT02_查詢A'}` → 預期 200 + 1 筆
    - 只填電話：body `{phone:'0922222222'}` → 預期 200 + 該電話下所有筆
    - 兩個都填：body `{name, phone}` → 精確匹配
  - UI：Playwright 開 `/status/search`、填姓名查詢、截圖 `scenario-06-search-result.png`、assert 看到候位記錄 chip + 編號 + 狀態
  - 邊角：mongosh set `showQueueNumberInQuery: false` → reload 截圖 `scenario-06-hide-number.png` 確認號碼欄隱藏
  - 邊角：用「家人姓名」查詢（先報一筆含家人 `_REGTEST_AGENT02_家人C`）→ 確認後端 `searchQueueByNameAndPhone` 掃 familyMembers.name 找得到
  - 失敗：兩欄都不填按查詢 → 截圖 `scenario-06-warning.png` 確認 warning 訊息

- [x] 2.2.2 **情境 7（詳細資料對話框）P2**：
  - 前置：先報一筆 `_REGTEST_AGENT02_詳情A` 含家人 + 諮詢主題勾「其他」+ otherDetails 填內容
  - UI：Playwright 查詢 → 點「查看詳細資料」、截圖 `scenario-07-detail-dialog.png`、assert：
    - 看到 4 大區塊（基本 / 出生 / 諮詢 / 備註 / 地址 / 家人）
    - 出生資料看到「國曆 + 農曆民國年 + 閏月註記」
    - **無「編輯」按鈕**（PRD：訪客僅能查看）
    - 諮詢主題顯示「其他(詢問搬家方位)」格式
  - 邊角：沒家人的記錄、確認家人區塊整段不顯示

- [x] 2.2.3 **情境 8（本次候位額滿）P0**：
  - 前置：mongosh set `maxOrderIndex: 10, issuedCount: 10`（強制額滿）+ `nextSessionDate` 設未來 + `scheduledOpenTime` 設未來
  - UI：Playwright 開首頁、截圖 `scenario-08-full-homepage.png`、assert 看到「本次報名已額滿」+ 主按鈕灰
  - UI：Playwright 開 `/register` → 看到 5 秒倒數 → 自動跳回首頁、截圖 `scenario-08-full-register-redirect.png`
  - 邊角：mongosh set `scheduledOpenTime: '2026-06-05T09:00:00+08:00'` → reload 確認顯示「2026 年 6 月 5 日 09:00 星期四」自訂時間
  - 邊角：mongosh unset `scheduledOpenTime` + unset `nextSessionDate` → 確認顯示「未設定」
  - 後置：mongosh 復原 baseline `maxOrderIndex: 100, issuedCount: 0`

- [x] 2.2.4 **情境 9（取消候位已移除）P0**：
  - 前置：先報一筆 `_REGTEST_AGENT02_取消測試`、跳到 `/status/:queueNumber`
  - UI：Playwright 開 `/status/:queueNumber`、點「查看詳細資料」、截圖 `scenario-09-no-cancel.png`、**assert 看不到「取消預約」按鈕**（Change C 已移除）
  - 程式層：grep `取消預約` 在 `frontend/src/components/customer/` 或 `StatusPage.jsx` 確認 button 已刪
  - API 安全側：curl `POST /api/v1/queue/cancel` 帶 `_id` + 姓名 + 電話（後端 API 仍存在但前台不呼叫）→ 預期 200 取消成功（Change A 加雙重驗證後仍可用、僅前台 UI 移除）

- [x] 2.2.5 **情境 10（忘了號碼只記得姓名）P2**：
  - 前置：報 2 筆同名 `_REGTEST_AGENT02_同名甲`（不同電話）
  - API：curl `POST /queue/search` body `{name:'_REGTEST_AGENT02_同名甲'}` → 預期 200 + 兩筆陣列
  - UI：Playwright 截圖 `scenario-10-multi-result.png` 確認列出兩筆

- [x] 2.2.6 sub-agent #2 跑完 Discord 回報 + 清資料

### 2.3 Sub-agent #3 — 情境 11-15（查詢補完 + 表單驗證）

- [x] 2.3.1 **情境 11（只記得電話）P2**：sub-agent 同 2.2.5 但只填電話、確認列出該電話下所有筆
- [x] 2.3.2 **情境 12（Email 格式錯）P2**：
  - UI：Playwright 開 `/register`、Email 填 `abc@`、按完成 → 截圖 `scenario-12-email-error.png`、assert 紅字提示（瀏覽器 native validation 或 backend 400）
  - 邊角：Email 留空 → 應通過（選填）
- [x] 2.3.3 **情境 13（電話格式錯）P2**：
  - UI：電話填 `abc` 或 `09xxxx` → 截圖 `scenario-13-phone-error.png`、assert 紅字
- [x] 2.3.4 **情境 14（漏填農曆生日）P1**：
  - 前置：mongosh set `simplifiedMode: false`
  - API：curl `POST /queue/register` 缺 `lunarBirthDay` → 預期 400 friendly error「請填寫農曆生日」（follow-up #3 補的驗證）
  - 邊角：mongosh set `simplifiedMode: true`、再 curl 缺 lunar → 預期 200（簡化模式 skip）
  - UI：Playwright 填表跳過生日、按完成 → 截圖 `scenario-14-lunar-required.png`、assert 紅字 `formErrors.birthYear/Month/Day`
  - 後置：mongosh set `simplifiedMode: false`
- [x] 2.3.5 **情境 15（農曆閏月）P2**：
  - API：curl `POST /queue/register` 含 `lunarBirthYear:109, lunarBirthMonth:4, lunarBirthDay:15, lunarIsLeapMonth:true` → 預期 200
  - mongosh 確認 `lunarIsLeapMonth: true` + `gregorianBirth*` 算出正確西元（民國 109 閏 4 月 15 → 西元 2020-06-06）
  - UI：Playwright 填表勾閏月、確認下拉勾選正確
- [x] 2.3.6 sub-agent #3 跑完 Discord 回報 + 清資料

### 2.4 Sub-agent #4 — 情境 16-21（家人 + 路由）

- [x] 2.4.1 **情境 16（家人上限 3 位）P1**：
  - UI：Playwright 開 `/register`、連續按「新增家人」3 次、截圖 `scenario-16-family-3.png`、assert 第 3 次後「新增家人」按鈕消失
  - API 安全側：curl `POST /queue/register` 帶 4 個 familyMembers → 後端應擋（`req.user` 不存在時 3 位上限）
- [x] 2.4.2 **情境 17（家人勾「同上」套用主地址）P1**：
  - UI：Playwright 開 `/register`、先填主地址、加家人、勾「同上」、截圖 `scenario-17-same-address.png`、assert 該家人地址欄被自動填上 + 類別 = home
  - 邊角：未填主地址先勾家人 checkbox → 截圖確認 checkbox disabled + 顯示「請先填寫主客戶地址」
- [x] 2.4.3 **情境 18（勾「其他」沒填內容）P2**：
  - UI：勾「其他」、跳過詳述、送出 → 應通過（無強制必填）→ 查詢詳情顯示「其他()」
- [x] 2.4.4 **情境 19（表單填到一半 reload）P2**：
  - UI：Playwright 開 `/register` 填一半、reload、截圖 `scenario-19-reload-reset.png`、assert 表單清空（`RegisterResetWrapper`）
- [x] 2.4.5 **情境 20（URL 直接打狀態頁）P2**：
  - 前置：報一筆拿到 queueNumber
  - UI：Playwright 直接打 `/status/${queueNumber}`、截圖、assert 直接看到該筆狀態
  - 邊角：打 `/status/9999` 不存在號碼 → 截圖 `scenario-20-not-found.png`、assert 看到「找不到候位記錄」+ 返回首頁按鈕
- [x] 2.4.6 **情境 21（誤觸管理員登入）P2**：
  - UI：Playwright 開首頁、點頁尾「管理員登入」、跳轉 `/login`、截圖 `scenario-21-login.png`、assert 看到登入表單
  - 失敗：用錯帳密 → 截圖確認紅 alert「使用者名稱或密碼錯誤」
- [x] 2.4.7 sub-agent #4 跑完 Discord 回報 + 清資料

### 2.5 Sub-agent #5 — 情境 22-26（RWD + 路由保護 + 自動開放 + Banner + 即時刷新）

- [x] 2.5.1 **情境 22（手機 / 桌面 RWD）P2**：
  - UI：Playwright 用 `viewport: {width: 375, height: 667}` (iPhone SE) 開首頁、截圖 `scenario-22-mobile.png`
  - UI：viewport `{width: 1440, height: 900}` 開首頁、截圖 `scenario-22-desktop.png`
  - assert 兩種 viewport 都不破版（手動 review 截圖）
- [x] 2.5.2 **情境 23（路由保護 publicRegistrationEnabled=false）P1**：
  - 前置：mongosh set `publicRegistrationEnabled: false`
  - UI：Playwright 訪客模式打 `/register`、截圖 `scenario-23-redirect.png`、assert 自動跳回 `/`
  - 邊角：管理員登入後再打 `/register` → 應仍能進去（測試 ConditionalRegistrationRoute 對 authenticated 放行）
  - 後置：mongosh set `publicRegistrationEnabled: true`
- [x] 2.5.3 **情境 24（定時自動開放）P1**：
  - 前置：mongosh set `publicRegistrationEnabled: false, autoOpenEnabled: true, scheduledOpenTime: '<now + 2min ISO 帶 +08:00>'`
  - 等待 2 分鐘 + 30 秒緩衝
  - mongosh 確認 `publicRegistrationEnabled: true`（scheduler 應自動切）
  - UI：Playwright reload 首頁、截圖 `scenario-24-auto-open.png`、assert 看到「我要候位」按鈕
  - 邊角：若 scheduler service 沒生效（fluky）→ 重試 1 次再 fail（D5 retry）
- [x] 2.5.4 **情境 25（活動橫幅 EventBanner）P2**：
  - 前置：mongosh set `eventBanner: {enabled: true, title: '_REGTEST_AGENT05_法會', buttonText: '點我報名', buttonUrl: 'https://example.com'}`
  - UI：Playwright 開首頁、截圖 `scenario-25-banner.png`、assert 看到 banner 標題 + 按鈕
  - 邊角：set `enabled: false` → reload 確認 banner 不顯示
  - 後置：mongosh set `eventBanner.enabled: false`
- [x] 2.5.5 **情境 26（Socket 即時刷新）P0**：
  - 前置：先報一筆 `_REGTEST_AGENT05_即時測試` 拿到 queueNumber=N
  - UI：開 2 個 Playwright browser context：
    - Context A（客戶 watcher）：開 `/status/N`、wait 5 秒
    - Context B（管理員）：登入後台 admin/admin123、點「叫號下一位」（直到目前叫號變成 N-1）
    - Context A reload 前先 wait 10 秒看數字是否自動跳到 N-1（Socket 推播）
  - 截圖 `scenario-26-socket-update.png` Context A 數字變化前 / 後對照
  - 失敗：Socket fluky 重試 3 次
  - 後置：清資料
- [x] 2.5.6 sub-agent #5 跑完 Discord 回報 + 清資料

### 2.6 階段 2 完整回報

- [x] 2.6.1 sub-agent #1-5 全完成後，由派發 sub-agent 主帶（不是執行 sub-agent）匯總：「26 情境 PASS/FAIL 矩陣」+ 阻斷項目 + 截圖目錄
- [x] 2.6.2 任 1 個 P0 失敗 → 停下、Discord 回報、等懷特決定
- [x] 2.6.3 P1 / P2 失敗 → 繼續進階段 3

---

## 3. 階段 3 — Admin 36 情境完整測試（派 6 個 sub-agent 並行）

每個 sub-agent brief 必含：
- 該 sub-agent 負責的情境編號清單
- 完整情境描述（複製 `/home/node/projects/open-queue-test/docs/USER_SCENARIOS_ADMIN.md` 對應段落）
- 測試資料命名規則：`_REGTEST_AGENT06_*` / `_REGTEST_AGENT07_*` ... 對應
- 管理員登入：admin / admin123 → 拿 JWT token、後續 API 用 `Authorization: Bearer <token>`
- 後台 URL base：`https://openqueue-test.zeabur.app/admin/...`
- 強制紀律：同階段 2

### 3.1 Sub-agent #6 — 情境 1-6（登入 + 列表 + 叫號 + 拖動）

- [x] 3.1.1 **情境 1（管理員登入成功）P2**：
  - API：curl `POST /api/v1/auth/login` body `{username:'admin', password:'admin123'}` → 預期 200 + JWT token
  - UI：Playwright 開 `/login`、填表、登入、截圖 `scenario-admin-01-login-success.png`、assert 跳轉 `/admin/dashboard`
- [x] 3.1.2 **情境 2（登入失敗）P2**：
  - API：用錯密碼 → 預期 401
  - UI：截圖 `scenario-admin-02-login-fail.png` 確認紅 alert
  - 邊角：欄位留空按送出 → 截圖確認 warning「請填寫所有欄位」（前端 short-circuit、不打 API）
- [x] 3.1.3 **情境 3（候位列表 waiting tab）P2**：
  - 前置：sub-agent 先報 5 筆 `_REGTEST_AGENT06_顧客1-5`
  - API：curl `GET /api/v1/admin/queue/list?status=waiting` Authorization Bearer → 預期 200 + 5 筆
  - UI：Playwright 登入後到 `/admin/dashboard`、截圖 `scenario-admin-03-waiting-list.png`、assert 看到 5 筆 + orderIndex=1 顯示「處理中」chip
  - 邊角：開「欄位設定」、勾選不同欄位、截圖確認欄位顯示對應變化
- [x] 3.1.4 **情境 4（已完成 / 已取消 tab）P2**：
  - 前置：先把其中 1 筆走情境 5 叫號變 completed、1 筆走情境 7 取消變 cancelled
  - UI：切 tab、截圖 `scenario-admin-04-completed.png` + `scenario-admin-04-cancelled.png`、assert 對應筆在對應 tab
  - 邊角：tab 1 / 2 不可拖曳（試拖、看 cursor 不變）
- [x] 3.1.5 **情境 5（叫號下一位）P0**：
  - 前置：5 筆在 waiting tab，orderIndex 1-5
  - API：curl `POST /api/v1/admin/queue/next` Authorization Bearer → 預期 200
  - mongosh 確認：
    - 原 orderIndex=1 的記錄 status='completed'
    - 原 orderIndex=2 的記錄 orderIndex=1 + status='processing'
    - `db.systemsettings.findOne({}).currentQueueNumber` 已更新
    - `db.backup_snapshots.find({operationType: /call.?next/i}).sort({createdAt: -1}).limit(1)` 有快照
  - UI：Playwright 後台、點「叫號下一位」、截圖 `scenario-admin-05-call-next.png`、assert 列表自動 refresh + 處理中跳到下一筆
  - Socket：另一個 browser context 開 `/status/原 orderIndex=2 的 queueNumber` 確認 Socket 推播數字更新
- [x] 3.1.6 **情境 6（拖動排序）P0**：
  - 前置：5 筆在 waiting tab
  - UI：Playwright 拖第 4 筆到第 1 筆位置、截圖 `scenario-admin-06-drag-before.png` + `scenario-admin-06-drag-after.png`、assert 順序變化
  - API：curl `PUT /api/v1/admin/queue/reorder` body `{ids: [新順序 _id 陣列]}` → 預期 200
  - mongosh 確認 orderIndex 1-5 連續無撞號
  - 邊角：故意送少 1 筆 _id 給 reorder → 預期 409（Change A Phase 4 後端驗證）
- [x] 3.1.7 sub-agent #6 跑完 Discord 回報 + 清資料

### 3.2 Sub-agent #7 — 情境 7-12（取消 / 恢復 / 完成 / 編輯）

- [x] 3.2.1 **情境 7（取消預約）P0**：
  - 前置：報 1 筆 `_REGTEST_AGENT07_取消A`
  - API：curl `PUT /api/v1/admin/queue/status` body `{id: '<_id>', status: 'cancelled'}` → 預期 200
  - mongosh 確認：
    - 該筆 status='cancelled', orderIndex=null（Change A Phase 3 取消後設 null）
    - `db.systemsettings.issuedCount` **不變**（Change A：cancelled 仍佔名額）
  - UI：Playwright 在 dashboard 點某筆 cancel icon、confirmDialog 按確定、截圖 `scenario-admin-07-cancel.png`、assert 該筆移到 cancelled tab
- [x] 3.2.2 **情境 8（恢復候位）P1**：
  - 前置：用 3.2.1 取消的那筆
  - API：curl `PUT /api/v1/admin/queue/status` body `{id, status: 'waiting'}` → 預期 200
  - mongosh 確認：
    - 該筆回 waiting、orderIndex=max+1 原子分配（Change A Phase 3.2）
    - issuedCount 不增加（恢復沿用原名額、Change A D14）
    - 整列 orderIndex 連續無撞（`ensureOrderIndexConsistency()` 被呼叫）
  - UI：Playwright 點 cancelled tab 某筆 RestoreIcon、截圖 `scenario-admin-08-restore.png`、assert 該筆回 waiting tab 末尾
- [x] 3.2.3 **情境 9（客戶請求取消、人工流程）P2**：簡單流程、走情境 7 確認即可、不獨立測
- [x] 3.2.4 **情境 10（標記完成 checkbox）P1**：
  - 前置：報 1 筆 `_REGTEST_AGENT07_完成B`
  - API：curl `PUT /api/v1/admin/queue/status` body `{id, status: 'completed'}` → 預期 200
  - UI：Playwright 點該 row checkbox、截圖 `scenario-admin-10-mark-completed.png`、assert 該筆移到 completed tab
  - 邊角：跟「叫號下一位」差異 — currentQueueNumber 不變動
- [x] 3.2.5 **情境 11（查看詳細資料）P2**：
  - UI：Playwright 點某筆 EditIcon、截圖 `scenario-admin-11-view-detail.png`、assert 4 大區塊 + 唯讀模式（無 input field）
- [x] 3.2.6 **情境 12（編輯客戶資料 dialog）P0**：
  - 前置：報 1 筆 `_REGTEST_AGENT07_編輯C` 含家人 1 位
  - UI：Playwright 開 CustomerDetailDialog、點「編輯」、修改姓名 / 電話 / 加家人到第 5 位（後台限）、改農曆生日（驗證 lunar-only 強制）、儲存、截圖 `scenario-admin-12-edit.png`
  - API：curl `PUT /api/v1/admin/queue/update` body 含修改後資料 + Authorization Bearer → 預期 200
  - mongosh 確認：
    - 修改後欄位寫進 DB（含 5 位家人完整 address + addressType）
    - gregorianBirth* 被 autoFillDates 重算（follow-up #5）
    - zodiac 被 addZodiac 重算
  - 邊角：BirthdayPicker 強制 lunarOnly（Change C v3）— 截圖確認無國曆切換按鈕
  - 邊角：取消編輯 → editedData 不影響原資料（deep copy）
- [x] 3.2.7 sub-agent #7 跑完 Discord 回報 + 清資料

### 3.3 Sub-agent #8 — 情境 13-18（刪除 / 後台登記 / 結束本期 / 清空 / 重排 / 欄位設定）

- [x] 3.3.1 **情境 13（刪除客戶）P0**：
  - 前置：報 1 筆 `_REGTEST_AGENT08_刪除D`
  - API：curl `DELETE /api/v1/admin/queue/:_id` Authorization Bearer → 預期 200
  - mongosh 確認：
    - 該筆從 waitingrecords 消失
    - `db.systemsettings.issuedCount` **$inc -1**（Change A：delete 才釋出名額）
    - `db.backup_snapshots` 有對應 snapshot
  - UI：Playwright 開 CustomerDetailDialog 編輯模式、點「刪除客戶」、confirmDialog、截圖 `scenario-admin-13-delete.png`
- [x] 3.3.2 **情境 14（後台登記候位、家人上限 5）P0**：
  - UI：Playwright 後台點「登記候位」按鈕、開對話框、填表 + 加 5 位家人（後台限）、送出、截圖 `scenario-admin-14-admin-register.png`
  - API：對話框內表單送出後台流程（embed RegisterForm + `req.user` 存在）→ 預期 200
  - mongosh 確認：
    - 該筆有 5 位 familyMembers 完整 address（Change B 修法 1）
    - issuedCount += 1（atomic 閘門）
  - **關鍵驗證**（Change A 修法）：UI 確認 onSuccess 後 dashboard 列表自動刷新、新客戶立刻顯示在末尾（不需 F5）→ 截圖 `scenario-admin-14-auto-refresh.png`
- [x] 3.3.3 **情境 15（結束本期）P0**：
  - 前置：報 3 筆 `_REGTEST_AGENT08_歸檔1-3`、其中 1 筆含家人 + 完整地址
  - UI：Playwright 點「結束本期」、confirmDialog、截圖 `scenario-admin-15-end-session-before.png` + `scenario-admin-15-end-session-after.png`
  - API：curl `POST /api/v1/admin/queue/end-session` Authorization Bearer → 預期 200
  - mongosh 確認（Change B 修法 2 驗收）：
    - `db.waitingrecords.find({name: /^_REGTEST_AGENT08_/})` 空（已清空）
    - `db.customer_profiles.find({name: /^_REGTEST_AGENT08_/})` 有 3 筆（歸檔）
    - `db.customer_visits.find({customerName: /^_REGTEST_AGENT08_/})` 有 3 筆對應
    - 含家人那筆的 VisitRecord familyMembers **含 address + addressType**（Change B 修法 2 驗收、新歸檔不再消失家人地址）
    - `db.systemsettings.findOne({})` `currentQueueNumber: 0, issuedCount: 0, isQueueOpen: false`
  - 邊角：「先寫後刪」鐵律 — 若中間 crash WaitingRecord 保留（測不到、但 grep 確認 end-session.admin.controller.js 邏輯先寫後刪）
- [x] 3.3.4 **情境 16（清除所有候位）P1**：
  - 前置：報 2 筆 `_REGTEST_AGENT08_清空1-2`
  - API：curl `POST /api/v1/admin/queue/clear-all` Authorization Bearer → 預期 200
  - mongosh 確認：waitingrecords 那 2 筆消失、Customer / VisitRecord **沒有歸檔**（跟 end-session 差別）
  - UI：Playwright 點「清除所有候位」、confirmDialog 強警告、截圖 `scenario-admin-16-clear-all.png`
- [x] 3.3.5 **情境 17（重新排序）P1**：
  - 前置：手動 mongosh 製造 orderIndex 撞號（如把 2 筆都 set orderIndex=3）— 注意若 partial unique index 已生效會被擋、需先 dropIndex 再造撞、最後復原 index
  - **安全替代方案**：跳過手動造撞、純驗證按鈕觸發 `ensureOrderIndexConsistency` 即可
  - UI：Playwright 點「重新排序」按鈕、截圖 `scenario-admin-17-reorder.png`
  - API：curl 對應 endpoint → 預期 200
  - mongosh 確認 orderIndex 連續 1-N
- [x] 3.3.6 **情境 18（欄位設定 Popover）P2**：
  - UI：Playwright 點「欄位設定」、勾選不同欄位、截圖 `scenario-admin-18-columns.png`、assert 表格立即依勾選顯示
  - 邊角：「操作」欄 alwaysVisible — 截圖確認 checkbox disabled
  - 邊角：「重設為預設」按鈕 — 點後回 default
- [x] 3.3.7 sub-agent #8 跑完 Discord 回報 + 清資料

### 3.4 Sub-agent #9 — 情境 19-24（匯出 / 預估時間 / 系統設定 4 Tab）

- [x] 3.4.1 **情境 19（匯出 Excel / CSV / PDF）P1**：
  - 前置：報 3 筆 `_REGTEST_AGENT09_匯出1-3`
  - UI：Playwright 點「匯出資料」→ ExportDialog、選 Excel、預覽、截圖 `scenario-admin-19-excel.png`
  - 同步測 PDF 預覽、截圖 `scenario-admin-19-pdf.png`
  - 邊角：list 為空時匯出按鈕 disabled — 清空後截圖確認
  - 失敗：PDF 中文字體（已知技術債）— 截圖留存當前狀態、不阻斷
- [x] 3.4.2 **情境 20（客戶總數 + 上一位時間 input）P2**：
  - API：curl `PUT /api/v1/admin/settings/customer-count` body `{count: 50}` → 預期 200
  - mongosh 確認 `db.systemsettings.totalCustomerCount: 50`
  - UI：Playwright 修改 input、onBlur、截圖 `scenario-admin-20-customer-count.png`
- [x] 3.4.3 **情境 21（系統設定 Tab 0 基本）P2**：
  - UI：Playwright 開 `/admin/settings` Tab 0、逐一測 6 個 switch / input：
    - 辦事狀態 switch → API + mongosh 確認 `isQueueOpen`
    - 下次辦事時間 → API + mongosh 確認 `nextSessionDate`
    - 最大叫號上限 → API + mongosh 確認 `maxOrderIndex`
    - 預估時間 1-120 → API + mongosh 確認 `minutesPerCustomer`
    - 簡化模式 switch → API + mongosh 確認 `simplifiedMode`
    - 公開候位登記 switch → API + mongosh 確認 `publicRegistrationEnabled`
    - 查詢頁號碼顯示 switch → API + mongosh 確認 `showQueueNumberInQuery`
    - 更改密碼 dialog → 開 dialog 但不真改（避免破壞 admin/admin123）
  - 截圖 `scenario-admin-21-settings.png`
- [x] 3.4.4 **情境 22（系統設定 Tab 2 註冊設定）P1**：
  - UI：Playwright 開 `/admin/settings` Tab 2
  - 測 scheduledOpenTime + autoOpenEnabled switch
  - 邊角：未設 nextSessionDate / scheduledOpenTime → 定時開放 switch disabled + warning
  - 截圖 `scenario-admin-22-schedule.png`
- [x] 3.4.5 **情境 23（系統設定 Tab 3 EventBanner）P2**：
  - UI：Playwright 開 `/admin/settings` Tab 3、開 enabled switch、填標題 / 顏色 / URL、預覽
  - API：curl `PUT /admin/settings/event-banner` → 預期 200
  - mongosh 確認寫入
  - 截圖 `scenario-admin-23-banner.png`
- [x] 3.4.6 **情境 24（操作快照備份 + 恢復）P2**：
  - 前置：先做一個會生 snapshot 的操作（如 delete 一筆）
  - UI：Playwright 開 `/admin/system`、看「最近 10 筆快照」、點「恢復」、填 `CONFIRM_RESTORE`、按確認、截圖 `scenario-admin-24-restore.png`
  - mongosh 確認被恢復的記錄回到 waitingrecords
  - 邊角：end-session 不支援恢復 — 截圖確認對應 row「不支援」chip
- [x] 3.4.7 sub-agent #9 跑完 Discord 回報 + 清資料

### 3.5 Sub-agent #10 — 情境 25-30（Google Drive / API Log / 客戶資料庫）

- [x] 3.5.1 **情境 25（Google Drive 備份）P2**：
  - 邊角：dry-run 模式優先測（避免真打 Drive）
  - UI：Playwright 開 `/admin/system`、點「立即備份」、截圖 `scenario-admin-25-gdrive.png`
  - API：curl `POST /api/v1/admin/gdrive-backup` → 預期 200 或 503（若 Drive 認證過期）
  - 邊角：認證過期 → 截圖確認 error alert
- [x] 3.5.2 **情境 26（API Log）P2**：
  - UI：Playwright 開 `/admin/system` API Log 段、看表格、切「僅危險操作」filter、截圖 `scenario-admin-26-logs.png`
  - 邊角：log 太多翻頁、確認 limit=50
- [x] 3.5.3 **情境 27（客戶資料庫列表 + 搜尋）P2**：
  - 前置：先跑情境 15 結束本期讓 Customer 有資料
  - UI：Playwright 開 `/admin/customers`、看列表、輸入「_REGTEST_AGENT08_」搜尋、截圖 `scenario-admin-27-list.png`
  - API：curl `GET /api/v1/customers?search=_REGTEST_AGENT08_` → 預期 200 + 對應筆
  - 邊角：翻頁（10/20/50）
- [x] 3.5.4 **情境 28（客戶詳情頁編輯 + 來訪紀錄）P2**：
  - UI：Playwright 進 `/admin/customers/:id`、看基本資料 + 來訪歷史
  - 點「編輯」、修改農曆生日（驗證民國年 ↔ 西元年轉換、CustomerDetailPage `initEditData` 修法 follow-up #5）、儲存、截圖 `scenario-admin-28-customer-detail.png`
  - mongosh 確認：
    - lunar 民國年存 DB（如 80）
    - gregorianBirth* 被 autoFillDates 重算
    - zodiac 重算
  - 邊角：BirthdayPicker `lunarOnly=true` — 截圖確認無國曆切換
  - 邊角：`birthCalendarType` 永遠 lunar — mongosh 確認該欄位永遠是 'lunar'
- [x] 3.5.5 **情境 29（客戶資料庫新增客戶）P2**：
  - UI：Playwright 進 `/admin/customers/new`、填表、儲存、截圖 `scenario-admin-29-create.png`
  - API：curl `POST /api/v1/customers` → 預期 201
  - mongosh 確認 customer_profiles 有新增
  - 邊角：姓名空白 → 紅 alert「姓名為必填」
- [x] 3.5.6 **情境 30（來訪紀錄 CRUD）P2**：
  - UI：CustomerDetailPage → 點「新增來訪紀錄」、開 VisitFormDialog、填日期 / 主題 / 家人、儲存、截圖 `scenario-admin-30-visit.png`
  - API：curl `POST /api/v1/customers/:id/visits` → 預期 201
  - mongosh 確認 customer_visits 新增 + Customer.totalVisits / firstVisitDate / lastVisitDate 自動更新
  - 邊角：Change B 修法 2 — 新來訪紀錄家人地址完整保存
- [x] 3.5.7 sub-agent #10 跑完 Discord 回報 + 清資料

### 3.6 Sub-agent #11 — 情境 31-36（token 過期 / 並發 / hotfix / 跨情境驗收 / Phase 6.4 / 手機）

- [x] 3.6.1 **情境 31（token 過期）P2**：
  - 前置：登入後手動把 localStorage token 設為過期值 / 改 jwt secret 模擬
  - UI：Playwright 觸發任意 API 操作、看是否跳 `/login` + `from` 存 location.state、截圖 `scenario-admin-31-token-expired.png`
- [x] 3.6.2 **情境 32（並發報名超收）P0**：
  - 前置：mongosh set `maxOrderIndex: 100, issuedCount: 99`
  - 並發測試（Node.js 腳本同時打 2 個 `POST /queue/register`）：
    ```javascript
    const axios = require('axios');
    const reqs = [
      axios.post('https://openqueue-test-backend.zeabur.app/api/v1/queue/register', {name: '_REGTEST_AGENT11_並發A', phone: '0900000001', lunarBirthYear: 80, lunarBirthMonth: 1, lunarBirthDay: 1, addresses: [{address: 'A', addressType: 'home'}], consultationTopics: ['body']}),
      axios.post('https://openqueue-test-backend.zeabur.app/api/v1/queue/register', {name: '_REGTEST_AGENT11_並發B', phone: '0900000002', lunarBirthYear: 80, lunarBirthMonth: 1, lunarBirthDay: 2, addresses: [{address: 'B', addressType: 'home'}], consultationTopics: ['body']})
    ];
    Promise.allSettled(reqs).then(results => console.log(JSON.stringify(results, null, 2)));
    ```
    - 預期：1 個 200 + 1 個 400「本次報名已額滿」（Change A 原子閘門）
  - mongosh 確認：issuedCount 變 100、只有 1 筆新增、絕無超收
  - **這是 Change A 最關鍵的驗收**
- [x] 3.6.3 **情境 33（後台新增後刷新）P1**：已被情境 14 涵蓋、確認情境 14 已驗 onSuccess 自動 refresh
- [x] 3.6.4 **情境 34（結束本期後家人地址保留、Change B 驗收）P1**：已被情境 15 涵蓋、確認情境 15 已驗 VisitRecord familyMembers.address
- [x] 3.6.5 **情境 35（Phase 6.4 阻斷性 bug 觀察）P1**：階段 1.4 已驗、不重複
- [x] 3.6.6 **情境 36（手機 / 平板後台）P2**：
  - UI：Playwright viewport `{width: 768, height: 1024}` (iPad) 登入後台、測拖曳排序、截圖 `scenario-admin-36-mobile.png`
  - 邊角：觸控拖曳延遲 / 失敗 — 記錄是否需 long-press
- [x] 3.6.7 sub-agent #11 跑完 Discord 回報 + 清資料

### 3.7 階段 3 完整回報

- [x] 3.7.1 sub-agent #6-11 全完成後匯總：「36 情境 PASS/FAIL 矩陣」+ 阻斷項目 + 截圖目錄
- [x] 3.7.2 任 1 個 P0 失敗 → 停下、Discord 回報
- [x] 3.7.3 P1 / P2 失敗 → 繼續進階段 4

---

## 4. 階段 4 — 跨情境整合測試（派 2 個 sub-agent 並行）

跨情境測試需要「特定初始狀態」（如「issuedCount=99 / maxOrderIndex=100」才能驗超收邊界）。

每個 sub-agent brief 必含：
- 前置條件（mongosh 預設值 + curl 預先報名等）
- 整合流程逐步驟（含程式 + API + UI）
- 預期 DB 終態（mongosh 查詢確認）
- 失敗處理 / 清資料 / 回報格式

### 4.1 Sub-agent #12 — 整合場景 A、B、C

- [x] 4.1.1 **整合 A：客戶報名 → 管理員看到 → 拖動排序 → 客戶查詢看到新位置 → 結束本期 → 客戶查不到**
  - 前置：mongosh 清 `_REGTEST_*`、重設 SystemSetting
  - 步驟 1（Customer Playwright Context）：報名 3 筆 `_REGTEST_AGENT12_流程1-3`、拿到 queueNumber
  - 步驟 2（Admin Playwright Context）：登入後台、看 dashboard 應有 3 筆
  - 步驟 3（Admin）：拖第 3 筆到第 1 位置、確認 reorder 成功
  - 步驟 4（Customer Playwright Context A）：用「流程3」姓名查詢、確認顯示「orderIndex=1」/ 「前面還有 0 組」
  - 步驟 5（Admin）：點「結束本期」歸檔
  - 步驟 6（Customer）：用「流程1」姓名查詢、應顯示「找不到符合條件的候位記錄」（已歸檔到 Customer / VisitRecord，不在 WaitingRecord）
  - 步驟 7：mongosh 確認 customer_visits 有 3 筆、家人地址完整（Change B）
  - 截圖：`integration-A-step{N}.png` 每步驟
  - 清資料：mongosh 刪 customer_profiles + customer_visits 的 `_REGTEST_AGENT12_*`

- [x] 4.1.2 **整合 B：客戶報名 → 管理員叫號 → Socket 推播 → 客戶查詢頁自動跳號**
  - 前置：mongosh 清 + 重設
  - 步驟 1（Customer）：報名 1 筆 `_REGTEST_AGENT12_即時A`、拿 queueNumber=N
  - 步驟 2（Customer Context A）：開 `/status/N`、等待
  - 步驟 3（Admin Context B）：登入、連續叫號直到 currentQueueNumber 變 N-1
  - 步驟 4（Customer Context A）：等待 10 秒、確認頁面「目前叫號」自動跳到 N-1（Socket 推播）
  - 截圖：`integration-B-before.png` + `integration-B-after.png`
  - Socket fluky 重試 3 次

- [x] 4.1.3 **整合 C：額滿邊界 → 管理員刪除一筆 → 釋出名額 → 客戶下一個能擠進來**
  - 前置：mongosh `maxOrderIndex: 5, issuedCount: 0`、清測試資料
  - 步驟 1：報 5 筆 `_REGTEST_AGENT12_額滿1-5`、確認 issuedCount=5
  - 步驟 2：第 6 個客戶嘗試報名 → 預期 400「本次報名已額滿」（Change A 閘門）
  - 步驟 3（Admin）：刪除「額滿3」那筆（情境 13）
  - 步驟 4：mongosh 確認 issuedCount=4（$inc -1 釋出）
  - 步驟 5：第 6 個客戶（`_REGTEST_AGENT12_額滿6`）重試報名 → 預期 200 成功
  - 步驟 6：mongosh 確認 issuedCount=5、有 5 筆 active 記錄
  - 截圖：`integration-C-fullness.png`

- [x] 4.1.4 sub-agent #12 跑完 Discord 回報 + 清資料

### 4.2 Sub-agent #13 — 整合場景 D、E

- [x] 4.2.1 **整合 D：誤觸清除所有候位 → 從快照恢復**
  - 前置：mongosh 清 + 重設
  - 步驟 1：報 3 筆 `_REGTEST_AGENT13_救援1-3`
  - 步驟 2（Admin）：點「清除所有候位」、confirmDialog 按確定
  - 步驟 3：mongosh 確認 waitingrecords 那 3 筆消失、`backup_snapshots` 應有對應 snapshot
  - 步驟 4（Admin）：開 `/admin/system`、找到 snapshot、點「恢復」、填 CONFIRM_RESTORE
  - 步驟 5：mongosh 確認 waitingrecords 那 3 筆回來
  - 截圖：`integration-D-recovery.png`

- [x] 4.2.2 **整合 E：取消候位後恢復、整列順序正確、不撞 partial unique index**
  - 前置：mongosh 清 + 重設
  - 步驟 1：報 5 筆 `_REGTEST_AGENT13_恢復1-5`
  - 步驟 2：取消 `恢復3` → mongosh 確認該筆 status=cancelled, orderIndex=null
  - 步驟 3：再報 1 筆 `_REGTEST_AGENT13_恢復6` → mongosh 確認 orderIndex=5（原子分配）
  - 步驟 4：恢復 `恢復3` → mongosh 確認該筆 orderIndex=6 + 整列 1-6 連續無撞號
  - 步驟 5：嘗試造撞號（mongosh 手動 set 兩筆同 orderIndex）→ 應撞 partial unique index、E11000
  - 截圖：`integration-E-collision.png`
  - 後置：mongosh 修復撞號（drop 撞號筆其中一筆 orderIndex 或 dropIndex 後重建）

- [x] 4.2.3 sub-agent #13 跑完 Discord 回報 + 清資料

### 4.3 階段 4 完整回報

- [x] 4.3.1 sub-agent #12-13 全完成後匯總：「5 個整合場景 PASS/FAIL」+ 截圖
- [x] 4.3.2 任 1 個整合場景失敗 → P0 等級、Discord 回報、停下等懷特

---

## 5. 階段 5 — 報告匯總（派 1 個 sub-agent #14 專責）

### 5.1 環境復原

- [x] 5.1.1 mongosh 全清 `_REGTEST_*` 殘留（waitingrecords / customer_profiles / customer_visits / backup_snapshots `metadata.testTag` if any）
- [x] 5.1.2 mongosh 把 SystemSetting 復原到階段 1.3.3 記錄的 baseline 值
- [x] 5.1.3 確認測試環境回到「乾淨可用狀態」（curl `/queue/status` 看欄位正常）

### 5.2 完整匯總報告（推 CC + Discord）

- [x] 5.2.1 sub-agent #14 拉所有階段 1-4 的 Discord 回報訊息、彙整成完整 markdown 報告：
  - 標題：「修玄宮候位系統測試版本完整情境回歸測試報告 2026-05-24」
  - 62 情境 PASS/FAIL 矩陣（含優先級欄、失敗原因摘要欄）
  - 5 個整合場景 PASS/FAIL
  - 阻斷項目 list（P0 失敗清單）
  - 修補建議（按優先級）
  - 「是否可同步正式環境的判斷」（**P0 全綠 + P1 失敗 ≤ 3 個 + 0 個整合場景失敗 → 建議可同步**；否則「需先修補再驗證」）
- [x] 5.2.2 用 dash-push 推 CC 給懷特：
  - `dash-push doc xiuxuangong full-regression-test-report-2026-05-24 /tmp/regression-test-report.md "修玄宮 62 情境完整回歸測試報告" report final`
- [x] 5.2.3 截圖目錄打包：`tar czf /tmp/regression-test-screenshots.tar.gz /tmp/regression-test-screenshots/` 推 CC 附件
- [x] 5.2.4 Discord 給懷特最終回報（含 CC URL + 阻斷項目 + 同步建議）

### 5.3 階段 5 收尾

- [x] 5.3.1 標記本 OpenSpec 為 done、archive 入 `openspec/changes/archive/2026-05-24-full-scenario-regression-test/`（懷特 5/24 後續執行階段完成後另派 sub-agent 做 archive）
- [x] 5.3.2 留底「下一步建議」：
  - 若全綠 → 開新 OpenSpec「正式環境同步」
  - 若有阻斷 → 開新 OpenSpec 對應修補
  - 若新發現 bug → 對應開新 OpenSpec
