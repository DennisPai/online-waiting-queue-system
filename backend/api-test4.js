const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 測試如何判斷閏月 ===');

try {
  // 測試正常月份
  console.log('1. 測試正常月份:');
  const lunarNormal = Lunar.fromYmd(2023, 3, 26, false);
  console.log('農曆三月廿六:', lunarNormal.toString());
  console.log('農曆中文月份:', lunarNormal.getMonthInChinese());
  
  // 測試閏月
  console.log('\n2. 測試閏月:');
  const lunarLeap = Lunar.fromYmd(2023, 2, 15, true);
  console.log('閏二月十五:', lunarLeap.toString());
  console.log('閏月中文月份:', lunarLeap.getMonthInChinese());
  
  // 檢查toString是否包含閏字
  console.log('\n3. 比較toString結果:');
  console.log('正常月份toString:', lunarNormal.toString());
  console.log('閏月toString:', lunarLeap.toString());
  console.log('閏月是否包含"閏"字:', lunarLeap.toString().includes('閏'));
  
  // 檢查_p內部屬性
  console.log('\n4. 檢查內部屬性:');
  console.log('正常月份內部月份:', lunarNormal._p.month);
  console.log('閏月內部月份:', lunarLeap._p.month);
  
  // 嘗試從getMonthInChinese判斷
  console.log('\n5. 從月份中文名稱判斷:');
  console.log('正常月份中文:', lunarNormal.getMonthInChinese());
  console.log('閏月中文:', lunarLeap.getMonthInChinese());
  
} catch (error) {
  console.error('❌ 測試失敗:', error);
} 