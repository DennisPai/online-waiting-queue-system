## Context

`/queue/register` 的輸入驗證有兩段：先過 express-validator 鏈 `validateRegisterQueue`，失敗時由 `validateRequest`（`backend/src/utils/middleware.js`）回 400；通過後才進 `QueueService.registerQueue` 的業務驗證（`validateRequiredFields`）與 mongoose model。

兩個事實在實機重現中確認：
1. 前端完整模式把**西元出生年**（lunarToGregorian 算出，如 1991）放進 `gregorianBirthYear` 送出；驗證器 `gregorianBirthYear.isInt({ min: 1, max: 150 })` 以 1991 > 150 擋下。`WaitingRecord.gregorianBirthYear` 在 model 端**無 min/max**。
2. `validateRequest` 失敗回 `{ success:false, errors:[...] }`、**無 message**。回應信封 `v1-response.js`（line 33）為 `message: payload.message || ... 'Request failed'`——既有 message 會被尊重，缺 message 時才補預設 `'Request failed'`。故前端只拿得到 `Request failed`，真正原因 `errors[0].msg`（「出生年必須是 1-150 之間的整數」）被吞掉。

約束：此 repo 不用 MongoDB transaction；改 API route/回應 code 需同步 `docs/API.md`（CI contract 測試把關）；合併前 `npm test`（含 3 契約測試）+ `npm run lint` 須全綠；只動測試環境，正式環境另經核可。

## Goals / Non-Goals

**Goals:**
- `gregorianBirthYear`（含家人）驗證規則對齊「前端實際送出的西元年」，不再擋掉合法 payload。
- 驗證失敗的回應一律帶可讀 `message`，全站 express-validator 端點受惠、不再黑箱 `Request failed`。
- 把讓本缺陷出貨的破口補起來：白名單錯誤前提修正 + 真實 payload 回歸測試。
- 含實機操作驗證（後台＋前台完整模式報名、簡易模式、其他受影響端點）。

**Non-Goals:**
- 不從零重建 `validateRegisterQueue`（懷特裁示「重新校準」非「重建」；它 6/24 才逐欄位審過，重建反增回歸風險）。
- 不改 `gregorianBirthYear` 的 model 欄位語意，不做歷史資料 migration（此次只動「新報名輸入驗證」，不碰既存記錄）。
- 不處理已登記在案的「驗證器比 model 寬（反向脆弱）」另議項目。
- 不動正式環境（另案、需核可）。

## Decisions

### D1：`gregorianBirthYear` 改為「西元年合理範圍」而非民國年上界
改 `gregorianBirthYear`（主客戶）與新增 `familyMembers.*.gregorianBirthYear`（補對稱）為 `.optional().isInt({ min: 1, max: <當前西元年 + 1> })`。上界用「當前西元年 + 1」動態算（生日不可能在未來；+1 容時區邊界），可自我更新、永不擋掉前端送的真實西元年。
- **為何不直接拿掉規則**：model 雖無 min/max，但保留一個「永不擋真實值」的 sanity bound 仍有防呆價值（擋負數／未來年／明顯髒值），且符合既有 spec「刻意嚴格須登記」框架——只是這次要附**正確**前提。
- **為何不沿用 1-150**：那是民國年尺度，與此欄西元語意根本錯置，正是缺陷本身。
- **替代方案**：純 `isInt()` 無上界（最寬、零回歸但失去未來年防呆）；或靜態 `max: 9999`（簡單、不依賴時鐘但語意較鬆）。動態 `currentYear+1` 語意最正確，測試以同法動態算上界、不寫死避免脆弱。
- **家人欄位**：與主客戶語意一致故規則一致；採同樣寬鬆 sanity bound，對家人真實西元 payload 永不誤擋（消除「主客戶有約束、家人無規則」的不對稱）。

