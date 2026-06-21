> 全部任務只在測試 repo（`DennisPai/open-queue-test`）執行。每條附稽核 file:line 證據（皆已親自 Read code 核對）。
> 實作與驗證分離：WS1-WS4 由實作 agent 做，WS5 由**獨立**驗證 agent 跑端對端整合測試（feedback_separate_implement_verify_agents）。

## 1. WS1 — 完成功能修復（前端，解懷特看到的 500）

- [ ] 1.1 P0-1：`QueueTable.jsx:347` 的 `onChange={(event) => onCompletionChange(event, row._id, event.target.checked)}` 改傳兩參數 `(row._id, event.target.checked)`，對齊 `useQueueActions.js:103` 的 `handleCompletionChange(recordId, completed)`。證據：QueueTable.jsx:347（3 參數）vs useQueueActions.js:103（收 2 參數）→ recordId 收到 event 物件 → `/queue/[object Object]/status` → CastError 500
- [ ] 1.2 P0-2：在 `useQueueActions.js` 定義 `handleCompleteFromDialog`（呼叫與 `handleCompletionChange` completed 分支同等的 `updateQueueStatus({ id, status:'completed' })`）並加入 return（`:293` 區）。證據：AdminDashboardPage.jsx:101 解構、:354 `onCompleteFromDialog={handleCompleteFromDialog}`，但 useQueueActions return 無此 handler → undefined → 點擊拋 `onCompleteFromDialog is not a function`
- [ ] 1.3 P0-1/P0-2 共同：確認改後完成動作只送合法 ObjectId（非 event 物件）；對 `updateQueueStatus` thunk 鏈（`queueSlice.js` → `queueService.js`）端對端檢查 id 型別。證據：稽核資料流 8 步（QueueTable→AdminDashboardPage→useQueueActions→queueSlice→queueService→controller findById）

## 2. WS2 — 認證資安閘門

- [ ] 2.1 P0-3：`auth.routes.js:21-29` register route 在 `protect` 後加 `restrictTo('admin')`（確認 `restrictTo` 已存在於 `utils/middleware`，若無則一併補）。證據：auth.routes.js:22 只有 protect、無 restrictTo
- [ ] 2.2 P0-3：`auth.controller.js:85` 的 `role: role || 'staff'` 改白名單 `role === 'admin' || role === 'staff' ? role : 'staff'`，杜絕任意 body.role 提權。證據：auth.controller.js:63 取 body.role、:85 直接 `role || 'staff'`
- [ ] 2.3 P0-4：`app.js:58-59` limiter 掛載路徑 `/api/auth`→`/api/v1/auth`、`/api/queue/register`→`/api/v1/queue/register`（對齊 `:132` 實際路由前綴）。證據：app.js:58-59 vs :132 `app.use('/api/v1', ...)` → 限流器掛在不存在路徑
- [ ] 2.4 P0-4：設 `app.set('trust proxy', 1)`（Zeabur 反向代理後 client IP 判定；保守單層）。證據：design R3、express-rate-limit 在代理後需 trust proxy 才能正確取 client IP
- [ ] 2.5 P0-5：`queue.routes.js:8` register route 掛上既有孤兒驗證器——`require('../../validators/queueValidators')` 的 `validateRegisterQueue` + `validateRequest` middleware。證據：queue.routes.js:8 無 validator、validators/queueValidators.js:11 `validateRegisterQueue` 存在但未被引用
- [ ] 2.6 P0-5：確認 `validateRegisterQueue` 的欄位規則涵蓋實際 register body（name/familyMembers/農曆生日等），缺漏欄位驗證補上（與 P1-15 `Array.isArray(familyMembers)` 守衛協調，但本 change 只做 register 入口必要驗證）。證據：validators/queueValidators.js:11-（既有規則）

## 3. WS3 — 結束本期資料正確性

