## Why

2026-06-21 P0-5 把一個從未掛載過的孤兒驗證器 `validateRegisterQueue` 直接掛上公開報名端點 `/queue/register`。它要求**電話必填、地址非空、信箱合格式**，但系統早演進成「簡化模式（只需姓名）+ 多欄位選填」（model `email required:false`、`addresses.*.address` 預設 `''`）。規則與現況打架，擋掉合法的空值 / 簡化登記——**正式上線當天 12:00 開放前後**，客戶報名（信箱格式）與管理員後台建客戶（空地址）連環踩雷。已逐一補修電話 / 地址 / 信箱（`b41df9d`）。

但這三條是「被使用者實際撞出來才修」的，根因沒有被機制擋住：

1. **驗證器（API 層）的必填 / 選填 / 格式定義，沒有對齊 model（DB 層）的 required / optional / enum 真值**，全靠人記得。
2. **測試與第一次實機用的全是「欄位填滿」的完整 payload**，從沒測「只填姓名 / 空地址 / 亂填信箱 / 最小輸入」這種真實邊角，正常路徑把問題蓋住。
3. **抓到一條（電話）沒有舉一反三**，只修踩到的那條，沒回頭把驗證器每個欄位都掃過——所以地址、信箱是後來才一條條補。

逐欄位重新對照 `validateRegisterQueue` vs `WaitingRecord` model 後，確認**還有一條同類漏網沒修**：`gender` 驗證器只放行 `male/female`，但 model enum 明定 `male/female/other` 合法 → **驗證器比 model 嚴**，會擋掉 model 認可的 `other`。雖然目前前台 radio 只給男 / 女，但 `/queue/register` 是公開 API、model 明定 `other` 合法，驗證器不該更嚴。

同一份對照也揭露一個**反向脆弱**（驗證器比 model 寬）：`phone` / `addresses` / `consultationTopics` 在 model 是 `required:true`，驗證器卻是 `optional`。目前沒爆是因為前端簡化模式一律補了 placeholder 值兜住；但若有人直接打 API 只送姓名繞過前端，驗證器放行 → mongoose `save` 撞 `required` → 噴 500（而非友善 400）。此項涉及改 schema 或 controller 兜底，影響面較大，本 change **只建立偵測機制 + 記錄在案 + 提報懷特**，不擅自改 model。

## What Changes

把「驗證器必須對齊 model」這條人治規則換成**機制 + 測試**，三件事：

- **WS1 — 修 `gender` enum 漏網（舉一反三的最後一條）**：`validateRegisterQueue` 的 `gender` 從 `isIn(['male','female'])` 改為 `isIn(['male','female','other'])`，對齊 model enum。並逐欄位再掃一次，確認再無其他「驗證器比 model 嚴」的漏網（對照表附 `design.md`）。

- **WS2 — 驗證器↔model 一致性 contract 測試（治本核心）**：新增 `backend/tests/contract/validator-model-alignment.test.js`，用 express-validator 的 `chain.run(req)` 行為測試，三層自我維護機制：
  1. **行為對齊**：對「model 合法 + register 流程真實會送」的 payload（含最小輸入 / 空值 / 各 enum 值含 `gender:'other'` / 空地址 / 亂填信箱），跑 `validateRegisterQueue` 斷言**不報錯**。任一 model 合法值被驗證器擋下 → 紅燈（直接擋住「驗證器比 model 嚴」復發）。
  2. **enum 完整性**：對 model 每個 enum 欄位（`gender` / `addresses.*.addressType` / `consultationTopics.*`）的每個 enum 值，行為驗證驗證器都放行 → 未來 model 新增 enum 值但驗證器忘了跟進即紅燈。
  3. **欄位涵蓋 meta**：靜態 parse `waiting-record.model.js` 抽 register 相關欄位集合，對照測試的對照表，model 新增欄位但沒登記進對照 → 紅燈（機制自我維護，不會隨 schema 演進失效）。

