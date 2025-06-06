try {
  console.log('開始測試...');
  const { Lunar, Solar } = require('lunar-javascript');
  console.log('lunar-javascript 包載入成功');
  
  // 測試建立國曆日期
  const solar = Solar.fromYmd(2023, 5, 15);
  console.log('國曆日期建立成功:', solar.toString());
  
  // 測試轉換為農曆
  const lunar = solar.getLunar();
  console.log('轉換為農曆成功:', lunar.toString());
  
  console.log('所有測試完成');
} catch (error) {
  console.error('測試失敗:', error.message);
  console.error('錯誤詳情:', error.stack);
} 