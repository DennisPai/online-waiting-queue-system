# Design — validator↔model 一致性機制

## 1. 逐欄位對照真值表（`validateRegisterQueue` vs `WaitingRecord` model）

`validateRegisterQueue` 是 `/queue/register`（公開報名）**唯一**掛載的驗證器（`queue.routes.js:9`）。逐欄位對照如下（model = `backend/src/models/waiting-record.model.js`）：

| 欄位 | model 定義 | validator 定義 | 對齊判定 |
|---|---|---|---|
| `name` | `required:true`, trim | `notEmpty` + `isLength 1-50` | ✅ 對齊（皆要求非空） |
| `phone` | **`required:true`**, trim | `optional({checkFalsy})` + 電話 regex | ⚠️ **validator 比 model 寬**（model 必填 / validator 選填）|
| `email` | `required:false`, default `''` | `optional()` | ✅ 對齊（6/21 拿掉 isEmail） |
| `gender` | **`required:true`**, enum `[male,female,other]` | `optional` + `isIn([male,female,other])`（WS1 修後） | (a) validator 比 model 寬（必填→選填）→ 同 D2 反向脆弱、登記 `KNOWN_VALIDATOR_LOOSER`;(b) ~~enum 缺 `other`~~ **WS1 已修對齊**。雙重身份：enum-aligned + looser |
| `gregorianBirthYear` | default null（選填、**無 min/max**） | `optional` + `isInt 1-150` | △ **validator 比 model 嚴但刻意**：model 對年無 min/max，validator 加 1-150（民國年合理 sanity bound）。register 主流程走 lunar-only、此欄非客戶直送主資料，刻意保留 → 登記 `KNOWN_VALIDATOR_STRICTER`（D3）|
| `gregorianBirthMonth` | default null, min1 max12 | `optional` + `isInt 1-12` | ✅ |
| `gregorianBirthDay` | default null, min1 max31 | `optional` + `isInt 1-31` | ✅ |
| `lunarBirth*` | default null | （validator 無規則） | validator 更寬，無衝突 |
| `addresses` | **`required:true`** + 長度 1-3 | `optional` + `isArray` | ⚠️ **validator 比 model 寬** |
| `addresses.*.address` | default `''`（允許空） | `optional({checkFalsy})` + `isString` | ✅ 對齊（6/21 修） |
| `addresses.*.addressType` | enum `[home,work,hospital,other]`, default home | `optional` + `isIn([home,work,hospital,other])` | ✅ |
| `familyMembers` | default `[]`, max5 | `optional` + `isArray` | ✅（validator 不深驗 member，更寬） |
| `consultationTopics` | **`required:true`** + 長度>0 | `optional` + `isArray` | ⚠️ **validator 比 model 寬** |
| `consultationTopics.*` | enum 9 值 | `optional` + `isIn(9 值)` | ✅（9 值逐一對齊） |

三類差異（皆要管）：
- **驗證器比 model 嚴（意外）**（會擋掉 model 合法輸入 = 這次事故的本質）：已修 `phone` 格式 / `address` notEmpty / `email` isEmail；**新發現 `gender` enum 缺 `other`** → WS1 修。由 contract 測試第 1/2 層擋復發。
- **驗證器比 model 嚴（刻意）**：`gregorianBirthYear` 的 1-150 sanity bound（model 無 min/max）。合理且刻意 → 登記 `KNOWN_VALIDATOR_STRICTER`（決策 D3），與「意外嚴格」區分。
- **驗證器比 model 寬（反向脆弱）**（放行了 model 會擋的 → 直接打 API 漏送→500）：`phone` / `addresses` / `consultationTopics` / **`gender`**（共 4 個，獨立驗證補上 gender）。由第「反向脆弱自動偵測」測試抓全集，見決策 D2。

## 2. 決策 D1：contract 測試用「行為驗證」而非「靜態反射 validator 內部結構」

**問題**：怎麼自動驗「驗證器有沒有比 model 嚴」？

**選項 A（靜態反射）**：反射 express-validator chain 內部的 `optional` flag、`isIn` 允許值等。
- 缺點：依賴 express-validator 私有結構（`chain.builder` / context），版本升級易碎、誤判風險高。

**選項 B（行為驗證，採用）**：用官方 `chain.run(req)` API，餵「model 合法的代表值」進去，斷言驗證器**不報該欄位的錯**。
```js
const { validationResult } = require('express-validator');
async function runRegister(body) {
  const req = { body, params: {}, query: {}, cookies: {}, headers: {} };
  for (const chain of validateRegisterQueue) await chain.run(req);
  const r = validationResult(req);
  return { isEmpty: r.isEmpty(), paths: r.array().map(e => e.path) };
}
```
- 優點：用官方公開 API（express-validator 文件指定的單元測試方式）、不碰私有結構、無 DB、無啟動 app（與既有 `route-api-contract` / `code-registry` / `dead-links` 三個 contract 測試同風格）。直接表達「model 合法的值 validator 必須放行」這個語意。
- **採用 B。**

