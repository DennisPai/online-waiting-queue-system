## Context

盤點（CC `xiuxuangong/i18n-audit-2026-06-29`）確認系統對外文案已高度繁中化，缺口集中：
- A（35）：`auth.routes.js`(7) / `admin.routes.js`(28) 的路由內聯 express-validator 規則沒掛 `.withMessage`。`utils/middleware.js` 的 `validateRequest` 會把失敗規則 `e.msg` 串成 `message` 回前端，無 withMessage 即吐英文預設 `"Invalid value"`。
- B（7）：`event.admin` / `queue.admin` / `settings.admin` controller 少數英文／中英混雜對外 message。
- C（1）：`v1-response.js` 失敗 fallback `'Request failed'`。
- D（1）：`CustomerCreatePage.jsx` `label="Email"`。
- E：依懷特裁示，E1/E2/E4 不納入、E3/E5 併入 B。

約束（沿用 repo 慣例）：合併前 `npm test` + `npm run lint` 全綠；改 route/回應 code 才需動 `docs/API.md`（本變更只改 message 文字、不改 route/code）；只動測試環境。

## Goals / Non-Goals

**Goals:**
- 消除所有使用者／管理員可見的英文與中英混雜對外訊息（A+B+C+D），改為一致繁體中文。
- 建立「對外訊息須繁中」的規格與防回歸測試，使日後新增無 `.withMessage` 的 route validator 即被攔下。

**Non-Goals:**
- 不改驗證邏輯／route／回應 code／欄位結構（A 只加訊息文字）。
- 不翻譯非展示字串：程式識別符、enum 值與技術 token（`left`/`center`/`dry-run`/`execute`/`_id`…）、回應 code 枚舉、HTTP header（E4）、開發者誤用斷言（E1）、成功語意預設 `'OK'`（E2）。
- 不導入 i18n 框架／多語系（本系統單一語言＝繁中，硬編即可，過度工程化沒必要）。
- 不動正式環境（另案、待核可）。

## Decisions

### D1：A 區逐條補繁中 `.withMessage`，文案用盤點建議稿、對齊既有語氣
直接在 `auth.routes.js` / `admin.routes.js` 的內聯鏈每條規則後補 `.withMessage('繁中')`，文案採盤點清單建議（如 `isBoolean` → 「…必須是布林值」、`isInt({min:1})` → 「…必須是正整數」），與 `queueValidators.js` 既有繁中語氣一致。不重構路由結構。

### D2：B 區翻 prose、保留 enum/技術 token
controller 對外 message 翻繁中，但句中的 enum 值與技術 token 保留原文（必要時加中文說明），讓「錯誤訊息」與「API 實際接受值」一致、不誤導呼叫者。維運端點（migrate / restore 的 dry-run/execute）同則處理。

### D3：C/D 直接置換
`v1-response.js` 失敗 fallback `'Request failed'` → 「請求失敗，請稍後再試」（此為「`success:false` 但無 message」時的對外預設；validateRequest 已會帶 message，故此預設只在極少數無訊息失敗時出現）。前端 `CustomerCreatePage.jsx` `label="Email"` → 「電子郵件」。

### D4：防回歸＝source-scan contract 測試
新增無 DB 的 contract 測試：解析 route 檔（至少 `auth.routes.js` / `admin.routes.js`，可含全部 route 檔）內的每個 express-validator 鏈（從 `body(`/`param(`/`query(` 起算），斷言每個鏈**至少有一個 `.withMessage(`**。任何新增「無 withMessage 的 route validator 鏈」即 CI 紅燈。
- **為何 source-scan 而非整合測試**：route-inline validator 未具名匯出，整合測試需起 app + DB + auth，太重；source-scan 與既有 `route-api-contract` / `dead-links` 等 contract 測試同風格、無 DB、快。
- **限制（誠實記載）**：此 heuristic 抓「整條鏈零 withMessage」（即本次缺口型態），不保證抓「多驗證子鏈中段漏 withMessage」的細粒度情形；對目前缺口足夠，未來若需更細可再強化。

## Risks / Trade-offs

- [A 補 withMessage 可能撞既有測試斷言英文 msg] → 實作前先 grep 測試是否有斷言 `'Invalid value'`；有則一併更新。`npm test` 全綠把關。
- [B 翻譯誤動到 enum/token 破壞 API 語意] → D2 明定保留 token；測試與既有 controller 行為測試把關。
- [source-scan 測試誤判既有合法寫法] → 先對現況跑一次（補完後應全綠），對 `queueValidators.js`（已全 withMessage）應通過、對補完的 routes 應通過。
- [遺漏某個對外字串] → 以盤點清單為據逐條改；獨立 sub-agent 驗證階段再掃一次確認無英文殘留。

## Migration Plan

1. 測試 repo 實作 A/B/C/D + D4 測試。
2. `cd backend && npm test` + `npm run lint` 全綠（前端改動跑 `CI=true npm run build` 確認）。
3. push 測試 repo → Zeabur 測試部署 RUNNING + `/health`。
4. 獨立 sub-agent 驗證：實機觸發數個 A 區端點的驗證失敗，確認回繁中 message（非 "Invalid value"）；掃描確認無英文對外殘留。
5. Discord + CC 回報。正式同步另案、待核可。
6. 回滾：`git revert` + 重新部署測試環境。

## Open Questions

- source-scan 測試覆蓋範圍：僅 `auth`+`admin` route，或含全部 route 檔（`queue`/`customer` 已繁中、納入可防未來回歸）——傾向納入全部 route 檔，實作時定。
