const logger = require('./logger');
const { Lunar, Solar } = require('lunar-javascript');

/**
 * 西元年轉民國年
 * @param {number} gregorianYear - 西元年
 * @returns {number} - 民國年
 */
function gregorianToMinguo(gregorianYear) {
  return gregorianYear - 1911;
}

/**
 * 民國年轉西元年
 * @param {number} minguoYear - 民國年
 * @returns {number} - 西元年
 */
function minguoToGregorian(minguoYear) {
  return minguoYear + 1911;
}

/**
 * 自動判斷年份輸入是民國還是西元，並轉換為民國年
 * @param {number} inputYear - 輸入的年份
 * @returns {object} - {minguoYear: number, originalType: 'minguo'|'gregorian'}
 */
function autoConvertToMinguo(inputYear) {
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
function convertMinguoForStorage(minguoYear) {
  return minguoToGregorian(minguoYear);
}

/**
 * 國曆轉農曆
 * @param {number} year - 國曆年（西元年）
 * @param {number} month - 國曆月
 * @param {number} day - 國曆日
 * @returns {object} - 農曆日期對象 {year, month, day, isLeapMonth}
 */
function gregorianToLunar(year, month, day) {
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
    logger.error('國曆轉農曆錯誤:', error);
    throw new Error('國曆日期轉換失敗');
  }
}

/**
 * 農曆轉國曆
 *
 * Follow-up patch #5（OpenSpec 2026-05-23-followup-patches D4）：
 * 改接受「民國年」輸入（不再接受西元年）。系統內 lunarBirthYear 一律是民國年，
 * 此 function 在被 autoFillDates / admin 工具呼叫時都應傳民國年。
 * 內部先 +1911 轉成西元年，再丟給 lunar-javascript 算對應國曆日期。
 *
 * 對應 design.md D4 的「函式單一職責：民國農曆生日 → 西元國曆日期」。
 * 注意：gregorianToLunar 保持接受西元年（給未來 admin 工具用，輸入是西元年國曆、
 * 輸出農曆民國年）— 兩個函式語意不對稱但對應實際 use case。
 *
 * @param {number} minguoYear - 農曆年（民國年）
 * @param {number} month - 農曆月
 * @param {number} day - 農曆日
 * @param {boolean} isLeapMonth - 是否為閏月
 * @returns {object} - 國曆日期對象（西元年）{year, month, day}
 */
function lunarToGregorian(minguoYear, month, day, isLeapMonth = false) {
  try {
    // Follow-up patch #5：民國年 → 西元年（lunar-javascript 吃西元年）
    const gregorianYear = minguoYear + 1911;

    // 創建農曆日期對象，閏月月份用負數表示
    const lunarMonth = isLeapMonth ? -month : month;
    const lunar = Lunar.fromYmd(gregorianYear, lunarMonth, day);

    // 轉換為國曆
    const solar = lunar.getSolar();

    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay()
    };
  } catch (error) {
    logger.error('農曆轉國曆錯誤:', error);
    throw new Error('農曆日期轉換失敗');
  }
}

/**
 * 自動填充缺失的日期數據
 *
 * Follow-up patch #5（OpenSpec 2026-05-23-followup-patches D5）：
 * Change C v3 之前把這個 function 退化成淺拷貝（懷疑民國/西元年混淆轉換錯誤）。
 * 5/23 懷特反饋設計反轉：要保留「農曆→國曆自動反推」、系統每次新資料匯入或
 * 後台修改時自動算國曆填進 gregorianBirth* 欄位、UI 永遠不開國曆編輯入口。
 *
 * 此版本：
 *   - 恢復「農曆→國曆 反推」：呼叫修好的 lunarToGregorian（民國年版）
 *   - 移除「國曆→農曆 反推」：前端不再有國曆輸入入口、不需要這方向
 *   - 觸發時機沿用既有：register / admin updateQueueData / customer normalize 等
 *     callsite 都已呼叫此 function（不用改 callsite）
 *
 * 注意：只在 lunar 三欄位齊全、且 gregorian 任一欄位缺值時才反推。
 * 若 gregorian 已存在完整值（例如歷史資料），仍會覆蓋成新算出來的西元值
 * （懷特要求「每次儲存自動補正確國曆」、舊國曆 80/1/1 也會被覆蓋）。
 *
 * @param {object} data - 客戶數據
 * @returns {object} - 自動填充後的數據
 */
