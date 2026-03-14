/**
 * lunarDays.js
 * 農曆/國曆日期工具函式
 * 依賴 lunar-javascript（已在 package.json）
 */
import { Lunar, Solar } from 'lunar-javascript';

/**
 * 判斷國曆閏年
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 國曆某年某月的天數
 */
export function getGregorianDaysInMonth(year, month) {
  if (!year || !month) return 31;
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return days[month] || 31;
}

/**
 * 農曆某年某月的天數（含閏月）
 * @param {number} year - 西元年
 * @param {number} month - 農曆月（1-12）
 * @param {boolean} isLeapMonth - 是否閏月
 */
export function getLunarDaysInMonth(year, month, isLeapMonth = false) {
  if (!year || !month) return 30;
  try {
    const lunarMonth = isLeapMonth ? -month : month;
    const lunar = Lunar.fromYmd(year, lunarMonth, 1);
    return lunar.getDaysOfMonth();
  } catch (e) {
    return 30;
  }
}

/**
 * 判斷農曆某年某月是否存在閏月
 * @param {number} year - 西元年
 * @param {number} month - 農曆月（1-12）
 */
export function hasLeapMonth(year, month) {
  if (!year || !month) return false;
  try {
    // 嘗試用負數月份建立農曆日期，若成功表示有閏月
    const lunar = Lunar.fromYmd(year, -month, 1);
    return !!lunar;
  } catch (e) {
    return false;
  }
}

/**
 * 民國年 ↔ 西元年轉換
 */
export function minguoToGregorian(minguoYear) {
  return minguoYear + 1911;
}

export function gregorianToMinguo(gregorianYear) {
  return gregorianYear - 1911;
}

/**
 * 產生年份選項（民國 1 ~ 115 年）
 * 回傳 [{ label: '民國 XX 年（西元 XXXX）', value: gregorianYear }, ...]
 */
export function getBirthYearOptions() {
  const options = [];
  for (let minguo = 115; minguo >= 1; minguo--) {
    const gregorian = minguoToGregorian(minguo);
    options.push({
      label: `民國 ${minguo} 年（西元 ${gregorian}）`,
      value: gregorian
    });
  }
  return options;
}

/**
 * 產生月份選項（1~12）
 */
export function getMonthOptions() {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1} 月`,
    value: i + 1
  }));
}

/**
 * 產生日期選項（根據年月動態計算天數）
 */
export function getDayOptions(year, month, calendarType, isLeapMonth = false) {
  let maxDay = 31;
  if (year && month) {
    if (calendarType === 'gregorian') {
      maxDay = getGregorianDaysInMonth(year, month);
    } else {
      maxDay = getLunarDaysInMonth(year, month, isLeapMonth);
    }
  }
  return Array.from({ length: maxDay }, (_, i) => ({
    label: `${i + 1} 日`,
    value: i + 1
  }));
}
