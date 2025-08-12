# 重構執行便條（概要）

- 新增 docs：PRD.md、API_SPEC.md、ENGINEERING_RULES.md
- 後端：
  - User.mustChangePassword 欄位
  - PUT /api/v1/auth/change-password（現先掛在現有 auth.routes 作為 v1 規格的回應格式起點）
  - /ready 就緒端點
- 前端：
  - ChangePasswordDialog 元件
  - authService/authSlice 新增 changePassword 流程
  - 在 AdminLayout 強制改密彈框
- 下一步：新增 /api/v1 adapter 路由樹、Helmet/RateLimit、索引 migration、services 統一回傳格式與 API_VERSION 切換

