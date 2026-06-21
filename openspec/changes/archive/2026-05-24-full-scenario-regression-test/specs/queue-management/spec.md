## ADDED Requirements

### 元需求：62 個使用者情境完整回歸測試

候位系統在進入「同步正式環境」階段前，SHALL 通過 62 個使用者情境（customer 26 + admin 36）的完整回歸測試，包含程式驗證 + API curl 端對端 + Playwright UI 三層覆蓋。

#### 場景：執行完整情境回歸測試

- **WHEN** 完成 4 個 OpenSpec Change（A 候位資料一致性 / B 家人地址 / C 全系統農曆 + 移除前台取消 / Follow-up patches）+ 任何 hotfix 部署
- **THEN** 系統 SHALL 跑完 62 情境的「三層覆蓋」（程式 grep + API curl + Playwright UI），每情境結果記錄於完整匯總報告

#### 場景：阻斷條件判定

- **WHEN** 任 1 個 P0 情境失敗（核心情境：customer 3/6/8/9/26、admin 5/6/7/12/13/14/15/32）
- **THEN** 系統 SHALL 立刻停止後續測試、Discord 回報、由懷特決定是否修補後再驗

#### 場景：跨情境整合測試

- **WHEN** 完成單情境測試（階段 2 + 3）
- **THEN** 系統 SHALL 跑 5 個跨情境整合場景（A 報名→排序→歸檔 / B Socket 推播 / C 額滿釋出名額 / D 快照恢復 / E 取消恢復不撞 unique index），確認跨元件 / 跨流程行為無 regression

#### 場景：DB raw 直連驗值

- **WHEN** sub-agent 跑 API 類驗證
- **THEN** 系統 SHALL 使用 `mongosh "$XIUXUANGONG_TEST_MONGO_URI"` 直連測試環境 MongoDB 查 collection 原始欄位、不可只看 controller 回傳信任值（避免 Change A Phase 6.4 「Mongoose default 架空 migration」類陷阱）

#### 場景：完整匯總報告判斷正式環境同步資格

- **WHEN** 完成全部 62 情境 + 5 個整合場景
- **THEN** 系統 SHALL 產出匯總報告含「是否可同步正式環境」明確判斷：
  - P0 全綠 + P1 失敗 ≤ 3 個 + 0 個整合場景失敗 → 「建議可同步」
  - 否則 → 「需先修補再驗證」+ 修補建議優先級

#### 場景：執行 sub-agent ≠ 驗證 sub-agent

- **WHEN** 派 sub-agent 跑情境
- **THEN** 系統 SHALL 派 fresh agent（不是實作 agent）、每階段不同 agent、實作的 sub-agent 不准自己驗收（懷特 5/23 嚴令）

#### 場景：測試資料隔離 + 清理

- **WHEN** sub-agent 跑情境
- **THEN** 系統 SHALL 使用 `_REGTEST_AGENT{NN}_*` 命名規則隔離測試資料、跑完自動清自己的測試殘留（mongosh deleteMany by name regex）、不影響其他 sub-agent

#### 場景：Playwright 截圖留證

- **WHEN** sub-agent 跑 UI 類驗證
- **THEN** 系統 SHALL 留 PNG 截圖在 `/tmp/regression-test-screenshots/`、命名格式 `scenario-{NN}-{phase}.png`、回報必附路徑供懷特肉眼驗收
