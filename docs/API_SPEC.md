# API 規格（v1）

## 通用
- Base Path: `/api/v1`
- 認證：`Authorization: Bearer <token>`（管理端）
- 成功：`{ success: true, code: 'OK', message, data }`
- 失敗：`{ success: false, code: 'VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL_ERROR', message, errors? }`
- 分頁格式：`{ page, limit, total, pages }`

## Auth
- POST `/api/v1/auth/login`
  - body: `{ username, password }`
  - 200: `{ success, code, data: { user: { id, username, email, role, mustChangePassword }, token } }`
- GET `/api/v1/auth/me`
  - 200: `{ success, code, data: { id, username, email, role, mustChangePassword } }`
- POST `/api/v1/auth/register` [admin]
  - body: `{ username, password, email, role? }`
  - 201: `{ success, code, data: { id, username, email, role } }`
- PUT `/api/v1/auth/change-password` [login required]
  - body: `{ oldPassword, newPassword }`
  - 200: `{ success, code, message: '密碼已更新', data: { updatedAt } }`

## Queue（公開）
- GET `/api/v1/queue/status`
- POST `/api/v1/queue/register`
- GET `/api/v1/queue/number/:queueNumber`
- GET `/api/v1/queue/search?name&phone`
- GET `/api/v1/queue/ordered-numbers`
- GET `/api/v1/queue/max-order`
- POST `/api/v1/queue/cancel`
- PUT `/api/v1/queue/update`

## Admin（需 Bearer）
- GET `/api/v1/admin/queue/list?status=&page=&limit=`
- PUT `/api/v1/admin/queue/next`
- PUT `/api/v1/admin/queue/:queueId/status`
- PUT `/api/v1/admin/queue/:queueId/update`
- DELETE `/api/v1/admin/queue/:queueId/delete`
- PUT `/api/v1/admin/queue/order`
- PUT `/api/v1/admin/settings/next-session`
- PUT `/api/v1/admin/settings/queue-status`
- PUT `/api/v1/admin/settings/max-queue-number`
- PUT `/api/v1/admin/settings/minutes-per-customer`
- PUT `/api/v1/admin/settings/simplified-mode`
- PUT `/api/v1/admin/settings/public-registration-enabled`
- PUT `/api/v1/admin/settings/total-customer-count`
- POST `/api/v1/admin/settings/reset-customer-count`
- PUT `/api/v1/admin/settings/last-completed-time`
- POST `/api/v1/admin/settings/reset-completed-time`

## Deprecated 對應（相容期）
- 舊端點保留，逐步在 header 加入 `Deprecation: true` 與 `Link` 指向 v1
- 回應格式差異由 v1 adapter 封裝成統一格式

