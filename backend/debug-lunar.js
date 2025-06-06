const { Lunar, Solar } = require('lunar-javascript');

console.log('開始調試lunar-javascript API...');

try {
  // 建立國曆對象
  const solar = Solar.fromYmd(2023, 5, 15);
  console.log('國曆日期:', solar.toString());
  
  // 轉換為農曆
  const lunar = solar.getLunar();
  console.log('農曆日期:', lunar.toString());
  
  // 檢查lunar對象的屬性和方法
  console.log('lunar對象類型:', typeof lunar);
  console.log('lunar對象:', lunar);
  
  // 嘗試不同的方法來獲取是否為閏月
  console.log('getYear():', lunar.getYear());
  console.log('getMonth():', lunar.getMonth());
  console.log('getDay():', lunar.getDay());
  
  // 檢查閏月相關方法
  if (typeof lunar.isLeap === 'function') {
    console.log('isLeap() 方法存在，結果:', lunar.isLeap());
  } else {
    console.log('isLeap() 方法不存在');
  }
  
  if (typeof lunar.isLeapMonth === 'function') {
    console.log('isLeapMonth() 方法存在，結果:', lunar.isLeapMonth());
  } else {
    console.log('isLeapMonth() 方法不存在');
  }
  
  // 檢查leap屬性
  if (lunar.hasOwnProperty('leap')) {
    console.log('leap 屬性存在，值:', lunar.leap);
  } else {
    console.log('leap 屬性不存在');
  }
  
} catch (error) {
  console.error('調試過程中發生錯誤:', error);
} 