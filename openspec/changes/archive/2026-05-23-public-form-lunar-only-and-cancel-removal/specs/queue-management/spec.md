## ADDED Requirements

### Requirement: 全系統報名生日輸入限定農曆

整個系統（前台 `/register` + 後台 CustomerDetailDialog + 後台 dashboard「登記候位」對話框）的主客戶 + 家人生日輸入 SHALL **只允許農曆輸入**，不得在任何介面顯示「國曆 / 農曆」切換按鈕。閏月選擇 SHALL 保留以對應農曆閏月場景。後端 SHALL 自動把農曆生日轉換為國曆生日（雙向都存進 DB），不需任何介面輸入國曆。

#### 情境：前台 register 看不到國曆/農曆切換

- **WHEN** 客戶開啟前台 `/register` 頁
- **THEN** 主客戶段生日 input + 家人段生日 input 都**不顯示**「國曆 / 農曆」切換按鈕組，固定顯示「農曆生日」+ 閏月勾選框

#### 情境：前台 register 只填農曆生日，後端自動補國曆

- **WHEN** 客戶在前台填農曆生日（lunarBirthYear/Month/Day + 可選 lunarIsLeapMonth）+ 主客戶資料 + 家人含農曆生日，送出報名
- **THEN** 後端 autoFillDates 自動把農曆生日轉換為對應國曆生日（gregorianBirthYear/Month/Day），DB 紀錄兩種曆法的生日欄位都齊全

#### 情境：後台也是 lunar-only（v2 反饋更新）

- **WHEN** 管理員在後台編輯 CustomerDetailDialog 內主客戶或家人生日
- **THEN** UI **不顯示**「國曆 / 農曆」切換按鈕組（跟前台一致），固定顯示農曆 + 閏月，由系統每次自動轉成國曆

#### 情境：後台 dashboard「登記候位」對話框也是 lunar-only

- **WHEN** 管理員在後台 dashboard 點「登記候位」開報名對話框
- **THEN** 該對話框的主客戶 + 家人生日 UI 也是 lunar-only（若該對話框共用 RegisterForm 即自動套用）

### Requirement: 移除前台客戶查詢頁取消預約按鈕

客戶查詢候位頁面（`/status/...` / StatusPage 內容）的「候位狀態」對話框 SHALL **不再顯示「取消預約」按鈕**。客戶若要取消候位 SHALL 透過後台管理員人工處理。後端取消候位接口（`POST /queue/cancel`）SHALL 保留（Change A 已加 `_id` + 身分驗證），admin 端仍可呼叫。

#### 情境：StatusPage 候位狀態對話框看不到取消按鈕

- **WHEN** 客戶查詢自己候位狀態（status=waiting 或 processing 中），開啟候位狀態詳情對話框
- **THEN** 對話框底部 actions 段**不顯示「取消預約」按鈕**，只顯示「關閉」按鈕

#### 情境：後端取消候位接口仍可用（admin 路徑）

- **WHEN** 管理員透過後台 `PUT /admin/queue/:id/status status=cancelled` 取消某筆候位
- **THEN** 接口正常運作（Change A 的 `_id` 定位 + 身分驗證仍有效），對應 ensureOrderIndexConsistency 壓回連續（Change A hotfix 86fc5ba 行為不變）

#### 情境：後端公開取消候位接口仍存在（保留）

- **WHEN** 第三方 client 直接呼叫 `POST /queue/cancel` 帶正確 `_id + 姓名 + 電話`
- **THEN** 接口仍接受（Change A 安全性保護），不因 Change C 移除 UI 入口就拒絕（接口跟 UI 分離設計）

### Requirement: BirthdayPicker 共用元件支援 lunarOnly 模式

共用元件 `BirthdayPicker.jsx` SHALL 提供 `lunarOnly` boolean 屬性參數（default `true`，即「全系統預設 lunar-only」）。`lunarOnly=true` 時：強制 `calendarType='lunar'`、隱藏「國曆 / 農曆」切換按鈕組、`onChange` 回呼永遠帶 `calendarType: 'lunar'`、閏月勾選框保留顯示。`lunarOnly=false`（顯式傳入）時行為保留雙模式（給未來特殊需求彈性）。

#### 情境：default lunarOnly=true 全系統隱藏切換

- **WHEN** 任何呼叫者（前台 FamilySection / 前台 RegisterForm / 後台 CustomerDetailDialog）使用 `<BirthdayPicker ... />` 不傳 lunarOnly
- **THEN** UI 不 render 國曆/農曆切換按鈕組，固定農曆 input + 閏月勾選框

#### 情境：lunarOnly=true onChange 永遠 lunar

- **WHEN** lunarOnly=true 模式下使用者操作年/月/日/閏月任一變更
- **THEN** onChange 回呼回傳的物件 `calendarType` 欄位**永遠是 `'lunar'`**，即使外部屬性參數傳的 calendarType 是 `'gregorian'` 也被覆蓋

#### 情境：lunarOnly=false 行為保留雙模式（特殊需求彈性）

- **WHEN** 呼叫者顯式傳入 `<BirthdayPicker lunarOnly={false} ... />`
- **THEN** BirthdayPicker 行為跟 Change C 之前一致：顯示國曆/農曆切換 + 雙模式輸入（這條保留是給未來特殊需求用，Change C 本身範圍內所有呼叫者都不傳 lunarOnly 即套用 default true）
