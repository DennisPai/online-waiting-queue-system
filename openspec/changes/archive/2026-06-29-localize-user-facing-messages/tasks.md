## 1. A — auth.routes.js 補繁中 withMessage（7 條）

- [x] 1.1 `auth.routes.js` 7 條規則補繁中 withMessage；**並修正多驗證子鏈**（register username/password/email + change-password newPassword 的 `notEmpty` 原本被 trailing withMessage 漏掉、空值仍吐英文）→ 改為每個 validator 各掛 withMessage

## 2. A — admin.routes.js 補繁中 withMessage（28 條）

- [x] 2.1 `admin.routes.js` 候位管理類 17 條補繁中 withMessage（皆單驗證子鏈、trailing withMessage 正確覆蓋）
- [x] 2.2 同檔 event-banner 類 11 條補繁中 withMessage（`.optional().isX().trim()` 的 isX 為唯一 validator、已覆蓋）

## 3. B — 後端 controller 對外 message 繁中（7 條，保留 token）

- [x] 3.1 `event.admin.controller.js` 2 條（對齊方式/字體粗細）翻繁中，enum 採「中文（原文 enum）」如「靠左（left）」
- [x] 3.2 `queue.admin.controller.js` 2 條翻繁中
- [x] 3.3 `settings.admin.controller.js` 3 條翻繁中 prose、保留 dry-run/execute/_id token

## 4. C + D — 共用層 fallback + 前端 label

- [x] 4.1 `v1-response.js` 失敗 fallback `'Request failed'` → 「請求失敗，請稍後再試」
- [x] 4.2 `CustomerCreatePage.jsx` `label="Email"` → 「電子郵件」；**獨立驗證另抓到盤點漏網**：`CustomerDetailPage.jsx:320` `<Typography>Email</Typography>`（後台客戶資料卡）也補成「電子郵件」。前端廣掃確認再無其他英文 label 殘留

## 5. 防回歸 contract 測試（source-scan）

- [x] 5.1 新增 `tests/contract/route-validator-message.test.js`：掃 routes/v1 + validators，balanced-paren 解析每鏈，斷言「withMessage 數 ≥ validator 數」（比「每鏈至少一個」更嚴、能抓多驗證子漏網；sanitizer/custom 不計）
- [x] 5.2 對補完後現況跑：2/2 綠（掃到 >10 鏈、零漏網）

## 6. CI 閘門（merge 前鐵律）

- [x] 6.1 `npm test` 全綠：**19 suites / 222 tests**（含新增 route-validator-message 2）；grep 既有測試無 'Invalid value' 斷言、不破
- [x] 6.2 `npm run lint` **0 error**（7 既有 warning）；前端 `CI=true npm run build` 編譯成功 0 error

## 7. 部署測試環境

- [ ] 7.1 commit（bracket-prefix 繁中）+ `git push origin`（測試 repo）
- [ ] 7.2 Zeabur 測試前後端 deployment = RUNNING + `/health` 存活（前端有改、確認前端服務也重新部署）

## 8. 獨立驗證（由獨立 sub-agent、非實作者）

- [x] 8.1 ✅PASS 獨立 sub-agent 實機：V1 simplifiedMode→「精簡模式必須是布林值」、V2 maxOrderIndex→「最大號碼必須是正整數」、V3 register 缺 username→「請輸入帳號；帳號長度需 3-50 字」(核心空值修正)、V4 login 缺 password→「請輸入密碼」，皆 400 繁中、無 "Invalid value"
- [x] 8.2 ✅PASS V5 event-banner enum→「標題對齊方式無效」；V6 全程無 "Request failed"；V7 前端 bundle「電子郵件」×11
- [x] 8.3 ✅ V7 抓到 1 處盤點漏網（CustomerDetailPage Email label）已補修 + build 通過；副作用檢查：非法值全驗證失敗、simplifiedMode 未被改、無建立使用者/殘留

## 9. 文檔同步與回報

- [x] 9.1 docs/API.md 未逐列驗證訊息文字、免改；CHANGELOG 不動（正式同步時才記）。commit 標 [no-docs-needed]
- [x] 9.2 推 CC + Discord 回報結果（含 V1-V7 驗證證據 + 漏網補修）；正式環境同步另案、待核可
