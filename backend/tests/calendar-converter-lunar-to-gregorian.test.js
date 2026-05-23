/**
 * calendar-converter-lunar-to-gregorian.test.js
 *
 * Change C v3：全民國農曆、主流程不再做 lunar↔gregorian 轉換。
 *
 * 背景：v2 系統前端只送 lunarBirth* 三欄位（+ 視情況 lunarIsLeapMonth），原本後端
 * autoFillDates 會反推 gregorianBirth* 給下游邏輯。v3 改為「全民國農曆單一資料源」，
 * autoFillDates 不再做雙向轉換 — 但 function 仍保留 callsite 兼容，
 * lunarToGregorian / gregorianToLunar 也仍 export 給未來 admin 工具雙向轉換用。
 *
 * 驗證範圍：
 *   1. 只帶 lunar 三欄位 → autoFillDates 不會自動補 gregorian（保留欄位完整）
 *   2. 既有 record 已帶完整 gregorian + lunar → autoFillDates 不亂改既有值（idempotent）
 *   3. lunarToGregorian / gregorianToLunar function 仍 export 給未來 admin 用
 *
 * 不 mock mongoose、不連 DB，直接呼叫 utils function。
 */

const calendarConverter = require('../src/utils/calendarConverter');
const { autoFillDates, lunarToGregorian, gregorianToLunar } = calendarConverter;

describe('Change C v3 — autoFillDates 不再做 lunar↔gregorian 轉換', () => {
  test('1. 只帶 lunarBirthYear/Month/Day → autoFillDates 不補 gregorianBirth*（保留原 data）', () => {
    const input = {
      lunarBirthYear: 80,   // 民國年（v3 全民國農曆）
      lunarBirthMonth: 5,
      lunarBirthDay: 18,
    };

    const result = autoFillDates(input);

    // v3：autoFillDates 不再反推國曆三欄位
    expect(result.gregorianBirthYear).toBeUndefined();
    expect(result.gregorianBirthMonth).toBeUndefined();
    expect(result.gregorianBirthDay).toBeUndefined();

    // 原 lunar 欄位完整保留
    expect(result.lunarBirthYear).toBe(80);
    expect(result.lunarBirthMonth).toBe(5);
    expect(result.lunarBirthDay).toBe(18);
  });

  test('2. 已帶完整 gregorian + lunar 時 autoFillDates 不亂改既有值（idempotent）', () => {
    const input = {
      gregorianBirthYear: 2000,
      gregorianBirthMonth: 2,
      gregorianBirthDay: 5,
      lunarBirthYear: 80,
      lunarBirthMonth: 1,
      lunarBirthDay: 1,
      lunarIsLeapMonth: false,
    };

    const result = autoFillDates(input);

    expect(result.gregorianBirthYear).toBe(2000);
    expect(result.gregorianBirthMonth).toBe(2);
    expect(result.gregorianBirthDay).toBe(5);
    expect(result.lunarBirthYear).toBe(80);
    expect(result.lunarBirthMonth).toBe(1);
    expect(result.lunarBirthDay).toBe(1);
    expect(result.lunarIsLeapMonth).toBe(false);
  });

  test('3. lunarToGregorian / gregorianToLunar function 仍 export 給未來 admin 工具用', () => {
    // Change C v3：主流程不再呼叫這兩個 fn，但仍須保留 export
    expect(typeof lunarToGregorian).toBe('function');
    expect(typeof gregorianToLunar).toBe('function');

    // 簡單跑一個 round trip 驗證 fn 還能用（西元年輸入）
    const lunar = gregorianToLunar(2000, 2, 5);
    expect(lunar).toMatchObject({
      year: expect.any(Number),
      month: expect.any(Number),
      day: expect.any(Number),
      isLeapMonth: expect.any(Boolean),
    });

    const back = lunarToGregorian(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
    expect(back).toMatchObject({
      year: 2000,
      month: 2,
      day: 5,
    });
  });

  test('4. 不帶任何生日欄位 → autoFillDates 仍正常回傳（不丟錯）', () => {
    const input = { name: '王小明', phone: '0912345678' };
    const result = autoFillDates(input);
    expect(result.name).toBe('王小明');
    expect(result.phone).toBe('0912345678');
    expect(result.gregorianBirthYear).toBeUndefined();
    expect(result.lunarBirthYear).toBeUndefined();
  });
});
