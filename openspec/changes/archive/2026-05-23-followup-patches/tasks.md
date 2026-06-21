## 1. 階段 1 — 前置確認

- [x] 1.1 grep `currentProcessingNumber` `maxOrderIndex` 在 frontend 全部出現位置，定位需要補 fallback 的 redux store + selector
- [x] 1.2 grep `cancelQueueByCustomer` 確認 controller 回傳 record 的 path、看其他 controller 是否也有同 mongoose 內部噴出問題
- [x] 1.3 grep `validateRequiredFields` 看既有 required 陣列定義 + 簡化模式 skip 邏輯
- [x] 1.4 grep `lunarToGregorian` 所有呼叫位置（修接受民國年後要看哪些呼叫端要更新）
- [x] 1.5 grep `autoFillDates` 所有呼叫位置 + 看 Change C v3 留下的「淺拷貝」實作
- [x] 1.6 grep `出生日期` `BirthdayPicker` 確認標題改名範圍

## 2. 階段 2 — 修法 #1 前端 pageerror 補 fallback

- [x] 2.1 `frontend/src/redux/slices/queueSlice.js`（或對應 store）的 initial state 加 `queueStatus: { currentProcessingNumber: 0, maxOrderIndex: 100, ... }` 完整 default
- [x] 2.2 `getQueueStatus` reducer 若有 partial response merge、確保所有欄位都不會 undefined
- [x] 2.3 跑前端瀏覽器（或 Playwright）看 console 不再噴 pageerror

## 3. 階段 3 — 修法 #2 cancel response 加 toJSON

- [x] 3.1 `backend/src/controllers/queue.controller.js:cancelQueueByCustomer` 的 `res.json(...)` 把 record 改成 `record.toObject()` 或設定 schema toJSON transform
- [x] 3.2 確認其他 admin cancel path（updateQueueStatus）若有同問題也順手修
- [x] 3.3 curl 取消候位確認 response 不含 `$__` `_doc` `activePaths` 等內部欄位

## 4. 階段 4 — 修法 #3 lunar 必填驗證

### 4.1 後端
- [x] 4.1.1 `backend/src/services/QueueService.js:validateRequiredFields` 把 `required` 陣列加入 `lunarBirthYear` `lunarBirthMonth` `lunarBirthDay`
- [x] 4.1.2 簡化模式仍 skip（沿用既有 line 37-39 `if (!settings.simplifiedMode)` 邏輯）
- [x] 4.1.3 錯誤訊息友善：lunar 缺欄位回「請輸入農曆生日年/月/日」之類中文

### 4.2 前端
- [x] 4.2.1 `frontend/src/hooks/useRegistrationForm.js` 的 form validation 對應加 lunar 必填提示
- [x] 4.2.2 `frontend/src/components/RegisterForm.jsx` 完整模式驗證對齊
- [x] 4.2.3 後台 CustomerCreatePage / CustomerDetailPage / CustomerDetailDialog 對齊
- [x] 4.2.4 簡化模式仍 skip（前端對應）

## 5. 階段 5 — 修法 #5 lunarToGregorian 接受民國年 + autoFillDates 恢復 + 前端 UI 標題改

### 5.1 後端 calendarConverter.js
- [x] 5.1.1 `lunarToGregorian` 改成接受**民國年**輸入（內部 `+1911` 轉西元再用 lunar-javascript 算）
- [x] 5.1.2 函式 doc 明示「接受民國年輸入、回西元年輸出」
- [x] 5.1.3 `autoFillDates` **恢復**「農曆→國曆 反推」邏輯：呼叫修好的 lunarToGregorian 民國年版
- [x] 5.1.4 **移除**「國曆→農曆 反推」邏輯（前端不再有國曆輸入入口）
- [x] 5.1.5 `gregorianToLunar` 保持接受西元年（給未來 admin 工具用、不對稱但對應 use case）
- [x] 5.1.6 grep 所有 lunarToGregorian 呼叫位置確認都更新成民國年輸入

### 5.2 前端 BirthdayPicker UI 標題 + 備註
- [x] 5.2.1 `frontend/src/components/shared/BirthdayPicker.jsx` 內部加 default 標題「農曆生日」（或加 prop `title` default = "農曆生日"）
- [x] 5.2.2 加 helper text 小字「請先自行查好農曆生日」（淺色 / FormHelperText）
- [x] 5.2.3 5 處呼叫位置（前台 BasicInfoSection / FamilySection / RegisterForm / 後台 CustomerDetailDialog 主+家 / CustomerCreatePage / CustomerDetailPage）確認標題顯示一致

## 6. 階段 6 — 單元測試 + 程式層驗證

### 6.1 backend test
- [x] 6.1.1 `backend/tests/calendar-converter-lunar-to-gregorian.test.js` **改寫**（Change C v3 sub-agent 之前寫的 4 個 case 要對應新行為）：
  - lunarToGregorian 接受民國年（民國 80 + 1991 期望 / 民國 109 閏月 + 2020 期望）
  - autoFillDates 恢復農曆→國曆反推（送 lunarBirthYear: 80/1/15 → gregorianBirth* 補對應西元值）
  - 不再有國曆→農曆反推（送 gregorianBirth → lunarBirth* 不被自動補）
- [x] 6.1.2 `backend/tests/queue.service.test.js` 加 lunar 必填驗證 test case（非簡化模式缺 lunarBirth* 回 400）
- [x] 6.1.3 `backend/tests/queue.service.test.js` 加 cancel response 不含 mongoose 內部 test case
- [x] 6.1.4 全部 backend test 跑通（baseline 142 + 新加 ≥ 6，0 不破壞既有）

