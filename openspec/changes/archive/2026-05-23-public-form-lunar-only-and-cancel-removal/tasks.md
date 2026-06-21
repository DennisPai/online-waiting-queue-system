## 1. Phase 1 — 前置確認 + 設計裁示

- [x] 1.1 確認後台 dashboard 「登記候位」對話框用什麼元件（grep `AdminDashboardPage` 內 register 對話框結構）
  - 若是前台 RegisterForm 共用：Phase 2 給 RegisterForm 統一改 lunar-only，前/後台都自動 lunar-only
  - 若是另一元件：本 Change 額外加 Phase 2 補修
- [x] 1.2 確認後台 CustomerDetailDialog 內主客戶 + 家人生日 UI 修改範圍（v2 反饋：後台也要 lunar-only）
- [x] 1.3 grep `calendarType` `gregorianBirth` `lunarBirth` 確認所有相關位置

## 2. Phase 2 — BirthdayPicker + 全系統表單改 lunar-only

### 2.1 BirthdayPicker 加 lunarOnly 屬性參數
- [x] 2.1.1 `frontend/src/components/shared/BirthdayPicker.jsx` 加屬性參數 `lunarOnly = true`（default true 全系統 lunar-only）
- [x] 2.1.2 `lunarOnly=true` 時：
  - 強制 `calendarType='lunar'`（不論外部傳什麼 calendarType 屬性參數）
  - 隱藏「國曆/農曆」切換按鈕組（line 80 段）
  - 閏月勾選框仍顯示（line 132 段沿用）
  - onChange 永遠帶 `calendarType: 'lunar'`
- [x] 2.1.3 注意 `lunarOnly=false` 行為 100% 不變（雙模式邏輯保留，留作未來彈性）

### 2.2 FamilySection 套 lunar-only
- [x] 2.2.1 `frontend/src/components/registration/FamilySection.jsx:124-130` BirthdayPicker 不傳 `lunarOnly` 即自動 default true（已 lunar-only）
- [x] 2.2.2 移除 family member object 內 `calendarType: 'gregorian'` 預設（line 313, 432 等）改 `'lunar'`

### 2.3 RegisterForm 主客戶段改用 BirthdayPicker
- [x] 2.3.1 把 RegisterForm 主客戶段的自家「生日 input + 曆法切換 UI」（line ~227-292 範圍）改用 `<BirthdayPicker ... />`（不傳 lunarOnly 即 default true）
- [x] 2.3.2 RegisterForm.jsx:53 default `calendarType: 'gregorian'` → `'lunar'`
- [x] 2.3.3 處理 onChange 回呼：BirthdayPicker 回的 `{year, month, day, isLeapMonth, calendarType}` 對應到 formData 的 `lunarBirthYear / lunarBirthMonth / lunarBirthDay / lunarIsLeapMonth`
- [x] 2.3.4 提交流程：拿掉 calendarType='gregorian' 分支（line 492+506+529 + family member line 339+529+544 都是 gregorian/lunar 分流）— 全改成 lunar-only 路徑
- [x] 2.3.5 表單驗證：必填驗證改檢 lunarBirth* 而不是 calendarType-based

### 2.4 後台 CustomerDetailDialog 也改 lunar-only（v2 反饋新加）
- [x] 2.4.1 `frontend/src/components/admin/CustomerDetailDialog.jsx:620` 家人 BirthdayPicker 不傳 lunarOnly 即自動 default true
- [x] 2.4.2 同檔 line 460+480 主客戶 BirthdayPicker（如有）也不傳 lunarOnly
- [x] 2.4.3 同檔內 `familyBirthCalendarTypes` 狀態（line 620）改成永遠 'lunar' 或移除（因永遠 lunar）
- [x] 2.4.4 同檔內 onChange 對應的 calendarType=='gregorian' 分支（line 468/484）可保留作不破壞（lunarOnly 下永遠走 lunar 分支）

### 2.5 後台 dashboard register 對話框（依 Phase 1.1 裁示）
- [x] 2.5.1 若是共用 RegisterForm → Phase 2.3 已自動 lunar-only
- [x] 2.5.2 若是獨立元件 → 額外加 BirthdayPicker default lunar-only