### D2：在 `validateRequest` 補 `message`，不動 `v1-response`
`validateRequest` 失敗回應改為附 `message`（彙整 `errors[].msg`，以「；」連接），保留 `errors[]` 結構不動。
- **為何修這層**：`v1-response` 既已尊重既有 `message`（line 33），只要驗證器帶上 message 即可直達前端；改一處、全站 express-validator 端點同時受惠。
- **向後相容**：僅**新增** `message` 欄位、不移除 `errors[]`；前端 `queueSlice` 既有解析本就優先讀 `error.response.data.message`，無需改前端。
- **替代方案**：改 `v1-response` 預設訊息（否決：那層拿不到欄位級原因，只能給更通用字串，治標不治本）。

### D3：白名單修正為「前提正確 + 行為佐證」，而非刪除
`KNOWN_VALIDATOR_STRICTER` 對 `gregorianBirthYear` 保留登記（D1 後仍是 model 未定義的 sanity bound），但**改寫前提**為正確版本：「西元出生年 sanity bound（正整數、不在未來）；已以前端完整模式真實 payload（西元年）佐證不會擋掉合法值」。並補真實 payload 行為測試作為佐證。
- **為何不只是改數字**：讓缺陷出貨的不是數字、是「憑欄位名假設語意 + 測試只用 model 合法/最小輸入、從不送前端真實 payload」。必須補上「以前端實際 payload 佐證」這道把關，否則同類還會再犯。

### D4：測試與驗證分兩層、驗證者獨立
- **契約/回歸（無 DB）**：在 `validator-model-alignment.test.js`（或新增測試檔）加「完整模式真實 payload」案例——含西元 `gregorianBirthYear`、家人含西元生年——斷言通過 `validateRegisterQueue`；並斷言白名單 premise 已更新。
- **整合/操作驗證（懷特要求、由獨立 sub-agent 跑、非實作者）**：對測試後端 curl 實打——①後台 admin 完整模式登記、②前台公開完整模式報名、③簡易模式登記，皆預期 201；④故意送非法值預期 400 且回應帶**真正 message**（非 `Request failed`）；⑤抽驗其他用到 `validateRequest` 的端點，確認 message 也現形。比對結果與預期。

## Risks / Trade-offs

- [改 `validateRequest` 影響全站端點] → 僅新增 `message` 欄位、不動 `errors[]`，信封已尊重既有 message；操作驗證階段抽驗其他端點確認無破壞。
- [動態 `currentYear+1` 上界使測試對時鐘敏感] → 測試以同法動態計算上界，或對「真實西元年（如 1991）通過」「未來年（currentYear+50）被擋」分別斷言，不寫死年份。
- [家人新增驗證規則可能擋掉原本被放行的髒值] → 採永不擋真實西元年的寬鬆 bound；操作驗證含「帶家人的完整 payload」確認放行。
- [歷史髒資料：民國年曾被誤存進 gregorian 欄位] → 本變更只驗「新報名輸入」，不讀／不改既存記錄，無 migration、不影響歷史資料。
- [回應新增 message 是否屬回應契約變更] → 僅新增欄位、不新增 code、不改 route；若 `docs/API.md` 有列驗證錯誤格式則同步，否則免（不觸發 contract 測試紅燈）。

## Migration Plan

1. 在 `open-queue-test`（測試 repo）實作 D1–D3 + D4 測試。
2. 本地 `cd backend && npm test`（3 契約 + 新測試）+ `npm run lint` 全綠。
3. `git push origin`（測試 repo）→ Zeabur 測試環境自動部署 → 用 Zeabur API 確認 deployment RUNNING + `/health`。
4. 獨立 sub-agent 跑 D4 操作驗證；不過則回修（≤2 輪），通過才算完成。
5. Discord 回報懷特。**正式環境同步為另案、需懷特核可**。
6. 回滾：`git revert` 該 commit + 重新部署測試環境。

## Open Questions

- `gregorianBirthYear` 上界最終採「動態 `currentYear+1`」（本設計推薦）或「靜態 generous max」——實作時若動態造成測試脆弱可降級靜態，two-way door、不需事先定死。
- `message` 彙整全部 `errors[].msg` 或只取首條——本設計採彙整（資訊較全），若實測過長再縮為首條，屬實作細節。
