const mongoose = require('mongoose');
const SystemSetting = require('./src/models/system-setting.model');

async function checkSimplifiedMode() {
  try {
    // 連接資料庫
    await mongoose.connect('mongodb://localhost:27017/queueSystem', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('資料庫連接成功');
    
    // 獲取系統設定
    const settings = await SystemSetting.getSettings();
    
    console.log('當前系統設定:');
    console.log('- 簡化模式:', settings.simplifiedMode);
    console.log('- 候位系統開啟:', settings.isQueueOpen);
    console.log('- 最大候位數:', settings.maxQueueNumber);
    console.log('- 每位客戶處理時間:', settings.minutesPerCustomer);
    
    // 如果簡化模式是關閉的，開啟它
    if (!settings.simplifiedMode) {
      console.log('\n簡化模式目前是關閉的，正在開啟...');
      settings.simplifiedMode = true;
      await settings.save();
      console.log('簡化模式已開啟!');
    } else {
      console.log('\n簡化模式已經是開啟狀態');
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await mongoose.disconnect();
    console.log('資料庫連接已關閉');
  }
}

checkSimplifiedMode(); 