### 6.2 frontend test
- [x] 6.2.1 `frontend/src/components/shared/BirthdayPicker.test.jsx` 加 test case：default 標題顯示「農曆生日」+ helper text 顯示「請先自行查好農曆生日」
- [x] 6.2.2 全部 frontend test 跑通（baseline 4 + 新加 ≥ 2）

### 6.3 程式層驗證
- [x] 6.3.1 frontend `CI=true npm run build` 過、無 ESLint warning
- [x] 6.3.2 grep 確認 `lunarToGregorian` 全部呼叫端傳民國年（沒漏改）
- [x] 6.3.3 grep 確認 `autoFillDates` 內部恢復農曆→國曆反推

## 7. 階段 7 — 程式碼審閱

### 7.1 自我審閱檢查清單
- [x] 7.1.1 #1 前端 store fallback 補全、無 selector 漏讀 undefined
- [x] 7.1.2 #2 cancel response 真的不含 mongoose 內部
- [x] 7.1.3 #3 lunar 必填在非簡化模式擋下、簡化模式仍 skip
- [x] 7.1.4 #5 lunarToGregorian 接受民國年、autoFillDates 反推對、前端標題改名一致
- [x] 7.1.5 沒誤改 Change A/B/C 既有功能（grep + test 雙保險）

### 7.2 派 sub-agent 獨立審閱（懷特 5/23 嚴令：實作 ≠ 驗證 sub-agent）
- [x] 7.2.1 派**獨立** Opus 4.7 sub-agent 看 4 件改動 + brief 含完整 OpenSpec 路徑
- [x] 7.2.2 阻斷項目回階段 2-5 修；NICE-TO-HAVE 評估納入 / 留 follow-up

## 8. 階段 8 — Local 跑 + 部署

- [x] 8.1 Local `npm test` 全綠（backend 148+ / frontend 6+）
- [x] 8.2 Local frontend `CI=true npm run build` 過
- [x] 8.3 commit + push 測試 repo `open-queue-test`
- [x] 8.4 push 後 5 分鐘內主動查 Zeabur 部署 commit 是否到位、沒到位主動 `redeployService`（[[feedback_zeabur_push_active_check]]）
- [x] 8.5 polling 用 timeout + FAILED 偵測

## 9. 階段 9 — 實機驗證（含程式驗證 + 實機操作驗證，懷特 5/23 嚴令）

派**獨立 QA sub-agent**（fresh agent、不是實作 agent）做全部驗證。

### 9.1 API 類驗證（sub-agent curl）

- [x] 9.1.A1 報名只填 lunar 三欄位 → 200 + DB lunarBirth 對 + **gregorianBirth 被 autoFillDates 自動補對**（不再 null / 不再 80/1/1）
  - 例 lunarBirthYear=80 lunarBirthMonth=1 lunarBirthDay=15 → gregorianBirthYear=西元對應值（民國 80 = 西元 1991）
- [x] 9.1.A2 含閏月（民國 109 閏 4 月 15）→ gregorianBirth 補對應西元值
- [x] 9.1.A3 非簡化模式缺 lunarBirthDay → 回 400 friendly error（lunar 必填驗證生效）
- [x] 9.1.A4 簡化模式缺 lunar → 仍 200 success（簡化模式 skip 驗證、行為不變）
- [x] 9.1.A5 取消候位 → response 不含 `$__` `_doc` 等 mongoose 內部欄位
- [x] 9.1.A6 admin 修改既有客戶資料按儲存 → gregorianBirth 自動更新成對應值

### 9.2 UI 類驗證 — 前台 register（sub-agent 用 Playwright）

- [x] 9.2.B1 訪問 `/register` 截圖看到**「農曆生日」標題**（不是「出生日期」）
- [x] 9.2.B2 截圖看到備註小字「**請先自行查好農曆生日**」
- [x] 9.2.B3 開瀏覽器 console 看**不再噴 pageerror**「currentProcessingNumber undefined」「maxOrderIndex undefined」
- [x] 9.2.B4 Playwright 填農曆生日 + 主客戶 + 送出 → 跳到 StatusPage

### 9.3 UI 類驗證 — 後台（sub-agent 用 Playwright）

- [x] 9.3.C1 後台 CustomerDetailDialog edit mode 看到「農曆生日」標題 + 備註
- [x] 9.3.C2 後台 dashboard「登記候位」對話框看到「農曆生日」標題 + 備註
- [x] 9.3.C3 修改既有客戶生日按儲存 → 我 curl DB 驗 gregorianBirth 被自動更新

### 9.4 不破壞既有驗證（sub-agent curl）

- [x] 9.4.D1 Change A：active 列表連續、cancel 後壓回連續
- [x] 9.4.D2 Change B：報名帶家人地址 → DB 家人地址正確
- [x] 9.4.D3 Change C lunar-only UI：前台 register 仍看不到國曆/農曆切換、StatusPage 仍無取消按鈕

### 9.5 完整匯總

- [x] 9.5 寫實機驗證報告（含 PASS/FAIL + 截圖 + DB raw），Discord reply 完整匯總給懷特

## 10. 階段 10 — 完整收尾

- [x] 10.1 push 進測試 repo（open-queue-test），等懷特 OK 後再 patch 到正式 repo（online-waiting-queue-system）
- [x] 10.2 寫進 Change A/B/C 完整收尾報告 — 整個一系列修玄宮 OpenSpec 完成