- [ ] 3.1 P0-6：`end-session.admin.controller.js:217-223` 重設 `$set` 補 `issuedCount: 0, orderIndexCounter: 0`（直寫不受 default 遮蔽，見 design D-E）。證據：:219 只有 currentQueueNumber:0、漏 issuedCount/orderIndexCounter → 下期誤判額滿
- [ ] 3.2 P0-7：`system-setting.model.js` 新增 `sessionEnding: { type: Boolean, default: false }` 鎖欄位。證據：design D-C
- [ ] 3.3 P0-7：`end-session.admin.controller.js:85` endSession 入口改原子搶鎖 `findOneAndUpdate({ sessionEnding: { $ne: true } }, { $set: { sessionEnding: true } }, { new: true })`，搶不到回 409；`finally` 釋放 `sessionEnding: false`。證據：:85-214 整段無冪等鎖、雙擊→totalVisits 翻倍 + 重複 VisitRecord
- [ ] 3.4 P0-7：前端結束本期按鈕送出即 disable、收到回應前不可再點（雙保險）。證據：design D-C、稽核 BE-25/DATA-1/EDGE-3
- [ ] 3.5 P0-8：`end-session.admin.controller.js:264-267` `autoGroupHouseholds` 取地址改用 optional chaining 並排除佔位值：`const addr = cust.addresses?.[0]?.address?.trim(); if (!addr || addr === '臨時地址') continue;`，對齊 `:176` VisitRecord 階段的正確排除。證據：:264-267 取 `cust.addresses[0].address.trim()` 無排除臨時地址、無 optional chaining vs :176 已正確排除
- [ ] 3.6 P0-9：`customer.model.js` 新增 `needsReview: { type:Boolean, default:false, index:true }` 與 `possibleDuplicateOf: [{ customerId:ObjectId, score:Number, reason:String }]`。證據：現 schema 無複核標記欄位（customer.model.js:1-80）、design D-A
- [ ] 3.7 P0-9：重寫 `findOrCreateCustomer`（`end-session.admin.controller.js:14-74`）為「name gate 撈同名候選 → 多特徵加權評分（生日/phone含編輯距離typo容錯/地址/性別）→ 信心分級」：HIGH(≥50) 自動併、MID(20–50) 建新+標 needsReview+記 possibleDuplicateOf、LOW(<20)/無同名 建新客。門檻定為可調常數。證據：:25-32 exact match 過嚴過鬆雙缺陷、design D-A 狀況矩陣與評分表
- [ ] 3.8 P0-9：新增人工複核 API（admin.routes.js + controller）：`GET /admin/customers/duplicates`（列 needsReview）、`POST /admin/customers/:id/merge`（確認同人，併入目標+先 saveSnapshot 再刪來源，destructive）、`POST /admin/customers/:id/dismiss-duplicate`（確認不同人，清標記）。merge 同步 `docs/API.md`（contract 測試會擋）。證據：design D-A 複核閉環、先寫後刪鐵律
- [ ] 3.9 P0-9：前端新增「疑似重複客戶」最小清單頁（列 needsReview 客戶 + 疑似對象 + 「確認同人合併 / 確認不同人」兩鈕），接 3.8 API。證據：design D-A「人工最少化但仍能介入」
- [ ] 3.10 P0-8/P0-9 共同：在測試 DB 造張霶濱情境資料（同名+生日同+phone typo／同名全缺／同名真不同人／全填臨時地址）驗證 autoGroupHouseholds 不錯組、findOrCreateCustomer 分級正確（HIGH 併、MID 標、LOW 建新），WS5 整合測試覆蓋。證據：稽核 DATA-12/15/16、design D-A 驗證段

## 4. WS4 — destructive 操作快照防護

- [ ] 4.1 P0-10：`queue.admin.controller.js:567-591` `clearAllQueue` 在 `WaitingRecord.deleteMany({})`（:572）前補 `await saveSnapshot({ operation:'clear-all-queue', collection:'waitingrecords', beforeData:<清空前全部記錄>, operatorId:req.user?.id })`，與 `:217`/`:530` 同 pattern。**保留 endpoint（前端 useQueueActions.js:224 在用，見 design D-B）**。證據：:572 deleteMany 無 saveSnapshot、:7 已 import saveSnapshot
- [ ] 4.2 P0-10：確認 `saveSnapshot` 失敗時的處理（end-session 用 fire-and-forget；clear-all 屬主動 destructive，建議 await 並在快照失敗時中止刪除、回錯誤——比 end-session 更嚴格，因無後續歸檔當第二備份）。證據：design D-B、先寫後刪鐵律

## 5. WS5 — 回歸測試 + 獨立驗證（實作後派新 agent）

- [ ] 5.1 補 WS1 前端測試：完成勾選框 + 對話框完成各送出一次，斷言 `updateQueueStatus` 收到的 `id` 是合法 record `_id` 字串（非 event 物件、非 undefined handler）。證據：P0-1/P0-2
- [ ] 5.2 補 WS2 資安測試：非 admin token 打 register → 403（P0-3）；register body 帶 `role:'admin'` 由 staff 發 → 被降為 staff 或 403（P0-3）；limiter 對 `/api/v1/auth/*` 生效（P0-4）；register 無效欄位 → 400（P0-5）。證據：P0-3/4/5
- [ ] 5.3 補 WS3 end-session 測試：重設後 `issuedCount==0 && orderIndexCounter==0`（P0-6）；併發/雙擊 endSession 第二次回 409 且 totalVisits 不翻倍（P0-7）；全填臨時地址的多客戶不被組成一家（P0-8）；同名無生日 + 不同 phone 不被併單（P0-9）。證據：P0-6/7/8/9
- [ ] 5.4 補 WS4 測試：clearAllQueue 後 snapshot 集合有一筆 `clear-all-queue` 快照、beforeData 含清空前記錄數（P0-10）。證據：P0-10
- [ ] 5.5 解除 `backend/tests/contract/known-issues.test.js` 既有 2 個 `skip`（rate-limiter / register），改為真實斷言（對應 P0-4 / P0-5 修好後應轉綠）。證據：known-issues.test.js 2 skip
- [ ] 5.6 派**獨立**驗證 agent（非實作者）跑端對端整合測試：實機 curl 觸發 register 提權 / endSession 雙擊 / clearAllQueue，對比 DB 狀態與預期（feedback_end_to_end_data_flow_check）。證據：design R1
- [ ] 5.7 依 AGENTS.md 文檔維護 SOP：若任一 P0 改了端點行為/回應 code，同步 `docs/API.md`（route↔API.md contract 測試會擋）；跑 `cd backend && npm test`（含 contract 測試）+ `npm run lint` 全綠。證據：CLAUDE.md 最高指導原則第 6、AGENTS.md SOP
- [ ] 5.8 部署測試環境（push origin → Zeabur TEST service 雙 service RUNNING → /health 200 → 前端登入後台實測完成勾選框/對話框/結束本期/清空），Discord 回報待懷特人工驗收。證據：CLAUDE.md 部署流程
