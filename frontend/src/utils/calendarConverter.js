import { Lunar, Solar } from 'lunar-javascript';

/**
 * 西元年轉民國年
 * @param {number} gregorianYear - 西元年
 * @returns {number} - 民國年
 */
export function gregorianToMinguo(gregorianYear) {
  return gregorianYear - 1911;
}

/**
 * 民國年轉西元年
 * @param {number} minguoYear - 民國年
 * @returns {number} - 西元年
 */
export function minguoToGregorian(minguoYear) {
  return minguoYear + 1911;
}

/**
 * 自動判斷年份輸入是民國還是西元，並轉換為民國年
 * @param {number} inputYear - 輸入的年份
 * @returns {object} - {minguoYear: number, originalType: 'minguo'|'gregorian'}
 */
export function autoConvertToMinguo(inputYear) {
  const year = parseInt(inputYear);
  
  // 如果年份大於1911，判斷為西元年，需要轉換
  if (year > 1911) {
    return {
      minguoYear: gregorianToMinguo(year),
      originalType: 'gregorian'
    };
  } else {
    // 否則判斷為民國年，直接使用
    return {
      minguoYear: year,
      originalType: 'minguo'
    };
  }
}

/**
 * 將民國年轉換為西元年（用於內部處理和資料庫儲存）
 * @param {number} minguoYear - 民國年
 * @returns {number} - 西元年
 */
export function convertMinguoForStorage(minguoYear) {
  return minguoToGregorian(minguoYear);
}

/**
 * 國曆轉農曆
 * @param {number} year - 國曆年（西元年）
 * @param {number} month - 國曆月
 * @param {number} day - 國曆日
 * @returns {object} - 農曆日期對象 {year, month, day, isLeapMonth}
 */
export function gregorianToLunar(year, month, day) {
  try {
    // 創建國曆日期對象
    const solar = Solar.fromYmd(year, month, day);
    
    // 轉換為農曆
    const lunar = solar.getLunar();
    
    return {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()), // 取絕對值，因為閏月為負數
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0  // 負數表示閏月
    };
  } catch (error) {
    console.error('國曆轉農曆錯誤:', error);
    throw new Error('國曆日期轉換失敗');
  }
}

/**
 * 農曆轉國曆
 * @param {number} year - 農曆年（西元年）
 * @param {number} month - 農曆月
 * @param {number} day - 農曆日
 * @param {boolean} isLeapMonth - 是否為閏月
 * @returns {object} - 國曆日期對象 {year, month, day}
 */
export function lunarToGregorian(year, month, day, isLeapMonth = false) {
  try {
    // 創建農曆日期對象，閏月月份用負數表示
    const lunarMonth = isLeapMonth ? -month : month;
    const lunar = Lunar.fromYmd(year, lunarMonth, day);
    
    // 轉換為國曆
    const solar = lunar.getSolar();
    
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay()
    };
  } catch (error) {
    console.error('農曆轉國曆錯誤:', error);
    throw new Error('農曆日期轉換失敗');
  }
}

/**
 * 自動填充缺失的日期數據（注意：內部使用西元年進行轉換）
 * @param {object} data - 客戶數據
 * @returns {object} - 自動填充後的數據
 */
