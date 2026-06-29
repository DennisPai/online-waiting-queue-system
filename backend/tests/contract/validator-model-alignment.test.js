/**
 * 驗證器 ↔ model 一致性 contract 測試
 * （OpenSpec 2026-06-23-validator-model-alignment / capability: input-validation-integrity）
 *
 * 目的：把「API 層驗證器必須對齊 DB model」這條人治規則換成機制。
 *
 * 事故根因（2026-06-21 P0-5）：孤兒驗證器 `validateRegisterQueue`（從沒掛載過）被直接掛上
 * 公開報名端點 /queue/register，它要求電話必填 / 地址非空 / 信箱合格式，但系統早演進成
 * 「簡化模式（只需姓名）+ 多欄位選填」（model email required:false、addresses.*.address 預設 ''）。
 * 規則與現況打架，擋掉合法的空值 / 簡化登記——正式上線當天客戶報名 + 後台建客戶連環踩雷。
 * 已逐一補修電話 / 地址 / 信箱，但全靠人記得；本測試讓「驗證器比 model 嚴」復發即 CI 紅燈。
 *
 * 三層自我維護機制（design.md §3）：
 *   第 1 層 行為對齊：model 合法值（含選填空值、enum 每個列舉值）不被驗證器擋
 *   第 2 層 enum 完整性：model 每個 enum 欄位的每個值，驗證器都放行
 *   第 3 層 欄位涵蓋 meta：model 的每個 top-level 欄位都被對照表明確涵蓋（防 schema 演進後機制失效）
 *
 * 兩個方向的差異都要管（design.md §1）：
 *   - 驗證器比 model「嚴」= bug 類（事故本質）→ 第 1/2 層擋；刻意的 sanity bound 例外須登記 KNOWN_VALIDATOR_STRICTER
 *   - 驗證器比 model「寬」= 反向脆弱（model required 但 validator optional → 直接打 API 漏送→ mongoose 撞 required→500）
 *     → 用「行為自動偵測」抓出全集，逐一須登記 KNOWN_VALIDATOR_LOOSER（design.md §4 D2）
 *
 * 實作方式（design.md §2 決策 D1，選項 B「行為驗證」）：
 *   用 express-validator 官方 chain.run(req) + validationResult 跑 validateRegisterQueue，
 *   不反射其私有結構。無 DB、無啟動 app（與既有三個 contract 測試同風格）。
 */

const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { validateRegisterQueue } = require('../../src/validators/queueValidators');
const { validateRequest } = require('../../src/utils/middleware');

const MODEL_PATH = path.resolve(__dirname, '../../src/models/waiting-record.model.js');

// ── 跑 register 驗證器（官方 chain.run），回傳該 body 報錯的欄位 path 清單 ──────────
async function runRegister(body) {
  const req = { body, params: {}, query: {}, cookies: {}, headers: {} };
  for (const chain of validateRegisterQueue) {
    // express-validator v7：每個 ValidationChain 都是可單獨跑的 middleware，.run(req) 為官方單元測試 API
    await chain.run(req);
  }
  const result = validationResult(req);
  return {
    isEmpty: result.isEmpty(),
    // v7 ValidationError 欄位為 .path（v6 為 .param）
    paths: result.array().map((e) => e.path),
    errors: result.array(),
  };
}

// 取某欄位（或某 wildcard 欄位 prefix，如 'addresses'）相關的報錯 path
function fieldErrors(paths, field) {
  return paths.filter((p) => p === field || p.startsWith(`${field}[`) || p.startsWith(`${field}.`));
}

function omitField(obj, field) {
  const copy = { ...obj };
  delete copy[field];
  return copy;
}

