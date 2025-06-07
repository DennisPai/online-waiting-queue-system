// 管理員初始化腳本
// 用於創建初始管理員用戶，運行方法：
// node init-admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 連接到 MongoDB
const mongoUri = process.env.MONGODB_URI || 
                 process.env.DATABASE_URL || 
                 process.env.MONGO_CONNECTION_STRING ||
                 'mongodb://admin:password@localhost:27017/queue_system?authSource=admin';

console.log('初始化腳本連接到MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

mongoose.connect(mongoUri)
  .then(() => console.log('成功連接到MongoDB'))
  .catch(err => {
    console.error('無法連接到MongoDB:', err);
    process.exit(1);
  });

// 用戶模型
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  }
}, {
  timestamps: true
});

// 密碼加密中間件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// 系統設定模型
const systemSettingSchema = new mongoose.Schema({
  nextSessionDate: {
    type: Date,
    default: null
  },
  isQueueOpen: {
    type: Boolean,
    default: true
  },
  currentQueueNumber: {
    type: Number,
    default: 0
  },
  maxQueueNumber: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

// 創建默認管理員
async function createAdmin() {
  try {
    // 檢查是否已存在管理員
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('管理員已存在，跳過創建步驟');
    } else {
      // 創建新管理員
      const admin = new User({
        username: 'admin',
        password: 'admin123', // 這將被自動加密
        email: 'admin@example.com',
        role: 'admin'
      });
      
      await admin.save();
      console.log('成功創建管理員用戶');
      console.log('用戶名: admin');
      console.log('密碼: admin123');
      console.log('請登入後立即修改此密碼!');
    }
    
    // 檢查系統設定
    const existingSettings = await SystemSetting.findOne();
    if (existingSettings) {
      console.log('系統設定已存在，跳過創建步驟');
    } else {
      // 創建默認系統設定
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const settings = new SystemSetting({
        nextSessionDate: nextWeek,
        isQueueOpen: true,
        currentQueueNumber: 0,
        maxQueueNumber: 100
      });
      
      await settings.save();
      console.log('成功創建默認系統設定');
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error('初始化失敗:', err);
    mongoose.connection.close();
  }
}

createAdmin(); 