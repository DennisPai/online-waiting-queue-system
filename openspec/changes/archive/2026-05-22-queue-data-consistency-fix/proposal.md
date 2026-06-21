## Why

2026-05-22 對修玄宮候位系統測試環境做 code review（5 個 sub-agent 平行掃描，完整檢測報告見 `/tmp/xiuxuangong_code_review_2026-05-22.md`），發現 4 個影響宮廟辦事營運的 bug：

1. **隨機取消候位** — 免登入的公開取消 API 用「會漂移、不唯一」的 `queueNumber` 定位記錄。客戶拿著上週查到的舊號碼來取消，這週同一號碼早已是別人 → 取消到無辜客戶。
2. **誤取消解除額滿** — 額滿判斷排除 `cancelled` 狀態、且無持久狀態。一筆候位被（誤）取消 → active 人數下降 → 額滿狀態解除 → 新人趁機報進來。原本已額滿，本不該再收人。
3. **恢復報名後排序亂** — 恢復報名（status 改回 waiting）的路徑漏掉 `ensureOrderIndexConsistency()` 重算 + 用非原子「讀 max +1」分配 orderIndex → orderIndex 撞號 → 排序不穩定 → 前面排好的人被擠位。
4. **調整後面順序時前面亂** — 前端拖動排序的 `loadQueueList()` 是非同步，在「reorder 已回、列表還沒刷新」的空檔拖第二筆 → 拖到 stale 列表 → 後端零驗證照錯順序整列重算 → 前面沒動的記錄被洗亂。

**共同病根**：`orderIndex`（排序）與 `queueNumber`（號碼）的唯一性/穩定性從來沒被保證——兩欄位都沒有 unique 約束、`queueNumber` 會被排序/叫號/刪除/結束本期覆寫而漂移、多處用非原子「讀最大值 +1」分配、並行寫入無交易/鎖。

這些問題直接影響每月辦事的候位準確性（誰被取消、誰排前面、總人數多少），必須修。

## What Changes

### 問題 1：取消候位定位改用 `_id` + 加身分驗證
- 公開取消 API（`cancelQueueByCustomer`）改用記錄 `_id`（MongoDB 唯一、永不漂移）定位，**不再用 `queueNumber`**
- 取消前加身分驗證：比對「姓名 + 電話」與記錄一致才允許取消
- 備註：Change C（移除前台取消功能）會把前台取消入口整個拿掉；Change A 先讓取消 API 本身安全，兩個 change 不衝突、可獨立上線

### 問題 2：額滿改用「佔用名額」原子閘門判斷，`cancelled` 仍佔名額
- **設計定案（懷特 2026-05-22 核可）**：`cancelled` 仍佔名額——本期收滿 N 人就停收，誤取消不再解除額滿。只有管理員手動**刪除**（delete，非 cancel）記錄才釋出名額（人工確認真的不來才刪）
- **額滿判斷從「先查再寫」非原子，升級成 `issuedCount` 原子閘門**：原本「查 active 數量 → 比 maxOrderIndex → 寫入」三步非原子，並發時多個請求會同時讀到「還沒滿」而雙雙通過 → 超收。改成 `SystemSetting`（或獨立 counter 文件）上的 `issuedCount` 欄位（累計發出名額，只增不減），報名第一步就 `findOneAndUpdate({ issuedCount: { $lt: maxOrderIndex } }, { $inc: { issuedCount: 1 } })`：回傳 null = 已額滿（直接回友善訊息），回傳文件 = 已原子地佔到一個名額
- **此為「額滿算 cancelled」的原子化實作版本**：`issuedCount` 只增不減 = cancelled 仍佔名額，與「額滿包含 cancelled 狀態」語意完全一致，差別只是把「改 query 加 cancelled」這個仍非原子的做法，升級成真正原子的 counter 閘門。partial unique index 不再被當成額滿判斷工具，降格回「理論上不該發生的撞號的最後防線」

### 問題 4 附帶 bug：後台「新增候位」成功後候位列表不刷新
- 兵推 4-Q2 發現：後台管理員「新增候位」操作成功後，只關閉對話框、漏呼叫 `loadQueueList()` → 新客戶不會立刻出現在候位列表上，管理員需手動重整才看得到
- 修正：後台新增候位成功後須觸發候位列表刷新（與其他變更候位的操作一致）

### 問題 3：恢復報名補一致性重算 + orderIndex 原子分配
- 恢復報名路徑（status 改回 `waiting`）補呼叫 `ensureOrderIndexConsistency()`
- `orderIndex` 分配改為原子操作（避免並行「讀 max +1」撞號）
- `orderIndex` 加 unique 約束（partial index，只約束 active 狀態記錄），DB 層級擋撞號

### 問題 4：reorder 修跨拖動競態 + 後端驗證
- 前端：拖動排序後，等列表刷新完成才允許下一次拖動（或直接以 reorder API 回傳的列表為準，不依賴非同步的 `loadQueueList()`）
- 後端：`reorderQueue` 收到的 id 列表要驗證 = DB 當前全部 active 記錄（數量 + 內容），不一致就拒絕、不照錯列表重算
- `ensureOrderIndexConsistency` 排序加次要排序鍵（`_id`），保證 orderIndex 撞號時排序仍穩定

## Impact

- 影響的 spec 能力：候位報名、候位取消、候位排序、額滿控制
- 影響的程式：`QueueService.js` / `QueueRepository.js` / `queue.controller.js` / `queue.admin.controller.js` / `system-setting.model.js`（新增 `issuedCount`）/ `waiting-record.model.js` / `utils/orderIndex.js` / `errorHandler.js` / 前端 `useQueueActions` / `useQueueData` / Redux queue slice
- 需要 DB migration：`orderIndex` 加 partial unique index（對既有資料要先檢查有無撞號再加 index）；`SystemSetting` 新增 `issuedCount` 欄位並以「目前 active + cancelled 記錄數」初始化
- 全程在測試環境（`open-queue-test` repo）開發驗證，測試通過 + 懷特核可後才同步正式環境