## 3. 三層測試機制（治本核心，自我維護）

1. **行為對齊測試**：對「model 合法 + register 真實會送」的 payload fixtures 跑 `runRegister`，斷言 `paths` 不含該欄位（或整體 `isEmpty`）。涵蓋最小輸入 / 空值 / 各 enum 值 / 空地址 / 亂填信箱。→ 擋「驗證器比 model 嚴」復發。
2. **enum 完整性測試**：對 model 每個 enum 欄位的**每個 enum 值**，行為驗證 validator 放行。→ model 新增 enum 值但 validator 沒跟進即紅燈。
3. **欄位涵蓋 meta 測試**：靜態 parse `waiting-record.model.js` source 抽 top-level schema 欄位名集合，對照測試裡宣告的 `COVERED_FIELDS`（含每欄位的對齊意圖）。model 新增欄位但沒登記 → 紅燈。→ 機制隨 schema 演進自我維護，不會悄悄失效。

> 為什麼要第 3 層？這次事故的元兇正是「驗證器與 model 各自演進、沒有任何東西強迫兩邊對照」。只有第 1、2 層的話，model 哪天新增一個 required 欄位、validator 沒跟進，測試仍綠（因為對照表沒涵蓋新欄位）。第 3 層用「model 欄位全集」當真值，強迫每個欄位都被明確對照過一次。

## 4. 決策 D2：反向脆弱（驗證器比 model 寬）→ 本 change 只偵測 + 記錄 + 提報，不擅自改 schema

`phone` / `addresses` / `consultationTopics` / `gender` model `required:true` 但 validator `optional`（共 4 個；`gender` 是獨立驗證階段補上的第 4 個——它 enum 已對齊但必填方向仍是反向脆弱）。目前未爆，因前端簡化模式 / radio 一律補值（`phone='0000000000'`、`addresses=[{address:''}]`、`consultationTopics=['other']`、`gender` radio 必送男/女）。但直接打 API 漏送該欄位 → validator 放行 → mongoose 撞 required → 500。

兩個治本方向：
- **方向 A（推薦，最治本）：讓 model 誠實反映「只需姓名」業務**。把這三欄 `required:true → false`（或拿掉 `length>0` 強制）。優點：DB 層成為單一事實來源，直接打 API 只送姓名也能成功入庫、不噴 500，validator 的 optional 與 model 真正對齊。風險：動 schema、需確認下游 `addresses[0].address` 等取值處都有 optional chaining（多數已有）；只放寬不會讓既有資料失效。
- **方向 B（保守）：保持 model required，register controller 入口補值兜底**（缺漏時補與簡化模式一致的 placeholder）。優點：不動 schema。缺點：把「業務允許只填姓名」這個事實藏在 controller 補值邏輯裡，model 仍說謊（required 但實際非必填）。

**本 change 的處理**：不選邊、不動 model（dev 紀律「動 schema 前先問」+ 北極星「不擅自簡化 / 變更」）。用 contract 測試的**行為自動偵測**把這 4 欄抓出全集（對每個 model-required 欄位實際 omit 後跑 validator，放行的即反向脆弱），斷言恰等於 `KNOWN_VALIDATOR_LOOSER` 白名單（附原因註解）——比 hardcode 清單更 robust，任何新增的反向脆弱（含當初漏掉的 gender）會自動現形。並在此 design 記錄。**Discord 提報懷特裁示**要不要納入本 change（補一個 WS）或另開一案走方向 A。

## 6. 決策 D3：刻意嚴格（validator 加 model 沒有的 sanity bound）須登記、與「意外嚴格」區分

並非所有「validator 比 model 嚴」都是 bug。`gregorianBirthYear` 的 `isInt({min:1,max:150})` 是 model 沒有的約束，但它是合理的民國年 sanity bound、且 register 主流程走 lunar-only（此欄非客戶直送主資料），屬**刻意**保留。

機制必須區分兩種「嚴格」：
- **意外嚴格**（如原 `gender` enum 缺 `other`）= bug，擋掉 model 合法值 → 由 contract 測試第 1/2 層擋、必修。
- **刻意嚴格**（如 `gregorianBirthYear` 年範圍）= 合理 sanity bound → 登記 `KNOWN_VALIDATOR_STRICTER` 白名單（附原因 + 行為佐證測試確認該約束確實存在、非空殼登記），明確化、可審計、不誤判成 bug。

此區分讓「驗證器不得比 model 嚴」這條原則不會僵化到連合理輸入防呆都不准——而是「凡比 model 嚴，要嘛是 bug（修），要嘛刻意（登記）」。

## 5. 不做什麼（避免 scope 蔓延）

