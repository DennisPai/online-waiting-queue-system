## Context

修玄宮候位系統 2026-05-22 code review 發現 4 個影響營運的 bug（問題 1-4），共同病根是 `orderIndex` / `queueNumber` 一致性沒被保證。本 change 修這 4 個問題。完整檢測報告：`/tmp/xiuxuangong_code_review_2026-05-22.md`。

技術約束（修玄宮既有設計決策，本 change 必須遵守）：
- **絕對不用 MongoDB transaction** — Zeabur 單節點不支援 ACID transaction，`abortTransaction()` 不會回滾。並發保護要用 unique index / 原子操作 / 應用層處理，不能用 transaction。
- **先寫後刪** — 任何資料清除前先確認寫入成功。
- 不用 `mongoose.createConnection()` 獨立連線（Zeabur 部署會崩）。

## Key Decisions

### D1：取消候位用 `_id` 定位，不用 `queueNumber`
`queueNumber` 沒有 unique 約束、而且會被排序/叫號/刪除/結束本期覆寫而漂移。任何「定位特定一筆記錄」的操作都必須用 MongoDB `_id`（唯一、永不變）。取消候位 API 改吃 `_id`，並比對「姓名 + 電話」做身分驗證，雙重確保不會取消到別人。

### D2：額滿用「佔用名額」定義，`cancelled` 仍佔名額（以 `issuedCount` 原子閘門實作，見 D8）
**懷特 2026-05-22 核可的設計取捨**：
- 額滿 = `waiting` + `processing` + `cancelled` 三種狀態都算「佔用名額」
- 本期收滿 N 人就停收。一筆候位被取消（不管誤取消或客戶真的不來），名額**不自動釋出**
- 要釋出名額 → 管理員人工確認後「**刪除**」那筆記錄（`delete`，不是 `cancel`）
- 理由：誤取消若會自動釋出名額，會導致新人補進來、總辦事人數被灌爆。改成「取消不釋出、刪除才釋出」，把名額釋放的決定權交給管理員人工把關。
- 代價：客戶真的不來時，名額會暫時被 `cancelled` 記錄佔著，要管理員手動刪除才釋出 — 這個人工成本懷特接受。

`cancelled` vs `deleted` 語意自此明確分離：
- `cancelled`：候位被取消，但**仍佔用本期名額**（保留紀錄、可被恢復）
- `deleted`：管理員確認移除，**釋出名額**

**實作方式（兵推後定案）**：本決策的「佔用名額」**不**用「把額滿 query 加上 `cancelled`」實作——那只是把一個浮動值換另一個算法，仍是非原子的「先查再寫」，並發時會超收（兵推情境 1/2）。正解是 D8 的 `issuedCount` 原子閘門：`issuedCount` 只增不減，天然等價於「cancelled 仍佔名額、本期收滿就停收」。D2 是「要什麼語意」，D8 是「怎麼原子地實作這個語意」。

### D3：orderIndex 原子分配 + partial unique index
- 「讀目前最大 orderIndex → +1 → save」是非原子的，並發時兩筆會讀到同一個 max → 撞號。改用原子操作（`findOneAndUpdate` 配 `$inc`，或集中由一個 counter 發號）。
- `orderIndex` 加 **partial unique index**（只對 active 狀態 `waiting`/`processing` 約束唯一；`cancelled`/`completed`/`deleted` 不約束，因為它們不參與排序）。DB 層級擋撞號，是最後一道防線。
- 為什麼 partial：cancelled/completed 的記錄 orderIndex 可能重複或不重要，全欄位 unique 會擋掉合理情況。
- **partial unique index 的盲區（兵推情境 7 釐清，務必明白）**：partial unique index **只**保證「同一時刻 active 記錄的 orderIndex 不重複」。它 (a) 管不到 `cancelled` 記錄的 orderIndex（cancelled 不在 index 約束範圍，其 orderIndex 值對 index 而言「不存在」）→ 防不了「新報名拿到 cancelled 記錄留下的 orderIndex 空洞」；(b) 防不了超收（超收靠 D8 的 `issuedCount` 原子閘門）。partial unique index 在本 change 的定位是「理論上不該發生的撞號的最後防線」，**不是**額滿判斷工具、**不是**填洞防護。
- **與 `ensureOrderIndexConsistency` 的核心矛盾**：partial unique index 約束「active orderIndex 唯一」，而 `ensureOrderIndexConsistency` / `reorder` / `callNext` 都會「整列重寫 orderIndex」。整列重寫的中間態必然出現「兩筆暫時同 orderIndex」，會被 unique index 擋下並丟 `E11000`。本 change 必須正面解決此矛盾——見 D10（reorder 兩階段 offset）、D11（callNext 不平移）、D14（consistency 批量重寫）。

