> 全部任務只在測試 repo（`DennisPai/open-queue-test`）執行。逐欄位對照真值表見 `design.md` §1。
> 實作與驗證分離：WS1-WS3 由實作完成後，WS4 由**獨立**驗證 agent 跑（feedback_separate_implement_verify_agents）。

## 1. WS1 — 修 `gender` enum 漏網（舉一反三）

- [x] 1.1 `backend/src/validators/queueValidators.js` 的 `gender` 從 `isIn(['male', 'female'])`（:30）改為 `isIn(['male', 'female', 'other'])`，對齊 model enum `[male,female,other]`（`waiting-record.model.js:132`）。加註解說明「對齊 model enum、驗證器不可比 model 嚴」。證據：design §1 gender 列、model:130-134。
- [x] 1.2 逐欄位再掃一次 `validateRegisterQueue` 全 14 欄位，對照 model required/optional/enum，確認 `gender` 修完後**再無其他「驗證器比 model 嚴」的漏網**（design §1 真值表已列：`name`/`email`/`gregorianBirth*`/`addresses.*.address`/`addressType`/`consultationTopics.*` 皆已對齊或更寬）。若發現新漏網，補進本 WS 並更新 design §1。

## 2. WS2 — 驗證器↔model 一致性 contract 測試（治本核心）

- [x] 2.1 新增 `backend/tests/contract/validator-model-alignment.test.js`，實作 `runRegister(body)` helper：用 express-validator 官方 `chain.run(req)` + `validationResult` 跑 `validateRegisterQueue`，回傳 `{ isEmpty, paths }`（design §2 決策 D1 選項 B）。無 DB、無啟動 app。
- [x] 2.2 **第 1 層 行為對齊測試**：對「model 合法 + register 真實會送」的 payload，斷言對應欄位不在 error `paths`。最少涵蓋：完整合法 payload（baseline）、簡化模式實送 payload（phone='0000000000'/空 email/空地址/['other']/民國生年）、`gender:'other'`、空地址 `[{address:''}]`、亂填信箱、只填姓名。證據：design §3 第 1 層。
- [x] 2.3 **第 2 層 enum 完整性測試**：宣告 model 三個 enum 欄位真值（`gender:[male,female,other]`、`addresses.*.addressType:[home,work,hospital,other]`、`consultationTopics.*:[body,fate,karma,family,career,relationship,study,blessing,other]`），對每個 enum 值跑 `runRegister` 斷言驗證器放行。證據：design §3 第 2 層、model enum 定義。
- [x] 2.4 **第 3 層 欄位涵蓋 meta 測試**：靜態讀 `waiting-record.model.js` source，抽 top-level schema 欄位名集合（regex 解析 `waitingRecordSchema` 的 key），對照測試裡宣告的 `COVERED_FIELDS`；model 有但對照表沒有的欄位 → 斷言失敗（提示「新增 model 欄位請補進 validator-model 對照」）。排除 timestamps 自動欄位（createdAt/updatedAt）與 virtual。證據：design §3 第 3 層、route-api-contract.test.js 的 source-parse 範式。
- [x] 2.5 加「parser 非空」防呆測試（對照既有 route-api-contract.test.js:70）：確保 model 欄位集合 / enum 集合解析非空，避免 parser 壞掉導致假性通過。

## 3. WS3 — register 邊角測試 + 反向脆弱登記

- [x] 3.1 在同檔補 register 真實邊角案例描述測試（與 2.2 fixtures 共用但獨立 describe block 表達「真實使用情境」語意）：簡化模式 / 只填姓名 / 空地址 / 亂填信箱 / `gender:'other'` / 最小輸入，斷言 `isEmpty`（能成功通過驗證、不被擋）。證據：design §3、feedback_validator_align_model_edge_cases「測試必含最小輸入/邊角空值」。
- [x] 3.2 **反向脆弱白名單登記**：宣告 `KNOWN_VALIDATOR_LOOSER = { phone, addresses, consultationTopics }` 附原因註解（model required 但 validator optional、靠前端簡化模式補值兜住），加一個斷言「目前已知 validator-looser 欄位就這三個」——未來有人把別的欄位改寬卻沒登記即提示。**此測試不修問題、只記錄在案**。證據：design §4 決策 D2。
- [x] 3.3 在 design §4 已記載反向脆弱兩方向（改 model 誠實 vs controller 兜底）；**Discord 提報懷特裁示**是否納入本 change 或另案。本 change 不擅自改 schema。

## 4. WS4 — 跑測試 + 獨立驗證（實作後派新 agent）