- 不反射 express-validator 私有結構（決策 D1）。
- 不擴到 `validateUpdateStatus` / `validateQueueSearch` / `validateUpdateOrder` 等其他 validator——它們對應的是 admin 操作、不是這次出事的公開 register 路徑；機制設計成日後可加，但本 change 不做。
- 不改前端 radio（仍只男 / 女；放寬的是 API 層對 model 既有合法值的接納）。

## 7. WS5（懷特 6/24 裁示）：反向脆弱根治——維持簡化模式填假值，後端補值兜底

D2 的反向脆弱（model required / validator optional → 直接打 API 漏送→500），懷特裁示**維持簡化模式填假值、走 service 補值兜底（不改 model required→false）**。深入 code 後修正先前判斷與處理：

### D4：後端「補假值兜底」其實已存在，補齊缺口即可
逐行追 `QueueService.registerQueue` 後發現：簡化模式已有 `applyDefaultValues` 補 gender/phone/addresses，所以驗證器層的「4 欄 looser」在 service 層其實 3 個已兜住。真正的 500 缺口只有：
- **`consultationTopics`**：`applyDefaultValues` 漏補 → 簡化模式繞過前端只送姓名時撞 model required→500。**補上**（缺漏補 `['other']` + `otherDetails`）。
- **非簡化模式 gender/addresses/consultationTopics**：`validateRequiredFields` 原本只查 name/phone/農曆 → 非簡化缺這些直接 500。**補齊 addresses/consultationTopics 友善 400**（gender 走 D6 補待填、不 400）。

### D5：familyMembers 內部欄位用「驗證對齊」而非補假值
`familyMembers.*.name`/`gender` 在 model 也 required，但驗證器只驗 `familyMembers` isArray、不驗內部 → 送 `familyMembers:[{}]` 撞 model→500。處理分兩種：
- `name`：**無法合理補假值**（補「家人」當名字是壞資料）→ 加驗證器 `familyMembers.*.name` notEmpty 對齊 model，加了家人沒填名字回友善 400。
- `gender`：**可補待填**（同主客戶）→ `processFamilyMembers` 補 `'other'`；驗證器加 `familyMembers.*.gender` optional + isIn 防無效值繞過→500。

### D6：gender 補值用「待填」標記，復用既有 `other` 值（零 schema 變更）
懷特原要求 gender 補值要「讓管理員看得出是補的、待確認」（補 `'male'` 完全隱形、最危險——查證確認其他欄位多少看得出：phone `0900000000`、address 留空、topics 的 otherDetails 寫「簡化模式快速登記」）。

實現「待填」標記有兩條路：(a) 加新 enum 值 `unspecified`（動 schema）；(b) 復用既有 `other`（零 schema）。懷特裁示 **(b)：把 `other`「其他性別」用途整個改成「待填」**（命理場景幾乎用不到真正的其他性別）。代價：放棄真正的「其他性別」選項——後台客戶建立/編輯的性別下拉「其他」標籤改「待填」。

實作：
- gender 缺漏一律補 `'other'`（待填），**不分模式**，統一在 `processQueueData` 入口處理（移出 `applyDefaultValues`）。家人 gender 同樣補 `'other'`。
- 前端顯示：`gender==='other'` 一律顯示「待填」（含客戶庫歸檔後，標記延續）；後台性別**輸入**下拉「其他」選項改標「待填」（admin 能看到/管理待填值）；**前台 register 下拉移除「其他」選項**（other≡待填，前台使用者不該選到「待填」——`RegisterPage` 走 `BasicInfoSection`/`FamilySection`，是正式路由）。
- 驗證器 gender enum 不變（`other` 本就在）；contract 測試的 enum 完整性不受影響（驗的是 enum 值，與顯示語意無關）。

> **scope 教訓（獨立驗證揪出）**：gender 顯示處實際散在 **11 個檔**（畫面 7 + `utils/pdfGenerator.js` + `utils/exportUtils.js`×3），不是最初寫死的「7 檔」。`pdfGenerator.js` 原把 `gender==='other'` 印成「女」——待填客戶會在**實體問事單**被誤標女性（最嚴重）。根因是「派工時用 hardcode 檔案清單而非系統性 grep 全部同類顯示處」——正是本 change 在治的「不修一個算一個」反面。修法：系統性 grep `gender ===`/`genderMap`/`GENDER_MAP` 全前端，逐一補到「待填」，並加最終掃描確認無 fallback 仍顯示非待填的漏網。

### 為什麼 gender 缺漏「補待填」而非「400」（與 addresses/consultationTopics 不同）
addresses/consultationTopics 非簡化模式缺漏 = 真的沒填、該 400；gender 有專屬「待填」標記、且前台 radio 保證有值（只有畸形 API 缺 gender），補待填比 400 友善且符合「填假值」精神，故 gender 一律補待填、不 400。
