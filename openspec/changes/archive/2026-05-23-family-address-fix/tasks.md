## 1. Phase 1 — 後台「新增家人」物件結構改純量 `address`（前端）

- [x] 1.1 `frontend/src/hooks/admin/useQueueUI.js:140` — `addFamilyMember` 把 `addresses: [{ address: '', addressType: 'home' }]` 改成 `address: ''` + `addressType: 'home'`（純量）
- [x] 1.2 同檔 grep 其他 family 相關 hook（addOnCreate / addOnEdit 等）有無沿用陣列結構，一併修正
- [x] 1.3 `frontend/src/pages/admin/CustomerCreatePage.jsx` / `CustomerDetailPage.jsx` 等使用 hook 的 page 確認讀寫家人地址用純量 `member.address`（review 報告說端到端是通的、要 confirm）
- [x] 1.4 前端不動 UI（dialog field 已是純量 read）

## 2. Phase 2 — visit-record familyMember 子 schema 補齊欄位（後端）

- [x] 2.1 `backend/src/models/visit-record.model.js:24-27` 把 `familyMembers: [{ name, zodiac }]` 擴充為跟 `waiting-record.model.js` familyMember 子 schema 100% 同步（含 name / gender / 國曆 3 / 農曆 4 / virtualAge / zodiac / **address** + addressType）
- [x] 2.2 保留 `{ _id: false }` 設定（跟 waiting-record familyMember 一致，避免子文件 ID 噪音）
- [x] 2.3 看 `backend/src/controllers/admin/end-session.admin.controller.js` 把 WaitingRecord → VisitRecord 歸檔的 assign 邏輯，確認 schema 同步後完整欄位會自動帶（不用改歸檔 controller）

## 3. Phase 3 — waiting-record `address` default 改 `''`（後端）

- [x] 3.1 `backend/src/models/waiting-record.model.js:78`（addressSchema）把 `default: '臨時地址'` 改 `default: ''`
- [x] 3.2 同檔 familyMember 子 schema `address` field（line 76 附近）若有同款 default 也改 `''`
- [x] 3.3 grep 全 backend 確認沒有別處 hardcode `'臨時地址'` 字串（如 service layer / controller / utility）
- [x] 3.4 **不做 migration 改歷史資料**（保留 audit trail，design.md D3）

## 4. Phase 4 — Unit test + 程式層驗證

### 4.1 Unit test

- [x] 4.1.1 `backend/tests/queue.service.test.js`（或新建 `backend/tests/family-address.test.js`）加 test case：
  - 報名時帶完整家人含 `address` → DB 確認 address 有存
  - 報名時帶家人不帶 address → DB 確認 address 是 `''`（不是 `'臨時地址'`）
- [x] 4.1.2 `backend/tests/end-session.test.js` 加 test case：
  - 結束本期歸檔 → VisitRecord 的 familyMembers 完整保留 address + 其他欄位（不丟）
- [x] 4.1.3 全部 test 跑通（106 既有 + 新增 ≥ 3，0 regression）

### 4.2 程式層 API contract 驗證（local 跑，部署前先確認）

- [x] 4.2.1 mock test（jest）：模擬前端 `useQueueUI.js:addFamilyMember()` 產出的新物件，丟進 mongoose schema validate → 確認所有欄位都被接受（不 strict-mode 丟棄）
- [x] 4.2.2 schema sync 驗證：寫 jest 或 script 比對 `waiting-record.familyMember` 子 schema 跟 `visit-record.familyMember` 子 schema 的 paths/types，**要 100% 一致**（避免日後一邊改一邊忘）
- [x] 4.2.3 default check：jest 建立沒填 `address` 的家人 → save 後讀回 → 確認 `address === ''`（不是 `'臨時地址'`）
- [x] 4.2.4 既有 schema-related test（waiting-record.test.js / system-setting.test.js 等）不被破壞

## 5. Phase 5 — Code Review（懷特 5/23 要求：寫完後檢視程式邏輯有沒有問題）

### 5.1 自我 review checklist

- [x] 5.1.1 改完的前端 hook 邏輯：純量 `address` 是否真的被全部 code path 一致使用？grep 全 frontend 確認沒有別處還在用 `addresses[]` 陣列結構
- [x] 5.1.2 改完的後端 visit-record schema 跟 waiting-record familyMember 子 schema：欄位 / type / default / enum / validate 全部 100% 對齊？逐欄位 diff
- [x] 5.1.3 default 改完後既有歷史資料（已存 `'臨時地址'`）讀取行為：mongoose 不會在讀取時把 `'臨時地址'` 改成 `''`（default 只在 create/save 時套用），確認 read path 不被影響
- [x] 5.1.4 grep `addresses[` `addresses:` 全 repo 確認沒誤改主客戶的 `addresses[]`（主客戶用陣列是設計、不能動）
- [x] 5.1.5 grep `臨時地址` 全 repo 確認改乾淨（含註解、test 寫死、frontend i18n 等）

