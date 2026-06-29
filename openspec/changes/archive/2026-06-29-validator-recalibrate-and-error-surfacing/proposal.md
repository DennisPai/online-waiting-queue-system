# Proposal: 驗證器重新校準 + 驗證錯誤訊息可見化

## Why

公開報名端點 `/queue/register` 在「完整模式（簡易模式關閉）」下，前端會把**西元出生年**（例如 1991）放進 `gregorianBirthYear` 送出，但 `validateRegisterQueue` 的 `gregorianBirthYear.isInt({ min: 1, max: 150 })` 把它擋下（1991 > 150）。驗證失敗走 `validateRequest` 中介層，而它的回應只有 `{ success, errors[] }`、**沒有 `message` 欄位**，前端因而退回顯示無意義的 `Request failed`，使用者與管理員都看不出真正原因（其實 `errors[0].msg` 就寫著「出生年必須是 1-150 之間的整數」）。

這是 2026-06-21「孤兒驗證器」事故（電話／地址／信箱被擋）的**第四個受害欄位**，卻在 2026-06-24 `validator-model-alignment` 審查時被**誤判**：當時把 `gregorianBirthYear` 的 `[1,150]` 認定為「刻意的民國年 sanity bound、且此欄前端不直送」，登記進 `KNOWN_VALIDATOR_STRICTER` 白名單——兩個前提皆與現況相反（此欄是**西元**年、完整模式前端**確實**直送），等於用 spec 與測試把缺陷認證成「設計如此」，因而出貨。本變更要根治這條缺陷、修掉編進 spec 的錯誤前提，並補上讓它能在出貨前被攔下的測試與訊息破口。

## What Changes

- **修正 `gregorianBirthYear` 驗證規則**：對齊 model（`WaitingRecord.gregorianBirthYear` 無 min/max），改為接受前端實際送的西元年（合理範圍下界防呆、不再以 150 上限擋掉西元年）。
- **用「前端實際送出的 payload」端對端重新核對 `validateRegisterQueue` 每條規則**，把已知不對稱補齊：主客戶 `gregorianBirthYear` 受年範圍約束、但 `familyMembers.*.gregorianBirthYear` 完全沒有規則——兩者語意一致、約束須一致。
- **修正白名單錯誤前提**：把 `KNOWN_VALIDATOR_STRICTER` 對 `gregorianBirthYear` 兩個錯誤前提（民國年 sanity bound／前端不直送）移除或改正；該欄重新歸類為「缺陷修正」而非「刻意嚴格」。
- **補真實 payload 回歸測試**：以完整模式真實送出的 payload（含西元 `gregorianBirthYear`、家人含西元生年）斷言通過 `validateRegisterQueue`，堵住「測試只用最小／model 合法輸入、從不送前端真實 payload」的破口。
- **修 `validateRequest` 中介層回傳真正的錯誤訊息**：驗證失敗時，回應 SHALL 附帶可讀的 `message`（取首條 `errors[].msg` 或彙整），讓全站所有 express-validator 端點的驗證錯誤都顯示原因，不再是黑箱 `Request failed`。此為共用中介層，僅在原有回應上**新增** `message` 欄位、保留既有 `errors[]`，對既有 client 為向後相容（前端 `error.response.data.message` 解析本就優先吃 message，無需改前端）。

## Capabilities

### New Capabilities
（無）

### Modified Capabilities
- `input-validation-integrity`：
  - 修正「刻意嚴格的 sanity bound 須登記於白名單」需求——`gregorianBirthYear` 的年範圍不再是合法「刻意嚴格」範例（前提錯誤）；新增「白名單登記前須以前端實際送出的真實值佐證該約束不會擋掉合法 payload」的把關，避免再用錯誤前提認證缺陷。
  - 強化「register 邊角輸入須有測試覆蓋」需求——契約／回歸測試 SHALL 涵蓋**完整模式前端實際送出的 payload**（含西元 `gregorianBirthYear`、家人生年），不只最小／空值輸入。
  - 新增需求——API 驗證失敗的回應 SHALL 附可讀 `message`，使 client 能呈現真正原因而非通用 `Request failed`。

## Impact

- **程式碼**：
  - `backend/src/validators/queueValidators.js`（`gregorianBirthYear` 規則 + 家人欄位對稱）
  - `backend/src/utils/middleware.js`（`validateRequest` 新增 `message`）
  - `backend/tests/contract/validator-model-alignment.test.js`（白名單修正 + 真實 payload 斷言）
  - 視需要新增／擴充回歸測試檔
- **回應契約**：驗證失敗回應新增 `message` 欄位（僅新增、不移除 `errors[]`，向後相容）；若 `docs/API.md` 有列驗證錯誤回應格式則同步。
- **前端**：無需改動——`queueSlice` 既有錯誤解析已優先讀 `error.response.data.message`。
- **環境**：僅在測試環境（`open-queue-test`）實作與部署驗證；正式環境之後另經懷特核可才同步。
- **相依／風險**：`validateRequest` 為全站 express-validator 端點共用，需在 design 評估對其他端點回應的相容性（僅新增欄位，風險低）。
