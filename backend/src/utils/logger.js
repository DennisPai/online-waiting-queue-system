/**
 * 簡易分級 logger
 * 正式環境只輸出 warn + error
 */

const isProduction = process.env.NODE_ENV === 'production';

const timestamp = () => new Date().toISOString();

const logger = {
  debug(...args) {
    if (!isProduction) {
      console.log(`[${timestamp()}] [DEBUG]`, ...args);
    }
  },
  info(...args) {
    if (!isProduction) {
      console.log(`[${timestamp()}] [INFO]`, ...args);
    }
  },
  warn(...args) {
    console.warn(`[${timestamp()}] [WARN]`, ...args);
  },
  error(...args) {
    console.error(`[${timestamp()}] [ERROR]`, ...args);
  }
};

module.exports = logger;
