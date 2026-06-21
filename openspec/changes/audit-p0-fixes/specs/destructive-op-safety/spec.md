## ADDED Requirements

### Requirement: 整批清空候位前必須先快照

`clearAllQueue`（整批刪除候位記錄）SHALL 在 `deleteMany` 之前先 `saveSnapshot` 保存清空前的全部記錄，遵循「先寫後刪」鐵律與 2026-03-02 資料遺失事故教訓。快照儲存失敗時 SHALL 中止刪除並回報錯誤（此操作無後續歸檔作為第二備份，故較 end-session 更嚴格採 await 而非 fire-and-forget）。本端點 SHALL 保留（前端現役功能使用中），不得逕行移除而破壞功能。

#### Scenario: 清空候位前留下快照

- **WHEN** 管理員觸發清空全部候位
- **THEN** 系統先保存一筆 `clear-all-queue` 快照（含清空前記錄）後才刪除；事後可由快照復原，不再無備份直接 `deleteMany`

#### Scenario: 快照失敗則不刪除

- **WHEN** 清空候位時快照儲存失敗
- **THEN** 中止刪除、回報錯誤，候位記錄維持原狀，不在無備份情況下清空
