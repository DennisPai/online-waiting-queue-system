## Context

懷特 4/12 指示完整移植修玄宮專案到 Claude Code 管理。

## Key Decisions

### D1：專案級 CLAUDE.md = 專案的 source of truth
CLAUDE.md 放在 repo 根目錄，每次 Claude Code 讀這個專案時自動載入。包含架構、規則、環境設定、開發流程、設計決策。

### D2：DESIGN.md = 純 UI/UX 設計系統
DESIGN.md 只放配色、字體、元件風格、響應式規則。不放架構、不放開發規則。

### D3：正式環境最高指導原則（寫入 CLAUDE.md）
懷特 4/12 明確交代：
- **除非懷特核可，否則不能擅自去更動或 push 正式環境**
- **所有編輯和改動只能在測試環境做**
- **測試環境做到一個階段後，才做版本更新**

### D4：正式環境更新流程（寫入 CLAUDE.md）
1. 對比測試 repo vs 正式 repo，列出差異 commits
2. 整理 changelog（bug fix / 新功能 / 重構 / DB migration）
3. Discord 回報懷特 → 等核可
4. 核可後 merge → push 正式 → Zeabur deploy → 驗收 → 回報
5. 出問題 → 立即 revert → 回報

### D5：三層分工
| 層 | 檔案 | 用途 | 何時讀 |
|---|------|------|--------|
| 導航 | `roles/xiuxuangong.md` | 專案位置 + 快速 context + 環境 URL | 懷特提到「修玄宮」時自動讀 |
| 手冊 | `CLAUDE.md`（repo 內） | 所有規則、架構、環境設定、credentials 指引 | 實際動手前必讀 |
| 快照 | `memory/project_xiuxuangong.md` | 跨 session 狀態（上次做到哪、待辦） | 每次 session 自動載入 |

角色檔不再重複存放架構和教訓，只當導航入口。避免兩處維護同步問題。

### D6：Credentials 統一管理（secrets.env + 專案前綴）
- **所有 credentials 統一存放在 `/home/node/.secrets/secrets.env`**
- **用專案前綴區分**：`XIUXUANGONG_TEST_` vs `XIUXUANGONG_PROD_`，從 key 名字就能確認環境
- **CLAUDE.md 只寫 key name**（如「見 secrets.env 的 `XIUXUANGONG_TEST_MONGO_URI`」），不寫明文
- **正式環境 credentials 的 key 用 `PROD` 標記**，搭配 CLAUDE.md 的 ⛔ 標記雙重提醒
- 其他專案（命運鍛造所、見招拆招）日後也沿用同一 pattern（`FATEFORGE_*`、`JIANZHAOCHAIQIAO_*`）

### D7：不改 code，純移植知識
本 OpenSpec 的 scope 是「知識移植 + 環境設定」，不包含任何 code 修改。待辦任務只做盤點，不做修復。

## Open Questions

無。scope、原則、credentials 管理做法都已由懷特 4/12 確認。