function autoFillDates(data) {
  try {
    const result = { ...data };

    // 農曆→國曆 反推（lunar 三欄位齊全才推）
    if (result.lunarBirthYear && result.lunarBirthMonth && result.lunarBirthDay) {
      const gregorianDate = lunarToGregorian(
        result.lunarBirthYear,
        result.lunarBirthMonth,
        result.lunarBirthDay,
        result.lunarIsLeapMonth || false
      );
      result.gregorianBirthYear = gregorianDate.year;
      result.gregorianBirthMonth = gregorianDate.month;
      result.gregorianBirthDay = gregorianDate.day;
    }

    // Follow-up patch #5：不再反推「國曆→農曆」（前端無國曆輸入入口）

    return result;
  } catch (error) {
    logger.error('自動填充日期失敗:', error);
    return { ...data };
  }
}

/**
 * 計算生肖（基於農曆年）
 *
 * Change C v3：lunarBirthYear 改視為「民國年」。內部 +1911 轉西元
 * 後再丟給 lunar-javascript 取生肖。
 *
 * @param {number} lunarBirthYear - 農曆出生年（民國年）
 * @returns {string|null} - 生肖（如：「鼠」、「牛」、「虎」等）
 */
function calculateZodiac(lunarBirthYear) {
  if (!lunarBirthYear) return null;

  try {
    // Change C v3：民國年 → 西元年（lunar-javascript 吃西元年）
    const gregorianYear = lunarBirthYear + 1911;

    // 使用 lunar-javascript 獲取生肖
    // 創建農曆日期對象（使用年份的第一天即可獲取生肖）
    const lunar = Lunar.fromYmd(gregorianYear, 1, 1);

    // 取得生肖（lunar-javascript 回傳簡體，轉繁體）
    const simplifiedToTraditional = { '龙': '龍', '马': '馬', '鸡': '雞', '猪': '豬' };
    const raw = lunar.getYearShengXiao();
    return simplifiedToTraditional[raw] || raw;
  } catch (error) {
    logger.error('生肖計算錯誤:', error);
    return null;
  }
}

/**
 * 為數據自動計算並添加生肖
 * @param {object} data - 客戶數據
 * @returns {object} - 添加生肖後的數據
 */
function addZodiac(data) {
  const result = { ...data };
  
  // 計算主客戶生肖
  if (result.lunarBirthYear) {
    result.zodiac = calculateZodiac(result.lunarBirthYear);
  }
  
  // 計算家人生肖
  if (result.familyMembers && Array.isArray(result.familyMembers)) {
    result.familyMembers = result.familyMembers.map(member => ({
      ...member,
      zodiac: member.lunarBirthYear ? calculateZodiac(member.lunarBirthYear) : null
    }));
  }
  
  return result;
}

/**
 * 計算虛歲（基於農曆年）
 *
 * Change C v3：lunarBirthYear 改視為「民國年」，虛歲算法簡化為
 * 「今年民國年 - 出生民國年 + 1」（不再用 lunar-javascript 取當前農曆年）。
 *
 * @param {number} lunarBirthYear - 農曆出生年（民國年）
 * @returns {number} - 虛歲
 */
function calculateVirtualAge(lunarBirthYear) {
  if (!lunarBirthYear) return null;

  try {
    // Change C v3：今年民國年 = 西元年 - 1911
    const currentMinguoYear = new Date().getFullYear() - 1911;

    // 虛歲計算：今年民國年 - 出生民國年 + 1
    return currentMinguoYear - lunarBirthYear + 1;
  } catch (error) {
    logger.error('虛歲計算錯誤:', error);
    return null;
  }
}

/**
 * 為數據自動計算並添加虛歲
 * @param {object} data - 客戶數據
 * @returns {object} - 添加虛歲後的數據
 */
function addVirtualAge(data) {
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
function autoFillFamilyMembersDates(data) {
  if (!data.familyMembers || !Array.isArray(data.familyMembers)) {
    return data;
  }
  
  const result = { ...data };
  result.familyMembers = data.familyMembers.map(member => autoFillDates(member));
  
  return result;
}

module.exports = {
  gregorianToMinguo,
  minguoToGregorian,
  autoConvertToMinguo,
  convertMinguoForStorage,
  gregorianToLunar,
  lunarToGregorian,
  autoFillDates,
  autoFillFamilyMembersDates,
  calculateZodiac,
  addZodiac,
  calculateVirtualAge,
  addVirtualAge
}; 