### D4：恢復報名補一致性重算
系統其他動 orderIndex 的操作（叫號、刪除、reorder）動完都會呼叫 `ensureOrderIndexConsistency()` 把 orderIndex 壓成連續 1..N，唯獨「恢復報名」這條漏了。補上即可與其他路徑一致。

### D5：reorder 後端驗證 + 不信任前端列表
目前 `reorderQueue` 完全信任前端送來的 id 列表、照下標重算整列 orderIndex。問題是前端列表可能 stale（跨拖動競態）或殘缺。後端必須驗證：收到的 id 列表 == DB 當前全部 active 記錄（數量 + 內容）。不一致就拒絕這次 reorder，回傳錯誤要前端重新整理，**不照錯列表把 DB 改壞**。

### D6：前端拖動排序鎖 UI 防跨拖動競態
`54f014b` 只解決了「同一次拖動內」的並行。跨拖動競態（reorder 已回、`loadQueueList` 還沒回時拖第二筆）還在。解法：拖動送出後鎖住拖動 UI，直到列表刷新完成才解鎖；或乾脆以 reorder API 回傳的列表為準，不依賴非同步的 `loadQueueList()`。

### D7：排序加次鍵保證穩定
`ensureOrderIndexConsistency` 目前只用單鍵 `sort({orderIndex:1})`。萬一中間態出現 orderIndex 撞號，單鍵排序結果不穩定（同 orderIndex 的相對順序由 MongoDB 自行決定，可能每次不同）。加次要排序鍵 `_id`，撞號時排序仍 deterministic。

---

> **以下 D8–D14 是 2026-05-22 並發兵推（`/tmp/changeA_wargame.md`）後新增的補強決策。兵推發現：光加 partial unique index 而不補這些配套，只是把「靜默撞號」變成「噴 HTTP 500 / 噴天書 409」——問題型態變了，沒消失。**

### D8：額滿用 `issuedCount` 原子閘門（D2 的原子化實作）
- **問題**：原 `checkQueueAvailability` 的「查 active 數量 → 比 maxOrderIndex → 寫入」是非原子三步。並發報名時多個請求在同一瞬間全部讀到「還沒滿」→ 全部通過 → 超收（兵推情境 1：30 人搶 5 個名額會收進 30 人）。把額滿 query 加上 `cancelled` 不解決此問題——那只是換一個浮動值算法，仍非原子。
- **決策**：在 `SystemSetting`（或獨立 counter 文件）新增 `issuedCount` 欄位（累計發出名額數，**只增不減**）。報名第一步執行原子閘門：
  ```js
  const gate = await SystemSetting.findOneAndUpdate(
    { issuedCount: { $lt: maxOrderIndex } },
    { $inc: { issuedCount: 1 } },
    { new: true }
  );
  // gate === null → 已額滿，直接回友善訊息「今日候位已滿」，根本走不到 create
  // gate !== null → 已原子地佔到一個名額
  ```
- **為何 `issuedCount` 等價於 D2「cancelled 仍佔名額」**：`issuedCount` 只增不減，一旦發出去就不回沖。一筆候位被 `cancelled`，它當初佔的 `issuedCount` 名額仍在 → 本期收滿就停收，與「額滿包含 cancelled 狀態」語意完全一致。D2 定語意、D8 定原子實作。
- **唯有「刪除」釋出名額**：管理員 `delete` 一筆記錄時，`issuedCount` 對應 `$inc -1`（這是 `issuedCount` 唯一允許下降的情況，呼應 D2「刪除才釋出名額」）。
- **migration**：上線時 `issuedCount` 以「目前 active + cancelled 記錄數」初始化。
- partial unique index 因此降格回「最後防線」（見 D3），不再扛額滿判斷。

