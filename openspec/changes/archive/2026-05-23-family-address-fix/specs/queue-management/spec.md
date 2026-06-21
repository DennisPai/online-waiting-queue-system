## ADDED Requirements

### Requirement: 家人資料地址欄位結構一致性

系統 SHALL 保證「家人」物件在所有資料流（前台報名、後台新增/編輯、DB schema、歸檔到 VisitRecord）使用**統一的純量 `address` 欄位**，禁止任一路徑使用 `addresses` 陣列結構。家人物件 SHALL 包含完整欄位（姓名、性別、生日、虛歲、生肖、地址、地址類型），且 `address` 欄位 default 為**空字串 `''`**（不得為 `'臨時地址'` 等預設提示字串）。

#### Scenario: 後台新增家人能存進地址

- **WHEN** 管理員在後台編輯客戶時點「新增家人」並填寫姓名、地址等資料
- **THEN** 該家人的地址（純量 `address` 欄位）被正確寫入 DB，重新打開編輯時地址正確顯示

#### Scenario: 後台新增第 4-5 位家人能存進地址（必踩坑場景）

- **WHEN** 管理員在後台連續新增家人達到後台上限（5 位）並各自填寫地址
- **THEN** 全部 5 位家人地址都被正確寫入 DB，DB raw 文件確認 `familyMembers[].address` 全為非空字串

#### Scenario: 前台報名家人地址正常運作（不被破壞）

- **WHEN** 客戶從前台 `/register` 報名並新增 1-3 位家人含地址
- **THEN** 家人地址被正確寫入 DB，與 Change B 前行為一致

#### Scenario: 未填家人地址不被 `'臨時地址'` 字串填入

- **WHEN** 報名時新增家人但地址欄位留空
- **THEN** DB 該家人 `address` 欄位是空字串 `''`（不是 `'臨時地址'`），管理員後續編輯時看到空白欄位、不被誤導為「已填」

### Requirement: 歸檔到 VisitRecord 時家人完整資料不丟失

系統在「結束本期」歸檔 active WaitingRecord 到 VisitRecord 時，SHALL 保留每位家人的完整欄位（姓名、性別、國曆/農曆生日、虛歲、生肖、**地址、地址類型**）。VisitRecord 的 familyMember 子 schema SHALL 與 WaitingRecord familyMember 子 schema 同步定義同樣的欄位集合。

#### Scenario: 歸檔保留家人地址

- **WHEN** 管理員按「結束本期」歸檔 active 候位（其中某筆含家人地址）
- **THEN** 對應 VisitRecord 的 familyMembers 完整保留每位家人的 `address` 欄位，**不被歸檔流程丟棄**

#### Scenario: 歸檔保留家人完整欄位

- **WHEN** 歸檔某筆含 3 位家人（各有 gender / 生日 / address / addressType）
- **THEN** VisitRecord 對應 3 位家人的 9 個欄位（name / gender / 國曆 3 / 農曆 4 / virtualAge / zodiac / address / addressType）完全保留、可從歷史查詢回看

### Requirement: 後台「新增家人」UI hook 物件結構

後台管理員介面的 `addFamilyMember` hook 函式 SHALL 建立物件時使用純量 `address` 與 `addressType` 欄位，禁止使用 `addresses: [{...}]` 陣列結構。

#### Scenario: addFamilyMember 建立的物件被 schema 接受

- **WHEN** 後台 admin hook `addFamilyMember()` 被呼叫產生新家人物件
- **THEN** 新物件的結構（純量 `address` / `addressType`）跟 waiting-record familyMember 子 schema 完全匹配，送出後**不會被 Mongoose schema 靜默丟棄任何欄位**
