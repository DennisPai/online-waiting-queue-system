/**
 * zodiac-virtualage-minguo.test.js
 *
 * Change C v3 — calculateZodiac / calculateVirtualAge 改用「民國年」算
 *
 * 背景：v2 之前 lunarBirthYear 在 calendarConverter 內被當「西元年」處理
 * （Lunar.fromYmd(lunarBirthYear, 1, 1) / currentLunarYear - lunarBirthYear + 1）。
 * v3 全民國農曆，lunarBirthYear 統一視為「民國年」：
 *   - calculateZodiac：內部 +1911 轉西元再呼叫 lunar-javascript
 *   - calculateVirtualAge：今年民國年(=getFullYear()-1911) - lunarBirthYear + 1
 *
 * 不 mock mongoose、不連 DB，直接呼叫 utils function。
 */

const { Lunar } = require('lunar-javascript');
const {
  calculateZodiac,
  calculateVirtualAge,
  addZodiac,
  addVirtualAge,
} = require('../src/utils/calendarConverter');

// 簡繁體生肖映射（跟 calendarConverter 內部對齊）
const simplifiedToTraditional = { '龙': '龍', '马': '馬', '鸡': '雞', '猪': '豬' };
function expectedZodiacForMinguo(minguoYear) {
  const raw = Lunar.fromYmd(minguoYear + 1911, 1, 1).getYearShengXiao();
  return simplifiedToTraditional[raw] || raw;
}

describe('Change C v3 — calculateZodiac 用民國 lunarBirthYear 算', () => {
  test('1. 民國 80 (=西元 1991) → 生肖跟 lunar-javascript 對 1991 的結果一致', () => {
    const result = calculateZodiac(80);
    const expected = expectedZodiacForMinguo(80);
    expect(result).toBe(expected);
    // 額外驗：result 是個非空字串（生肖）
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('2. 民國 90 (=西元 2001) → 生肖跟 lunar-javascript 對 2001 的結果一致', () => {
    const result = calculateZodiac(90);
    const expected = expectedZodiacForMinguo(90);
    expect(result).toBe(expected);
  });

  test('3. lunarBirthYear 為 falsy (null/undefined/0) → 回 null', () => {
    expect(calculateZodiac(null)).toBe(null);
    expect(calculateZodiac(undefined)).toBe(null);
    expect(calculateZodiac(0)).toBe(null);
  });

  test('4. addZodiac：主客戶 + 家人 lunarBirthYear 都用民國年算生肖', () => {
    const data = {
      lunarBirthYear: 80,
      familyMembers: [
        { name: '家人A', lunarBirthYear: 90 },
        { name: '家人B', lunarBirthYear: 100 },
        { name: '家人C' }, // 沒生日 → zodiac 應為 null
      ],
    };

    const result = addZodiac(data);

    expect(result.zodiac).toBe(expectedZodiacForMinguo(80));
    expect(result.familyMembers[0].zodiac).toBe(expectedZodiacForMinguo(90));
    expect(result.familyMembers[1].zodiac).toBe(expectedZodiacForMinguo(100));
    expect(result.familyMembers[2].zodiac).toBe(null);
  });
});

describe('Change C v3 — calculateVirtualAge 用民國 lunarBirthYear 算', () => {
  test('1. 民國 80 (=西元 1991) → 虛歲 = 今年民國年 - 80 + 1', () => {
    const currentMinguoYear = new Date().getFullYear() - 1911;
    const expected = currentMinguoYear - 80 + 1;
    expect(calculateVirtualAge(80)).toBe(expected);
  });

  test('2. 民國 115 (今年) → 虛歲 = 1', () => {
    const currentMinguoYear = new Date().getFullYear() - 1911;
    // 今年出生 → 虛歲 1
    expect(calculateVirtualAge(currentMinguoYear)).toBe(1);
  });

  test('3. lunarBirthYear 為 falsy (null/undefined/0) → 回 null', () => {
    expect(calculateVirtualAge(null)).toBe(null);
    expect(calculateVirtualAge(undefined)).toBe(null);
    expect(calculateVirtualAge(0)).toBe(null);
  });

  test('4. addVirtualAge：主客戶 + 家人 lunarBirthYear 都用民國年算虛歲', () => {
    const currentMinguoYear = new Date().getFullYear() - 1911;
    const data = {
      lunarBirthYear: 80,
      familyMembers: [
        { name: '家人A', lunarBirthYear: 90 },
        { name: '家人B', lunarBirthYear: 100 },
        { name: '家人C' }, // 沒生日 → virtualAge 應為 null
      ],
    };

    const result = addVirtualAge(data);

    expect(result.virtualAge).toBe(currentMinguoYear - 80 + 1);
    expect(result.familyMembers[0].virtualAge).toBe(currentMinguoYear - 90 + 1);
    expect(result.familyMembers[1].virtualAge).toBe(currentMinguoYear - 100 + 1);
    expect(result.familyMembers[2].virtualAge).toBe(null);
  });
});
