const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 測試 lunar-javascript 正確用法 ===');

try {
  // 測試國曆轉農曆
  console.log('1. 國曆轉農曆:');
  const solar = Solar.fromYmd(2023, 5, 15);
  console.log('國曆對象:', solar.toString());
  
  const lunar = solar.getLunar();
  console.log('農曆對象:', lunar.toString());
  console.log('農曆年:', lunar.getYear());
  console.log('農曆月:', lunar.getMonth());
  console.log('農曆日:', lunar.getDay());
  
  // 檢查是否為閏月的正確方法
  console.log('是否為閏月 (lunar.isLeap()):', lunar.isLeap());
  
  console.log('\n2. 農曆轉國曆:');
  // 創建農曆對象
  const lunarDate = Lunar.fromYmd(2023, 4, 26, false); // false表示非閏月
  console.log('農曆對象:', lunarDate.toString());
  
  const solarConverted = lunarDate.getSolar();
  console.log('轉換後的國曆:', solarConverted.toString());
  console.log('國曆年:', solarConverted.getYear());
  console.log('國曆月:', solarConverted.getMonth());
  console.log('國曆日:', solarConverted.getDay());
  
  console.log('\n✅ API測試成功');
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error('詳細錯誤:', error);
} 