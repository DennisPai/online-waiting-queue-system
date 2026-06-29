# Proposal: 全站對外訊息一致繁體中文化

## Why

系統對外文案已高度繁中化，但仍有零散缺口會讓使用者看到英文或中英混雜訊息——最系統性的是**路由內聯 express-validator 規則沒掛 `.withMessage()`**：驗證失敗時 `validateRequest` 會把規則的預設 `msg` 回給前端，沒掛訊息就直接吐 express-validator 英文預設 `"Invalid value"`（2026-06-29 修 register bug 時於 admin 設定端點實測到）。這對宮廟管理員與客戶都不友善、且與全站繁中體驗不一致。本變更把這些對外訊息一次補齊為繁體中文，並建立「對外訊息須為繁中」的規格與防回歸測試。

盤點全文（每條 file:line + 建議繁中）：CC `xiuxuangong/i18n-audit-2026-06-29`。

## What Changes

- **A｜後端 validator 缺 `.withMessage`（35 條）**：為 `auth.routes.js`（7）與 `admin.routes.js`（28）所有路由內聯 express-validator 規則補上繁中 `.withMessage()`，消除 `"Invalid value"` 英文預設。（公開報名 `queueValidators.js` 已全繁中、不在此範圍。）
- **B｜後端回應英文／中英混雜 message（7 條）**：`event.admin` / `queue.admin` / `settings.admin` controller 的對外 message 翻為繁中 prose，**保留 enum 值與技術 token 原文**（如 `left`/`center`/`right`、`normal`/`bold`、`dry-run`/`execute`、`_id`）以對齊 API 實際接受值。
- **C｜共用層預設（1 條）**：`utils/v1-response.js` 失敗 fallback `'Request failed'` → 「請求失敗，請稍後再試」。
- **D｜前端 UI（1 條）**：`pages/admin/CustomerCreatePage.jsx` 的 `label="Email"` → 「電子郵件」。
- **E｜邊界判斷（依懷特裁示）**：E1 `FontSizeContext` 開發者誤用錯誤、E2 成功預設 `'OK'`、E4 `X-Deprecated` HTTP header **不納入**（非使用者可見／屬語意值／屬技術 header）；E3、E5 翻 prose、保留 enum/mode token（併入 B 處理）。
- **防回歸**：新增測試斷言「掛 `validateRequest` 的路由驗證鏈，驗證失敗回應的 `message` 不得為 `Invalid value` 等英文預設」，使日後新增無 `.withMessage` 的規則即紅燈。

## Capabilities

### New Capabilities
- `user-facing-message-localization`：規範「所有對外（使用者／管理員可見）的訊息——API 驗證失敗訊息、回應 message、共用層預設、前端 UI 字串——SHALL 為繁體中文；程式識別符、enum 值、回應 code 枚舉、技術／品牌名、HTTP header、開發者專用斷言等非展示字串為明確例外」，並以測試防止英文預設回歸。

### Modified Capabilities
（無——本變更新增訊息語言規範，不改既有 capability 的行為需求；A 區補 `.withMessage` 只改訊息文字、不改驗證邏輯，與 `input-validation-integrity` 的對齊需求無衝突。）

## Impact

- **程式碼**：
  - `backend/src/routes/v1/auth.routes.js`、`admin.routes.js`（補 `.withMessage`）
  - `backend/src/controllers/admin/event.admin.controller.js`、`queue.admin.controller.js`、`settings.admin.controller.js`（message 繁中）
  - `backend/src/utils/v1-response.js`（fallback 繁中）
  - `frontend/src/pages/admin/CustomerCreatePage.jsx`（Email label）
  - 新增／擴充測試（驗證失敗訊息非英文預設）
- **回應契約**：僅改 message 文字內容，不改 route / 回應 code / 欄位結構（不觸發 route↔API.md / code-registry contract 紅燈）；`docs/API.md` 無逐條列這些訊息文字，預期免改（實作時確認）。
- **前端**：1 個 label 文字，無邏輯改動。
- **環境**：僅測試環境（`open-queue-test`）實作與驗證；正式同步另案、待懷特核可（與先前 validator 修復一併擇期同步）。
- **風險**：低——純文案；唯一行為面是「使用者現在看得到正確中文錯誤原因」。需確認 `.withMessage` 補上後既有測試（若有斷言英文 msg）不破。
