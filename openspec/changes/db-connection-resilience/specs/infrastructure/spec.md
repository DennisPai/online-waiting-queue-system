## ADDED Requirements

### Requirement: 資料庫連線韌性與自動恢復

系統 SHALL 在 MongoDB 短暫中斷／重啟時自動恢復連線、回復服務，**不需人工重啟 backend**。資料庫不可用時，請求 SHALL 快速失敗（503）而非無限等待；backend server SHALL 與資料庫連線解耦、即使資料庫未連上也能啟動並提供 health 觀測。

#### Scenario: MongoDB 重啟後 backend 自動恢復

- **WHEN** MongoDB 服務重啟（中斷後重新可用）
- **THEN** backend 在 MongoDB 恢復後自動重新連線，候位查詢與管理員登入等需資料庫的功能恢復正常，全程不需人工重啟 backend

#### Scenario: 資料庫不可用時請求快速失敗、不無限卡住

- **WHEN** MongoDB 連線中斷期間有請求進入需查資料庫的 API
- **THEN** 該請求在數秒內回明確錯誤（503），而非無限等待（hang）逾時

#### Scenario: server 與資料庫連線解耦、health 可觀測

- **WHEN** backend 啟動時 MongoDB 尚未就緒（連不上）
- **THEN** backend server 仍正常啟動並監聽，`/health` 可達且回報資料庫即時狀態，`/ready` 在資料庫未就緒時回 503；不會出現「整個服務 502、連 health 都無回應」

#### Scenario: 初次連線失敗持續重試

- **WHEN** backend 啟動時 MongoDB 連不上
- **THEN** backend 以退避策略持續重試連線，MongoDB 一旦可用即自動連上並完成需資料庫的初始化（資料初始化、排程），不需重啟 backend

#### Scenario: 重連後雙資料庫讀寫維持正確

- **WHEN** MongoDB 重啟、backend 自動重連後
- **THEN** 候位資料庫（waiting/settings/user/log）與客戶資料庫（customer/visit/household）的讀寫皆正確，model 與正確資料庫的綁定維持有效，無資料錯位
