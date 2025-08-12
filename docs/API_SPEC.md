# API 規格（v1）

## 通用
- Base Path: `/api/v1`
- 回應格式：
  - 成功：`{ success:true, code:'OK', message?, data }`
  - 失敗：`{ success:false, code, message, errors? }`
- 常見錯誤碼：`VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL_ERROR`

## Auth
- POST `/api/v1/auth/login`
- GET `/api/v1/auth/me`
- PUT `/api/v1/auth/change-password`（需登入） body: `{ oldPassword, newPassword }`

## Queue（公開）
- GET `/api/v1/queue/status`
- POST `/api/v1/queue/register`
- GET `/api/v1/queue/number/:queueNumber`
- GET `/api/v1/queue/search?name&phone`
- GET `/api/v1/queue/ordered-numbers`
- GET `/api/v1/queue/max-order`
- POST `/api/v1/queue/cancel`
- PUT `/api/v1/queue/update`

## Admin（需登入）
- GET `/api/v1/admin/queue/list`
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
