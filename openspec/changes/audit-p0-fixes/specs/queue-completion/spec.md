## ADDED Requirements

### Requirement: 候位完成操作不得因前端參數錯位而失敗

管理端「標記完成」的所有入口 SHALL 把候位記錄的合法 `_id` 傳給後端狀態更新 API；前端事件處理器之間的參數簽名 SHALL 一致，不得把 DOM event 物件當作 record id 傳遞。

#### Scenario: 候位列表勾選框標記完成

- **WHEN** 管理員在候位列表對某筆記錄點選「完成」核取方框
- **THEN** 前端送出 `PUT /api/v1/queue/{合法ObjectId}/status`（id 為該 record 的 `_id` 字串），後端回 200 且該記錄狀態變為 completed，不再出現 `/queue/[object Object]/status` 造成的 CastError 500

#### Scenario: 客戶詳情對話框標記完成

- **WHEN** 管理員在客戶詳情對話框點「標記為已完成」
- **THEN** 對應 handler 已被定義並可呼叫，記錄被標記完成，不再拋 `onCompleteFromDialog is not a function`