## 3. Phase 3 — StatusPage 移除「取消預約」UI + 死碼

- [x] 3.1 `frontend/src/pages/StatusPage.jsx:749-757` 移除「取消預約」按鈕的 JSX
- [x] 3.2 移除 `handleCancelQueue` 函式（line 119-126）
- [x] 3.3 移除 `confirmCancelQueue` 函式（line 128-167）
- [x] 3.4 移除 `CancelIcon` import（若沒別處用 — grep 確認）
- [x] 3.5 移除 `confirmDialog` 狀態 + 相關 setConfirmDialog（若沒別處用 — grep 確認）
- [x] 3.6 移除 ConfirmDialog 元件 render（若它只給 cancel 用）
- [x] 3.7 grep 確認沒死碼引用

## 4. Phase 4 — 單元測試 + 程式層驗證

### 4.1 單元測試
- [x] 4.1.1 `frontend/src/components/shared/BirthdayPicker.test.jsx` 新檔（或加進既有 jsx 測試檔）：
  - default lunarOnly=true 時切換按鈕組不 render
  - lunarOnly=true 時 calendarType 強制 lunar、即使外部傳 gregorian
  - lunarOnly=true 時閏月勾選框仍 render
  - 顯式傳 `lunarOnly={false}` 時行為 100% 不變（保留彈性）
- [x] 4.1.2 backend `tests/queue.service.test.js` 加：前台 register 只帶 lunarBirth*、autoFillDates 補 gregorianBirth* 後 DB 兩種都有
- [x] 4.1.3 全部測試跑通（baseline 130 + 新增 ≥ 4，0 不破壞既有）

### 4.2 程式層驗證
- [x] 4.2.1 BirthdayPicker lunarOnly=true 時 onChange 回呼出來的物件永遠帶 `calendarType: 'lunar'`（不會在某個 path 漏帶或變 gregorian）
- [x] 4.2.2 StatusPage import / 狀態 / 函式都沒死碼引用（lint 或 grep 驗）
- [x] 4.2.3 前端 `CI=true npm run build` 過（無 ESLint 警告 + 無 unused var）

## 5. Phase 5 — 程式碼審閱

### 5.1 自我審閱檢查清單
- [x] 5.1.1 lunarOnly default 改成 true 後，所有 BirthdayPicker 呼叫者（前/後台 5 個位置）行為都是 lunar-only（grep 確認）
- [x] 5.1.2 RegisterForm 主客戶段重構用 BirthdayPicker 後，提交結構正確（grep `lunarBirth` `submitData` 流程）
- [x] 5.1.3 StatusPage 死碼清乾淨（grep `handleCancelQueue` `confirmCancelQueue` `CancelIcon` 確認 0 引用）
- [x] 5.1.4 後台 CustomerDetailDialog lunar-only 改完仍可正常編輯（不破壞家人新增 / 主客戶修改流程，套 Change B 的 family address 修法不被破壞）
- [x] 5.1.5 backend autoFillDates 不動（grep 確認，schema/util 不在本 Change 範圍）

### 5.2 派 sub-agent 獨立審閱
- [x] 5.2.1 派 Opus 4.7 sub-agent 看：是否真解決「全系統只填農曆」需求？是否有遺漏 code path / 副作用 / 不破壞既有風險？StatusPage 改動有沒有把該保留的功能誤刪？後台 lunar-only 是否真套到 CustomerDetailDialog 全部位置？
- [x] 5.2.2 阻斷項目回 Phase 1-3 修；NICE-TO-HAVE 評估納入 / 留 follow-up

## 6. Phase 6 — Local 跑 + 部署

- [x] 6.1 Local `npm test` 全綠（backend 130 + frontend test 若新增 ≥ 4）
- [x] 6.2 Local frontend `CI=true npm run build` 過
- [x] 6.3 commit + push 測試 repo `open-queue-test`
- [x] 6.4 push 後**5 分鐘內主動查** Zeabur 部署 commit 是否到位，沒到位主動 `redeployService`（[[feedback_zeabur_push_active_check]]）
- [x] 6.5 polling 用 timeout + FAILED 偵測（同 feedback memory）

