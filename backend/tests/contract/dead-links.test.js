/**
 * 活躍文檔死連結檢查（WS4 / tasks.md 4.2）
 *
 * 目的：擋住 docs 內指向已刪/已搬檔案的幽靈引用（drift A6 / A7 / C8，例如歷史上的
 * docs/API_SPEC.md、docs/ENGINEERING_RULES.md、backend/final-test.js）。
 *
 * 斷言：
 *   下方 SCANNED 清單中每份「活躍文檔」用 markdown link 語法 `[text](target)` 引用的
 *   相對檔案/目錄路徑都必須實際存在；不存在 → 紅燈（扣除 KNOWN_DEAD_LINKS 已知清單）。
 *
 * 掃描範圍刻意只取「intentional markdown link」`[text](relative)`，不掃反引號內的
 * 說明性檔名（如 `queue.controller.js`、`AdminDashboardPage.jsx`）——那些是敘述提及、
 * 非可點連結，全掃會製造大量誤報。外部 URL（http/https/mailto）與純錨點（#section）跳過。
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');

// ── 掃描範圍：活躍文檔（相對 repo root）。tasks.md 4.2 明列。 ──────────────
const SCANNED = [
  'README.md',
  'AGENTS.md',
  'DESIGN.md',
  'DEPLOYMENT.md',
  'docs/API.md',
  'docs/CONTRIBUTING.md',
  'docs/PRD.md',
  'docs/USER_GUIDE_ADMIN.md',
  'docs/USER_SCENARIOS_CUSTOMER.md',
  'openspec/project.md',
];
// 動態納入 docs/incident-*.md 與 openspec/ 內其餘 .md（changes/*、specs/* 等）。
function expandDynamic() {
  const extra = [];
  // docs/incident-*.md
  const docsDir = path.join(REPO_ROOT, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (/^incident-.*\.md$/.test(f)) extra.push(`docs/${f}`);
    }
  }
  // openspec/ 全部 .md（含 project.md / changes/ / specs/），但排除 EXCLUDED 路徑底下的。
  const openspecDir = path.join(REPO_ROOT, 'openspec');
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(REPO_ROOT, full);
      if (isExcluded(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) extra.push(rel);
    }
  }
  walk(openspecDir);
  return extra;
}

// ── 排除範圍（MUST 明示、不可靜默漏掉）：以下三類等懷特拍板後再納入掃描。 ──────
// 用 EXCLUDED 常數 + 註解標明原因，避免「靜默不掃」被誤認為已驗過。
const EXCLUDED = [
  // 歷史史料、不再維護，內含大量指向已刪檔的舊引用是「預期內」、非待修 drift。
  // （DEVELOPMENT_LOG.md 已於文檔治理 4A 封存進 docs/archive/，自動被本規則涵蓋。）
  'docs/archive/',
  // 註：.cursor/ 已改為薄轉址（指向 AGENTS.md，無死引用），故移出排除、納入掃描。
];
function isExcluded(relPath) {
  const norm = relPath.split(path.sep).join('/');
  return EXCLUDED.some((ex) => (ex.endsWith('/') ? norm.startsWith(ex) : norm === ex));
}

/**
 * 已知死連結 allow-list（讓既有 drift 可見、可追蹤、但不阻擋本 change CI 綠）。
 *
 * 本 WS4 不修業務 code 也不改 docs/*（README 屬其他 WS 範圍）。下列死連結是 WS1/WS5
 * README 文檔清理的殘留——docs/TODO.md 已於 WS5 搬到 docs/archive/TODO.md、docs/specs/
 * 內容已清空搬入 docs/archive/，但 README「文檔說明」區塊仍指向舊位置。
 * 待修：由負責 README 的 WS 修正連結（指向 docs/archive/ 或刪該行），修好後從此清單移除。
 */
const KNOWN_DEAD_LINKS = [
  // （空）README 的 docs/TODO.md 連結已於 WS3/WS4 收尾修正（改指 openspec/docs/archive）；目前無已知死連結
];

/** 從一份 markdown 抽出所有 `[text](target)` 的 target。 */
function extractLinkTargets(md) {
  const targets = [];
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(md)) !== null) targets.push(m[1]);
  return targets;
}

/** 判斷是否為「應檢查存在性的相對路徑」。 */
function isLocalRelativeLink(target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false; // http: https: mailto: 等 scheme
  if (target.startsWith('//')) return false; // protocol-relative
  if (target.startsWith('#')) return false; // 純錨點
  return true;
}

/** 去掉錨點 / query 後回傳實體路徑部分（可能為空字串）。 */
function stripFragment(target) {
  return target.split('#')[0].split('?')[0];
}

describe('活躍文檔死連結檢查 (WS4 4.2)', () => {
  const docs = [...SCANNED, ...expandDynamic()].filter(
    (rel) => !isExcluded(rel) && fs.existsSync(path.join(REPO_ROOT, rel))
  );
  const known = new Set(KNOWN_DEAD_LINKS);

  test('至少掃到核心活躍文檔（確保清單沒被整批跳過）', () => {
    expect(docs).toContain('README.md');
    expect(docs).toContain('docs/API.md');
    expect(docs.length).toBeGreaterThanOrEqual(5);
  });

  test('所有 markdown 連結指向的相對路徑都存在（扣除 KNOWN_DEAD_LINKS）', () => {
    const broken = [];
    for (const rel of docs) {
      const abs = path.join(REPO_ROOT, rel);
      const md = fs.readFileSync(abs, 'utf8');
      const baseDir = path.dirname(abs);
      for (const target of extractLinkTargets(md)) {
        if (!isLocalRelativeLink(target)) continue;
        const entry = `${rel} -> ${target}`;
        if (known.has(entry)) continue;
        const filePart = stripFragment(target);
        if (filePart === '') continue; // 純錨點殘留
        const resolved = path.resolve(baseDir, filePart);
        if (!fs.existsSync(resolved)) broken.push(entry);
      }
    }
    // 若紅燈 = 活躍文檔引用了不存在的相對路徑（幽靈引用）。
    // 修法：修正/刪除該連結；若屬已追蹤、暫不修的歷史 drift 才加進 KNOWN_DEAD_LINKS 並
    // 交叉引用負責的 WS/change。禁止靜默放寬掃描範圍。
    expect(broken).toEqual([]);
  });

  test('KNOWN_DEAD_LINKS 必須仍真的死著（防清單腐爛：已修好的別留著）', () => {
    const stale = [];
    for (const entry of KNOWN_DEAD_LINKS) {
      const [rel, target] = entry.split(' -> ');
      const abs = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(abs)) {
        stale.push(`${entry}（來源文檔已不存在）`);
        continue;
      }
      const resolved = path.resolve(path.dirname(abs), stripFragment(target));
      if (fs.existsSync(resolved)) stale.push(`${entry}（連結已修復，請移出清單）`);
    }
    expect(stale).toEqual([]);
  });
});
