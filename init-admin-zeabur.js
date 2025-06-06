const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB 連接 URI（從環境變數獲取）
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:SecurePassword123!@mongodb:27017/queue_system?authSource=admin';

// 用戶模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// 系統設定模型
const SystemSettingSchema = new mongoose.Schema({
  nextSessionDate: Date,
  isQueueOpen: { type: Boolean, default: true },
  currentQueueNumber: { type: Number, default: 0 },
  maxQueueNumber: { type: Number, default: 100 },
  minutesPerCustomer: { type: Number, default: 13 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: mongoose.Schema.Types.ObjectId
});

const SystemSetting = mongoose.model('SystemSetting', SystemSettingSchema);

async function initializeAdmin() {
  try {
    console.log('正在連接到 MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('成功連接到 MongoDB');

    // 檢查是否已有管理員
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('管理員帳號已存在');
      return;
    }

    // 創建管理員帳號
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
      role: 'admin'
    });

    await admin.save();
    console.log('管理員帳號創建成功！');
    console.log('帳號: admin');
    console.log('密碼: admin123');

    // 檢查並創建系統設定
    const existingSetting = await SystemSetting.findOne({});
    if (!existingSetting) {
      const setting = new SystemSetting({
        nextSessionDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明天
        isQueueOpen: true,
        currentQueueNumber: 0,
        maxQueueNumber: 100,
        minutesPerCustomer: 13,
        updatedBy: admin._id
      });
      
      await setting.save();
      console.log('系統設定初始化完成！');
    }

  } catch (error) {
    console.error('初始化失敗:', error);
  } finally {
    await mongoose.disconnect();
    console.log('已斷開 MongoDB 連接');
  }
}

// 執行初始化
initializeAdmin(); 