// ── model 真值：top-level 欄位的 enum 定義（手抄自 waiting-record.model.js，第 2/3 層測試會驗對照完整）──
const MODEL_ENUMS = {
  // 註：gender 的 'other' 值用途已改為「待填」標記（前端顯示「待填」），但 enum 值不變（仍 male/female/other），
  // 故 validator 仍須放行 other。此處驗的是 enum 完整性（validator ⊇ model），與顯示語意無關。
  gender: ['male', 'female', 'other'],
  'addresses.*.addressType': ['home', 'work', 'hospital', 'other'],
  'consultationTopics.*': [
    'body', 'fate', 'karma', 'family', 'career', 'relationship', 'study', 'blessing', 'other',
  ],
  // WS5：家人性別 optional + isIn（缺漏後端補 'other' 待填、有填驗 enum）
  'familyMembers.*.gender': ['male', 'female', 'other'],
};

// ── model 的 client 端必填欄位（model required:true 且屬使用者輸入；排除 server 產生的 queueNumber）──
// 反向脆弱「行為自動偵測」的掃描範圍。若 model 新增 required 欄位，第 3 層 meta 測試 + 下方 guard 會提示更新。
const MODEL_REQUIRED_CLIENT_FIELDS = ['name', 'phone', 'gender', 'addresses', 'consultationTopics'];

// ── 反向脆弱白名單（design.md §4 決策 D2）──────────────────────────────────────────
// model required:true 但 validator optional 的欄位。直接打 API 漏送該欄位 → validator 放行 →
// mongoose 撞 required → 500（而非友善 400）。目前靠前端簡化模式 / radio 一律補值兜住。
// 本測試「行為自動偵測」會抓出全集並斷言每個都在此白名單（漏登記即紅燈）。
// 本 change 只「登記在案 + 防遺忘」，不消除（消除方式：改 model 誠實 / controller 兜底，屬另議、需懷特核可）。
const KNOWN_VALIDATOR_LOOSER = {
  phone: 'model required:true 但 validator optional；簡化模式前端補 "0000000000" 兜住',
  addresses: 'model required:true（長度 1-3）但 validator optional+isArray；簡化模式前端補 [{address:""}]',
  consultationTopics: 'model required:true（長度>0）但 validator optional+isArray；簡化模式前端補 ["other"]',
  // 2026-06-23 獨立驗證補列：gender 同屬「model required:true / validator optional」。雖 enum 已對齊（第 2 層），
  // 但必填方向仍是反向脆弱（前台 radio 一律送男/女、不會單獨漏送，故風險低，但須誠實登記）。
  gender: 'model required:true 但 validator optional；前台 radio 一律送 male/female，不會單獨漏送',
};

// ── 刻意嚴格白名單：validator 加了 model 沒有的約束，但屬合理 sanity bound、經確認刻意保留 ──────────
// 與「意外嚴格」（bug，如原 gender enum 缺 other）區分：意外嚴格該修並由第 1/2 層擋；刻意嚴格登記在此。
const KNOWN_VALIDATOR_STRICTER = {
  gregorianBirthYear:
    'validator isInt({min:1,max:當前西元年+1})；model 對 gregorianBirthYear 無 min/max。'
    + '此欄為國曆（西元）出生年，前端完整模式由農曆推算後「直送」西元年（如 1991）。'
    + 'sanity bound = 正整數且不在未來，已以前端真實西元年 payload 佐證不會擋掉合法值（見下方行為測試），刻意保留。'
    + '（2026-06-29 修正：原誤記為「民國年 1-150 sanity bound、且前端不直送此欄」，兩前提皆與現況相反——'
    + '此欄是西元年、完整模式前端直送——導致 1991 被擋成 400「Request failed」而出貨。）',
};

