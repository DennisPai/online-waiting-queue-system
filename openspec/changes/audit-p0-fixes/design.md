## Context

2026-06-20 稽核：5 個 READ-ONLY 檢查 agent（known-bug / backend / data / frontend / edge）共報 94 條，一個獨立評估員（implementation-validator，非檢查者）逐條 Read code 驗證、跨 agent 去重、修正一條根因誤判（known-bug 把懷特看到的 500 誤判成後端 VersionError，實為前端 P0-1 參數錯位），最終裁出 P0×10 / P1×16 / P2×13。本 change 範圍鎖 P0×10。

所有 P0 位置已在 propose 階段親自 Read code 逐行核對（`docs-governance` 確認未動任何業務 code，行號全準）。

## Goals / Non-Goals

**Goals**
- 解掉懷特實際看到的「完成→500」（P0-1 為顯性根因，P0-2 為第二個完成入口死按鈕）
- 堵兩個資安 Blocker：register 提權（P0-3）、rate limiter 死掛載（P0-4）+ register 入口驗證（P0-5）
- 修結束本期四個資料正確性問題：不歸零（P0-6）、無冪等（P0-7）、臨時地址錯組（P0-8）、name-only 誤併（P0-9）
- destructive `clearAllQueue` 補快照（P0-10）
- 每條 P0 有對應回歸測試，CI 全綠

**Non-Goals**
- 不修 P1/P2（含 catchAsync 全面化、農曆顯示回歸、calendarConverter 語意、XSS escape 等）
- 不改未列端點合約、不改既有 schema 欄位語意（P0-7 僅新增鎖 flag）
- 不自動推正式；不用 transaction

## Decisions

### D-A：P0-9 改「加權模糊比對 + 信心分級 + 人工複核閉環」（懷特已拍板 A1+A2，並依張霶濱真實案例升級）

**懷特裁示（2026-06-20）**：選 A1+A2，並提供正式環境真實案例「張霶濱」——同一人卻有兩筆客戶：一筆 phone 正確（來過 8 次）、一筆 phone 錯誤（1 次）。目標：「結束本期一鍵下去就正確歸檔、人工介入最少化」，並要求多狀況推導最佳解。

**問題根因（已 Read code 確認）**：現況 `findOrCreateCustomer`（`:25-32`）用 **exact match**——`{ name }`，且僅當 `lunarBirthYear != null` 才把生日加入。任一次填寫不一致（生日填錯/漏填、或姓名前後空白）就比不中既有客戶 → 建立重複新筆。phone 根本不參與比對。於是同一人會因「某次生日或 phone 填寫不同」被拆成多筆（張霶濱即此類），而缺生日時又退化成 name-only → 同名不同人被錯併。**現況同時「過嚴（同人被拆）」與「過鬆（不同人被併）」。**

**狀況矩陣（張霶濱 + 系統推導，機器可否自動判定）**：

| 狀況 | name | 生日 | phone | 機器應為 |
|---|---|---|---|---|
| 同人重訪（全同） | 同 | 同 | 同 | 自動併 |
| 同人這次生日填錯/漏 | 同 | 異/缺 | 同 | 自動併（靠 name+phone）|
| 同人這次 phone typo | 同 | 同 | 近似 | 自動併（靠 name+生日 + phone 近似）← 張霶濱 |
| 同名 + 生日phone皆不同 | 同 | 異 | 異 | **無法區分「同人雙錯」vs「真不同人」→ 人工複核** |
| 同名缺生日缺phone（家人） | 同 | 缺 | 缺 | **無法區分 → 人工複核** |

第 4、5 列從資料上機器無法判定，這正是「必須留人工複核出口」的本質——不是偷懶，是資訊不足下唯一安全解。

**決策：以「name 為 gate 撈候選 → 多特徵加權評分 → 信心分級」取代 exact match。**

- **撈候選**：用 trim 後 name 撈出所有同名 Customer（name 是最穩特徵）。無同名 → 確定新客。
- **加權評分**（每個候選算分；門檻可在測試資料上調校，先定基準）：
  - 農曆生日年月日全同 `+50`；年同但月/日缺或其一不同 `+20`；國曆生日全同 `+40`
  - phone 完全相同且非空 `+40`；phone 編輯距離=1（單字 typo）`+25`；距離=2 `+10`
  - 地址相同且非「臨時地址」`+20`；性別相同非空 `+5`
  - （反證）生日兩邊皆完整但完全不同 `−30`；phone 兩邊皆完整但編輯距離>3 `−15`
- **信心分級決策**：
  - 最高分 **≥ 50（HIGH）→ 自動併入**（至少一個強特徵命中，如生日全同／phone 全同／生日年同+phone 近似）
  - **20 ≤ 最高分 < 50（MID）→ 建新檔 + 標記 `needsReview` + 記 `possibleDuplicateOf`**（候選 id/score/reason），進人工複核佇列
  - 最高分 **< 20 或無同名 → 建新檔（新客）**
- **A1+A2 如何體現**：有 phone/生日等特徵 → 高分自動收斂（A1 的精神，但容錯 typo）；特徵不足無從區分 → 不自動併、標記待複核（A2）。錯併比漏併難復原，故模稜兩可一律偏向「不自動併 + 標記」。

**新增 Customer 欄位**（`customer.model.js`）：`needsReview: { Boolean, default:false, index:true }`、`possibleDuplicateOf: [{ customerId, score, reason }]`。

