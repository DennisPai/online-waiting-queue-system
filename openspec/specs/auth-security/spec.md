# auth-security Specification

## Purpose
TBD - created by archiving change audit-p0-fixes. Update Purpose after archive.
## Requirements
### Requirement: 帳號建立必須限管理員且角色受白名單控制

`POST /api/v1/auth/register` SHALL 僅允許具 admin 角色者呼叫，且新帳號的角色 SHALL 由伺服器端白名單決定——任何非白名單的 `role` 值 SHALL 被強制降為最低權限 `staff`，使一般登入者無法藉 request body 自建 admin。

#### Scenario: 非管理員無法建立帳號

- **WHEN** 一個 staff（或未授權）token 呼叫 register
- **THEN** 回 403（route 層 `restrictTo('admin')` 攔截），不建立任何帳號

#### Scenario: body 夾帶 role 提權被擋

- **WHEN** 呼叫 register 時 body 帶 `role: 'admin'` 但實際情境不應給 admin
- **THEN** controller 依白名單把角色收斂為 `staff`（或拒絕），新帳號不會取得 admin 權限

### Requirement: 認證與報名端點限流必須實際生效

rate limiter SHALL 掛載於實際生效的路由前綴（`/api/v1/auth`、`/api/v1/queue/register`），且在反向代理（Zeabur）後 SHALL 正確識別 client IP（設定 `trust proxy`），使暴力嘗試會被限流，而非因掛載於不存在路徑而形同虛設。

#### Scenario: 登入端點被限流

- **WHEN** 對 `/api/v1/auth/login` 在限流視窗內超過上限次數發出請求
- **THEN** 後續請求被 limiter 擋下（429），限流確實作用於真實端點

### Requirement: 報名輸入必須經過驗證

`POST /api/v1/queue/register` SHALL 在進入 controller 前套用既有 `validateRegisterQueue` 驗證器，對文字欄位做長度/字元/結構驗證；不合法輸入 SHALL 回 400 而非直接入庫。

#### Scenario: 非法報名輸入被擋

- **WHEN** 報名 request 帶超長或格式不符的欄位
- **THEN** 回 400 驗證錯誤，資料不入庫