// ── COVERED_FIELDS：model 每個 top-level 欄位的「主要對齊意圖」分類（第 3 層 meta 測試的真值）──
// 任何 model 新增 / 移除 top-level 欄位但沒同步此表 → meta 測試紅燈，逼人回來對照 validator。
// 分類（僅資訊性主標籤；looser/stricter 由獨立白名單 + 行為偵測權威認定，不從此表推導）：
//   server-controlled     → 後端產生 / 控制，非 client 輸入，驗證器不該驗也沒驗
//   validator-aligned     → 驗證器與 model 對齊（必填對必填、選填對選填、格式合理）
//   enum-aligned          → enum 欄位，驗證器 isIn 須 ⊇ model enum（見 MODEL_ENUMS / 第 2 層）
//   looser-by-design      → 驗證器比 model 寬（model required / validator optional），登記 KNOWN_VALIDATOR_LOOSER
//   stricter-by-design    → 驗證器比 model 嚴但刻意（sanity bound），登記 KNOWN_VALIDATOR_STRICTER
//   model-optional-silent → model 選填，驗證器無規則（更寬，無衝突）
const COVERED_FIELDS = {
  queueNumber: 'server-controlled',
  orderIndex: 'server-controlled',
  status: 'server-controlled',
  completedAt: 'server-controlled',
  virtualAge: 'server-controlled',
  zodiac: 'server-controlled',
  name: 'validator-aligned',
  email: 'validator-aligned',
  gender: 'enum-aligned', // 主標籤＝enum；同時為 looser（見 KNOWN_VALIDATOR_LOOSER，由行為偵測權威認定）
  gregorianBirthYear: 'stricter-by-design', // 見 KNOWN_VALIDATOR_STRICTER
  gregorianBirthMonth: 'validator-aligned',
  gregorianBirthDay: 'validator-aligned',
  familyMembers: 'validator-aligned',
  lunarBirthYear: 'model-optional-silent',
  lunarBirthMonth: 'model-optional-silent',
  lunarBirthDay: 'model-optional-silent',
  lunarIsLeapMonth: 'model-optional-silent',
  otherDetails: 'model-optional-silent',
  remarks: 'model-optional-silent',
  phone: 'looser-by-design',
  addresses: 'looser-by-design',
  consultationTopics: 'looser-by-design',
};

// ── 靜態解析 model 的 waitingRecordSchema top-level 欄位名（brace 配對，robust）──────
function parseModelTopLevelFields() {
  const src = fs.readFileSync(MODEL_PATH, 'utf8');
  const anchor = 'const waitingRecordSchema = new mongoose.Schema(';
  const ai = src.indexOf(anchor);
  if (ai === -1) return [];
  // 從 anchor 後第一個 '{' 開始 brace 配對，取出 schema 第一個參數（欄位定義物件）的字面範圍。
  // 子 schema addressSchema / familyMemberSchema 定義在 anchor 之前，不會被誤抓。
  let i = src.indexOf('{', ai + anchor.length);
  const objStart = i;
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) break; // 配到 schema 第一參數物件的結尾
    }
  }
  const objBody = src.slice(objStart + 1, i);

  // 在 objBody 內，只取相對 depth===0 的 `key:` 鍵 = top-level 欄位
  const fields = [];
  let d = 0;
  const lines = objBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (d === 0) {
      const m = trimmed.match(/^([A-Za-z_]\w*)\s*:/);
      if (m) fields.push(m[1]);
    }
    for (const ch of line) {
      if (ch === '{' || ch === '[') d++;
      else if (ch === '}' || ch === ']') d--;
    }
  }
  return [...new Set(fields)];
}

