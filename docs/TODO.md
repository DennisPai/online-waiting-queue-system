# TODO（重構待辦）

## 後端
- [ ] 新增 /api/v1 adapter 路由樹（統一回應格式）
- [ ] 導入 helmet、express-rate-limit、結構化日誌
- [ ] DB 索引 migration：orderIndex、status、phone、queueNumber

## 前端
- [ ] API_VERSION = 'v1'；services 統一回傳 data
- [ ] 拆分 RegisterPage/AdminDashboardPage 巨型元件
- [ ] 抽離表單驗證 schema（yup/zod）

## 文件
- [ ] 精煉 DEPLOYMENT.md
- [ ] 精煉 AI_DEVELOPMENT_GUIDE.md → CONTRIBUTING.md
- [ ] 精煉 管理員使用教學.md → USER_GUIDE_ADMIN.md
- [ ] 歸檔 線上候位系統開發文檔.md → docs/archive/

## 發佈
- [ ] 後端先上 v1；前端切換；觀察 1~2 週
- [ ] 舊端點標記 Deprecated → 移除

