## ADDED Requirements

### Requirement: API 層驗證器不得比 DB model 嚴格

掛在 API 端點上的 express-validator 驗證器（以 `/queue/register` 的 `validateRegisterQueue` 為首要對象）對任一欄位的「必填 / 選填 / 允許值（enum）/ 格式」約束，SHALL NOT 比對應 Mongoose model（`WaitingRecord`）的 `required` / `optional` / `enum` 定義更嚴格。具體而言：凡 model 認定合法的欄位值（含選填欄位的空值、enum 列舉的每個值），驗證器 SHALL 放行而不報錯。

兩個方向的差異都要管：
- 驗證器比 model **寬**（放行 model 會擋的值）SHALL 被明確登記附原因（見「反向寬鬆需登記」需求）。
- 驗證器比 model **嚴**：凡屬「意外嚴格」（擋掉 model 合法值，如原 `gender` enum 缺 `other`）SHALL 視為缺陷修正；唯有「刻意嚴格」（合理的輸入 sanity bound，如 `gregorianBirthYear` 的年範圍）SHALL 登記於 `KNOWN_VALIDATOR_STRICTER` 白名單並附原因，明確化與審計，不得以未登記的形式存在。

此需求把「驗證器必須對齊 model」這條人治規則（2026-06-21 P0-5 孤兒驗證器把電話 / 地址 / 信箱定成比 model 嚴、擋掉合法簡化登記的事故根因）換成自動把關。

#### Scenario: model 合法值不被驗證器擋

- **WHEN** 對 `/queue/register` 送出一筆所有欄位值皆為 model 認定合法的請求（含選填欄位留空、enum 欄位取 model enum 列舉的任一值，例如 `gender:'other'`）
- **THEN** `validateRegisterQueue` 不對任何該等欄位回報驗證錯誤（`validationResult` 對這些欄位為空）

#### Scenario: gender 對齊 model enum

- **WHEN** 報名請求的 `gender` 為 model enum 允許的 `'other'`
- **THEN** 驗證器放行（不再以 `isIn(['male','female'])` 擋下 model 合法的 `'other'`）

### Requirement: 驗證器↔model 一致性須由 contract 測試持續把關

系統 SHALL 維護一組無資料庫依賴的 contract 測試（`backend/tests/contract/validator-model-alignment.test.js`），在 CI 與本地 `npm test` 自動執行，三層把關：(1) 行為對齊——model 合法值不被驗證器擋；(2) enum 完整性——model 每個 enum 欄位的每個列舉值驗證器皆放行；(3) 欄位涵蓋——model 的每個 register 相關欄位都被對照表明確涵蓋。測試 SHALL 使用 express-validator 官方 `chain.run(req)` 行為 API，不反射其私有結構，以隨版本演進維持穩定。

#### Scenario: 驗證器比 model 嚴時 CI 紅燈

- **WHEN** 任何人修改驗證器，使某欄位對 model 合法的值報錯（例如把某 enum 欄位的允許值改成 model enum 的真子集，或把 model 選填欄位改成必填 / 加格式限制）
- **THEN** contract 測試的行為對齊或 enum 完整性層失敗、CI 紅燈，阻擋該漂移合併

#### Scenario: model 新增欄位未對照時提示

- **WHEN** `WaitingRecord` model 新增一個 register 相關欄位，但 contract 測試的對照表（`COVERED_FIELDS`）未同步登記
- **THEN** 欄位涵蓋 meta 測試失敗，提示需把新欄位納入 validator↔model 對照，避免機制隨 schema 演進悄悄失效

### Requirement: register 邊角輸入須有測試覆蓋

針對公開報名端點的真實最小輸入與邊角空值（簡化模式只填姓名、空地址、亂填信箱、`gender:'other'`、最小輸入），系統 SHALL 有測試斷言其能成功通過驗證、不被擋下。此舉補上 2026-06-21 事故的測試盲區——當時測試與第一次實機用的全是「欄位填滿」的完整 payload，從未測真實最小輸入。

#### Scenario: 簡化模式登記通過驗證

- **WHEN** 以簡化模式實際送出的 payload（只填姓名 + 前端補的 placeholder：空信箱 / 空地址 / `['other']` 諮詢主題 / 佔位電話）打 register 驗證器
- **THEN** 驗證通過、不報錯

#### Scenario: 亂填信箱不被擋

- **WHEN** 報名請求的 `email` 為非 email 格式的任意字串（如「隨便填的」）
- **THEN** 驗證器放行（信箱選填、不驗格式，對齊 2026-06-21 懷特要求與 model `email required:false`）

### Requirement: 反向寬鬆（驗證器比 model 寬）須由行為自動偵測並全部登記

