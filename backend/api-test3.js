const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 測試閏月相關功能 ===');

try {
  console.log('1. 測試正常月份:');
  const solar1 = Solar.fromYmd(2023, 5, 15);
  const lunar1 = solar1.getLunar();
  console.log('國曆:', solar1.toString());
  console.log('農曆:', lunar1.toString());
  console.log('農曆年月日:', lunar1.getYear(), lunar1.getMonth(), lunar1.getDay());
  
  // 尋找閏月相關方法
  const lunarMethods = Object.getOwnPropertyNames(lunar1).filter(name => 
    typeof lunar1[name] === 'function' && 
    (name.toLowerCase().includes('leap') || name.includes('闰'))
  );
  console.log('閏月相關方法:', lunarMethods);
  
  // 測試是否有getMonthInChinese等方法提供線索
  console.log('農曆月份(中文):', lunar1.getMonthInChinese());
  
  // 檢查2023年是否有閏月
  console.log('\n2. 測試2023年的閏月 (農曆2月):');
  try {
    // 創建閏月日期
    const lunarLeap = Lunar.fromYmd(2023, 2, 15, true); // true表示閏月
    console.log('閏二月:', lunarLeap.toString());
    console.log('轉換為國曆:', lunarLeap.getSolar().toString());
  } catch (error) {
    console.log('2023年沒有閏二月');
  }
  
  // 測試有閏月的年份 (2023年有閏二月)
  console.log('\n3. 測試農曆轉國曆:');
  const lunarNormal = Lunar.fromYmd(2023, 3, 26, false);
  console.log('農曆三月廿六:', lunarNormal.toString());
  console.log('轉換為國曆:', lunarNormal.getSolar().toString());
  
} catch (error) {
  console.error('❌ 測試失敗:', error);
} 