### 5.2 派 sub-agent 獨立 review（Opus 4.7）

- [x] 5.2.1 派 sub-agent 拉一個獨立視角看：「Change B 修法是否真的解決『後台新增家人地址填不進去』問題？有沒有遺漏的 code path / 副作用 / regression 風險？schema 變更是否會破壞既有 archived 資料的讀取？」brief 必含 5.1 各項細節 + 完整檔案路徑 + 修法 commit hash
- [x] 5.2.2 sub-agent 報告若有 BLOCKER → 回到 Phase 1-3 修正
- [x] 5.2.3 sub-agent 報告若有 NICE-TO-HAVE → 評估是否進 scope 或留 follow-up

## 6. Phase 6 — Local + 部署

- [x] 6.1 Local `npm test` 全綠（106 既有 + Phase 4 新增 ≥ 3 + Phase 5 schema sync test ≥ 1，合計 ≥ 110）
- [x] 6.2 Local frontend `CI=true npm run build` 不破壞（[[reference_ci_build_lint_warning]]）
- [x] 6.3 commit + push 測試 repo `open-queue-test`
- [x] 6.4 Zeabur backend + frontend 部署 RUNNING（用 Zeabur API 自助驗證 commitSHA）

## 7. Phase 7 — 實機驗證（懷特 5/23 要求：含完整驗證階段與清單 + 實際進系統操作）

### 7.1 API 類驗證（我 curl）

- [x] 7.1.A1 報名一筆 with 1 家人含 address `'家人地址1'` → 查 DB raw 文件確認 `familyMembers[0].address === '家人地址1'`
- [x] 7.1.A2 報名一筆 with 2 家人（一個有 address、一個不填）→ DB 確認 `familyMembers[0].address === '家有地址'` 且 `familyMembers[1].address === ''`（**不是 `'臨時地址'`**）
- [x] 7.1.A3 報名一筆只有主客戶、無家人 → DB `familyMembers === []`
- [x] 7.1.A4 報名一筆帶家人地址走完整流程後再用 admin update endpoint 改該家人 address → DB 確認新 address 寫入

### 7.2 UI 類驗證 — 後台新增家人（懷特操作 + 我 curl 驗 DB）

懷特操作 → 我用 curl 驗 DB 真實狀態（避免前端顯示假象）：

- [x] 7.2.B1 懷特登入 `/login` → 進 `/admin/dashboard` → 點某現有候位的「編輯」按鈕（鉛筆 icon）
- [x] 7.2.B2 在編輯 dialog 內點「**新增家人**」按鈕
- [x] 7.2.B3 在新加的家人 row 填：姓名 `測試家人A`、性別 male、出生 70 年 5 月 5 日、**地址 `測試家人地址A`**、地址類型 home
- [x] 7.2.B4 再點「新增家人」加第二位：`測試家人B`、地址 `測試家人地址B`
- [x] 7.2.B5 點「儲存」/「確認」送出
- [x] 7.2.B6 **我 curl** GET `/admin/queue/<id>` 看 DB 真實 familyMembers 是否完整存到 2 位含 address
- [x] 7.2.B7 懷特把 dialog 關掉、重新打開該客戶編輯 dialog → 確認 2 位家人地址 UI 顯示正確（不是 `'臨時地址'`、不是空白）

### 7.3 UI 類驗證 — 後台「加到第 4-5 位家人」（最關鍵 — 必踩坑情境）

- [x] 7.3.C1 懷特延續 7.2 的客戶（已有 2 位家人）→ 編輯該客戶
- [x] 7.3.C2 連加 3 位家人到第 5 位（後台上限）：`測試家人C/D/E`，各填地址 `家人地址C/D/E`
- [x] 7.3.C3 點儲存
- [x] 7.3.C4 **我 curl** 看 DB 5 位家人地址全到位
- [x] 7.3.C5 懷特關掉再開 dialog 看 5 位地址都顯示正確
- [x] 7.3.C6 全部清乾淨：admin delete 該客戶 / 或還原家人到測試前狀態

### 7.4 regression — 前台一般報名（不能被 Change B 破壞）