- [x] 4.1 `cd backend && npm test` 全綠（含新 `validator-model-alignment.test.js` 與既有三個 contract 測試 + 全部 unit）。先確認「未修 gender 前」2.2/2.3 的 `gender:'other'` 案例會**紅燈**（證明測試真的抓得到漏網），再套 WS1 修正轉綠（防假性通過）。
- [x] 4.2 `cd backend && npm run lint` 通過（無新增 warning，CI=true 會把 warning 當 error）。
- [x] 4.3 派**獨立** implementation-validator agent（非實作者），對照 `proposal.md` / `design.md` / `specs/` 逐條檢查：三層測試是否都實作、gender 是否對齊、白名單是否登記、有無 false-positive 或漏掉的 model 合法值。輸出 findings。
- [x] 4.4 獨立驗證（implementation-validator）findings 處理：0 critical / 3 minor 全數採納並強化——(1) 反向脆弱改「行為自動偵測」自動抓到第 4 個欄位 `gender` 並登記；(2) 新增 `KNOWN_VALIDATOR_STRICTER` 登記 `gregorianBirthYear` 刻意嚴格、與意外嚴格區分（design D3 / spec 新需求）；(3) 修 fixture email 註解。補做「先紅後綠」流程確認（暫還原 gender→精準 3 紅→再修綠）。
- [x] 4.5 Discord 回報 + 推 CC：測試結果 + 反向脆弱（D2）提報懷特裁示是否納入本 change 或另案。等核可後才談同步正式。

## 5. WS5 — 後端補值兜底根治反向脆弱（懷特 6/24 裁示：維持簡化模式填假值、走 service 補值）

> 深入 code 後修正先前判斷：後端 `applyDefaultValues` **已**在簡化模式補 phone/gender/addresses，真正 500 缺口只剩下列。逐一掃完同類（feedback_validator_align_model_edge_cases「不修一個算一個」）。

- [x] 5.1 `QueueService.applyDefaultValues`（簡化模式）補上漏掉的 `consultationTopics`：缺漏/空陣列補 `['other']` + `otherDetails`「簡化模式快速登記」（對齊前端）。證據：applyDefaultValues 原只補 gender/phone/addresses、漏 consultationTopics → 簡化模式繞過前端只送姓名會撞 model required→500。
- [x] 5.2 `QueueService.validateRequiredFields`（非簡化模式）補上 `addresses` / `consultationTopics` 必填檢查（原本只查 name/phone/農曆）：缺漏回友善 400 而非 500。空陣列也擋（`!Array.isArray || length===0`）。gender 走 5.4 補待填、不在此 400。
- [x] 5.3 `queueValidators.validateRegisterQueue` 加 `familyMembers.*.name`（notEmpty + 長度 1-50）對齊 model：沒加家人不觸發；加了家人沒填姓名→友善 400 而非 model 500。
- [x] 5.4 **gender「待填」標記（懷特 6/24 裁示：復用既有 `other`、零 schema 變更，見 design D6）**。後端 ✅：gender 缺漏一律補 `'other'`（待填）、不分模式、移到 `processQueueData` 統一處理；家人 gender 同補 `'other'`；`queueValidators` 加 `familyMembers.*.gender` optional isIn。前端 ✅：**gender 顯示處實際散在 11 檔（非原寫死的 7 檔——獨立驗證揪出工具層遺漏，已系統性 grep 補全）**：7 畫面檔 + `utils/pdfGenerator.js`（原把待填印成「女」）+ `utils/exportUtils.js`×3（Excel 待填→空白/未設定）全部顯示「待填」；後台性別下拉「其他」改標「待填」；**前台 register 下拉（BasicInfoSection/FamilySection）移除「其他」選項**（other≡待填 後前台不該選到，對齊 D6 放棄真正其他性別）。
- [x] 5.5 後端測試：service 補值（簡化缺 consultationTopics / gender 缺補 other / 家人 gender 補 other）成功不噴 500；非簡化缺 addresses/consultationTopics→400；空家人→400；contract 測試 familyMembers.*.name + .*.gender 對齊。後端 216 tests 綠。前端 CI=true build 綠。
- [x] 5.6 獨立 validator 驗 WS5：A(500 路徑全堵)/C(scope 精準)/D(驗證器對齊)/E(測試無假性)/F(未破壞既有) 全 PASS；揪出 B 項 4 個 critical（前端工具層 gender 顯示遺漏）已全修 + 前台 other 選項已移除。
- [x] 5.7 **測試 repo 完整走完（懷特 6/24「請跑完、不碰正式」）**：commit `beb61f4`+`1dd7668` → push DennisPai/open-queue-test → Zeabur 測試部署（後端/前端皆 RUNNING）→ **Chrome 實機驗證全通過**：簡化只填姓名→201 不噴 500｜後端補值 gender=other/phone/地址/主題 DB 確認｜後台詳情「性別：待填」（截圖）｜諮詢主題仍「其他」（scope 精準）｜前台性別下拉只男/女（截圖）｜空家人→400。正式環境全程未碰。