// ── 共用 fixtures：model 合法 + register 真實會送 ──────────────────────────────────
const fixtures = {
  full_valid: {
    name: '王完整',
    phone: '0912345678',
    email: 'test@example.com',
    gender: 'male',
    // 2026-06-29：baseline 改用前端完整模式「實際送出的西元年」（原為 80，≤150 的舊測試破口——
    // 永遠通過舊 max:150 故從沒抓到西元年被擋的缺陷）。現用 1991，若驗證器再退回民國年尺度即紅燈。
    gregorianBirthYear: 1991,
    gregorianBirthMonth: 6,
    gregorianBirthDay: 15,
    addresses: [{ address: '台北市信義區', addressType: 'home' }],
    consultationTopics: ['body', 'fate'],
  },
  simplified_mode: {
    // 對齊前端簡化模式實送（RegisterForm.jsx 459-494 補 placeholder）。
    // 註：前端 email 實送 `temp_<ts>@temp.com`（非空字串）；此處用 '' 是另一個 model 合法的選填值，
    // 兩者對 validator 皆通過（email 完全不驗格式），不影響測試語意。
    name: '王簡化',
    phone: '0000000000',
    email: '',
    gender: 'male',
    addresses: [{ address: '' }],
    consultationTopics: ['other'],
    gregorianBirthYear: 80,
  },
  name_only: { name: '王只有名字' }, // 極端：直接打 API 只送姓名
  gender_other: { name: '王其他', gender: 'other' }, // model enum 合法 → 未修 gender 前會紅燈
  empty_address: { name: '王空地址', addresses: [{ address: '' }] },
  garbage_email: { name: '王亂填信箱', email: '隨便填的不是信箱啦' },
  minimal_with_empty: { name: '王最小', phone: '', email: '', addresses: [{ address: '' }] },
};

