# user-facing-message-localization Specification (delta)

## ADDED Requirements

### Requirement: 對外可見訊息一律繁體中文

所有「使用者或管理員透過正常操作可見」的訊息——API 回應 message、API 驗證失敗訊息、共用回應層的預設訊息、前端 UI 文字——SHALL 為繁體中文。下列非展示字串為**明確例外**、不要求中文化：程式識別符、欄位名、enum 值（如 `home`/`left`/`normal`/`dry-run`/`execute`）、回應 `code` 枚舉（如 `VALIDATION_ERROR`）、技術／品牌名、HTTP header 值、僅開發者誤用才觸發的程式內斷言、以及前端不顯示的程式語意預設值（如成功回應預設 `message:'OK'`）。

#### Scenario: 一般操作不出現英文或中英混雜對外訊息

- **WHEN** 使用者或管理員在前台 / 後台進行正常操作（含觸發驗證失敗、操作錯誤）
- **THEN** 所見訊息為繁體中文，不出現 `Invalid value`、`Request failed` 等英文預設或未經處理的中英混雜句（enum 值／技術 token 作為句中保留原文者除外）

### Requirement: API 驗證失敗訊息須為繁中、不得吐 express-validator 英文預設

凡掛載 `validateRequest` 中介層的端點，其 express-validator 驗證鏈（含路由內聯定義者）SHALL 為每條規則提供繁中 `.withMessage()`，使驗證失敗時回應的 `message` 為繁中、SHALL NOT 為 express-validator 預設英文（如 `Invalid value`）。

#### Scenario: 路由內聯 validator 失敗回繁中原因

- **WHEN** 對任一掛 `validateRequest` 的端點（如 admin 設定 / auth）送出一筆會被驗證擋下的請求
- **THEN** 400 回應的 `message` 為描述該欄位錯誤的繁中字串，不為 `Invalid value`

#### Scenario: 公開報名驗證維持繁中

- **WHEN** 對 `/queue/register` 送出會被擋下的請求
- **THEN** 回應 `message` 為繁中（`queueValidators.js` 既有繁中 withMessage 不退化）

### Requirement: 後端回應與共用層預設訊息須為繁中

後端 controller 對外回應的 message、以及共用回應層（`v1-response`）在 `success:false` 無 message 時的 fallback，SHALL 為繁中 prose。句中若需引用 enum 值或技術 token，該 token SHALL 保留原文（以對齊 API 實際接受值），其餘敘述為繁中。

#### Scenario: 共用層失敗預設為繁中

- **WHEN** 一個 `success:false` 但未帶 message 的回應經 `v1-response` 封裝
- **THEN** 對外 `message` 為繁中（如「請求失敗，請稍後再試」），不為 `Request failed`

#### Scenario: 訊息保留 enum/技術 token 但敘述繁中

- **WHEN** 後端回傳一則涉及 enum 值或技術參數的錯誤訊息（如對齊方式、dry-run/execute 模式）
- **THEN** 訊息敘述為繁中，token 本身（`left`/`center`/`dry-run`/`execute` 等）保留原文

### Requirement: 前端使用者可見字串須為繁中

前端使用者可見的 UI 字串（標籤、按鈕、提示、對話框、警示）SHALL 為繁體中文，不出現英文（技術／品牌名與程式識別符除外）。

#### Scenario: 表單欄位標籤繁中

- **WHEN** 管理員開啟新增客戶表單
- **THEN** 所有欄位標籤為繁中（含電子郵件欄，不為 `Email`）

### Requirement: 防回歸——route validator 鏈須有 withMessage（測試把關）

系統 SHALL 維護一組無資料庫依賴的 contract 測試，解析 route 檔內的 express-validator 鏈並斷言每個鏈至少有一個 `.withMessage()`；任何新增「無 `.withMessage` 的 route validator 鏈」SHALL 使 CI 紅燈，阻止英文預設訊息回歸。

#### Scenario: 新增無 withMessage 的 route validator 即紅燈

- **WHEN** 有人在 route 檔新增一條 express-validator 規則但未掛 `.withMessage()`
- **THEN** contract 測試失敗、CI 紅燈，提示補上繁中訊息
