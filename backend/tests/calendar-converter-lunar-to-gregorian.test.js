/**
 * calendar-converter-lunar-to-gregorian.test.js
 *
 * Follow-up patch #5（OpenSpec 2026-05-23-followup-patches D4 / D5）：
 * v3 設計反轉 — lunarToGregorian 改接受「民國年」輸入、
 * autoFillDates 恢復「農曆→國曆」自動反推（v3 暫時退化為淺拷貝的設計被推翻）。
 *
 * 背景：v2 系統前端只送 lunarBirth* 三欄位（+ 視情況 lunarIsLeapMonth），原本後端
 * autoFillDates 會反推 gregorianBirth* 給下游邏輯。Change C v3 一度移除這層轉換、
 * 退化為淺拷貝；5/23 懷特反饋設計反轉：要保留「農曆→國曆自動反推」，UI 永遠不開
 * 國曆編輯入口。本次 follow-up #5 把 lunarToGregorian 改接受民國年輸入，
 * autoFillDates 恢復反推（呼叫修好的民國年版）。
 *
 * 對應 design.md D4 / D5：
 *   - lunarToGregorian 接受民國年（內部 +1911 轉西元再算）、回西元年
 *   - autoFillDates 恢復「農曆→國曆 反推」邏輯
 *   - 移除「國曆→農曆 反推」邏輯（前端不再有國曆輸入入口）
 *   - gregorianToLunar 保持接受西元年（給未來 admin 工具用，不對稱但對應實際 use case）
 *
 * 不 mock mongoose、不連 DB，直接呼叫 utils function。
 */

const calendarConverter = require('../src/utils/calendarConverter');
const { autoFillDates, lunarToGregorian, gregorianToLunar } = calendarConverter;

