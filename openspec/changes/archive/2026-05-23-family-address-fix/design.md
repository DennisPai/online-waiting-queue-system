## Context

修玄宮候位系統的「家人資料」貫穿前後端、報名/編輯/歸檔三個資料流，但結構從未對齊：

- **waiting-record**（候位中的客戶）：純量 `address`（default `'臨時地址'`）
- **visit-record**（結束本期後歸檔的歷史紀錄）：**沒有 address 欄位**
- **後台「新增家人」UI hook**：陣列 `addresses: [{address, addressType}]`（跟前後 schema 都不一致）
- **前台「新增家人」UI**：純量 `address`（跟 waiting-record schema 一致）

任何一條結構不對齊都會讓家人地址在某個流程被靜默丟棄。Change A 的設計重點在「並發/原子性/排序一致性」、Change C 重點在「生日農曆 / 取消入口」，本 Change B 重點在 **schema 結構對齊**。

### 為什麼現在才修

之前測試環境的「家人地址」流程主要走前台 1-3 位範圍，schema 看起來能用 → bug 沒爆。Phase 6.4 跑 D1-D5 拖動驗收時懷特問起家人地址流程，重看 code review 報告 line 85-100 確認問題 5 還沒被任何 Change 處理，所以單獨開 Change B。

## Key Decisions

### D1：家人地址欄位統一純量 `address`，禁用陣列 `addresses`

**選項**：
- A. 把後台 hook 改純量 `address` ✓（採用）
- B. 把 schema + 前台 + waiting-record 全改陣列 `addresses[]`（跟主客戶結構對齊）
- C. 維持後台陣列，加 controller 層 transform 把陣列拍平成純量

**選 A 理由**：
1. **改動最小**：B 要動 3 個檔（schema/前台/waiting-record）+ migration 歷史資料；C 要寫脆弱的 controller transform。A 只改 1 行 hook
2. **語意正確**：家人本身就是「附屬於主客戶的個體」，每人 1 個地址比每人多地址更直覺
3. **跟 waiting-record schema 已有結構一致**：schema 本就是純量 `address`，不需動 DB schema
4. **跟前台一致**：前台 RegisterForm 也是純量，後台對齊
5. **跟主客戶 `addresses[]` 分離合理**：主客戶代表「整戶」可有多地址（家、公司、醫院）；家人是「附屬個體」，地址跟著主客戶或自填一個就夠

### D2：visit-record familyMember 子 schema 補齊對齊 waiting-record

**問題**：visit-record 的 familyMembers 只有 `{name, zodiac}`，少了 9 個欄位（gender / 國曆 3 / 農曆 4 / virtualAge / address / addressType）。歸檔時 `WaitingRecord.familyMembers` → `VisitRecord.familyMembers` 直接 assign，這 9 個欄位全被靜默丟掉。

**修法**：visit-record 子 schema 補齊跟 waiting-record familyMember 子 schema 100% 同步（同 default / 同 enum / 同 validate）。

**為什麼不抽共用 schema**：
- mongoose 子 schema 抽出 reuse 在不同 model 間可行，但會引入「跨 model 結構耦合」風險（一改俱改、影響面難追蹤）
- 兩個 model 用途略不同（waiting=current/visit=history），日後可能想加只在 history 的欄位（如 `archivedAt`），各自獨立寫更可控
- 維護痛點：複製兩份的代價（小），不抽共用 schema

### D3：waiting-record 子 schema `address` default 改 `''`

**問題**：default `'臨時地址'` 會讓「未填地址」的家人在 DB 裡顯示「臨時地址」字串。前端編輯時看到欄位有「臨時地址」會誤判「已填」，不去輸入真實地址。

**修法**：default 改 `''`（空字串）。

**為什麼不刪除 default**：
- 留空字串 default 比 `null` / `undefined` 更安全（前端 TextField `value={member.address || ''}` 就不會撞 `undefined`）
- mongoose schema 對 String type 也習慣用空字串 default

**歷史資料怎麼辦**：
- 歷史 record 已存的 `'臨時地址'` 字串保留不動，作 audit trail。
- 不做 migration 「批改 `'臨時地址'` → `''`」（會抹除歷史證據誰被 default 填過）
- 前端編輯時可 hint「臨時地址（建議更新為真實地址）」（**選做、不在本 Change Phase**）

### D4：歸檔流程（end-session）對齊新 schema

修 visit-record schema 後，`end-session.admin.controller.js` 把 waiting → visit assign 的 code 不用改（schema 同步後 mongoose 會自動帶完整欄位）。但要驗：實際歸檔走完，VisitRecord 真的存到家人 address。

### D5：前端 UI 不動

前端編輯 family member dialog 已經是 `value={member.address}` 純量 read（review 報告 line 87 確認），改 hook 物件結構後**前端 UI 自動接上**、不用改 UI code。

只有「新增家人」hook 那段物件初始化要改，其他都不動。

### D6：兼容處理 — 歷史已存的陣列 `addresses` 殘留

理論上 review 報告說「殘留的 addresses 陣列又被 Mongoose schema 靜默丟棄」，所以 DB 不會有 `addresses` 殘留。**但保險起見**，Phase 6 驗證時用 raw `collection.findOne` 看歷史 record 是否有 `addresses` 殘留欄位，若有則寫個 migration `$unset`。

預期：不會有（schema strict mode default ON、unknown field 不存）。但驗證一下不會錯。

## Risks / 注意事項

### 風險

1. **VisitRecord schema 變更可能影響既有 archived 資料的讀取**
   - 補欄位（add）不影響既有資料讀（缺欄位 = undefined，前端要會處理）
   - 但前端讀 VisitRecord 時可能假設 `familyMember.zodiac` 一定存在（既有只有 name/zodiac），補欄位後**新欄位 undefined** 要前端容錯
   - 緩解：前端讀 VisitRecord 的 code 已存在，要 audit 看是否假設特定欄位存在

2. **Change A 的 issuedCount / orderIndex 不受影響**
   - Change B 只改 schema 子文件，不動 SystemSetting、不動 active 計算
   - Regression 風險低，但仍要驗（Phase 6 含項目）

### 注意事項

- 後台「編輯既有家人地址」流程 review 報告說端到端通，本 Change 不應該破壞它 → Phase 6 必驗 regression
- 前台一般報名（1-3 家人含地址）流程也要驗 regression
- 結束本期歸檔是破壞性操作，Phase 6 設計時要規劃還原方式（或 dry-run / 部分驗證）