- [x] 7.4.D1 我 curl 前台 `POST /queue/register` 帶 3 家人含 address → 200 + DB 3 位家人地址完整
- [x] 7.4.D2 我 curl 前台 register 帶 0 家人 → 200 + DB `familyMembers === []`
- [x] 7.4.D3 我 curl 前台 register 帶 4 家人（超前台上限）→ 應回 400「最多 3 位」（既有功能）

### 7.5 regression — 後台「編輯既有家人地址」（review 報告說端到端通的、要 regression）

- [x] 7.5.E1 懷特登入後台 → 編輯某既有客戶（有家人地址）→ 改其中一位家人 address → 儲存
- [x] 7.5.E2 我 curl 看 DB 該家人 address 確實改成新值

### 7.6 結束本期歸檔 — VisitRecord 完整性（**破壞性測試，選 A 真 end-session**）

⚠️ 懷特 5/23 裁示選 A：真實 end-session、最大化模擬真實功能、測試環境就要這樣做。

⚠️ 順序：必須安排在 7.1-7.5 都跑完之後（end-session 會清空 active queue），且要事先準備還原方案。

#### 7.6.F1 前置：準備還原方案
- [x] 7.6.F1.a 把當前 active queue 完整 export 成 JSON snapshot（含每筆 record 的所有欄位、家人、地址）寫到 `/tmp/pre-endsession-snapshot.json`
- [x] 7.6.F1.b 看是否有 seed script 可重 import 53 筆 baseline（檢查 `backend/scripts/seed/` 或類似）；若有就 documented re-seed 指令，若無就 import snapshot 那條路
- [x] 7.6.F1.c 寫一個還原 script `/tmp/restore-from-snapshot.js`（讀 snapshot 用 raw collection.insertMany 重建 WaitingRecord、跑 recalc-counters 對齊 issuedCount）

#### 7.6.F2 報名測試客戶
- [x] 7.6.F2.a 報名一筆「歸檔測試專用」客戶 `EndSessionTest01`，帶完整 1 主客戶 + 3 家人（每位都含 address `家人地址1/2/3`）
- [x] 7.6.F2.b 我 curl 確認該筆寫入完整

#### 7.6.F3 執行 end-session（破壞性）
- [x] 7.6.F3.a 懷特按「**結束本期**」按鈕（dashboard 上）
- [x] 7.6.F3.b 我 curl `GET /admin/customers/<id>/visits`（或對應 VisitRecord endpoint）看歸檔的 visit record
- [x] 7.6.F3.c **關鍵驗證**：VisitRecord.familyMembers 完整保留 `EndSessionTest01` 的 3 位家人 + 每位的 9 個欄位（含 address）
- [x] 7.6.F3.d 驗證 active queue = 0（清空）

#### 7.6.F4 還原 baseline
- [x] 7.6.F4.a 跑 `/tmp/restore-from-snapshot.js` 或 re-seed 指令
- [x] 7.6.F4.b 驗 active 回到 53 筆、orderIndex 1..53 連續
- [x] 7.6.F4.c recalc-counters 對齊 issuedCount
- [x] 7.6.F4.d **我自己 diff 驗證**：把 snapshot.json 跟還原後 `GET /admin/queue/list?limit=200` 結果**逐欄位 diff**（jq 比對 _id / orderIndex / queueNumber / status / name / phone / addresses / familyMembers 全段），全部 0 差異 才算還原成功，懷特不用逐筆肉眼比對

### 7.7 Change A regression（issuedCount / orderIndex / partial unique 不受影響）

- [x] 7.7.G1 跑完 7.1-7.6 後 `recalc-counters?mode=dry-run` 看 before / computed 是否一致
- [x] 7.7.G2 active 列表連續 1..N
- [x] 7.7.G3 報名 → cancel → restore 走一輪、orderIndex 仍正常壓回

### 7.8 完整驗收報告 → Discord 推給懷特

- [x] 7.8 寫 Phase 7 驗收報告（含 7.1-7.7 各項 PASS/FAIL + DB raw 文件 + 必要截圖），Discord reply 完整匯總

## 8. Phase 8 — 完整收尾

- [x] 8.1 把 Change B push 進測試 repo（open-queue-test），等懷特 OK 後再 patch 到正式 repo（online-waiting-queue-system）
- [x] 8.2 follow-up：歷史 `'臨時地址'` 字串清理（**不在本 Change scope**，留 mini-patch 跟 Change A 的 3 件附帶發現一起處理）
- [x] 8.3 follow-up：VisitRecord 既有 archived 資料補欄位（**不在本 Change scope**，歷史資料當下就沒存無法回填）
