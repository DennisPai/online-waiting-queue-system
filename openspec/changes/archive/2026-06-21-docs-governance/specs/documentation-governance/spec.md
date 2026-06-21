## ADDED Requirements

### Requirement: 單一 API 契約來源

系統 SHALL 以 `docs/API.md` 為 API 端點的唯一事實來源，且其記載 SHALL 與 `backend/src/routes/v1/` 實際掛載的 route 完全一致（涵蓋全部 v1 端點，含 admin 維運端點）。不走標準回應信封的端點（`/health`、`/ready`、`/`）SHALL 在文件中明確標注為例外。任何指向已不存在 API 文件名（如 `docs/API_SPEC.md`）的引用 SHALL 被消除。

#### Scenario: API.md 涵蓋全部實際 route

- **WHEN** 接手者以 `docs/API.md` 作為 API 契約對照實際掛載的 route
- **THEN** 文件記載的端點集合與實際 v1 route 集合完全一致，包含先前漏列的 admin 維運端點（recalc-counters / restore-waiting-records / backups / backups restore / gdrive backup / backup logs / migrate），不存在「拿文件當契約卻漏掉端點」

#### Scenario: 信封例外端點明確標注

- **WHEN** 接手者查閱 `docs/API.md` 對 `/health`、`/ready`、`/` 的回應格式
- **THEN** 文件明確標注這三個端點不適用 `{ success, code, message, data }` 信封、回原始 shape，不會出現「所有回應皆為信封」的過度宣稱

#### Scenario: 無指向幽靈 API 文件的引用

- **WHEN** 在全 repo 搜尋對 API 文件的引用
- **THEN** 所有引用一律指向存在的 `docs/API.md`，不存在任何指向不存在的 `docs/API_SPEC.md` 的引用

### Requirement: 文檔↔code 強制同步機制

系統 SHALL 具備自動化閘門，使文檔與 code 的同步從人治轉為機制。閘門 SHALL 至少包含：route↔API.md 契約測試（route 清單與 API.md 記載不一致即失敗）、文檔死連結檢查（文檔引用的檔案/目錄路徑不存在即失敗）、回應信封 code 登記檢查（controller emit 的 code 未登記即失敗）。CI SHALL 在每次變更時執行這些閘門加 test 與 lint。

#### Scenario: route 與 API.md 漂移被擋下

- **WHEN** 有人新增/移除一條 v1 route 卻未同步更新 `docs/API.md`
- **THEN** route↔API.md 契約測試失敗（CI 紅燈），漂移在合併前即被攔截，而非靜默累積

#### Scenario: 文檔死連結被擋下

- **WHEN** 有人在文檔中引用一個不存在的檔案或目錄路徑
- **THEN** 死連結檢查測試失敗，CI 阻止該變更，避免再次產生幽靈引用

#### Scenario: 未登記的信封 code 被擋下

- **WHEN** controller emit 一個未登記在 `docs/API.md` 白名單（或不符命名規約）的回應 `code`
- **THEN** 信封 code 登記檢查失敗，迫使該 code 先登記於文件才能合併

### Requirement: 架構知識必須進 git

系統 SHALL 確保「如何運作」的架構知識（系統架構、資料模型、設計決策、慣例）以 tracked 檔（`AGENTS.md`）存在於版控中，任何人 clone repo 即可取得；UI 規範（`DESIGN.md`）SHALL 進入版控。敏感的環境與運維脈絡（secrets 變數名、雙環境 Zeabur ID、預設密碼、正式環境操作流程）SHALL 留在 untracked 檔、不進入版控。tracked 檔中 SHALL NOT 出現明文預設密碼。

#### Scenario: clone 後即可取得架構知識

- **WHEN** 新接手者 clone repo（無存取本機 untracked 檔）
- **THEN** 可從 tracked 的 `AGENTS.md` 取得系統架構、資料模型、設計決策與慣例，不需依賴 clone 拿不到的本機檔

#### Scenario: 敏感資訊不進版控

- **WHEN** 檢查進入版控的 `AGENTS.md` 與 `DESIGN.md`
- **THEN** 不含 secrets.env 變數名、雙環境 Zeabur Project/Service ID、預設密碼或正式環境操作流程；這些敏感脈絡僅存在於 untracked 的 `CLAUDE.md`

#### Scenario: tracked 檔無明文預設密碼

- **WHEN** 在全部 tracked 文檔中搜尋預設管理員密碼字串
- **THEN** 不存在明文 `admin/admin123`，相關處皆已改為佔位字串

### Requirement: OpenSpec 變更生命週期紀律

系統 SHALL 確保 OpenSpec 變更的狀態反映真實交付狀態：已交付（已上線）的 change SHALL 被標記完成並 archive；進行中的 change SHALL 留在 active 區。整個 `openspec/` 目錄（含 changes、archive 與專案層 `project.md`）SHALL 納入版控，使 clone 可取得完整變更歷史與專案基線。

#### Scenario: 已交付 change 已 archive 且進版控

- **WHEN** 接手者查看 `openspec/changes/`
- **THEN** 2026-05-22 ~ 05-24 那批已上線的 change 已被勾選完成並移入 archive、且已進 git，不會被誤判為「進行中、幾乎沒動的大型 change」；進行中的 `db-connection-resilience` 仍正確留在 active

#### Scenario: 專案層 OpenSpec 脈絡可取得

- **WHEN** 工具或接手者需要 OpenSpec 專案層 context（技術棧/慣例/環境/測試慣例）
- **THEN** 可從 tracked 的 `openspec/project.md` 取得，不需每次 propose 從零重建脈絡

### Requirement: 慣例單一事實來源

系統 SHALL 以「實際 code 行為」為慣例的事實來源，並把慣例集中記載於單一 tracked 文件（`AGENTS.md`），消除文件↔code 矛盾。當文件宣稱與實際 code 不符時，文件 SHALL 被更正為符合實況（包含承認尚未達成的目標狀態，而非假裝已達成）。歷史性、已完成、或具誤導危險的死檔 SHALL 移入 `docs/archive/` 以與活躍文檔區隔。

#### Scenario: commit 格式以實況為準

- **WHEN** 接手者查閱 commit 訊息規範
- **THEN** 規範記載實際使用的 `[模組] 繁中描述` 格式（與 git log 一致），先前 `CONTRIBUTING.md` 宣稱卻無一筆符合的 Conventional Commits 死條款已被廢除

#### Scenario: 文件不假裝已達成的統一

- **WHEN** 接手者查閱錯誤處理慣例
- **THEN** 文件據實記載目標（catchAsync + ApiError）與現況（僅少數 controller 採用），不出現「controller 統一使用 catchAsync」這類與實況不符的宣稱

#### Scenario: 危險死檔移出活躍區

- **WHEN** 接手者瀏覽 `docs/` 活躍文檔
- **THEN** 教用「會造成資料遺失的 MongoDB transaction end-session 法」的 `customer-archive-tech-spec.md` 等已封存於 `docs/archive/`，不會在活躍區誘導接手者重蹈 2026-03-02 事故的 pattern
