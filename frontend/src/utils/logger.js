// 前端日誌系統
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // 最多保存1000條日誌
    this.storageKey = 'queue_system_logs';
    
    // 從localStorage載入既有日誌
    this.loadLogsFromStorage();
  }

  // 從localStorage載入日誌
  loadLogsFromStorage() {
    try {
      const storedLogs = localStorage.getItem(this.storageKey);
      if (storedLogs) {
        this.logs = JSON.parse(storedLogs);
        // 只保留最近的日誌
        if (this.logs.length > this.maxLogs) {
          this.logs = this.logs.slice(-this.maxLogs);
        }
      }
    } catch (error) {
      console.error('載入日誌失敗:', error);
      this.logs = [];
    }
  }

  // 保存日誌到localStorage
  saveLogsToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('保存日誌失敗:', error);
    }
  }

  // 基礎日誌記錄方法
  log(level, message, data = null, component = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      component,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // 添加到內存日誌
    this.logs.push(logEntry);
    
    // 保持日誌數量限制
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 保存到localStorage
    this.saveLogsToStorage();

    // 輸出到控制台
    const consoleMethod = this.getConsoleMethod(level);
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${component ? `[${component}] ` : ''}${message}`;
    
    if (data) {
      consoleMethod(formattedMessage, data);
    } else {
      consoleMethod(formattedMessage);
    }
  }

  // 根據日誌級別獲取對應的console方法
  getConsoleMethod(level) {
    switch (level) {
      case 'error':
        return console.error;
      case 'warn':
        return console.warn;
      case 'info':
        return console.info;
      case 'debug':
        return console.debug;
      default:
        return console.log;
    }
  }

  // 各種級別的日誌方法
  error(message, data = null, component = null) {
    this.log('error', message, data, component);
  }

  warn(message, data = null, component = null) {
    this.log('warn', message, data, component);
  }

  info(message, data = null, component = null) {
    this.log('info', message, data, component);
  }

  debug(message, data = null, component = null) {
    this.log('debug', message, data, component);
  }

  // API相關日誌
  apiRequest(method, url, data = null, component = null) {
    this.info(`API請求: ${method} ${url}`, { requestData: data }, component);
  }

  apiResponse(method, url, status, data = null, component = null) {
    if (status >= 200 && status < 300) {
      this.info(`API響應成功: ${method} ${url} [${status}]`, { responseData: data }, component);
    } else {
      this.error(`API響應錯誤: ${method} ${url} [${status}]`, { responseData: data }, component);
    }
  }

  apiError(method, url, error, component = null) {
    this.error(`API請求失敗: ${method} ${url}`, { error: error.message, stack: error.stack }, component);
  }

  // 用戶操作日誌
  userAction(action, data = null, component = null) {
    this.info(`用戶操作: ${action}`, data, component);
  }

  // 獲取所有日誌
  getAllLogs() {
    return [...this.logs];
  }

  // 根據級別過濾日誌
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  // 根據組件過濾日誌
  getLogsByComponent(component) {
    return this.logs.filter(log => log.component === component);
  }

  // 根據時間範圍過濾日誌
  getLogsByTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= start && logTime <= end;
    });
  }

  // 清除所有日誌
  clearLogs() {
    this.logs = [];
    this.saveLogsToStorage();
    console.log('日誌已清除');
  }

  // 匯出日誌為JSON
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `queue_system_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.info('日誌已匯出', null, 'Logger');
  }

  // 在開發者工具中顯示日誌查看器
  showLogViewer() {
    console.group('🔍 候位系統日誌查看器');
    console.log('📊 總日誌數量:', this.logs.length);
    console.log('❌ 錯誤日誌:', this.getLogsByLevel('error').length);
    console.log('⚠️ 警告日誌:', this.getLogsByLevel('warn').length);
    console.log('ℹ️ 資訊日誌:', this.getLogsByLevel('info').length);
    console.log('🐛 除錯日誌:', this.getLogsByLevel('debug').length);
    console.log('\n📋 查看方法:');
    console.log('logger.getAllLogs() - 獲取所有日誌');
    console.log('logger.getLogsByLevel("error") - 獲取錯誤日誌');
    console.log('logger.getLogsByComponent("SystemSettings") - 獲取特定組件日誌');
    console.log('logger.exportLogs() - 匯出日誌文件');
    console.log('logger.clearLogs() - 清除所有日誌');
    console.groupEnd();
  }
}

// 創建全局日誌實例
const logger = new Logger();

// 將logger掛載到window對象，方便在控制台中使用
if (typeof window !== 'undefined') {
  window.logger = logger;
}

export default logger; 