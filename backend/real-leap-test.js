const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 測試真實閏月日期 ===');

try {
  // 2023年確實有閏二月，讓我們找一個真實的閏月日期
  console.log('1. 測試2023年閏二月的真實日期:');
  
  // 測試2023年3月的一些日期，看看是否有閏二月的顯示
  for (let day = 1; day <= 31; day++) {
    try {
      const solar = Solar.fromYmd(2023, 3, day);
      const lunar = solar.getLunar();
      const lunarStr = lunar.toString();
      
      if (lunarStr.includes('閏') || lunar.getMonthInChinese().includes('閏')) {
        console.log(`國曆 2023-3-${day} -> 農曆 ${lunarStr}`);
        console.log(`月份中文: ${lunar.getMonthInChinese()}`);
      }
    } catch (error) {
      // 跳過無效日期
    }
  }
  
  console.log('\n2. 測試2023年4月的日期:');
  for (let day = 1; day <= 30; day++) {
    try {
      const solar = Solar.fromYmd(2023, 4, day);
      const lunar = solar.getLunar();
      const lunarStr = lunar.toString();
      
      if (lunarStr.includes('閏') || lunar.getMonthInChinese().includes('閏')) {
        console.log(`國曆 2023-4-${day} -> 農曆 ${lunarStr}`);
        console.log(`月份中文: ${lunar.getMonthInChinese()}`);
      }
    } catch (error) {
      // 跳過無效日期
    }
  }
  
  console.log('\n3. 檢查特定已知的閏月日期:');
  // 根據農曆計算，2023年閏二月應該對應到國曆3月下旬到4月
  
  // 測試一些農曆閏二月的創建
  console.log('\n4. 直接創建閏月並檢查行為:');
  const leap = Lunar.fromYmd(2023, 2, 1, true);  // 閏二月初一
  const normal = Lunar.fromYmd(2023, 2, 1, false); // 正常二月初一
  
  console.log('閏二月初一:', leap.toString());
  console.log('正常二月初一:', normal.toString());
  console.log('閏二月初一轉國曆:', leap.getSolar().toString());
  console.log('正常二月初一轉國曆:', normal.getSolar().toString());
  
  // 檢查閏月的月份顯示
  console.log('閏二月getMonthInChinese():', leap.getMonthInChinese());
  console.log('正常二月getMonthInChinese():', normal.getMonthInChinese());
  
  // 嘗試 getMonthInChinese 是否會顯示閏字
  console.log('\n5. 測試 getMonthInChinese 和其他月份相關方法:');
  
  // 檢查所有與月份相關的方法
  const monthMethods = Object.getOwnPropertyNames(leap).filter(name => 
    typeof leap[name] === 'function' && 
    name.toLowerCase().includes('month')
  );
  
  console.log('月份相關方法:', monthMethods);
  
  // 測試每個月份相關方法
  monthMethods.forEach(method => {
    try {
      const result = leap[method]();
      console.log(`leap.${method}():`, result);
    } catch (error) {
      console.log(`leap.${method}(): 錯誤 - ${error.message}`);
    }
  });
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error(error.stack);
} 