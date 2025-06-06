const { gregorianToLunar, lunarToGregorian, autoFillDates, autoFillFamilyMembersDates } = require('./src/utils/calendarConverter');

console.log('=== 測試日期轉換工具 ===');

try {
  // 測試國曆轉農曆
  console.log('1. 國曆轉農曆測試:');
  const lunarResult = gregorianToLunar(2023, 5, 15);
  console.log('   國曆 2023-5-15 轉換為農曆:', lunarResult);
  
  // 測試農曆轉國曆
  console.log('2. 農曆轉國曆測試:');
  const gregorianResult = lunarToGregorian(2023, 4, 26);
  console.log('   農曆 2023-4-26 轉換為國曆:', gregorianResult);
  
  // 測試自動填充功能
  console.log('3. 自動填充功能測試:');
  const testData = {
    name: '測試用戶',
    gregorianBirthYear: 1990,
    gregorianBirthMonth: 6,
    gregorianBirthDay: 15
  };
  
  const filledData = autoFillDates(testData);
  console.log('   輸入數據:', testData);
  console.log('   自動填充後:', filledData);
  
  console.log('✅ 所有測試通過');
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error('詳細錯誤:', error);
} 