**人工複核最小閉環**（達成「人工最少化但仍能介入」）：
- `GET /api/v1/admin/customers/duplicates`：列 `needsReview=true` 的客戶 + 疑似對象
- `POST /api/v1/admin/customers/:id/merge`：確認同人 → 把來源筆 totalVisits/VisitRecord/householdId 併入目標、刪來源（**destructive：先 `saveSnapshot` 再刪**），清 needsReview
- `POST /api/v1/admin/customers/:id/dismiss-duplicate`：確認不同人 → 清 needsReview/possibleDuplicateOf
- 前端 admin 一個「疑似重複客戶」清單頁（最小版：列出 + 兩個動作鈕）

**Scope 判斷（我作為被授權決策者）**：核心修正（加權比對 + 信心分級 + 標記）是 bug 本體、必做；複核 API + 最小 UI 是讓 MID 案例有人工出口的必要閉環，一併做（否則標記無處理），但 UI 只做最小清單。此 scope 比原提案「加 phone 鍵」大，已透明記於此 + Discord 告知懷特可否決。

**驗證**：因正式 DB 連不到（admin 密碼已改 + Zeabur MongoDB 內網無對外端點，且不擅自開 public access），改在**測試 DB 造張霶濱情境資料**（同名+生日同+phone typo／同名+全缺／同名真不同人）驗證分級正確，再於 WS5 由獨立 agent 跑端對端。懷特回來可給「改後 admin 密碼／Zeabur 臨時 public access／匿名樣本」三選一供真實分布微調門檻。

### D-B：P0-10 `clearAllQueue` 保留 endpoint + 補快照（⭐偏離原稽核建議，需懷特知會）

**問題**：`clearAllQueue`（`queue.admin.controller.js:567-591`）`deleteMany({})` 前無 `saveSnapshot`，違反先寫後刪鐵律與 2026-03-02 事故教訓。

**原稽核建議**：「既已標 deprecated，直接從 route 移除/回 410」。

**我的修正**：propose 階段核對發現**前端 `useQueueActions.js:224` 實際在 `dispatch(clearAllQueue()).unwrap()`**、service/slice/route 全鏈活著——直接移除 route 會讓前端「清空候位」功能 500/404、壞掉現役功能。

**決策**：**保留 endpoint，但在 `deleteMany` 前補 `saveSnapshot`**（helper 已於 `:7` import，與 `:217`/`:530` 既有快照同 pattern）。這同時滿足「先寫後刪」與「不破壞現役功能」。若懷特確認此功能應退役，再另案從前端一併移除（不在本 change）。

### D-C：P0-7 冪等鎖用 SystemSetting 原子 flag（工程選擇）

**做法**：SystemSetting 新增 Boolean `sessionEnding`（預設 false）。endSession 入口用原子 `findOneAndUpdate({ sessionEnding: { $ne: true } }, { $set: { sessionEnding: true } }, { new: true })` 搶鎖：搶不到（已被佔）→ 回 409「結束本期進行中」；流程結束（成功或失敗）在 `finally` 釋放 `sessionEnding: false`。前端按鈕送出即 disable（雙保險）。

**為何不用 transaction / 分散鎖**：Zeabur 單節點無 ACID transaction；單一 doc 的 `findOneAndUpdate` 條件更新本身原子，足以互斥單節點併發。

### D-D：P0-3 register role 白名單（工程選擇）

route 加 `restrictTo('admin')`（只有 admin 能建帳號）；controller `auth.controller.js:85` 的 `role: role || 'staff'` 改為白名單：`role === 'admin' || role === 'staff' ? role : 'staff'`，雙層防護（route 擋未授權呼叫者，controller 擋非法 role 值）。

### D-E：P0-6 用 `$set` 直寫歸零（避開 default 遮蔽地雷）

`end-session.admin.controller.js:217-223` 的 `$set` 補 `issuedCount: 0, orderIndexCounter: 0`。`system-setting.model.js` 對這兩欄宣告 `default: 0`（`:49`/`:62`），但 `$set` 是直接賦值、不走「`=== undefined` 偵測自動補欄位」那條路徑，**不受 default 遮蔽影響**（與 reference_mongoose_default_migration 教訓相符——遮蔽只坑「偵測缺欄位」，不坑直寫）。

## Risks

- **R1（行為語意改變）**：P0-7 冪等鎖 / P0-9 併單 / P0-3 提權修正會改變既有行為。緩解：WS5 由**獨立驗證 agent**（非實作者）跑端對端整合測試（curl 觸發 + DB 對比），不只看單元測試綠（feedback_separate_implement_verify_agents / feedback_end_to_end_data_flow_check）。
- **R2（P0-9 誤併已發生）**：歷史資料可能已有錯併客戶。本 change 只「防止未來再錯併」，不含回溯清理（若需回溯另案，且回溯屬 destructive 需先快照）。
- **R3（P0-4 trust proxy）**：Zeabur 在反向代理後，`trust proxy` 設定影響 rate limiter 的 client IP 判定；設錯會讓限流以代理 IP 計數（全站共用一個額度）。需確認 Zeabur 代理層數，保守設 `trust proxy: 1`。
- **R4（front-back 同時改）**：P0-1/P0-2/P0-7 跨前後端，部署順序需前後端一起上（測試環境同 push 觸發兩個 service），避免半套狀態。