describe('input-validation-integrity: 驗證器↔model 一致性 contract', () => {
  // ── 防呆：parser / 真值非空（對照 route-api-contract.test.js:70，防假性通過）──
  test('防呆：model 欄位解析非空、enum 真值非空、必填掃描範圍存在於 model', () => {
    const modelFields = parseModelTopLevelFields();
    expect(modelFields.length).toBeGreaterThan(10);
    expect(Object.keys(MODEL_ENUMS).length).toBeGreaterThan(0);
    expect(validateRegisterQueue.length).toBeGreaterThan(0);
    // MODEL_REQUIRED_CLIENT_FIELDS 必須都是 model 真實欄位（防掃描範圍 stale）
    const modelSet = new Set(modelFields);
    for (const f of MODEL_REQUIRED_CLIENT_FIELDS) expect(modelSet.has(f)).toBe(true);
  });

  // ── 第 1 層：行為對齊（model 合法值不被驗證器擋）────────────────────────────────
  describe('第 1 層 行為對齊：model 合法值不被驗證器擋下', () => {
    test('完整合法 payload 通過（baseline）', async () => {
      const r = await runRegister(fixtures.full_valid);
      expect(r.paths).toEqual([]);
      expect(r.isEmpty).toBe(true);
    });

    test('簡化模式實送 payload 通過', async () => {
      const r = await runRegister(fixtures.simplified_mode);
      expect(r.paths).toEqual([]);
    });

    test('只填姓名（直接打 API 最小輸入）不被驗證器擋', async () => {
      const r = await runRegister(fixtures.name_only);
      // phone/addresses/consultationTopics/gender 雖 model required，但驗證器層不該擋（反向脆弱、兜底另議）
      expect(r.paths).toEqual([]);
    });

    test('gender=other（model enum 合法）必須放行', async () => {
      const r = await runRegister(fixtures.gender_other);
      // 這條在「修 gender enum 前」會紅燈，正是它要抓的漏網（design §1）
      expect(fieldErrors(r.paths, 'gender')).toEqual([]);
    });

    test('空地址 [{address:""}] 通過（model addresses.*.address 預設 ""）', async () => {
      const r = await runRegister(fixtures.empty_address);
      expect(fieldErrors(r.paths, 'addresses')).toEqual([]);
    });

    test('亂填信箱通過（model email required:false、6/21 拿掉 isEmail）', async () => {
      const r = await runRegister(fixtures.garbage_email);
      expect(fieldErrors(r.paths, 'email')).toEqual([]);
    });
  });

  // ── 第 2 層：enum 完整性（model 每個 enum 值，驗證器都放行）──────────────────────
  describe('第 2 層 enum 完整性：驗證器 isIn ⊇ model enum', () => {
    test('gender 的每個 model enum 值都被放行', async () => {
      for (const value of MODEL_ENUMS.gender) {
        const r = await runRegister({ name: '測試', gender: value });
        expect(fieldErrors(r.paths, 'gender')).toEqual([]);
      }
    });

    test('addresses.*.addressType 的每個 model enum 值都被放行', async () => {
      for (const value of MODEL_ENUMS['addresses.*.addressType']) {
        const r = await runRegister({ name: '測試', addresses: [{ address: '某地址', addressType: value }] });
        expect(fieldErrors(r.paths, 'addresses')).toEqual([]);
      }
    });

    test('consultationTopics.* 的每個 model enum 值都被放行', async () => {
      for (const value of MODEL_ENUMS['consultationTopics.*']) {
        const r = await runRegister({ name: '測試', consultationTopics: [value] });
        expect(fieldErrors(r.paths, 'consultationTopics')).toEqual([]);
      }
    });

    test('familyMembers.*.gender 的每個 model enum 值都被放行（WS5）', async () => {
      for (const value of MODEL_ENUMS['familyMembers.*.gender']) {
        // 帶 name 避免 name required 報錯污染；只看 gender 是否被擋
        const r = await runRegister({ name: '測試', familyMembers: [{ name: '家人', gender: value }] });
        expect(fieldErrors(r.paths, 'familyMembers')).toEqual([]);
      }
    });
  });

  // ── 第 3 層：欄位涵蓋 meta（model 每個 top-level 欄位都被明確對照）──────────────────
  describe('第 3 層 欄位涵蓋 meta：防 schema 演進後機制失效', () => {
    test('model 每個 top-level 欄位都在 COVERED_FIELDS 對照表中', () => {
      const modelFields = parseModelTopLevelFields();
      const uncovered = modelFields.filter((f) => !(f in COVERED_FIELDS));
      // 若紅燈：model 新增了欄位，請回到本測試把它對照 validator 後登記進 COVERED_FIELDS
      expect(uncovered).toEqual([]);
    });

    test('COVERED_FIELDS 沒有 model 已不存在的幽靈欄位', () => {
      const modelFields = new Set(parseModelTopLevelFields());
      const ghost = Object.keys(COVERED_FIELDS).filter((f) => !modelFields.has(f));
      expect(ghost).toEqual([]);
    });
  });

  // ── 反向脆弱（驗證器比 model 寬）：行為自動偵測全集 + 逐一須登記 ─────────────────────
  // design §4 D2。不 hardcode 欄位清單，而是對每個 model-required 欄位實際 omit 後跑 validator——
  // validator 放行（不報該欄位錯）= 反向脆弱。自動抓出全集，斷言恰好等於 KNOWN_VALIDATOR_LOOSER。
  // 這個設計會自動抓到任何新增的反向脆弱（含 2026-06-23 補上的 gender）。
  describe('反向脆弱自動偵測：model required 但 validator optional 的欄位須全部登記', () => {
    test('行為偵測出的反向脆弱欄位集合 === KNOWN_VALIDATOR_LOOSER', async () => {
      const detected = [];
      for (const field of MODEL_REQUIRED_CLIENT_FIELDS) {
        const r = await runRegister(omitField(fixtures.full_valid, field));
        const blocked = fieldErrors(r.paths, field).length > 0;
        if (!blocked) detected.push(field); // validator 放行 model-required 欄位的缺漏 = 反向脆弱
      }
      // 若紅燈：(a) 有新欄位變反向脆弱卻沒登記 → 補進 KNOWN_VALIDATOR_LOOSER；
      //         (b) 或白名單有欄位其實已被 validator 設成必填 → 從白名單移除
      expect(detected.sort()).toEqual(Object.keys(KNOWN_VALIDATOR_LOOSER).sort());
    });

    test('name 是 model+validator 雙必填（不該被誤判成反向脆弱）', async () => {
      const r = await runRegister(omitField(fixtures.full_valid, 'name'));
      expect(fieldErrors(r.paths, 'name').length).toBeGreaterThan(0);
    });
  });

  // ── 刻意嚴格登記：validator 加 model 沒有的 sanity bound 須登記、且確為 model 必填欄位外的合理約束 ──
  describe('刻意嚴格登記：KNOWN_VALIDATOR_STRICTER', () => {
    test('gregorianBirthYear 西元年 sanity bound 登記在案 + 真實西元年不被誤擋', async () => {
      expect(KNOWN_VALIDATOR_STRICTER.gregorianBirthYear).toBeDefined();
      // 佐證一（堵 2026-06-29 缺陷）：前端完整模式真實送的西元年（如 1991）必須通過——
      // 修正前 max:150 會把它擋成 400「Request failed」。這條在「修 bound 前」會紅燈，正是它要抓的漏網。
      const pass = await runRegister({ name: '測試', gregorianBirthYear: 1991 });
      expect(fieldErrors(pass.paths, 'gregorianBirthYear')).toEqual([]);
      // 佐證二：明顯非法（未來年）仍被擋，證明這個刻意嚴格 sanity bound 確實存在、非空殼登記。
      const futureYear = new Date().getFullYear() + 50;
      const blocked = await runRegister({ name: '測試', gregorianBirthYear: futureYear });
      expect(fieldErrors(blocked.paths, 'gregorianBirthYear').length).toBeGreaterThan(0);
    });
  });
});

