/**
 * Route ↔ docs/API.md 契約測試（WS4 / tasks.md 4.1）
 *
 * 目的：把「API 修改後必須同步更新 docs/API.md」這條人治規則（CLAUDE.md 最高指導
 * 原則第 6 條）換成機制。歷史上 API 端點數曾漂移成 47 / 49 / 50 / 55 / 57 五個數字
 * 無一正確（drift A2 / B2），根因就是沒有 contract 測試。
 *
 * 斷言：
 *   實際掛載的 v1 route 集合（method + path）== docs/API.md 記載的端點集合。
 *   任一方有對方沒有的端點 → 紅燈（漂移即被擋下）。
 *
 * 實作方式（不啟動 app、純靜態解析，CI 無需 DB）：
 *   - 路由真值：parse backend/src/routes/v1/*.routes.js 的 router.<verb>('<path>') 宣告，
 *     依 index.js 的 mount 前綴（/auth /queue /admin /customers）組出完整路徑。
 *   - 文件真值：parse docs/API.md 的 `### / #### METHOD \`/path\`` 標題。
 *
 * 兩邊都用 Express 風格 :param 命名，路徑字面比對即可（現況雙方皆 57）。
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.resolve(__dirname, '../../src/routes/v1');
const API_MD = path.resolve(__dirname, '../../../docs/API.md');

// index.js 的 router.use('<prefix>', require('./<file>')) 掛載對應表。
// 若未來新增 route 檔，需同步補進此表（否則該檔不會被納入契約比對 → 測試會以缺漏暴露）。
const MOUNTS = {
  'auth.routes.js': '/auth',
  'queue.routes.js': '/queue',
  'admin.routes.js': '/admin',
  'customer.routes.js': '/customers',
};

/** 解析 route 檔，回傳 Set<"METHOD /full/path">。 */
function parseRoutes() {
  const set = new Set();
  for (const [file, prefix] of Object.entries(MOUNTS)) {
    const src = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    // router.get('/path' | router.post(`/path` | router.put("/path" ...
    const re = /router\.(get|post|put|delete|patch)\(\s*([`'"])([^`'"]+)\2/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const method = m[1].toUpperCase();
      const p = m[3];
      const full = prefix + (p === '/' ? '' : p);
      set.add(`${method} ${full}`);
    }
  }
  return set;
}

/** 解析 docs/API.md 的端點標題，回傳 Set<"METHOD /path">。 */
function parseApiMd() {
  const set = new Set();
  const src = fs.readFileSync(API_MD, 'utf8');
  // ### POST `/auth/login`  或  #### GET `/admin/queue/list`
  const re = /^#{3,4}\s+(GET|POST|PUT|DELETE|PATCH)\s+`([^`]+)`/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    set.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return set;
}

describe('Route ↔ docs/API.md 契約 (WS4 4.1)', () => {
  const routeSet = parseRoutes();
  const docSet = parseApiMd();

  test('解析結果非空（確保 parser 沒壞掉導致兩邊都空、假性通過）', () => {
    expect(routeSet.size).toBeGreaterThan(0);
    expect(docSet.size).toBeGreaterThan(0);
  });

  test('沒有「已掛載但 API.md 未記載」的端點（route → doc 漂移）', () => {
    const missingInDoc = [...routeSet].filter((r) => !docSet.has(r)).sort();
    expect(missingInDoc).toEqual([]);
  });

  test('沒有「API.md 記載但實際未掛載」的端點（doc → route 幽靈）', () => {
    const missingInRoute = [...docSet].filter((d) => !routeSet.has(d)).sort();
    expect(missingInRoute).toEqual([]);
  });

  test('兩邊端點集合完全相等（端點數一致且逐條對齊）', () => {
    expect([...routeSet].sort()).toEqual([...docSet].sort());
  });
});
