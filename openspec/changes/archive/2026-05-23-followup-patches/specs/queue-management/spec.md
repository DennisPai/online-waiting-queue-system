## ADDED Requirements

### Requirement: 前端候位狀態 store 必含完整 default 不能讓 selector 撞 undefined

前端 redux store 的 `queueStatus` 初始 state SHALL 包含所有後端可能回傳欄位的完整 default 值（如 `currentProcessingNumber: 0` / `maxOrderIndex: 100` 等），避免 selector / hook 讀取時撞 undefined 噴 pageerror。後端 `/queue/status` API 回 partial response 時，store reducer SHALL 用 merge 保留 default 值。

#### 情境：頁面開啟不噴 pageerror

- **WHEN** 使用者首次開啟前台 `/register` 或後台 dashboard、後端 `/queue/status` 還沒回 response
- **THEN** 前端 selector 讀 queueStatus.currentProcessingNumber / maxOrderIndex 拿到 default 值（0 / 100），不噴「Cannot read properties of undefined」pageerror

### Requirement: cancelQueueByCustomer API response 不得含 mongoose 文件內部欄位

公開取消候位 API（`POST /queue/cancel`）回傳的 JSON SHALL 不含 mongoose 文件內部欄位（如 `$__` / `_doc` / `activePaths` / `modifiedPaths` 等），只回傳純客戶資料欄位（透過 `.toObject()` 或 schema toJSON transform）。

#### 情境：取消成功回乾淨 JSON

- **WHEN** 客戶呼叫 `POST /queue/cancel` 帶正確 `_id + 姓名 + 電話` 成功取消
- **THEN** response 的 `data` 欄位只含 customer 純資料（name / phone / status / orderIndex / queueNumber / ... 等 schema 定義欄位），不含任何 mongoose 內部 metadata

### Requirement: lunar 生日必填驗證（非簡化模式）

後端 `validateRequiredFields` SHALL 在非簡化模式下驗證 `lunarBirthYear` / `lunarBirthMonth` / `lunarBirthDay` 三欄位都必填、缺任一回 400 友善錯誤。簡化模式仍 SHALL 跳過驗證（沿用既有行為）。前端 form validation SHALL 對應加 lunar 必填提示。

#### 情境：非簡化模式缺農曆生日被擋

- **WHEN** 系統處於非簡化模式 (simplifiedMode=false)，使用者送出報名但缺 `lunarBirthYear` 或 `lunarBirthMonth` 或 `lunarBirthDay`
- **THEN** 後端回 400 friendly error（例：「lunarBirthYear 為必填欄位」），不寫進 DB

#### 情境：簡化模式仍可不填 lunar

- **WHEN** 系統處於簡化模式 (simplifiedMode=true)，使用者送出只填姓名 + 電話 + 諮詢主題 + 地址（不填 lunar）
- **THEN** 後端仍接受、200 OK，沿用既有簡化模式快速登記行為

### Requirement: 後端 lunarToGregorian 接受民國年輸入

後端 `lunarToGregorian(lunarMinguoYear, month, day, isLeapMonth)` SHALL 接受**民國年**為第一參數、內部 `+1911` 轉西元年後算對應國曆日期。函式文件 SHALL 明示「接受民國年輸入、回西元年輸出」。

#### 情境：民國年輸入算正確國曆

- **WHEN** 呼叫 `lunarToGregorian(80, 1, 15, false)`（民國 80 年農曆 1 月 15 日）
- **THEN** 回西元年的對應國曆日期（不是把 80 當西元 80 年漢朝計算）

#### 情境：閏月參數正確處理

- **WHEN** 呼叫 `lunarToGregorian(109, 4, 15, true)`（民國 109 年閏 4 月 15 日）
- **THEN** 回對應西元 2020 年 6 月 6 日左右的國曆日期、lunarIsLeapMonth 正確處理

### Requirement: autoFillDates 恢復農曆→國曆自動反推

後端 `autoFillDates` SHALL 在 register / admin save 流程中，自動把使用者填的農曆生日（民國年）反推成對應國曆生日寫進 `gregorianBirth*` 欄位。SHALL 不反推「國曆→農曆」方向（前端不再有國曆輸入入口、不需要）。

#### 情境：報名自動補國曆

- **WHEN** 使用者送出 `lunarBirthYear: 80, lunarBirthMonth: 1, lunarBirthDay: 15, lunarIsLeapMonth: false` 報名
- **THEN** autoFillDates 自動算出對應國曆 → DB 該客戶 gregorianBirthYear/Month/Day 是西元年對應值（不是 null、也不是 80/1/1）

#### 情境：admin 修改客戶資料自動補國曆

- **WHEN** 管理員後台修改既有客戶生日按儲存（送 lunarBirth* 新值）
- **THEN** 對應 gregorianBirth* 在 DB 自動更新成新農曆對應的西元值

#### 情境：國曆永遠不能手動編輯

- **WHEN** 前台或後台任何介面
- **THEN** UI 都不提供國曆輸入欄位（系統永遠自動算）

### Requirement: 前端 BirthdayPicker 標題改名「農曆生日」加備註

前端共用元件 `BirthdayPicker` SHALL 預設顯示標題「**農曆生日**」（取代「出生日期」），下方 SHALL 顯示 helper text 小字「**請先自行查好農曆生日**」。全系統 5 處呼叫位置（前台 BasicInfoSection / FamilySection / RegisterForm 主客戶段 / 後台 CustomerDetailDialog 主+家人 / CustomerCreatePage / CustomerDetailPage）SHALL 套用這個 default。

#### 情境：前台報名看到農曆生日標題 + 備註

- **WHEN** 使用者開啟前台 `/register`
- **THEN** 主客戶 + 家人生日 input 段標題顯示「農曆生日」+ 下方備註「請先自行查好農曆生日」

#### 情境：後台編輯客戶看到農曆生日標題 + 備註

- **WHEN** 管理員後台開 CustomerDetailDialog edit mode
- **THEN** 主客戶 + 家人生日 input 段標題顯示「農曆生日」+ 備註
