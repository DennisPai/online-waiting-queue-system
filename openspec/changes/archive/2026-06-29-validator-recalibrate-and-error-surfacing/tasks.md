## 1. 後端：驗證器校準（design D1）

- [x] 1.1 `backend/src/validators/queueValidators.js`：`gregorianBirthYear` 由 `.isInt({ min:1, max:150 })` 改為 `.isInt({ min:1, max:new Date().getFullYear()+1 })`（西元年 sanity bound、動態上界），訊息改西元年語意
- [x] 1.2 同檔新增 `familyMembers.*.gregorianBirthYear`（同西元年 bound）+ `gregorianBirthMonth`(1-12) + `gregorianBirthDay`(1-31)，補齊與主客戶完全對稱（原本家人 gregorian 三欄全無規則）
- [x] 1.3 端對端再核對：前端完整模式送 name/phone/gender/email/lunar*/gregorian(年月日)/addresses/familyMembers(name/gender/lunar*/gregorian年月日/address)/consultationTopics/otherDetails/remarks。對照後唯一「驗證器擋掉前端真實值」的落差就是 gregorianBirthYear（已修），家人 gregorian 三欄為「無規則」(不會擋但不對稱，已補)。其餘欄位皆對齊、無其他落差

## 2. 後端：validateRequest 訊息可見化（design D2）

- [x] 2.1 `backend/src/utils/middleware.js` 的 `validateRequest`：驗證失敗回應新增 `message`（彙整 `errors[].msg`，以「；」連接），保留既有 `errors[]` 不動
- [x] 2.2 確認 `v1-response.js`（line 33 `payload.message || ...`）尊重既有 message、不覆蓋成 "Request failed"；契約測試新增 message 斷言佐證（見 4.2）

## 3. 白名單與契約測試修正（design D3 / spec：刻意嚴格 sanity bound）

- [x] 3.1 `backend/tests/contract/validator-model-alignment.test.js`：改寫 `KNOWN_VALIDATOR_STRICTER.gregorianBirthYear` 原因為西元年 sanity bound（移除民國年／前端不直送錯誤前提，並註明 6/29 修正）
- [x] 3.2 佐證測試改為「真實西元年 1991 佐證通過 + 未來年(currentYear+50)佐證被擋」雙向斷言

## 4. 測試：真實 payload 回歸（spec：register 邊角輸入須有測試覆蓋）

- [x] 4.1 新增「完整模式真實 payload」回歸測試（含西元 gregorianBirthYear + 家人西元生年）斷言通過；並把 baseline fixture `full_valid` 的 gregorianBirthYear 由 80（舊破口值）改為西元 1991，使 baseline 本身成回歸防線
- [x] 4.2 新增「validateRequest 驗證失敗回應帶可讀 message」測試：400 且 message 非 "Request failed"、errors[] 仍在；通過時放行 next

## 5. 本地 CI 閘門（merge 前鐵律）

- [x] 5.1 `cd backend && npm test` 全綠：18 suites / 220 tests 全通過（含改動的 validator-model-alignment 契約測試 30/30）
- [x] 5.2 `cd backend && npm run lint` 0 error（7 warnings 全為既有檔、非本次改動檔）；前端零改動、免 build

## 6. 部署測試環境

- [x] 6.1 `git push origin`（測試 repo）commit `fbcd1ec`（d449b10..fbcd1ec）
- [x] 6.2 Zeabur 測試後端 deployment = RUNNING（poll 4 轉綠）+ `/health` ok（新 startTime 14:22:39）

## 7. 獨立整合／操作驗證（design D4；由獨立 sub-agent 跑、非實作者）

- [x] 7.1 ✅PASS 完整模式 admin 登記（含西元 gregorianBirthYear 1991+家人 2003）→ HTTP 201（原為 400 "Request failed"），by 獨立 sub-agent
- [x] 7.2 ✅PASS 前台公開完整模式 → 201；簡易模式只填姓名 → 201（無回歸）
- [x] 7.3 ✅PASS 非法值(9999) → 400 + message「國曆出生年格式不正確（需為有效西元年）」+ errors[]（非 Request failed）
- [x] 7.4 ✅PASS admin settings 端點非法 body → 400 + message「Invalid value」+ errors[]（非 Request failed；附帶觀察：該端點為英文預設訊息、屬全站一致性議題另議）
- [x] 7.5 ✅ 清理：刪 3 筆假資料、0 殘留、simplifiedMode 還原 false、issuedCount 還原 4

## 8. 文檔同步與回報

- [x] 8.1 docs/API.md 錯誤回應格式段補述：驗證失敗額外帶 `errors[]` + `message` 為彙整可讀字串（非 Request failed）。契約測試重跑 4 suites/40 綠，無破壞
- [x] 8.2 推 CC 儀表板 + Discord 回報懷特（含 S1-S5 驗證證據）；**正式環境同步＝重大決策、escalate 待懷特核可**（不自行 sync prod）
