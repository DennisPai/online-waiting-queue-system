## 為什麼要做

懷特 5/22 給的兩個 Change C 需求：

1. **全系統生日輸入改成只填農曆**：當前主客戶 + 家人生日輸入都允許「國曆 / 農曆」二選一切換 → 對宮廟客戶（多以農曆計算命理）不直覺、輸入錯曆法常見。改成**全系統（前台 + 後台）只能填農曆**（後端 autoFillDates 已支援農曆→國曆自動轉換），減少輸入錯誤
2. **客戶查詢候位移除「取消候位」按鈕**：StatusPage 客戶查詢頁的「取消預約」按鈕容易被誤點導致客戶意外取消候位 → 改成「取消需透過後台管理員操作」（後端取消候位接口因 Change A 已加身分驗證，但前台 UI 入口直接移除避免誤點）

> 註：Change A 修法保留取消候位接口本身的安全性（`_id` 定位 + 姓名電話比對），Change C 只移除前台 UI 入口、不動接口。

## 要改什麼

### 修法 1：全系統 BirthdayPicker / 報名表單改成「只能填農曆」

**共用元件（BirthdayPicker）**：
- `frontend/src/components/shared/BirthdayPicker.jsx` 加 `lunarOnly` 屬性參數（default `true`，因全系統都用 lunar-only）
- `lunarOnly=true` 時：隱藏「國曆 / 農曆」切換按鈕組、強制 `calendarType='lunar'`、顯示閏月勾選框
- 後台 CustomerDetailDialog + 前台 FamilySection 都直接用 default `lunarOnly=true`（不傳即可）

**主客戶段（前台 RegisterForm）**：
- `RegisterForm.jsx:53` default `calendarType: 'gregorian'` → `'lunar'`
- 主客戶生日 UI 把「國曆/農曆」切換按鈕拿掉、固定顯示「農曆 + 閏月」（最好的方式是改用 BirthdayPicker 元件統一）
- 後端提交流程：主客戶生日改用 `lunarBirthYear/Month/Day/IsLeapMonth`，後端 autoFillDates 已支援農曆→國曆自動補（calendarConverter.js line 134-138），不用改

**後台 CustomerDetailDialog 也改 lunar-only（v2 加入，懷特 5/23 反饋）**：
- 之前 v1 設計「後台保留雙模式」是錯的
- 改成全系統都只能填農曆、由系統每次自動轉成國曆寫進國曆生日欄位
- CustomerDetailDialog 內主客戶 + 家人生日 UI 都套 lunar-only（移除切換按鈕）

**後台 dashboard「登記候位」對話框**：
- Phase 1 確認該對話框用什麼元件，若也用 RegisterForm 或 BirthdayPicker → 自動套用 lunar-only（因 default 改為 true）

### 修法 2：StatusPage 移除「取消預約」按鈕

- `frontend/src/pages/StatusPage.jsx:749-757` 移除「取消預約」按鈕的 JSX
- `frontend/src/pages/StatusPage.jsx:119-167` 移除 `handleCancelQueue` / `confirmCancelQueue` 死碼（兩個函式從此沒人呼叫）
- 順手移除上方相關 `CancelIcon` import（若沒別處用）
- `confirmDialog` 狀態若沒別處用也順手清

### 後端不改

- `backend/src/utils/calendarConverter.js` autoFillDates 已支援雙向（line 119 國曆→農曆、line 134 農曆→國曆）— 前台只送農曆 → 後端自動補國曆
- `backend/src/controllers/queue.controller.js` cancelQueueByCustomer 接口保留（Change A 已加身分驗證），管理員仍可走取消候位；只是前台 UI 不再有入口

### 完整端對端驗證（Phase 7）

依懷特 5/23 指令：API + 程式層 + 程式碼審閱 + 實機 UI 全跑（懷特 Change B 之後讓我用 Playwright 跑 UI）：
- **API 類**：curl 前台 register 只帶 lunarBirth* → 資料庫確認 gregorianBirth* 被 autoFillDates 自動補
- **程式層**：jest 測試驗 BirthdayPicker lunarOnly 屬性參數行為 + RegisterForm 提交結構
- **程式碼審閱**：派 sub-agent 獨立審閱
- **UI 類**：Playwright 跑前台 register 看不到國曆切換、StatusPage 看不到取消按鈕、後台 CustomerDetailDialog 也看不到國曆切換（v2 新增驗證）

## 不在 Change C 範圍（明確排除）

- **後端取消候位接口本身不動**：Change A 已加 `_id` + 姓名電話驗證，管理員仍可呼叫
- **歷史已存的客戶 / 候位紀錄**：若已有國曆生日資料，讀取行為不受影響（只影響「新報名輸入」介面）
- **農曆閏月勾選框**：保留（lunar-only 時更需要）
- **後端 autoFillDates 轉換邏輯本身不動**（雙向轉換已存在）

## 懷特 5/23 反饋處理（v2 → v3 變更）

- v2 改：原「後台保留雙模式」→ **全系統 lunar-only**（含後台 CustomerDetailDialog + 後台 dashboard「登記候位」對話框）
- v3 改：全文翻中文（不再中英夾雜，依 [[feedback_traditional_chinese_only]] 規則）
