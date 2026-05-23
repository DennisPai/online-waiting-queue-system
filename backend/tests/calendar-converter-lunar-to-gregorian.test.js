/**
 * calendar-converter-lunar-to-gregorian.test.js
 *
 * Change C / Task 4.1.2：lunar-only 系統 autoFillDates 反向補國曆驗證
 *
 * 背景：Change C 把全系統生日輸入改為「只填農曆」。前端只送 lunarBirthYear/Month/Day
 * （+ 視情況 lunarIsLeapMonth），後端 autoFillDates 必須能從農曆反推國曆三欄位，
 * 確保下游邏輯（既有依賴 gregorianBirth* 的 service / view）不被破壞。
 *
 * 驗證範圍：
 *   1. 只帶 lunar 三欄位 → autoFillDates 自動補 gregorian 三欄位
 *   2. 含閏月 (lunarIsLeapMonth: true) → 自動補 gregorian 三欄位
 *   3. 已帶完整 gregorian + lunar → autoFillDates 不亂改既有值（idempotent）
 *
 * 不 mock mongoose、不連 DB，直接呼叫 utils function。
 */

const { autoFillDates, lunarToGregorian } = require('../src/utils/calendarConverter');

describe('Change C / Task 4.1.2 — lunar-only autoFillDates 反向補國曆', () => {
  test('只帶 lunarBirthYear/Month/Day → 自動補 gregorianBirth*', () => {
    // 隨意挑一個非閏月的農曆日期（2000 年農曆 1 月 1 日）
    const input = {
      lunarBirthYear: 2000,
      lunarBirthMonth: 1,
      lunarBirthDay: 1,
    };

    const result = autoFillDates(input);

    // 應補上對應的 gregorian 三欄位（且為數字）
    expect(typeof result.gregorianBirthYear).toBe('number');
    expect(typeof result.gregorianBirthMonth).toBe('number');
    expect(typeof result.gregorianBirthDay).toBe('number');

    // 國曆年應該在合理範圍（農曆 2000 → 國曆應為 2000 年初/前一年底）
    expect(result.gregorianBirthYear).toBeGreaterThanOrEqual(1999);
    expect(result.gregorianBirthYear).toBeLessThanOrEqual(2001);

    // 跟直接呼叫 lunarToGregorian 結果一致
    const expected = lunarToGregorian(2000, 1, 1, false);
    expect(result.gregorianBirthYear).toBe(expected.year);
    expect(result.gregorianBirthMonth).toBe(expected.month);
    expect(result.gregorianBirthDay).toBe(expected.day);

    // 原 lunar 欄位不被改動
    expect(result.lunarBirthYear).toBe(2000);
    expect(result.lunarBirthMonth).toBe(1);
    expect(result.lunarBirthDay).toBe(1);
  });

  test('含閏月 (lunarIsLeapMonth: true) → 自動補 gregorianBirth*', () => {
    // 2020 年農曆閏 4 月（lunar-javascript 認可的閏月年）
    const input = {
      lunarBirthYear: 2020,
      lunarBirthMonth: 4,
      lunarBirthDay: 15,
      lunarIsLeapMonth: true,
    };

    const result = autoFillDates(input);

    expect(typeof result.gregorianBirthYear).toBe('number');
    expect(typeof result.gregorianBirthMonth).toBe('number');
    expect(typeof result.gregorianBirthDay).toBe('number');

    // 跟直接呼叫 lunarToGregorian(..., isLeapMonth=true) 結果一致
    const expected = lunarToGregorian(2020, 4, 15, true);
    expect(result.gregorianBirthYear).toBe(expected.year);
    expect(result.gregorianBirthMonth).toBe(expected.month);
    expect(result.gregorianBirthDay).toBe(expected.day);

    // 閏月 vs 非閏月應為不同國曆日期（防呆：確認閏月旗標真的有作用）
    const nonLeap = lunarToGregorian(2020, 4, 15, false);
    const isDifferent =
      expected.year !== nonLeap.year ||
      expected.month !== nonLeap.month ||
      expected.day !== nonLeap.day;
    expect(isDifferent).toBe(true);
  });

  test('已帶完整 gregorian + lunar 時 autoFillDates 不亂改既有值（idempotent）', () => {
    const input = {
      gregorianBirthYear: 2000,
      gregorianBirthMonth: 2,
      gregorianBirthDay: 5,
      lunarBirthYear: 2000,
      lunarBirthMonth: 1,
      lunarBirthDay: 1,
      lunarIsLeapMonth: false,
    };

    const result = autoFillDates(input);

    expect(result.gregorianBirthYear).toBe(2000);
    expect(result.gregorianBirthMonth).toBe(2);
    expect(result.gregorianBirthDay).toBe(5);
    expect(result.lunarBirthYear).toBe(2000);
    expect(result.lunarBirthMonth).toBe(1);
    expect(result.lunarBirthDay).toBe(1);
  });
});
