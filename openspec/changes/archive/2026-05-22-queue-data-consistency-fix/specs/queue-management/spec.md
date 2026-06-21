## ADDED Requirements

### Requirement: 候位取消身分驗證

系統 SHALL 用記錄的 `_id`（MongoDB 唯一識別碼）定位要取消的候位，不得使用會漂移的 `queueNumber`。取消前系統 SHALL 驗證請求者提供的身分資料（姓名 + 電話）與目標記錄一致，不一致則拒絕。

#### Scenario: 正確身分取消成功

- **WHEN** 客戶提供正確的記錄 `_id` + 相符的姓名 + 相符的電話
- **THEN** 系統將該筆候位 status 設為 `cancelled`

#### Scenario: 身分不符拒絕取消

- **WHEN** 請求提供的姓名或電話與目標記錄不符
- **THEN** 系統拒絕取消並回傳錯誤，目標記錄狀態不變

#### Scenario: 號碼漂移後不誤取消

- **WHEN** 結束本期後 queueNumber 重新編號，舊號碼指向不同記錄
- **THEN** 用 `_id` 定位的取消操作仍只作用於原本那筆記錄，不會誤取消他人

### Requirement: 額滿名額控制

系統 SHALL 以一個只增不減的「累計發出名額」計數（`issuedCount`）作為額滿判斷依據——`cancelled` 記錄仍佔名額等同 `issuedCount` 不回沖。本期報名 SHALL 以原子閘門操作判斷額滿與佔用名額（`findOneAndUpdate` 的 `$inc`），確保並發報名不超收。`issuedCount` 達到上限後系統 SHALL 拒絕新報名並回傳友善訊息。`cancelled` 記錄 SHALL 仍佔用名額（`issuedCount` 不下降）；唯有管理員「刪除」記錄才使 `issuedCount` 下降、釋出名額。

#### Scenario: 取消不解除額滿

- **WHEN** 候位已達額滿上限，其中一筆候位被取消（status 變 `cancelled`）
- **THEN** 額滿狀態維持（`issuedCount` 不下降），新客戶仍無法報名

#### Scenario: 刪除才釋出名額

- **WHEN** 候位已額滿，管理員刪除（delete）一筆候位記錄
- **THEN** `issuedCount` 對應下降，名額釋出，可再接受一位新報名

#### Scenario: 併發報名不超額

- **WHEN** 兩個報名請求同時搶最後一個名額
- **THEN** 原子閘門只讓一個請求成功佔到名額，總發出名額不超過上限

#### Scenario: 額滿時回友善訊息

- **WHEN** 本期 `issuedCount` 已達上限，新客戶送出報名
- **THEN** 系統在原子閘門即判定額滿並回傳可理解的友善訊息（如「今日候位已滿」），不噴技術性錯誤訊息

#### Scenario: 恢復報名不重複佔名額

- **WHEN** 一筆 `cancelled` 候位被恢復成 `waiting`
- **THEN** 系統不再增加 `issuedCount`（該記錄當初報名已佔過名額），僅重新分配排序位置

### Requirement: orderIndex 唯一性與排序穩定

系統 SHALL 保證 active 狀態（`waiting` / `processing`）候位的 `orderIndex` 唯一（DB 層級 partial unique index）。所有分配 `orderIndex` 的路徑（新報名、恢復報名、後台新增候位）SHALL 為原子操作。候位排序 SHALL 在 `orderIndex` 之外有次要排序鍵，確保結果穩定。恢復報名 SHALL 先分配安全的新 `orderIndex` 再切換 status 為 `waiting`；取消候位 SHALL 將 `orderIndex` 設為 `null` 以杜絕髒值。

#### Scenario: 恢復報名不弄亂前面順序

- **WHEN** 一筆 `cancelled` 候位被恢復成 `waiting`
- **THEN** 該筆排到隊尾，其他候位的順序與 orderIndex 不變、不撞號

#### Scenario: 並發恢復不撞號

- **WHEN** 兩筆候位幾乎同時被恢復報名
- **THEN** 兩筆獲得不同的 `orderIndex`，無重複

### Requirement: 並發操作不噴系統錯誤

系統處理候位操作（報名、叫號、拖動排序、恢復報名）撞到 `orderIndex` 唯一約束（`E11000`）時 SHALL 回傳可理解的友善訊息或自動處理，不得回傳赤裸的 HTTP 500「伺服器內部錯誤」。叫號 SHALL 不對其餘候位做全體 `orderIndex` 平移（避免與並發報名製造中間態撞號）。拖動排序的批量寫入 SHALL 採不產生中間態撞號的寫法。

#### Scenario: 叫號與並發報名不撞號

- **WHEN** 管理員按叫號的同時有客戶報名
- **THEN** 操作不撞 unique 約束、不回 500，隊伍順序不撕裂

#### Scenario: 拖動排序與並發報名不撞號

- **WHEN** 管理員拖動排序的同時有客戶報名
- **THEN** reorder 的批量寫入不產生中間態撞號，不回 500

#### Scenario: admin 操作撞號回友善訊息

- **WHEN** 後台操作撞到 `orderIndex` 唯一約束
- **THEN** 系統回傳友善訊息或自動重試，不回赤裸的 HTTP 500

### Requirement: 拖動排序資料一致性

系統在處理 reorder（拖動排序）時 SHALL 驗證前端送來的記錄 id 列表與後端當前全部 active 記錄一致（數量與內容），不一致則拒絕該次 reorder。前端 SHALL 防止跨拖動競態（前次拖動的列表刷新完成前不得送出下一次）。

#### Scenario: 調整後段順序不影響前段

- **WHEN** 管理員拖動調整後段候位的順序
- **THEN** 前段未被調整的候位順序保持不變

#### Scenario: 列表不一致時拒絕

- **WHEN** reorder 請求的 id 列表與後端 active 記錄不符（數量或內容）
- **THEN** 後端拒絕該次 reorder 並回傳錯誤，不照錯誤列表重算 orderIndex

#### Scenario: 連續快速拖動不亂序

- **WHEN** 管理員在前次拖動列表尚未刷新完成時就送出下一次拖動
- **THEN** 系統以正確的最新列表為基準，排序結果正確不亂