## 7. Phase 7 — 實機驗證（API + 程式層 + 程式碼審閱之外，含實機 UI 操作）

### 7.1 API 類驗證（我 curl）

- [x] 7.1.A1 前台 `POST /queue/register` 只帶 lunarBirth* + 家人各自只帶 lunarBirth*（不帶 gregorianBirth*）→ 200 + DB 確認 gregorianBirth* 被 autoFillDates 自動補
- [x] 7.1.A2 含閏月邊角案例（如 2025 閏 6 月某日）→ DB lunarIsLeapMonth=true + gregorianBirth* 補正確
- [x] 7.1.A3 前台 `POST /queue/register` 帶 lunarBirth* 缺漏（缺 day）→ 400 friendly 錯誤
- [x] 7.1.A4 後端 cancelQueueByCustomer 接口**仍可呼叫**（Change A `_id` 驗證生效）→ 確認 Change C 沒誤改接口

### 7.2 UI 類驗證 — 前台 register lunar-only（我用 Playwright）

- [x] 7.2.B1 Playwright 跑前台 `/register` 頁，截圖確認**看不到「國曆/農曆」切換**
- [x] 7.2.B2 截圖確認**閏月勾選框仍顯示**
- [x] 7.2.B3 用 Playwright 填農曆生日 + 主客戶資料 + 1 家人含農曆生日 → 點送出 → 跳轉到 StatusPage
- [x] 7.2.B4 我 curl DB 確認 lunarBirth* + gregorianBirth* 兩者都到位

### 7.3 UI 類驗證 — StatusPage 取消按鈕消失（我用 Playwright）

- [x] 7.3.C1 Playwright 訪問 StatusPage（用 7.2.B3 報名的客戶查詢）
- [x] 7.3.C2 在「候位狀態」對話框 actions 段截圖確認**「取消預約」按鈕不存在**
- [x] 7.3.C3 截圖確認其他按鈕（「關閉」等）仍正常
- [x] 7.3.C4 console error / pageerror 應 0

### 7.4 後台 lunar-only forward 驗證（v2 反饋新加；我用 Playwright）

- [x] 7.4.D1 Playwright 跑後台 dashboard 「編輯」現有客戶（陳昱充）→ 開對話框進編輯模式 → **截圖確認主客戶 + 家人生日 UI 都看不到「國曆/農曆」切換**（lunar-only 已套到後台）
- [x] 7.4.D2 點開家人 1 Accordion 看 BirthdayPicker 也是 lunar-only
- [x] 7.4.D3 若後台 register 對話框共用 RegisterForm（Phase 1.1 確認）：Playwright 跑後台 register 對話框 → 看是否也是 lunar-only（不可切換）

### 7.5 Change A + Change B 不破壞既有驗證（我 curl）

- [x] 7.5.E1 取消候位接口仍可被 admin 呼叫（PUT /admin/queue/:id/status status=cancelled）→ 觸發 ensureOrderIndexConsistency 壓回連續
- [x] 7.5.E2 family member address 寫入仍正確（前台帶家人地址送出後 DB 確認）
- [x] 7.5.E3 issuedCount / orderIndex 1..N 連續

### 7.6 完整驗收報告 → Discord 推給懷特

- [x] 7.6 寫 Phase 7 驗收報告（含截圖 + DB raw + 各項 PASS/FAIL），Discord reply 完整匯總

## 8. Phase 8 — 完整收尾

- [x] 8.1 push 進測試 repo（open-queue-test），等懷特 OK 後再 patch 到正式 repo（online-waiting-queue-system）
- [x] 8.2 follow-up（不在本 Change 範圍）：
  - 邊角案例農曆閏月轉換精度問題（若 Phase 7.1.A2 發現有 bug）
  - 客戶想取消的營運處理 SOP（業務層、不是技術）
  - 後台管理員「客戶報國曆生日要先換算成農曆才能填」的訓練 SOP（業務層）