- **WS3 — register 邊角測試 + 反向脆弱登記 + 刻意嚴格登記**：
  - 補 register 真實邊角案例測試（簡化模式 / 只填姓名 / 空地址 / 亂填信箱 / `gender:'other'` / 最小輸入），斷言能成功通過驗證。
  - 「驗證器比 model 寬」（反向脆弱）以**行為自動偵測**抓全集（對每個 model 必填欄位實際省略後跑驗證器，放行者即反向脆弱），斷言恰等於 `KNOWN_VALIDATOR_LOOSER` 白名單——比 hardcode 更 robust。獨立驗證階段藉此自動抓到原先漏掉的第 4 個欄位 `gender`（enum 已對齊但必填方向仍寬）。`design.md` 記載兩個治本方向（改 model 誠實 vs controller 兜底），提報懷特裁示是否納入本 change 或另案。
  - 「驗證器比 model 嚴但刻意」（如 `gregorianBirthYear` 的民國年 1-150 sanity bound、model 無 min/max）登記 `KNOWN_VALIDATOR_STRICTER` 並附行為佐證，與「意外嚴格（缺陷）」明確區分（`design.md` D3）。

- **WS5 — 反向脆弱根治：後端補值兜底（懷特 6/24 裁示，`design.md` D4/D5/D6）**：維持簡化模式填假值的前提下，讓後端成為「保證 model 必填欄位有值」的最後防線，杜絕「直接打 API 漏送→500」：
  - `consultationTopics`：簡化模式 `applyDefaultValues` 補上（原本漏補的唯一 top-level 缺口）。
  - 非簡化模式 `validateRequiredFields` 補 `addresses`/`consultationTopics` 友善 400。
  - `familyMembers.*.name` 加驗證器對齊 model（加了家人沒填名字→400，無法合理補假值）；`familyMembers.*.gender` optional isIn + 後端補待填。
  - `gender` 缺漏一律補 `'other'`（用途改「待填」標記、復用既有 enum 值零 schema 變更）不分模式；前端 7 處顯示「待填」、後台性別下拉「其他」改標「待填」。

### Scope 邊界（MUST 明確）

- **本 change 負責**：`gender` enum 對齊（WS1）+ validator↔model 一致性測試機制（WS2）+ register 邊角測試與反向脆弱登記（WS3）。全部只動 `validateRegisterQueue` 與測試檔。
- **反向脆弱根治（D2）**：懷特 6/24 裁示「維持簡化模式填假值、走後端 service 補值兜底」（不改 model `required:true → false`、不動 schema）。納入本 change WS5。
- **本 change 不負責**（另議）：把 `gender` 的「待填」用途與既有真正「其他性別」需求徹底分離（目前裁示為復用 `other`、放棄真正其他性別選項）；其他 admin validator 對齊。
- 不擴張到其他 validator（`validateUpdateStatus` / `validateQueueSearch` 等）或其他 model；本 change 聚焦 register 入口這條已出事的路徑。後台建客戶（`customer.routes.js`）目前 register 流程不經 `validateRegisterQueue`，不在本 change，但測試機制設計成日後可擴充。

### 執行環境邊界

- 全部變更**只在測試 repo（`DennisPai/open-queue-test`）做**。apply + 測試環境驗收通過、懷特人工核可後，才評估同步正式 repo。本 change 不自動推正式。
- ⚠️ 正式環境此刻仍有客戶報名 / 已報名查詢，**本 change 一律不碰正式**。

## Impact

- 影響檔案（apply 階段）：
  - `backend/src/validators/queueValidators.js`（WS1：`gender` enum 一行對齊）
  - `backend/tests/contract/validator-model-alignment.test.js`（WS2/WS3：新增）
- 受影響文檔：本 change 不改 API route / 回應 code / schema 欄位語意，**不觸發 contract / docs-sync 強制把關**；`gender` 行為從「擋 other」變「放行 other」屬放寬、不破壞既有合法請求，`docs/API.md` 若有列 register 欄位約束則順手對齊（無則免）。
- 風險：低。WS1 是放寬（只會讓更多合法請求通過，不會擋既有通過的）；WS2/WS3 是新增測試，不動 production code。唯一需確認：新 contract 測試本身不能有 false-positive（用 express-validator 官方 `chain.run` API，無 DB、無啟動 app，與既有三個 contract 測試同風格）。
- 不影響：資料 schema、既有端點合約、前端行為（前台 radio 仍只男 / 女）。