describe('Follow-up #5 — lunarToGregorian 接受民國年 + autoFillDates 恢復反推', () => {
  describe('lunarToGregorian 接受民國年（D4）', () => {
    test('民國 80 農曆 1/15（非閏月）→ 西元 1991/3/1', () => {
      // 民國 80 = 西元 1991；lunar-javascript 確認 1991 農曆 1/15 對應西元 1991/3/1
      const result = lunarToGregorian(80, 1, 15, false);
      expect(result).toMatchObject({
        year: 1991,
        month: 3,
        day: 1
      });
    });

    test('民國 109 農曆閏 4/15（閏月）→ 西元 2020/6/6', () => {
      // 民國 109 = 西元 2020；2020 農曆閏 4/15 對應西元 2020/6/6
      const result = lunarToGregorian(109, 4, 15, true);
      expect(result).toMatchObject({
        year: 2020,
        month: 6,
        day: 6
      });
    });

    test('民國 109 農曆 4/15（非閏月）→ 西元 2020/5/7（與閏月版不同日）', () => {
      // 同年同月日，閏月 flag 不同 → 算出來的西元日期應不同
      const result = lunarToGregorian(109, 4, 15, false);
      expect(result).toMatchObject({
        year: 2020,
        month: 5,
        day: 7
      });
    });

    test('isLeapMonth 預設為 false（不傳第 4 參數時 = 非閏月）', () => {
      const withDefault = lunarToGregorian(80, 1, 15);
      const explicitFalse = lunarToGregorian(80, 1, 15, false);
      expect(withDefault).toEqual(explicitFalse);
    });
  });

  describe('autoFillDates 恢復「農曆→國曆」反推（D5）', () => {
    test('只帶 lunarBirth* 三欄位 → autoFillDates 自動補對應 gregorianBirth*', () => {
      const input = {
        lunarBirthYear: 80,    // 民國年（v3+#5 全民國農曆）
        lunarBirthMonth: 1,
        lunarBirthDay: 15
      };

      const result = autoFillDates(input);

      // 反推：民國 80 農曆 1/15 → 西元 1991/3/1（透過 lunarToGregorian 民國年版）
      expect(result.gregorianBirthYear).toBe(1991);
      expect(result.gregorianBirthMonth).toBe(3);
      expect(result.gregorianBirthDay).toBe(1);

      // 原 lunar 欄位完整保留
      expect(result.lunarBirthYear).toBe(80);
      expect(result.lunarBirthMonth).toBe(1);
      expect(result.lunarBirthDay).toBe(15);
    });

    test('帶 lunarIsLeapMonth=true 時反推走閏月分支', () => {
      const input = {
        lunarBirthYear: 109,
        lunarBirthMonth: 4,
        lunarBirthDay: 15,
        lunarIsLeapMonth: true
      };

      const result = autoFillDates(input);

      // 民國 109 農曆閏 4/15 → 西元 2020/6/6
      expect(result.gregorianBirthYear).toBe(2020);
      expect(result.gregorianBirthMonth).toBe(6);
      expect(result.gregorianBirthDay).toBe(6);
    });

    test('既有 gregorianBirth 80/1/1 的歷史資料 → 仍會被覆蓋成正確西元值（懷特要求每次儲存自動補正確國曆）', () => {
      // design.md D5：若 gregorian 已存在完整值（例如歷史資料），仍會覆蓋成新算出來的西元值
      // 懷特要求「每次儲存自動補正確國曆」、舊國曆 80/1/1 也會被覆蓋
      const input = {
        lunarBirthYear: 80,
        lunarBirthMonth: 1,
        lunarBirthDay: 15,
        gregorianBirthYear: 80,   // 歷史髒資料（民國年被誤存進西元欄位）
        gregorianBirthMonth: 1,
        gregorianBirthDay: 1
      };

      const result = autoFillDates(input);

      // 被覆蓋成新算出的正確西元值
      expect(result.gregorianBirthYear).toBe(1991);
      expect(result.gregorianBirthMonth).toBe(3);
      expect(result.gregorianBirthDay).toBe(1);
    });

    test('lunar 三欄位不齊全（缺 lunarBirthDay）→ 不反推、gregorian 維持 undefined', () => {
      const input = {
        lunarBirthYear: 80,
        lunarBirthMonth: 1
        // 故意不給 lunarBirthDay
      };

      const result = autoFillDates(input);

      expect(result.gregorianBirthYear).toBeUndefined();
      expect(result.gregorianBirthMonth).toBeUndefined();
      expect(result.gregorianBirthDay).toBeUndefined();
    });

    test('不帶任何生日欄位 → autoFillDates 仍正常回傳（不丟錯）', () => {
      const input = { name: '王小明', phone: '0912345678' };
      const result = autoFillDates(input);
      expect(result.name).toBe('王小明');
      expect(result.phone).toBe('0912345678');
      expect(result.gregorianBirthYear).toBeUndefined();
      expect(result.lunarBirthYear).toBeUndefined();
    });

    test('不再有「國曆→農曆」反推（前端無國曆輸入入口、後端也移除此方向）', () => {
      // D5 明確要求移除「國曆→農曆」反推
      // 送 gregorianBirth + 完全沒帶 lunarBirth → autoFillDates 不該補 lunarBirth
      const input = {
        gregorianBirthYear: 2000,
        gregorianBirthMonth: 2,
        gregorianBirthDay: 5
      };

      const result = autoFillDates(input);

      // lunar 欄位不應被自動補（這個方向已移除）
      expect(result.lunarBirthYear).toBeUndefined();
      expect(result.lunarBirthMonth).toBeUndefined();
      expect(result.lunarBirthDay).toBeUndefined();

      // 原 gregorian 欄位保留
      expect(result.gregorianBirthYear).toBe(2000);
      expect(result.gregorianBirthMonth).toBe(2);
      expect(result.gregorianBirthDay).toBe(5);
    });
  });

  describe('gregorianToLunar 保持接受西元年（D4 對稱例外）', () => {
    test('gregorianToLunar 仍接受西元年輸入', () => {
      // 西元 2000/2/5 → 農曆（取 round-trip 驗證 fn 還能用）
      const lunar = gregorianToLunar(2000, 2, 5);
      expect(lunar).toMatchObject({
        year: expect.any(Number),
        month: expect.any(Number),
        day: expect.any(Number),
        isLeapMonth: expect.any(Boolean)
      });
      // 西元 2000/2/5 = 農曆 2000/1/1（lunar new year，lunar-javascript 回西元年）
      expect(lunar.year).toBe(2000);
      expect(lunar.month).toBe(1);
      expect(lunar.day).toBe(1);
      expect(lunar.isLeapMonth).toBe(false);
    });

    test('lunarToGregorian / gregorianToLunar 都仍 export', () => {
      expect(typeof lunarToGregorian).toBe('function');
      expect(typeof gregorianToLunar).toBe('function');
    });
  });
});
