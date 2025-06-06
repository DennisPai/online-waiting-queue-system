const { Lunar, Solar } = require('lunar-javascript');

console.log('=== 測試閏月檢測方法 ===');

try {
  // 測試正常月份
  console.log('1. 測試正常月份:');
  const normalLunar = Lunar.fromYmd(2023, 3, 26, false);
  console.log('正常農曆:', normalLunar.toString());
  console.log('getMonthInChinese():', normalLunar.getMonthInChinese());
  
  // 測試閏月
  console.log('\n2. 測試閏月:');
  const leapLunar = Lunar.fromYmd(2023, 2, 15, true);
  console.log('閏月農曆:', leapLunar.toString());
  console.log('getMonthInChinese():', leapLunar.getMonthInChinese());
  
  // 檢查getMonthInChinese的差異
  console.log('\n3. 比較getMonthInChinese結果:');
  console.log('正常月份月份名:', normalLunar.getMonthInChinese());
  console.log('閏月月份名:', leapLunar.getMonthInChinese());
  console.log('閏月是否包含閏字:', leapLunar.getMonthInChinese().includes('閏'));
  
  // 檢查內部_p屬性
  console.log('\n4. 檢查內部屬性:');
  console.log('正常月份_p.month:', normalLunar._p ? normalLunar._p.month : 'undefined');
  console.log('閏月_p.month:', leapLunar._p ? leapLunar._p.month : 'undefined');
  
  // 嘗試其他可能的方法
  console.log('\n5. 嘗試其他方法:');
  
  // 檢查是否有特定的閏月相關方法
  const allMethods = Object.getOwnPropertyNames(leapLunar).filter(name => 
    typeof leapLunar[name] === 'function' && 
    (name.toLowerCase().includes('leap') || name.includes('run') || name.includes('閏'))
  );
  console.log('可能的閏月相關方法:', allMethods);
  
  // 嘗試檢查創建時的參數是否被保存
  console.log('\n6. 測試創建參數差異:');
  
  // 創建同一天的正常月份和閏月
  const same_normal = Lunar.fromYmd(2023, 2, 15, false);
  const same_leap = Lunar.fromYmd(2023, 2, 15, true);
  
  console.log('同一天正常月份:', same_normal.toString());
  console.log('同一天閏月:', same_leap.toString());
  console.log('同一天正常月份轉國曆:', same_normal.getSolar().toString());
  console.log('同一天閏月轉國曆:', same_leap.getSolar().toString());
  
  // 檢查轉換結果是否不同（這是判斷閏月的最可靠方法）
  const normalSolar = same_normal.getSolar();
  const leapSolar = same_leap.getSolar();
  
  console.log('\n7. 通過轉換結果判斷閏月:');
  console.log('正常二月十五轉國曆:', normalSolar.toYmd());
  console.log('閏二月十五轉國曆:', leapSolar.toYmd());
  console.log('轉換結果是否不同:', normalSolar.toYmd() !== leapSolar.toYmd());
  
} catch (error) {
  console.error('❌ 測試失敗:', error.message);
  console.error(error.stack);
} 