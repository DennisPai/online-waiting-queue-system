const mongoose = require('mongoose');
const WaitingRecord = require('./src/models/waiting-record.model');

// 數據庫連接配置
const MONGODB_URI = process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017/queue_system';

// 為現有家人記錄新增性別欄位
async function addGenderToFamilyMembers() {
  try {
    // 連接數據庫
    await mongoose.connect(MONGODB_URI);
    console.log('已連接到 MongoDB');

    // 查找所有有家人記錄的客戶
    const records = await WaitingRecord.find({
      familyMembers: { $exists: true, $ne: [] }
    });

    console.log(`找到 ${records.length} 筆有家人記錄的客戶`);

    let updatedCount = 0;

    for (const record of records) {
      let needUpdate = false;
      
      // 檢查每個家人是否缺少性別欄位
      const updatedFamilyMembers = record.familyMembers.map(member => {
        if (!member.gender) {
          needUpdate = true;
          return {
            ...member.toObject(),
            gender: 'male' // 預設設為男性，可以後續手動修改
          };
        }
        return member;
      });

      if (needUpdate) {
        await WaitingRecord.updateOne(
          { _id: record._id },
          { $set: { familyMembers: updatedFamilyMembers } }
        );
        updatedCount++;
        console.log(`已更新客戶 ${record.queueNumber} 的家人性別欄位`);
      }
    }

    console.log(`\n遷移完成！`);
    console.log(`總共更新了 ${updatedCount} 筆客戶記錄的家人性別欄位`);
    console.log(`所有缺少性別的家人記錄都已設為預設值 'male'，可以通過管理後台進行修改`);

  } catch (error) {
    console.error('遷移過程中發生錯誤:', error);
  } finally {
    // 關閉數據庫連接
    await mongoose.connection.close();
    console.log('已關閉數據庫連接');
  }
}

// 執行遷移
if (require.main === module) {
  addGenderToFamilyMembers();
}

module.exports = addGenderToFamilyMembers; 