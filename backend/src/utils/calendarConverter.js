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
function lunarToGregorian(year, month, day, isLeapMonth = false) {
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
function autoFillDates(data) {
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
    
    return result;
  } catch (error) {
    console.error('自動填充日期失敗:', error);
    return data;
  }
}

/**
 * 計算虛歲（基於農曆年）
 * @param {number} lunarBirthYear - 農曆出生年（西元年）
 * @returns {number} - 虛歲
 */
function calculateVirtualAge(lunarBirthYear) {
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

/**
 * 專門處理編輯客戶資料時的日期變更邏輯
 * 完全仿效登記候位的處理流程
 * @param {object} newData - 新的客戶資料
 * @param {object} oldData - 舊的客戶資料 
 * @returns {object} - 處理後的資料
 */
function processEditBirthDateChanges(newData, oldData) {
  try {
    const result = { ...newData };
    
    // 檢查國曆年月日是否有變更
    const gregorianChanged = (
      newData.gregorianBirthYear !== oldData.gregorianBirthYear ||
      newData.gregorianBirthMonth !== oldData.gregorianBirthMonth ||
      newData.gregorianBirthDay !== oldData.gregorianBirthDay
    );
    
    // 檢查農曆年月日是否有變更
    const lunarChanged = (
      newData.lunarBirthYear !== oldData.lunarBirthYear ||
      newData.lunarBirthMonth !== oldData.lunarBirthMonth ||
      newData.lunarBirthDay !== oldData.lunarBirthDay ||
      newData.lunarIsLeapMonth !== oldData.lunarIsLeapMonth
    );
    
    // 若國曆和農曆都有變更，以國曆為準
    if (gregorianChanged && lunarChanged) {
      console.log('國曆和農曆都有變更，以國曆為準');
      
      // 清空農曆資料
      result.lunarBirthYear = null;
      result.lunarBirthMonth = null;
      result.lunarBirthDay = null;
      result.lunarIsLeapMonth = false;
      
      // 處理國曆資料變更邏輯
      return processGregorianDateChange(result);
    }
    // 若只有國曆有變更
    else if (gregorianChanged) {
      console.log('僅國曆有變更');
      
      // 清空農曆資料
      result.lunarBirthYear = null;
      result.lunarBirthMonth = null;
      result.lunarBirthDay = null;
      result.lunarIsLeapMonth = false;
      
      // 處理國曆資料變更邏輯
      return processGregorianDateChange(result);
    }
    // 若只有農曆有變更
    else if (lunarChanged) {
      console.log('僅農曆有變更');
      
      // 清空國曆資料
      result.gregorianBirthYear = null;
      result.gregorianBirthMonth = null;
      result.gregorianBirthDay = null;
      
      // 處理農曆資料變更邏輯
      return processLunarDateChange(result);
    }
    // 若都沒有變更，直接返回
    else {
      console.log('出生日期無變更');
      return result;
    }
    
  } catch (error) {
    console.error('處理編輯日期變更失敗:', error);
    return newData;
  }
}

/**
 * 處理國曆資料變更邏輯（完全仿效登記候位流程）
 * @param {object} data - 客戶資料
 * @returns {object} - 處理後的資料
 */
function processGregorianDateChange(data) {
  try {
    const result = { ...data };
    
    // 檢查是否有完整的國曆年月日
    if (result.gregorianBirthYear && result.gregorianBirthMonth && result.gregorianBirthDay) {
      
      // 步驟1: 判斷國曆年份為民國or西元 (仿效登記候位邏輯)
      const { minguoYear } = autoConvertToMinguo(result.gregorianBirthYear);
      const gregorianYear = convertMinguoForStorage(minguoYear);
      
      // 步驟2: 將國曆年份統一轉為西元年進行處理
      result.gregorianBirthYear = gregorianYear;
      
      // 步驟3: 國曆轉農曆
      const lunarDate = gregorianToLunar(
        result.gregorianBirthYear,
        result.gregorianBirthMonth,
        result.gregorianBirthDay
      );
      
      // 步驟4: 農曆西元資料填入農曆欄位
      result.lunarBirthYear = lunarDate.year;
      result.lunarBirthMonth = lunarDate.month;
      result.lunarBirthDay = lunarDate.day;
      result.lunarIsLeapMonth = lunarDate.isLeapMonth;
      
      console.log('國曆資料處理完成:', {
        原始年份: data.gregorianBirthYear,
        民國年: minguoYear,
        西元年: gregorianYear,
        轉換後農曆: lunarDate
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('處理國曆資料變更失敗:', error);
    return data;
  }
}

/**
 * 處理農曆資料變更邏輯（完全仿效登記候位流程）
 * @param {object} data - 客戶資料
 * @returns {object} - 處理後的資料
 */
function processLunarDateChange(data) {
  try {
    const result = { ...data };
    
    // 檢查是否有完整的農曆年月日
    if (result.lunarBirthYear && result.lunarBirthMonth && result.lunarBirthDay) {
      
      // 步驟1: 判斷農曆年份為民國or西元 (仿效登記候位邏輯)
      const { minguoYear } = autoConvertToMinguo(result.lunarBirthYear);
      const gregorianYear = convertMinguoForStorage(minguoYear);
      
      // 步驟2: 將農曆年份統一轉為西元年進行處理
      result.lunarBirthYear = gregorianYear;
      
      // 步驟3: 農曆轉國曆
      const gregorianDate = lunarToGregorian(
        result.lunarBirthYear,
        result.lunarBirthMonth,
        result.lunarBirthDay,
        result.lunarIsLeapMonth || false
      );
      
      // 步驟4: 國曆西元資料填入國曆欄位
      result.gregorianBirthYear = gregorianDate.year;
      result.gregorianBirthMonth = gregorianDate.month;
      result.gregorianBirthDay = gregorianDate.day;
      
      console.log('農曆資料處理完成:', {
        原始年份: data.lunarBirthYear,
        民國年: minguoYear,
        西元年: gregorianYear,
        轉換後國曆: gregorianDate
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('處理農曆資料變更失敗:', error);
    return data;
  }
}

/**
 * 為家人資料處理編輯時的日期變更邏輯
 * @param {object} newFamilyData - 包含新家人資料的對象
 * @param {object} oldFamilyData - 包含舊家人資料的對象
 * @returns {object} - 處理後的資料
 */
function processFamilyMembersEditBirthDateChanges(newFamilyData, oldFamilyData = {}) {
  if (!newFamilyData.familyMembers || !Array.isArray(newFamilyData.familyMembers)) {
    return newFamilyData;
  }
  
  const result = { ...newFamilyData };
  const oldFamilyMembers = oldFamilyData.familyMembers || [];
  
  result.familyMembers = newFamilyData.familyMembers.map((member, index) => {
    const oldMember = oldFamilyMembers[index] || {};
    return processEditBirthDateChanges(member, oldMember);
  });
  
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
  calculateVirtualAge,
  addVirtualAge,
  processEditBirthDateChanges,
  processFamilyMembersEditBirthDateChanges
}; 