// ── WS3 register 邊角測試（真實使用情境語意，與第 1 層 fixtures 共用底層）──────────────
describe('register 邊角輸入：真實最小輸入 / 邊角空值能成功通過驗證', () => {
  const edgeCases = [
    ['簡化模式只填姓名 + 前端 placeholder', fixtures.simplified_mode],
    ['純只填姓名（最小輸入）', fixtures.name_only],
    ['空地址', fixtures.empty_address],
    ['亂填信箱', fixtures.garbage_email],
    ['gender=other', fixtures.gender_other],
    ['多欄位空值最小輸入', fixtures.minimal_with_empty],
  ];

  test.each(edgeCases)('「%s」通過驗證、不被擋', async (_label, body) => {
    const r = await runRegister(body);
    expect(r.isEmpty).toBe(true);
  });
});

// ── WS5（2026-06-24）：familyMembers 內部欄位對齊 model（加了家人就該填完整）──────────────
// 對齊 model familyMemberSchema name required:true。沒加家人不受影響（wildcard 無元素）；
// 加了家人卻沒填姓名 → 友善 400 而非 model 撞 required → 500。name 無法合理補假值。
describe('familyMembers 內部欄位驗證對齊 model（WS5）', () => {
  test('沒加家人（familyMembers 省略）不受影響、通過', async () => {
    const r = await runRegister({ name: '王' });
    expect(fieldErrors(r.paths, 'familyMembers')).toEqual([]);
  });

  test('家人有填姓名 → 通過', async () => {
    const r = await runRegister({ name: '王', familyMembers: [{ name: '王家人' }] });
    expect(fieldErrors(r.paths, 'familyMembers')).toEqual([]);
  });

  test('加了家人卻沒填姓名（空物件）→ 被擋（friendly 400 而非 model 500）', async () => {
    const r = await runRegister({ name: '王', familyMembers: [{}] });
    expect(fieldErrors(r.paths, 'familyMembers').length).toBeGreaterThan(0);
  });

  test('家人姓名為空字串 → 被擋', async () => {
    const r = await runRegister({ name: '王', familyMembers: [{ name: '' }] });
    expect(fieldErrors(r.paths, 'familyMembers').length).toBeGreaterThan(0);
  });
});