### D9：admin controller 全線補 `E11000` catch 分流（不再裸吐 HTTP 500）
- **問題**：公開報名 `registerQueue` 走 `catchAsync` → `globalErrorHandler`，後者有 `err.code === 11000` 專門處理（轉 409）。但後台 `queue.admin.controller.js` 的 `callNext` / `updateQueueStatus` / `updateQueueOrder` / `reorderQueue` / `deleteCustomer` **全部用自己的 `try/catch`，catch 區塊一律 `res.status(500).json({ message:'伺服器內部錯誤' })`**。partial unique index 上線後，任何 admin 路徑撞號 → 管理員只看到「系統壞了」，沒有自動修復、也不知道是排序撞號。
- **決策**：admin controller 全線在 catch 區塊補 `E11000`（`error.code === 11000`）分流：撞號 → 回友善訊息（「排序衝突，請重新整理後再操作」）或依該操作性質做重試（見 D12），**不再回赤裸的 500**。其他非 11000 error 才走原本的 500。
- 另外 `globalErrorHandler` 對 orderIndex/queueNumber 的 11000 不應直接吐欄位名（「orderIndex 已存在」對宮廟客戶是天書），轉成可理解的友善訊息。

### D10：reorder 改「兩階段 offset 寫入」（避開中間態撞 unique index）
- **問題**：`reorderQueue` 用 `Promise.all` 把 N 筆記錄同時 `findByIdAndUpdate` 成最終 `1..N`。並行寫入沒有順序保證——當目標排列是現有 orderIndex 的非平凡置換時，置換過程必然出現「兩筆暫時同 orderIndex」的中間態 → partial unique index 把該筆寫入擋下並丟 `E11000` → `Promise.all` 整個 reject → HTTP 500。tasks 原 4.4「驗證 `Promise.all` 並行寫不會產生中間態撞號」的假設**不成立**。
- **決策**：reorder 改成兩階段 offset 寫入：
  - **第一階段**：把所有要動的記錄 orderIndex set 成「大偏移臨時值」（例如 `+100000`、或負數區間），保證離開 `1..N` 區間、彼此仍唯一 → 不與任何 active 記錄撞號。
  - **第二階段**：把這些記錄從臨時值 set 成最終 `1..N`。
  - 兩階段的目標值區間都與「另一階段尚未處理的記錄值」不重疊，全程不會出現中間態撞號。

### D11：callNext 不用 `updateMany $inc -1` 全體平移
- **問題**：`callNext` 目前流程是「第一筆 → completed」+「`updateMany({status active}, {$inc:{orderIndex:-1}})` 全體 -1」。`updateMany $inc -1` 與「並發新報名插入 active 集合」一起跑時，新報名者也在 active 集合裡會被一起 -1 → 與既有記錄撞號；且 `updateMany` 遇 unique 衝突會**中止剩餘文件更新**（半殘）→ 隊伍順序撕裂 + HTTP 500（兵推情境 4）。
- **決策**：callNext 不做全體平移。第一筆設 `completed`（一變 completed 就離開 partial unique index 約束範圍），**其餘記錄的 orderIndex 不動**——讓 orderIndex 變成 `2..N`（留一個空洞）無妨，因為排序只看相對大小。連續的 `1..N` 由 `ensureOrderIndexConsistency()` 在安全時機壓回（見 D14）。

### D12：`E11000` 撞號處理策略（原子發號為主、retry 為輔）
- **問題**：design / tasks 原本完全沒定義「撞 `E11000` 之後怎麼辦」。實作者面對「不想噴錯給使用者」的壓力很可能臨時加 retry，而沒上限/退避 → retry 風暴（兵推情境 5：N 個請求互相踩，O(N²) 次寫入嘗試），或 retry 用盡誤擋「明明沒額滿卻報不進」。
- **決策**：明定撞號處理策略：
  - **主機制**：原子發號（D8 的 `issuedCount` 閘門 + D3 的 orderIndex 原子分配）。正常情況下根本不撞，零 retry。
  - **retry 為輔**（只當「理論上不該發生的偶發碰撞」的補救）：(a) 上限 3 次；(b) 指數退避 + jitter；(c) 每次 retry 前**重新判額滿**（不能盲目重取 orderIndex 而超收）；(d) 用盡 3 次仍失敗 → 回友善訊息「報名人數眾多，請稍後再送出一次」；(e) **補償**：若報名最終失敗，要把 D8 已 `$inc` 的 `issuedCount` 補回 `$inc -1`（無 transaction 環境下，名額不能被吃掉卻沒人報成）。

### D13：取消 / 恢復報名的狀態切換順序
- **問題**：partial unique index 的 `partialFilterExpression` 只對 `status ∈ {waiting, processing}` 生效。記錄跨越這個邊界時會「進入 / 離開」index 約束範圍。若恢復報名「先改 status、後分配 orderIndex」（或漏分配），記錄會帶著舊的髒 orderIndex 值瞬間進入 index 約束範圍，撞上任何巧合等於舊值的 active 記錄 → `E11000` → 恢復操作 500（兵推情境 7b）。
- **決策**：
  - **恢復報名（`cancelled` → `waiting`）**：必須**先**用原子發號分配一個保證安全的新 orderIndex，**再**把 status 改成 `waiting`。讓記錄「進入 index 約束範圍」的那一刻 orderIndex 已是乾淨值。
  - **取消（`waiting` → `cancelled`）**：取消時把 orderIndex 設為 `null`，杜絕髒舊值在日後恢復時被帶回。恢復時一律強制重新發號。

