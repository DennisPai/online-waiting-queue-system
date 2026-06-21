## 背景

Change A / B / C 三個 OpenSpec 跑完累積 4 個 follow-up，本 Change 把它們合成一個 mini-patch commit 處理。

修法 #5 是 v3 設計反轉（之前我刪掉 autoFillDates 轉換邏輯、懷特實際要保留），要把 v3 部分 rollback 並修對民國年混淆 bug。

## 主要決策

### D1：#1 前端 pageerror — 補 store fallback 而非 selector 端防禦

**選項**：
- A. redux store 初始 state 加 `currentProcessingNumber: 0` / `maxOrderIndex: 100` ✓（採用）
- B. 各 selector 加 `?? 0` 防禦
- C. 後端 `/queue/status` API 永遠回完整欄位（schema 補 default）

**為何選 A**：
- 一處改、所有 selector 自動受惠（B 要改多處、易漏）
- 跟 store 設計慣例一致（init state 必含完整 default）
- 不影響後端 API contract

### D2：#2 cancelQueueByCustomer 加 toJSON

**選項**：
- A. `res.json(record.toObject())` ✓（採用）
- B. `res.json({ id, status, ... })` 顯式挑欄位

**為何選 A**：
- 改動最小（一行）
- mongoose toObject 預設行為已知乾淨（不含 internal state）
- 跟其他 controller 慣用法一致

### D3：#3 lunar 必填驗證 — 沿用既有 validateRequiredFields 加欄位

**為何**：
- 既有 `validateRequiredFields(data)` 已有「簡化模式 skip」邏輯（line 37-39 `if (!settings.simplifiedMode)`）
- 加 lunar 三欄位進 `required` 陣列即可自動套到非簡化模式
- 簡化模式仍 skip（保持既有行為，懷特沒要求簡化模式也必填）

### D4：#5 lunarToGregorian 改接受民國年（而非西元年）

**選項**：
- A. lunarToGregorian 改接受民國年、內部 +1911 ✓（採用）
- B. lunarToGregorian 保持接受西元年、autoFillDates 內呼叫時先 +1911 轉

**為何選 A**：
- 跟全系統「資料只用民國年」精神一致
- 呼叫者不需要每次自己換算
- 函式單一職責：「民國農曆生日 → 西元國曆日期」
- 函式 doc 註解明示「接受民國年輸入、回西元年輸出」（單一語意、不混淆）

**保留 gregorianToLunar 接受西元年**（給未來 admin 工具用，輸入是西元年、輸出農曆民國年）— 兩個函式語意不對稱但對應實際 use case

### D5：autoFillDates 簡化成單向（農曆→國曆）

**之前 v3 設計（要 rollback 一部分）**：autoFillDates 退化成淺拷貝、雙向都不做
**新設計**：
- 「農曆→國曆」**恢復**（呼叫修好的 lunarToGregorian 民國年版）
- 「國曆→農曆」**移除**（前端不再有國曆輸入入口、不需要這方向）
- 觸發時機沿用既有：register / admin updateQueueData / CustomerCreatePage / CustomerDetailPage 都已呼叫

### D6：前端 BirthdayPicker 標題在哪改

**選項**：
- A. 改 BirthdayPicker 內部 default 標題 ✓（採用）
- B. 各呼叫者各自傳 title prop

**為何選 A**：
- 全系統 5 處統一改、不漏
- BirthdayPicker 本來就是 lunar-only（default lunarOnly=true）、預設標題改「農曆生日」對應一致
- 「請先自行查好農曆生日」備註小字也統一在元件內 render（淺色 helper text）

### D7：使用者永遠無法手動編輯國曆 — UI 不開國曆編輯入口

**懷特 5/23 明確指示**：「沒辦法手動編輯或輸入國曆生日」

- 前端不顯示國曆 input（v3 已達成）
- 後台 admin 也不開（v3 後台 CustomerDetailDialog 也是 lunar-only）
- 既有 read-only 顯示舊客戶國曆（StatusPage 詳情）：**修法 #5 修完後**新報名國曆會被自動補對的值、舊國曆 80/1/1 會在下次儲存時被覆蓋

## 風險 / 注意事項

### 風險

1. **修 lunarToGregorian 改接受民國年的兼容性**
   - 目前 codebase 內所有呼叫者：autoFillDates、可能還有別處
   - 修完要 grep 確認所有呼叫端都更新成民國年
   - 若有 admin 工具或其他流程呼叫過 lunarToGregorian 並傳西元年 → 會壞

2. **autoFillDates 恢復後對既有測試的影響**
   - Change C v3 sub-agent 加的 calendar-converter-lunar-to-gregorian.test.js 寫了「v3 不反推」的 assertion → 改回反推後這些 test 會 fail
   - 要改 test 對應新行為（恢復反推）

3. **lunar 必填驗證對既有測試環境流程的影響**
   - 測試環境簡化模式 = true、不會被擋
   - 非簡化模式（prod 一般用）才會擋下缺 lunar 請求
   - 但前端 form validation 也要對齊更新（避免 UI 沒擋下又送出被 400）

### 注意事項

- 前端標題改名要看實際 BirthdayPicker UI 結構（Title 元件位置、HelperText 元件用法）
- 修法 #5 後跑 Change C v3 階段 7.1 重驗、確認 gregorianBirth 真的被自動補對（不是 80/1/1、不是 null）
- 簡化模式仍要可用（Change A `/admin/dev/restore-waiting-records` 之類 admin endpoint 也仍可用）
