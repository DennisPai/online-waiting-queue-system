/**
 * 日期計算工具函數
 */

/**
 * 計算開科辦事日的隔天，格式化為 "X月X日"
 * @param {string|Date} nextSessionDate - 開科辦事日期
 * @returns {string} 格式化的隔天日期，如 "9月16日"
 */
export const getNextRegistrationDate = (nextSessionDate) => {
  if (!nextSessionDate) return '未設定';
  
  try {
    const sessionDate = new Date(nextSessionDate);
    
    // 檢查日期是否有效
    if (isNaN(sessionDate.getTime())) {
      return '未設定';
    }
    
    // 計算隔天
    const nextDay = new Date(sessionDate);
    nextDay.setDate(sessionDate.getDate() + 1);
    
    const month = nextDay.getMonth() + 1;
    const day = nextDay.getDate();
    
    return `${month}月${day}日`;
  } catch (error) {
    console.error('計算隔天日期時發生錯誤:', error);
    return '未設定';
  }
};