export function autoFillDates(data) {
  try {
    const result = { ...data };
    
    // 檢查是否有完整的國曆生日且缺少農曆生日
    if (result.gregorianBirthYear && result.gregorianBirthMonth && result.gregorianBirthDay &&
        (!result.lunarBirthYear || !result.lunarBirthMonth || !result.lunarBirthDay)) {
      
      const lunarDate = gregorianToLunar(
        result.gregorianBirthYear,
        result.gregorianBirthMonth,
        result.gregorianBirthDay
      );
      
      result.lunarBirthYear = lunarDate.year;
      result.lunarBirthMonth = lunarDate.month;
      result.lunarBirthDay = lunarDate.day;
      result.lunarIsLeapMonth = lunarDate.isLeapMonth;
    }
    
    // 檢查是否有完整的農曆生日且缺少國曆生日
    if (result.lunarBirthYear && result.lunarBirthMonth && result.lunarBirthDay &&
        (!result.gregorianBirthYear || !result.gregorianBirthMonth || !result.gregorianBirthDay)) {
      
      console.log('=== autoFillDates 農曆轉國曆調試 ===');
      console.log('輸入的農曆數據:', {
        lunarBirthYear: result.lunarBirthYear,
        lunarBirthMonth: result.lunarBirthMonth,
        lunarBirthDay: result.lunarBirthDay,
        lunarIsLeapMonth: result.lunarIsLeapMonth
      });
      
      const gregorianDate = lunarToGregorian(
        result.lunarBirthYear,
        result.lunarBirthMonth,
        result.lunarBirthDay,
        result.lunarIsLeapMonth || false
      );
      
      console.log('轉換得到的國曆數據:', gregorianDate);
      
      result.gregorianBirthYear = gregorianDate.year;
      result.gregorianBirthMonth = gregorianDate.month;
      result.gregorianBirthDay = gregorianDate.day;
      
      console.log('最終結果:', {
        gregorianBirthYear: result.gregorianBirthYear,
        gregorianBirthMonth: result.gregorianBirthMonth,
        gregorianBirthDay: result.gregorianBirthDay,
        lunarBirthYear: result.lunarBirthYear,
        lunarBirthMonth: result.lunarBirthMonth,
        lunarBirthDay: result.lunarBirthDay
      });
    }
    
    return result;
  } catch (error) {
    console.error('自動填充日期失敗:', error);
    return data;
  }
}

/**
 * 格式化年份顯示為民國年
 * @param {number} gregorianYear - 西元年
 * @returns {string} - 格式化的民國年字串，例如："民國112年"
 */
export function formatMinguoYear(gregorianYear) {
  if (!gregorianYear) return '';
  const minguoYear = gregorianToMinguo(gregorianYear);
  return `民國${minguoYear}年`;
}

/**
 * 格式化完整日期顯示為民國年
 * @param {number} gregorianYear - 西元年
 * @param {number} month - 月
 * @param {number} day - 日
 * @returns {string} - 格式化的民國年日期字串，例如："民國112年5月15日"
 */
export function formatMinguoDate(gregorianYear, month, day) {
  if (!gregorianYear || !month || !day) return '';
  const minguoYear = gregorianToMinguo(gregorianYear);
  return `民國${minguoYear}年${month}月${day}日`;
}

/**
 * 計算虛歲（基於農曆年）
 * @param {number} lunarBirthYear - 農曆出生年（西元年）
 * @returns {number} - 虛歲
 */
export function calculateVirtualAge(lunarBirthYear) {
  if (!lunarBirthYear) return null;
  
  try {
    // 取得當前農曆年份
    const today = new Date();
    const currentSolar = Solar.fromDate(today);
    const currentLunar = currentSolar.getLunar();
    const currentLunarYear = currentLunar.getYear();
    
    // 虛歲計算：當前農曆年 - 出生農曆年 + 1
    return currentLunarYear - lunarBirthYear + 1;
  } catch (error) {
    console.error('虛歲計算錯誤:', error);
    return null;
  }
}

/**
 * 為數據自動計算並添加虛歲
 * @param {object} data - 客戶數據
 * @returns {object} - 添加虛歲後的數據
 */
export function addVirtualAge(data) {
  const result = { ...data };
  
  // 計算主客戶虛歲
  if (result.lunarBirthYear) {
    result.virtualAge = calculateVirtualAge(result.lunarBirthYear);
  }
  
  // 計算家人虛歲
  if (result.familyMembers && Array.isArray(result.familyMembers)) {
    result.familyMembers = result.familyMembers.map(member => ({
      ...member,
      virtualAge: member.lunarBirthYear ? calculateVirtualAge(member.lunarBirthYear) : null
    }));
  }
  
  return result;
}

/**
 * 為家人數據自動填充缺失的日期
 * @param {object} data - 包含家人數據的對象
 * @returns {object} - 自動填充後的數據
 */
export function autoFillFamilyMembersDates(data) {
  if (!data.familyMembers || !Array.isArray(data.familyMembers)) {
    return data;
  }
  
  const result = { ...data };
  result.familyMembers = data.familyMembers.map(member => autoFillDates(member));
  
  return result;
} 