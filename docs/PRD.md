# 線上候位系統 PRD

## 目標與KPI
- 不中斷服務完成 API 規格統一、文件精煉、代碼可維護化。
- KPI：部署期間 0 停機；前台登記成功率 ≥ 98%；後台核心操作錯誤率 ≤ 1%。

## 角色
- 訪客：登記（取決於 publicRegistrationEnabled）、查詢。
- 管理員：登入、候位管理（叫號、排序、編輯、取消/復原、刪除、匯出）、系統設定。

## 範圍（本重構）
- 新增 API 版本化（/api/v1），統一回應包裝與錯誤碼；相容舊端點。
- 新增登入後「強制變更密碼」能力（保留 admin/admin123）。
- 前端服務層統一解包格式，巨型頁拆分，驗證 schema 抽離。
- 文件精煉：PRD、API_SPEC、ENGINEERING_RULES、USER_GUIDE_ADMIN；其餘歸檔。

## 非功能需求
- 安全：Helmet、Rate Limit；JWT 秘鑰強度；必改密流程（旗標）。
- 可觀測：/health、/ready；結構化日誌；部署觀察 1–2 週。

## 里程碑
- M0：文件上線
- M1：後端 /api/v1 + change-password + 安全性加強
- M2：前端切 v1 + 強制改密 UI + 拆頁
- M3：觀察後下線舊端點
