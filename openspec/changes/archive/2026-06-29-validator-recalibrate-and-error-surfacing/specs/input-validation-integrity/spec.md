# input-validation-integrity Specification (delta)

## MODIFIED Requirements

### Requirement: 刻意嚴格的 sanity bound 須登記於白名單

凡驗證器對某欄位施加 model 未定義的合理輸入約束（sanity bound，如數值範圍），而該約束經確認為刻意保留，該情形 SHALL 登記於 contract 測試的 `KNOWN_VALIDATOR_STRICTER` 白名單並附原因，且 SHALL 有行為佐證測試確認該約束確實存在（非空殼登記）。白名單登記的原因 SHALL 以該欄位「前端實際送出的真實值」為依據（不得僅憑欄位名臆測語意），且 SHALL 有行為佐證測試確認該 sanity bound **不會擋掉任何合法的前端真實 payload**——以此區分「刻意嚴格」與「意外嚴格（缺陷）」，避免合理防呆被誤判成 bug、或缺陷以「刻意」之名蒙混。（2026-06-29 教訓：`gregorianBirthYear` 的 `1-150` 上界曾被誤當「民國年 sanity bound、且前端不直送此欄」登記，實際此欄為**西元**年、完整模式前端**直送**，導致缺陷被認證為設計如此而出貨；補上「以前端真實值佐證」即為堵此破口。）

#### Scenario: gregorianBirthYear 的西元年範圍刻意嚴格、且不擋真實 payload

- **WHEN** contract 測試執行
- **THEN** `gregorianBirthYear`（model 無 min/max，驗證器加西元年 sanity bound，如 `1 ~ 當前西元年+1`）被列入 `KNOWN_VALIDATOR_STRICTER`，其登記原因以「前端送西元年」為依據；並有測試以前端完整模式真實送出的西元年（如 1991）佐證**通過驗證**，以明顯非法值（如未來年）佐證**被擋**

#### Scenario: 白名單 sanity bound 不得擋掉合法前端 payload

- **WHEN** 對任一登記於 `KNOWN_VALIDATOR_STRICTER` 的 sanity bound，施測該欄位前端實際會送出的合法值範圍
- **THEN** 該範圍內的值全部通過驗證；若有合法真實值被該 bound 擋下，視為缺陷（非刻意嚴格），測試紅燈要求修正

### Requirement: register 邊角輸入須有測試覆蓋

針對公開報名端點的真實輸入，系統 SHALL 有測試斷言其能成功通過驗證、不被擋下，覆蓋面 SHALL 同時包含兩端：(a) 真實最小輸入與邊角空值（簡化模式只填姓名、空地址、亂填信箱、`gender:'other'`、最小輸入）；(b) **完整模式前端實際送出的完整 payload**（含由農曆推算、以西元年形式送出的 `gregorianBirthYear`，以及帶家人、家人亦含西元生年的情形）。此舉補上 2026-06-21 與 2026-06-29 兩次事故的共同測試盲區——測試與實機若只用「最小輸入」或「model 合法的人造值」、從不送前端完整模式真實 payload，驗證器與前端資料契約的落差就無從現形。

#### Scenario: 簡化模式登記通過驗證

- **WHEN** 以簡化模式實際送出的 payload（只填姓名 + 前端補的 placeholder：空信箱 / 空地址 / `['other']` 諮詢主題 / 佔位電話）打 register 驗證器
- **THEN** 驗證通過、不報錯

#### Scenario: 亂填信箱不被擋

- **WHEN** 報名請求的 `email` 為非 email 格式的任意字串（如「隨便填的」）
- **THEN** 驗證器放行（信箱選填、不驗格式，對齊 2026-06-21 懷特要求與 model `email required:false`）

#### Scenario: 完整模式真實 payload 通過驗證

- **WHEN** 以完整模式（簡易模式關閉）前端實際送出的 payload 打 register 驗證器，其中 `gregorianBirthYear` 為西元年（如 1991），且含至少一名家人、其 `gregorianBirthYear` 亦為西元年
- **THEN** 驗證器對主客戶與家人的 `gregorianBirthYear` 皆放行、整筆通過驗證，不報錯

## ADDED Requirements

### Requirement: API 驗證失敗回應須附可讀訊息

凡 express-validator 驗證失敗（由 `validateRequest` 中介層回 400）的回應，SHALL 附帶一個可讀的 `message` 欄位，內容反映實際的欄位級錯誤原因（取自 `errors[].msg`），使前端與使用者能看見「為何被擋」。回應 SHALL 同時保留既有 `errors[]` 結構（僅新增 `message`、不移除 `errors`，向後相容）。此需求適用於全站所有掛 `validateRequest` 的端點，杜絕「驗證失敗只顯示通用 `Request failed`、真正原因被吞」的黑箱。

#### Scenario: 驗證失敗回應帶可讀 message

- **WHEN** 任一掛 `validateRequest` 的端點收到一筆會被 express-validator 擋下的請求
- **THEN** 400 回應的 `message` 為反映該驗證錯誤的可讀字串（非通用 `Request failed`），且 `errors[]` 仍在

#### Scenario: 前端取得真正原因而非 Request failed

- **WHEN** 前端以 `error.response?.data?.message` 解析一筆驗證失敗回應
- **THEN** 取得的是真正的欄位級原因（如「出生年必須是…」），而非退回 axios 預設的 `Request failed`
