const mongoose = require('mongoose');
const WaitingRecord = require('./src/models/waiting-record.model');
const { addVirtualAge } = require('./src/utils/calendarConverter');

// 連接資料庫
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://admin:password@localhost:27017/queue_system?authSource=admin');
    console.log('✅ 資料庫連接成功');
  } catch (error) {
    console.error('❌ 資料庫連接失敗:', error);
    process.exit(1);
  }
};

// 批量更新既有客戶的虛歲
const updateExistingCustomers = async () => {
  try {
    console.log('🔄 開始批量更新既有客戶的虛歲...');
    
    // 查找所有沒有虛歲的客戶
    const customersWithoutAge = await WaitingRecord.find({
      $or: [
        { virtualAge: { $exists: false } },
        { virtualAge: null },
        { virtualAge: { $eq: 0 } }
      ]
    });
    
    console.log(`📊 找到 ${customersWithoutAge.length} 筆需要更新虛歲的客戶資料`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const customer of customersWithoutAge) {
      try {
        // 計算虛歲
        const customerData = customer.toObject();
        const updatedData = addVirtualAge(customerData);
        
        if (updatedData.virtualAge) {
          // 更新主客戶虛歲
          customer.virtualAge = updatedData.virtualAge;
          
          // 更新家人虛歲
          if (updatedData.familyMembers && updatedData.familyMembers.length > 0) {
            customer.familyMembers = updatedData.familyMembers;
          }
          
          await customer.save();
          updatedCount++;
          console.log(`✅ 更新客戶 ${customer.name} (號碼: ${customer.queueNumber}) 虛歲: ${updatedData.virtualAge} 歲`);
        } else {
          console.log(`⚠️  客戶 ${customer.name} (號碼: ${customer.queueNumber}) 缺少出生日期資料，跳過更新`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ 更新客戶 ${customer.name} (號碼: ${customer.queueNumber}) 時發生錯誤:`, error.message);
      }
    }
    
    console.log('\n📈 批量更新完成統計:');
    console.log(`✅ 成功更新: ${updatedCount} 筆`);
    console.log(`❌ 更新失敗: ${errorCount} 筆`);
    console.log(`📊 總計處理: ${customersWithoutAge.length} 筆`);
    
  } catch (error) {
    console.error('❌ 批量更新過程中發生錯誤:', error);
  }
};

// 主程序
const main = async () => {
  await connectDB();
  await updateExistingCustomers();
  
  console.log('\n🎉 虛歲批量更新程序執行完畢');
  process.exit(0);
};

// 執行主程序
main().catch(error => {
  console.error('❌ 程序執行失敗:', error);
  process.exit(1);
}); 