// ── 2026-06-29：完整模式「前端實際送出」的真實 payload 回歸（spec：register 邊角輸入須有測試覆蓋 b）──
// 補的破口：2026-06-21 與 2026-06-29 兩次事故，測試與實機都只用「最小輸入」或「model 合法人造值」，
// 從不送前端完整模式真實 payload（含由農曆推算、以西元年形式送出的 gregorianBirthYear + 家人西元生年），
// 驗證器與前端資料契約的落差因而無從現形。此 describe 用真實西元年 payload 鎖住該契約。
describe('完整模式前端真實 payload（含西元 gregorianBirthYear + 家人西元生年）通過驗證', () => {
  test('主客戶西元生年 + 一名家人西元生年 → 整筆通過、不被擋', async () => {
    const r = await runRegister({
      name: '王完整',
      phone: '0912345678',
      gender: 'male',
      lunarBirthYear: 80, lunarBirthMonth: 6, lunarBirthDay: 15, lunarIsLeapMonth: false,
      gregorianBirthYear: 1991, gregorianBirthMonth: 6, gregorianBirthDay: 15,
      addresses: [{ address: '台北市信義區', addressType: 'home' }],
      consultationTopics: ['body', 'fate'],
      familyMembers: [{
        name: '王家人', gender: 'female',
        lunarBirthYear: 92, lunarBirthMonth: 3, lunarBirthDay: 8, lunarIsLeapMonth: false,
        gregorianBirthYear: 2003, gregorianBirthMonth: 3, gregorianBirthDay: 8,
        address: '台北市信義區', addressType: 'home',
      }],
    });
    expect(r.isEmpty).toBe(true);
  });

  test('主客戶與家人的 gregorianBirthYear 西元年皆不被擋（對稱）', async () => {
    const r = await runRegister({
      name: '王', phone: '0912345678', gender: 'male',
      gregorianBirthYear: 1991,
      addresses: [{ address: '台北市', addressType: 'home' }],
      consultationTopics: ['body'],
      familyMembers: [{ name: '王家人', gregorianBirthYear: 2003 }],
    });
    expect(fieldErrors(r.paths, 'gregorianBirthYear')).toEqual([]);
    expect(fieldErrors(r.paths, 'familyMembers')).toEqual([]);
  });
});

// ── 2026-06-29：validateRequest 驗證失敗回應須附可讀 message（spec：API 驗證失敗回應須附可讀訊息）──
// 跑完 validator chain 後，呼叫 validateRequest 中介層、以 mock res 攔截 json，斷言回應帶真正原因。
describe('validateRequest 驗證失敗回應須附可讀 message', () => {
  async function runMiddleware(body) {
    const req = { body, params: {}, query: {}, cookies: {}, headers: {} };
    for (const chain of validateRegisterQueue) await chain.run(req);
    let status = null;
    let payload = null;
    let nextCalled = false;
    const res = {
      status(code) { status = code; return this; },
      json(p) { payload = p; return this; },
    };
    validateRequest(req, res, () => { nextCalled = true; });
    return { status, payload, nextCalled };
  }

  test('驗證失敗 → 400 且 message 為真正欄位原因（非 "Request failed"）、errors[] 仍在', async () => {
    const futureYear = new Date().getFullYear() + 50;
    const { status, payload } = await runMiddleware({ name: '測試', gregorianBirthYear: futureYear });
    expect(status).toBe(400);
    expect(payload.success).toBe(false);
    expect(typeof payload.message).toBe('string');
    expect(payload.message.length).toBeGreaterThan(0);
    expect(payload.message).not.toBe('Request failed');
    expect(Array.isArray(payload.errors)).toBe(true);
    expect(payload.errors.length).toBeGreaterThan(0);
  });

  test('驗證通過 → 放行（next 被呼叫、不回 400）', async () => {
    const { status, nextCalled } = await runMiddleware({ name: '測試', gregorianBirthYear: 1991 });
    expect(nextCalled).toBe(true);
    expect(status).toBe(null);
  });
});
