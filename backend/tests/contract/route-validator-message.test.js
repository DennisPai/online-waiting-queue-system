/**
 * 對外訊息中文化 contract 測試（OpenSpec localize-user-facing-messages /
 * capability: user-facing-message-localization）
 *
 * 目的：防止「express-validator 驗證鏈漏掛 .withMessage()」回歸——漏掛時 validateRequest
 * 會把規則的預設英文 msg（"Invalid value"）回給使用者，破壞全站繁中一致性
 * （2026-06-29 盤點發現 auth/admin 路由內聯規則共 35 條缺 withMessage）。
 *
 * 機制：靜態解析 routes/v1 與 validators 下每個檔的 express-validator 鏈
 * （以 body(/param(/query( 起算、balanced-paren 掃描整條鏈），對每條鏈斷言
 * 「.withMessage( 出現次數 >= 該鏈的 validator 方法數」。sanitizer（optional/trim…）
 * 與自帶錯誤的 custom 不計入 validator 數，避免誤判。
 *
 * 無 DB、無啟動 app（與其他 contract 測試同風格）。
 */

const fs = require('fs');
const path = require('path');

// express-validator 會「產生錯誤訊息」的 validator 方法（每個都該有對應 withMessage）。
// 不含 sanitizer / modifier（optional/trim/escape/to*/default/bail…）與自帶錯誤的 custom。
const VALIDATOR_METHODS = new Set([
  'notEmpty', 'isInt', 'isBoolean', 'isIn', 'isString', 'isURL', 'isISO8601', 'isEmail',
  'isArray', 'isLength', 'matches', 'isMongoId', 'isFloat', 'isNumeric', 'isDate',
  'isObject', 'equals', 'contains', 'isEmpty', 'isBefore', 'isAfter', 'isPostalCode',
]);

// 掃描來源：v1 路由 + 驗證器
const SCAN_DIRS = [
  path.resolve(__dirname, '../../src/routes/v1'),
  path.resolve(__dirname, '../../src/validators'),
];

function listJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f));
}

// 從 index i（指向 body(/param(/query( 的 '('）掃過 balanced parens、含字串內忽略括號，回傳 ')' 之後的 index
function consumeParens(src, k) {
  let depth = 0;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === "'" || c === '"' || c === '`') {
      const q = c; k++;
      while (k < src.length && src[k] !== q) { if (src[k] === '\\') k++; k++; }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return k + 1; }
  }
  return k;
}

// 抽出檔內所有 express-validator 鏈（body(/param(/query( 起，串接的 .method(...) 全收）
function extractChains(src) {
  const chains = [];
  const re = /\b(body|param|query)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index;
    let k = consumeParens(src, src.indexOf('(', m.index));
    // 連續吃 .method(...)（guard 為安全上界，鏈不可能有上萬個方法）
    for (let guard = 0; guard < 10000; guard += 1) {
      let p = k;
      while (p < src.length && /\s/.test(src[p])) p++;
      if (src[p] !== '.') break;
      p++;
      while (p < src.length && /[A-Za-z0-9_]/.test(src[p])) p++;
      while (p < src.length && /\s/.test(src[p])) p++;
      if (src[p] !== '(') break;
      k = consumeParens(src, p);
    }
    chains.push({ text: src.slice(start, k), start });
    re.lastIndex = k;
  }
  return chains;
}

function countMethods(chainText) {
  const re = /\.([A-Za-z0-9_]+)\s*\(/g;
  let m; let validators = 0; let withMessages = 0;
  while ((m = re.exec(chainText)) !== null) {
    const name = m[1];
    if (name === 'withMessage') withMessages++;
    else if (VALIDATOR_METHODS.has(name)) validators++;
  }
  return { validators, withMessages };
}

describe('user-facing-message-localization: route/validator 鏈每條規則須掛 withMessage', () => {
  const files = SCAN_DIRS.flatMap(listJsFiles);

  test('防呆：確實掃到檔案且抓到 express-validator 鏈', () => {
    expect(files.length).toBeGreaterThan(0);
    const total = files.reduce((n, f) => n + extractChains(fs.readFileSync(f, 'utf8')).length, 0);
    // 系統至少有 register + auth + admin 數十條鏈，遠超 10
    expect(total).toBeGreaterThan(10);
  });

  test('每個 express-validator 鏈的 withMessage 數 >= validator 數（無英文預設漏網）', () => {
    const offenders = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      for (const chain of extractChains(src)) {
        const { validators, withMessages } = countMethods(chain.text);
        if (validators > 0 && withMessages < validators) {
          const line = src.slice(0, chain.start).split('\n').length;
          offenders.push(
            `${path.basename(file)}:${line} validators=${validators} withMessage=${withMessages} → ${chain.text.replace(/\s+/g, ' ').slice(0, 90)}`
          );
        }
      }
    }
    // 若紅燈：有 validator 沒掛 .withMessage()，會吐英文預設 "Invalid value" 給使用者。
    // 請為每條紅燈規則補繁中 .withMessage()。
    expect(offenders).toEqual([]);
  });
});