### D14：`issuedCount` 與 `orderIndex` 解耦 + `ensureOrderIndexConsistency` 批量化、不吞 error
- **架構洞見（兵推 0.3 / 情境 11）**：`issuedCount`（名額計數，只增不減）與 `orderIndex`（排序位置，可被 reorder / callNext / consistency 重排）是**兩個獨立的東西**，必須解耦：
  - `issuedCount`：報名時 `$inc`，刪除時 `$inc -1`，永不因 reorder/callNext 變動。決定「能不能再收人」。
  - `orderIndex`：決定「排在第幾位」，可被重排，與「佔了幾個名額」無關。
  - **恢復報名的具體影響**：一筆記錄從 `cancelled` 恢復成 `waiting`，它當初報名時**已經佔過一個 `issuedCount` 名額**（cancelled 仍佔名額），恢復時**不再 `$inc issuedCount`**（否則名額重複佔、`issuedCount` 虛高），只需重新分配一個 orderIndex（排到隊尾）。
- **`ensureOrderIndexConsistency` 改寫**：
  - 目前是「`find` active → for 迴圈逐筆 `save()`」。配 partial unique index，整列重寫的中間態會撞 `E11000`。改成**批量寫入**（`bulkWrite` / 兩階段 offset，比照 D10），不再逐筆 save。
  - 目前 catch 區塊把 error 吞掉只 `console.log`——配 unique index 會「靜默放棄一致性修正」（撞號了不報錯也沒修好，DB 留在半修正撞號狀態）。改成**不吞 `E11000`**：撞號代表資料真的壞了，要 log error 並可觀測。

### D15：多 admin 並發 reorder 暫不處理（規模不需要）
修玄宮是單一宮廟、管理員人數少，多 admin / 多分頁同時 reorder 的機率極低。對這個規模加「樂觀鎖 version」是 over-engineering。本 change **不**為 reorder 加版本號樂觀鎖；D5 的「id 集合比對驗證」已能擋掉「列表殘缺 / 數量不符」這類主要錯誤。多 admin 並發競態（集合相同但順序 stale）暫不處理，日後若真有多人同時管理的需求再另案評估。

## Risks / 注意事項

- **DB migration 風險**：加 partial unique index 前，既有測試資料若已有 orderIndex 撞號，加 index 會失敗。Phase 3.4 要先掃描修正再加 index。
- **`issuedCount` migration**：`SystemSetting` 新增 `issuedCount` 欄位，上線時要以「目前 active + cancelled 記錄數」初始化，否則閘門基準錯誤。
- **額滿定義改變的影響**：改成 cancelled 算佔名額後，現有測試環境若有歷史 cancelled 記錄，額滿數字會跳升。上線前要確認測試資料乾淨或可接受。
- **不可用 transaction**：併發保護（D3、D8、問題 2.3）只能靠 unique index + 原子操作，實作時要特別注意。
- **MongoDB 版本相容性**：partial unique index 的 `partialFilterExpression` 使用 `{ status: { $in: ['waiting','processing'] } }` 形式。MongoDB 3.2 起 partial index 支援 `$in`，但 Change A 仍須**實測驗證 Zeabur 的 MongoDB 版本**確實支援此形式；若不支援，只能退用單值 `{ status: 'waiting' }`，那 `processing` 記錄將不受約束、設計需重新評估。
- **endSession 與並發報名競態（G10，不在本 change scope，但需載明）**：兵推情境 8 發現 `endSession` 的 `deleteMany({})` 與並發新報名有競態——`endSession` 先查好歸檔名單後，grace period 內新進的報名不會被歸檔卻會被 `deleteMany` 清掉 → 該客戶手持「報名成功」回執但資料永久消失。本 change scope 僅問題 1-4，不修 `endSession`；但本 change 加的 partial unique index / `issuedCount` 等改動會與 `endSession` 既有的非冪等、無鎖問題疊加。**建議另開 change 專門處理 `endSession` 競態**（例如歸檔前先原子地關閉報名 + grace period、或 `deleteMany` 前再查一次差集補歸檔）。
- 全程測試環境開發，正式環境同步要另走核可流程。
