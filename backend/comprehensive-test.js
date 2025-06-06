const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 全面測試 lunar-javascript API ===');

try {
  console.log('1. 測試國曆轉農曆:');
  const solar = Solar.fromYmd(2023, 5, 15);
  const lunar = solar.getLunar();
  
  console.log('國曆:', solar.toString());
  console.log('農曆:', lunar.toString());
  console.log('農曆年:', lunar.getYear());
  console.log('農曆月:', lunar.getMonth());
  console.log('農曆日:', lunar.getDay());
  console.log('農曆月份中文:', lunar.getMonthInChinese());
  
  // 檢查toString中是否包含閏字來判斷閏月
  const lunarString = lunar.toString();
  const isLeapFromString = lunarString.includes('閏');
  console.log('從toString判斷是否為閏月:', isLeapFromString);
  
  console.log('\n2. 測試已知的閏月日期:');
  // 2023年有閏二月，讓我們測試閏二月
  const lunarLeap = Lunar.fromYmd(2023, 2, 15, true); // 第四個參數表示閏月
  console.log('閏二月日期:', lunarLeap.toString());
  console.log('閏二月轉國曆:', lunarLeap.getSolar().toString());
  
  const leapString = lunarLeap.toString();
  const isLeapFromLeapString = leapString.includes('閏');
  console.log('閏月toString是否包含閏字:', isLeapFromLeapString);
  
  console.log('\n3. 比較正常月份和閏月:');
  const normalMonth = Lunar.fromYmd(2023, 2, 15, false); // 正常二月
  console.log('正常二月:', normalMonth.toString());
  console.log('閏二月:', lunarLeap.toString());
  
  console.log('\n4. 測試農曆轉國曆函數:');
  
  // 測試我們的轉換函數邏輯
  function testGregorianToLunar(year, month, day) {
    const solarDate = Solar.fromYmd(year, month, day);
    const lunarDate = solarDate.getLunar();
    
    // 從toString判斷是否為閏月（簡單方法）
    const isLeapMonth = lunarDate.toString().includes('閏');
    
    return {
      year: lunarDate.getYear(),
      month: lunarDate.getMonth(),
      day: lunarDate.getDay(),
      isLeapMonth: isLeapMonth
    };
  }
  
  function testLunarToGregorian(year, month, day, isLeapMonth = false) {
    const lunarDate = Lunar.fromYmd(year, month, day, isLeapMonth);
    const solarDate = lunarDate.getSolar();
    
    return {
      year: solarDate.getYear(),
      month: solarDate.getMonth(),
      day: solarDate.getDay()
    };
  }
  
  console.log('國曆2023-5-15轉農曆:', testGregorianToLunar(2023, 5, 15));
  console.log('農曆2023-3-26轉國曆:', testLunarToGregorian(2023, 3, 26, false));
  console.log('農曆2023閏2-15轉國曆:', testLunarToGregorian(2023, 2, 15, true));
  
  console.log('\n✅ 測試完成，找到可用的API方法');
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error(error.stack);
} 