凡驗證器對某欄位比 model 寬鬆（model `required` 但驗證器 `optional`），該情形 SHALL 被明確登記在 contract 測試的白名單（`KNOWN_VALIDATOR_LOOSER`）並附原因註解。contract 測試 SHALL 以**行為自動偵測**抓出反向寬鬆欄位的全集（對每個 model 必填欄位實際省略後跑驗證器，驗證器放行者即為反向寬鬆），並斷言偵測結果恰等於白名單，使未來新增的反向寬鬆**自動現形**、不依賴 hardcode 清單。本需求只要求偵測、登記與可見性，不要求消除該寬鬆（消除方式——改 model 誠實或 controller 兜底——屬另議決策）。

#### Scenario: 反向寬鬆全集被自動偵測且全部登記

- **WHEN** contract 測試執行
- **THEN** 行為偵測抓出 `phone` / `addresses` / `consultationTopics` / `gender`（model required、驗證器 optional、靠前端簡化模式或 radio 補值兜住）為反向寬鬆全集，且全部列於 `KNOWN_VALIDATOR_LOOSER` 白名單；若驗證器新增了未登記的反向寬鬆欄位（或白名單有已不成立的項），斷言失敗以提示更新

### Requirement: 刻意嚴格的 sanity bound 須登記於白名單

凡驗證器對某欄位施加 model 未定義的合理輸入約束（sanity bound，如數值範圍），而該約束經確認為刻意保留，該情形 SHALL 登記於 contract 測試的 `KNOWN_VALIDATOR_STRICTER` 白名單並附原因，且 SHALL 有行為佐證測試確認該約束確實存在（非空殼登記）。此需求使「刻意嚴格」與「意外嚴格（缺陷）」明確區分，避免合理防呆被誤判成 bug、或缺陷以「刻意」之名蒙混。

#### Scenario: gregorianBirthYear 的年範圍刻意嚴格被登記

- **WHEN** contract 測試執行
- **THEN** `gregorianBirthYear`（model 無 min/max，驗證器加 `isInt 1-150` 民國年 sanity bound）被列入 `KNOWN_VALIDATOR_STRICTER`，且有測試以超出範圍的值佐證該約束確實生效

### Requirement: 報名流程不得因 model 必填欄位缺漏而回傳 500

公開報名（`/queue/register`）對任何通過 API 驗證器的請求，SHALL NOT 因 model 必填欄位缺漏而拋出未處理的 mongoose ValidationError（HTTP 500）。後端 SHALL 以下列方式保證每個 model 必填的 client 欄位在寫入前已滿足，依欄位性質擇一：(a)「補假值」——簡化模式刻意留空的欄位（phone / addresses / consultationTopics / gender）由後端補與前端一致的預設值；(b)「友善驗證」——非簡化模式的必填欄位或無法合理補值的欄位（如 `familyMembers.*.name`）缺漏時回傳 400 並附訊息，而非 500。

此需求把 2026-06-21 事故的反向脆弱（驗證器選填、model 必填、直接打 API 漏送→500）收口：維持簡化模式填假值的前提下，後端成為「保證 model 必填欄位有值」的最後防線。

#### Scenario: 簡化模式只送姓名不噴 500

- **WHEN** 系統處於簡化模式，報名請求僅含 `name`（其餘 model 必填欄位缺漏，模擬繞過前端直接打 API）
- **THEN** 後端補上 phone / addresses / consultationTopics / gender 的預設值後成功建立候位記錄，不拋 500

#### Scenario: 加了家人卻沒填姓名回 400

- **WHEN** 報名請求帶 `familyMembers` 且其中某筆缺 `name`
- **THEN** 驗證器回傳 400「家人姓名不能為空」，而非通過後在 model 撞 required 拋 500

### Requirement: 簡化模式補上的 gender 須以可辨識的「待填」標記呈現

簡化模式報名未取得真實性別時，後端補的 gender SHALL 使用一個可被前端辨識為「待填／待確認」的值（本系統復用既有 enum 值 `other`，用途改為「待填」），且前端在所有性別顯示處 SHALL 將該值呈現為「待填」，使管理員能分辨此為系統補值而非使用者真實選擇。對應地，後台建立／編輯客戶的性別選單 SHALL NOT 再以「其他」之名提供該值作為一般性別選項（標籤改為「待填」）。

#### Scenario: 系統補的性別顯示為待填

- **WHEN** 一筆簡化模式報名的 gender 由後端補為 `other`
- **THEN** 前端候位列表 / 客戶詳情 / 客戶庫等所有性別顯示處皆呈現「待填」，而非「其他」或「男」
