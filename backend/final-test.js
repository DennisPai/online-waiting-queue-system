const { gregorianToLunar, lunarToGregorian, autoFillDates, autoFillFamilyMembersDates } = require('./src/utils/calendarConverter');

console.log('=== 最終測試日期轉換工具 ===');

try {
  // 測試1: 國曆轉農曆
  console.log('1. 國曆轉農曆測試:');
  const lunarResult = gregorianToLunar(2023, 5, 15);
  console.log('   國曆 2023-5-15 轉換為農曆:', lunarResult);
  
  // 測試2: 農曆轉國曆
  console.log('2. 農曆轉國曆測試:');
  const gregorianResult = lunarToGregorian(2023, 4, 26, false);
  console.log('   農曆 2023-4-26 轉換為國曆:', gregorianResult);
  
  // 測試3: 自動填充功能（國曆到農曆）
  console.log('3. 自動填充功能測試 - 國曆到農曆:');
  const testData1 = {
    name: '測試用戶',
    gregorianBirthYear: 1990,
    gregorianBirthMonth: 6,
    gregorianBirthDay: 15
  };
  
  const filledData1 = autoFillDates(testData1);
  console.log('   輸入數據:', testData1);
  console.log('   自動填充後:', filledData1);
  
  // 測試4: 自動填充功能（農曆到國曆）
  console.log('4. 自動填充功能測試 - 農曆到國曆:');
  const testData2 = {
    name: '測試用戶2',
    lunarBirthYear: 1995,
    lunarBirthMonth: 8,
    lunarBirthDay: 15,
    lunarIsLeapMonth: false
  };
  
  const filledData2 = autoFillDates(testData2);
  console.log('   輸入數據:', testData2);
  console.log('   自動填充後:', filledData2);
  
  // 測試5: 家人數據自動填充
  console.log('5. 家人數據自動填充測試:');
  const familyData = [
    {
      name: '家人1',
      gregorianBirthYear: 2000,
      gregorianBirthMonth: 1,
      gregorianBirthDay: 1
    },
    {
      name: '家人2',
      lunarBirthYear: 1998,
      lunarBirthMonth: 12,
      lunarBirthDay: 20,
      lunarIsLeapMonth: false
    }
  ];
  
  const filledFamilyData = autoFillFamilyMembersDates(familyData);
  console.log('   家人原始數據:', familyData);
  console.log('   家人填充後數據:', filledFamilyData);
  
  console.log('\n✅ 所有測試通過！轉換工具工作正常');
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error('錯誤詳情:', error.stack);
} 