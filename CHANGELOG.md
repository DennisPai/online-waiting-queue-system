# Changelog

本檔記錄**同步到正式環境的版本變更摘要**（人類可讀一覽）。

- 詳細變更（為什麼 / 怎麼做 / 驗收）：見 `openspec/changes/`（含 `changes/archive/`）
- 逐筆 commit：見 `git log`（格式 `[模組] 繁中描述`）
- 開發踩坑 / 早期技術決策歷史：見 `docs/archive/DEVELOPMENT_LOG.md`（已封存）

> 維護方式：每次同步到正式環境時，在最上方新增一段 `## YYYY-MM-DD — 摘要`（見 `AGENTS.md` 文檔維護 SOP）。

---

## 2026-06-29 — 完整模式登記 bug 修復 + 全站對外訊息中文化

### 修正：完整模式登記候位「Request failed」（validator-recalibrate-and-error-surfacing）
- 根因：完整模式（簡易模式關閉）前端送「西元」出生年，後端 validator 把 gregorianBirthYear 卡在民國年範圍 1-150 擋下；且驗證失敗回應無 message → 經信封補成通用「Request failed」，使用者看不到真正原因
- `gregorianBirthYear` 驗證改為西元年合理範圍（家人同欄補對稱規則）
- `validateRequest` 補可讀 message → 全站 express-validator 端點驗證錯誤皆顯示真正欄位原因，不再黑箱「Request failed」

### 全站對外訊息一致繁體中文化（localize-user-facing-messages）
- auth / admin 路由 35 條 validator 補繁中 `.withMessage`（消除英文預設「Invalid value」）
- admin controller 7 條對外 message + `v1-response` fallback + 前端 2 處 Email label 改繁中
- 新增 `route-validator-message` contract 測試，防英文預設訊息回歸

## [未發布 / 測試中]

### 文檔治理（docs-governance）
- 架構知識入 git：新增 tracked `AGENTS.md`（整併 CLAUDE.md 對外架構 + `.cursor/rules` 慣例），`.cursor/rules` 改為薄轉址
- `docs/API.md` 對帳成 57 路由的唯一契約來源（補 7 條 admin 端點、code 列舉補至 17、health/ready/root 標信封例外）
- 強制機制：route↔API.md / 死連結 / code 登記 三個 contract 測試 + GitHub Actions CI gate + backend lint
- OpenSpec 衛生：補 `openspec/project.md`、5 個已交付 change 移入 archive、死檔封存到 `docs/archive/`
- 新增「文檔維護 SOP」對照表 + 本 `CHANGELOG.md`

## 2026-06-08 — DB 連線韌性（測試 `6acd5a2`）
- MongoDB 事故根治：backend 自動重連 + server/DB 解耦 + fail-fast 連線逾時

## 2026-05-24 — StatusPage 顯示修復（正式 `fc043ef`）
- 詳細資料對話框 3 個顯示 bug（編號隱藏 / 農曆「民國-1826」/ 家人只顯示農曆）

## 2026-05-22 ~ 05-24 — 候位一致性 + 家人地址 + 全農曆（Change A/B/C）
- 候位資料一致性修復、家人地址結構修正、全系統農曆 + 移除前台取消、follow-up patches、全情境回歸測試

## 2026-03-02 — 客戶永久資料庫上線 + 重大 bugfix
- end-session 資料遺失事故根治（移除 transaction → 先寫後刪）、客戶永久資料庫、拖動排序雙重 bug 修復、家人地址歸組

## 2026-03 — 匯出功能
- Excel 表格範本 + PDF 問事單（A4 橫式雙 A5）

## 2026-02-15 ~ 24 — P1+P2+P3 完整修復
- P1 安全性（環境變數 / MongoDB injection / 密碼環境變數化 / 改密 UI）
- P2 品質（controller 拆分 / logger / 單元測試 / 客戶資料庫）
- P3 技術債（Node 16→20 / API 文檔）
