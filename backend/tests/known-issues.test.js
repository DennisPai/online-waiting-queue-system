/**
 * 已知 bug 待修案例（WS4 / tasks.md 4.6）
 *
 * 目的：把掃描揪到的真 code bug 寫成「可見、可追蹤、但不阻擋本 change CI 綠」的 skip 案例。
 * 本 docs-governance change 嚴格只做治理（文檔/慣例/機制/OpenSpec 衛生），不修業務 code
 * （design D4 scope 邊界）。下列 bug 的「行為修正」歸另一條 ===「稽核 P0/P1 修正」change===。
 *
 * 每個 case 用 test.skip 寫出「修好後應成立的斷言」：
 *   - 留下可執行的回歸測試骨架，等稽核修正 change 動手時把 .skip 拿掉即生效。
 *   - 在測試輸出以 "skipped" 顯示，讓 bug 持續可見、不被遺忘。
 *   - 但不參與 pass/fail 判定，故不會擋住本 change 的 CI 綠燈。
 *
 * 交叉引用：drift-gaps A1 / A5、design D2/D4。
 */

const fs = require('fs');
const path = require('path');

const APP_JS = path.resolve(__dirname, '../src/app.js');
const AUTH_ROUTES = path.resolve(__dirname, '../src/routes/v1/auth.routes.js');

describe('已知 bug 待修（歸「稽核 P0/P1 修正」change，本 change 不修）', () => {
  /**
   * A5：rate-limiter 死掛載。
   * app.js 把 limiter 掛在 '/api/auth' 與 '/api/queue/register'，但實際 route 全在
   * '/api/v1/*' 之下（少了 /v1 前綴）。limiter 永遠匹配不到任何請求 → 形同未啟用，
   * login / 公開報名端點完全沒有 rate limit 保護（abuse / 暴力破解風險）。
   * 修法（稽核 change）：把掛載前綴改為 '/api/v1/auth' 與 '/api/v1/queue/register'。
   */
  test('[A5] rate-limiter 應掛在 /api/v1/* 前綴（修好後拿掉 .skip）', () => {
    const src = fs.readFileSync(APP_JS, 'utf8');
    expect(src).toMatch(/app\.use\(\s*['"]\/api\/v1\/auth['"]\s*,\s*authLimiter/);
    expect(src).toMatch(/app\.use\(\s*['"]\/api\/v1\/queue\/register['"]\s*,\s*registerLimiter/);
  });

  /**
   * A1：POST /auth/register 缺 restrictTo。
   * 該路由目前只有 protect（任何已登入者皆可），未加 restrictTo('admin')。
   * 任一登入帳號都能建立新使用者 → 提權風險（任意 user 自建 admin）。
   * 修法（稽核 change）：在 register 鏈加 restrictTo('admin')（並讓 protect 注入 role）。
   */
  test('[A1] POST /auth/register 應加 restrictTo 限管理員（修好後拿掉 .skip）', () => {
    const src = fs.readFileSync(AUTH_ROUTES, 'utf8');
    // register 區塊應引用 restrictTo
    const registerBlock = src.slice(src.indexOf("'/register'"));
    expect(src).toMatch(/restrictTo/);
    expect(registerBlock).toMatch(/restrictTo/);
  });
});
