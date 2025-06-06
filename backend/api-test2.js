const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 探索 lunar 對象的方法和屬性 ===');

try {
  const solar = Solar.fromYmd(2023, 5, 15);
  const lunar = solar.getLunar();
  
  console.log('農曆年:', lunar.getYear());
  console.log('農曆月:', lunar.getMonth());
  console.log('農曆日:', lunar.getDay());
  
  // 列出所有可用的方法
  console.log('\n=== lunar 對象的所有方法 ===');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(lunar)).filter(name => typeof lunar[name] === 'function');
  console.log('可用方法:', methods.sort());
  
  // 測試一些可能的閏月相關方法
  console.log('\n=== 測試閏月相關方法 ===');
  
  if (typeof lunar.isLeap === 'function') {
    console.log('lunar.isLeap():', lunar.isLeap());
  } else {
    console.log('lunar.isLeap 不是函數');
  }
  
  if (typeof lunar.isLeapMonth === 'function') {
    console.log('lunar.isLeapMonth():', lunar.isLeapMonth());
  } else {
    console.log('lunar.isLeapMonth 不是函數');
  }
  
  // 檢查是否有 leap 屬性
  if (lunar.hasOwnProperty('leap')) {
    console.log('lunar.leap 屬性值:', lunar.leap);
  }
  
  // 嘗試獲取所有屬性
  console.log('\n=== lunar 對象的屬性 ===');
  const props = Object.getOwnPropertyNames(lunar);
  console.log('所有屬性:', props);
  
  // 檢查私有屬性 _p
  if (lunar._p) {
    console.log('\n_p 內部屬性:');
    console.log('year:', lunar._p.year);
    console.log('month:', lunar._p.month);
    console.log('day:', lunar._p.day);
    
    // 查找可能的閏月標識
    Object.keys(lunar._p).forEach(key => {
      if (key.toLowerCase().includes('leap') || key.includes('闰')) {
        console.log(`可能的閏月屬性 ${key}:`, lunar._p[key]);
      }
    });
  }
  
} catch (error) {
  console.error('❌ 測試失敗:', error);
} 