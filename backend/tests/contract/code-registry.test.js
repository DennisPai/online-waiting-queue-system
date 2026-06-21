/**
 * 回應信封 code 登記檢查（WS4 / tasks.md 4.3）
 *
 * 目的：controller / util 實際 emit 的回應信封 `code` 必須登記在 docs/API.md 的白名單，
 * 否則整合者（前端 / 第三方）的 error 分支會漏接未知 code（drift A3 / B2）。
 *
 * 斷言：
 *   src 內所有實際 emit 的 code ⊆ docs/API.md 登記的 17 個白名單
 *   （扣除下方 KNOWN_UNREGISTERED_CODES 已知未登記清單）。
 *
 * code 來源（三條 emit 路徑，全部納入掃描）：
 *   1. 字面量  `code: 'XXX'`（v1-response 折疊 / controller 自塞）
 *   2. ApiError.<helper>(msg, 'XXX')  顯式第二參數
 *   3. ApiError.<helper>(msg)  省略 code → 由 helper 預設值決定（badRequest→VALIDATION_ERROR…）
 *
 * 白名單真值來自 docs/API.md 開頭信封區塊那串 `code` 列舉（13 個）。
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../src');

// docs/API.md 登記的 17 個白名單 code（與文件開頭信封區塊一致）。
// 白名單以常數明列（而非每次 runtime 解析 API.md），確保「文件白名單漂移」也會被測試擋下：
// 若 API.md 改了白名單卻沒同步這裡，code-registry 與 dead-link/contract 測試會交叉暴露。
const WHITELIST = [
  'OK',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
  // 全域錯誤處理 errorHandler.js emit（Mongoose/JWT 轉譯）
  'DUPLICATE_FIELD',
  'INVALID_ID',
  'INVALID_TOKEN',
  'EXPIRED_TOKEN',
  'BACKUP_FAILED',
  'CONFIRM_REQUIRED',
  'INVALID_DATE',
  'INVALID_SNAPSHOT',
  'NOT_SUPPORTED',
  'UNKNOWN_COLLECTION',
];

// ApiError 靜態 helper 省略 code 時的預設值（對照 utils/ApiError.js）。
const APIERROR_DEFAULTS = {
  badRequest: 'VALIDATION_ERROR',
  unauthorized: 'UNAUTHORIZED',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  internal: 'INTERNAL_ERROR',
};

/**
 * 已知「實際 emit 但 docs/API.md 未登記」的 code —— 由 errorHandler.js 把 Mongoose/JWT
 * 原生錯誤轉成的內部技術 code。本 docs-governance change 只「讓 drift 無所遁形 + 可追蹤」，
 * 不動業務 code 也不擅改 docs/API.md（白名單調整／code 收斂屬另一條
 * 「稽核 P0/P1 修正」change）。在此明列 allow-list 讓它們可見、可追蹤、但不阻擋本 change CI 綠。
 *
 * 待『稽核修正』change 處理：把這幾個 code 登記進 API.md 白名單，或在 errorHandler 收斂成既有 code。
 * 來源：utils/errorHandler.js（11000 / CastError / JsonWebTokenError / TokenExpiredError 分支）。
 */
const KNOWN_UNREGISTERED_CODES = [
  // （空）DUPLICATE_FIELD/INVALID_ID/INVALID_TOKEN/EXPIRED_TOKEN 已登記進 docs/API.md 白名單（WS4 收尾）
];

/** 遞迴收集 src 下所有 .js 檔。 */
function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** 掃描整個 src，回傳實際 emit 的 code 集合（method/path 不論，只取 code 字串）。 */
function collectEmittedCodes() {
  const codes = new Set();
  for (const file of listJsFiles(SRC_DIR)) {
    const src = fs.readFileSync(file, 'utf8');

    // 路徑 1：字面量 code: 'XXX'
    let m;
    const literalRe = /code:\s*['"]([A-Z_]+)['"]/g;
    while ((m = literalRe.exec(src)) !== null) codes.add(m[1]);

    // 路徑 2：ApiError.<helper>(... , 'XXX') 顯式第二參數
    //   例：ApiError.conflict('排序衝突', 'DUPLICATE_FIELD')
    const explicitRe =
      /ApiError\.(badRequest|unauthorized|forbidden|notFound|conflict|internal)\([^,)]*,\s*['"]([A-Z_]+)['"]/g;
    while ((m = explicitRe.exec(src)) !== null) codes.add(m[2]);

    // 路徑 3：ApiError.<helper>(...) 省略 code → 套 helper 預設值
    //   涵蓋顯式版（路徑 2 已加進 code）一併重新加入預設不影響結果。
    const helperRe =
      /ApiError\.(badRequest|unauthorized|forbidden|notFound|conflict|internal)\(/g;
    while ((m = helperRe.exec(src)) !== null) {
      const def = APIERROR_DEFAULTS[m[1]];
      if (def) codes.add(def);
    }
  }
  return codes;
}

describe('回應信封 code 登記檢查 (WS4 4.3)', () => {
  const emitted = collectEmittedCodes();
  const allowed = new Set([...WHITELIST, ...KNOWN_UNREGISTERED_CODES]);

  test('掃描到的 code 集合非空（確保 grep 沒壞）', () => {
    expect(emitted.size).toBeGreaterThan(0);
  });

  test('所有 emit 的 code ⊆ 白名單 + 已知未登記清單', () => {
    const unregistered = [...emitted].filter((c) => !allowed.has(c)).sort();
    // 若這裡紅燈 = 新增了既不在 API.md 白名單、也未登記在 KNOWN_UNREGISTERED_CODES 的 code。
    // 修法：把新 code 補進 docs/API.md 信封白名單（首選），或若屬已知技術 drift 才加進
    // KNOWN_UNREGISTERED_CODES 並交叉引用「稽核修正」change。禁止靜默放寬。
    expect(unregistered).toEqual([]);
  });

  test('KNOWN_UNREGISTERED_CODES 必須確實仍被 emit（防清單腐爛：已修好的別留著）', () => {
    const stale = KNOWN_UNREGISTERED_CODES.filter((c) => !emitted.has(c)).sort();
    expect(stale).toEqual([]);
  });
});
