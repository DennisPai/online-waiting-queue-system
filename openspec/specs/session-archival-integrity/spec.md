# session-archival-integrity Specification

## Purpose
TBD - created by archiving change audit-p0-fixes. Update Purpose after archive.
## Requirements
### Requirement: 結束本期重設必須歸零所有發號計數

結束本期（end-session）重設系統設定時 SHALL 將 `issuedCount` 與 `orderIndexCounter` 一併歸零（連同 `currentQueueNumber`），使下一期開始時不會殘留前期已發號數而誤判「已額滿」。

#### Scenario: 下一期開始不誤判額滿

- **WHEN** 一期辦完、執行結束本期，隨後新一期開放報名
- **THEN** `issuedCount` 與 `orderIndexCounter` 皆為 0，報名閘門 `issuedCount < maxOrderIndex` 成立，新客可正常取號，不會一開即顯示額滿

### Requirement: 結束本期必須冪等

end-session SHALL 具備互斥鎖，重複觸發（雙擊/重送/併發）時 SHALL 僅有一次實際歸檔；後續重複請求 SHALL 回 409 而非再次歸檔，確保 `totalVisits` 不被重複累加、不產生重複 `VisitRecord`。

#### Scenario: 雙擊結束本期不重複歸檔

- **WHEN** 結束本期在第一次歸檔尚未完成時被再次觸發
- **THEN** 第二次請求取不到鎖、回 409；客戶 `totalVisits` 僅 +1、`VisitRecord` 僅建立一筆，永久客戶庫不被污染

### Requirement: 家庭自動分組必須排除佔位地址

`autoGroupHouseholds` 依地址分組時 SHALL 排除佔位值 `'臨時地址'` 與空字串，並以安全存取（optional chaining）避免缺地址欄位時拋例外，使「全填臨時地址」的不相干客戶不被錯組成同一家庭。

#### Scenario: 全填臨時地址不被錯組

- **WHEN** 一期內多位不相干客戶地址皆為佔位值 `'臨時地址'`
- **THEN** 他們不會因相同佔位地址被自動組成同一家庭

### Requirement: 客戶歸檔比對需容錯且分信心級，避免同人被拆與不同人被併

結束本期歸檔時，客戶比對 SHALL 以姓名為 gate 撈取同名候選並對多個特徵（農曆/國曆生日、電話含 typo 編輯距離容錯、地址、性別）加權評分，依信心分級決策：高信心 SHALL 自動併入既有客戶（容許單一特徵偶發填寫不一致，不因一次 typo 而拆成新筆）；資訊不足以區分時 SHALL NOT 自動併單，而是建新檔並標記待人工複核（`needsReview`）；無相符候選 SHALL 建為新客。系統 SHALL 提供人工複核出口（列出待複核、確認同人合併、確認不同人解除標記），且合併屬 destructive 操作 SHALL 先快照再刪。

#### Scenario: 同人因電話 typo 不被拆成兩筆

- **WHEN** 同一位客戶再次來訪，姓名與生日一致但電話少打一碼（typo）
- **THEN** 比對以高信心命中既有客戶並自動併入（totalVisits 累加於同一筆），不會因電話不同而新建重複客戶

#### Scenario: 同名但無從區分者進人工複核而非錯併

- **WHEN** 兩位同名客戶皆無完整生日與電話、無其他可區分特徵
- **THEN** 系統不自動併單，建立新檔並標記 `needsReview`、記錄疑似對象，列入人工複核清單，由管理員一鍵確認同人合併或確認不同人

#### Scenario: 確認同人合併前先快照

- **WHEN** 管理員在複核清單對某筆按「確認同人合併」
- **THEN** 系統先保存快照，再將來源客戶的造訪記錄與次數併入目標客戶並刪除來源，可事後復原

