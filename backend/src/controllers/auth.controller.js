const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// 用戶登入
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 檢查用戶是否存在
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 驗證密碼
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '密碼不正確'
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 回傳用戶資訊和令牌
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: !!user.mustChangePassword
      },
      token
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 修改密碼（登入後）
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '缺少必要欄位' });
    }

    // 基本強度檢查（至少10字元，含字母與數字）
    const strongEnough = typeof newPassword === 'string' &&
      newPassword.length >= 10 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword);
    if (!strongEnough) {
      return res.status(400).json({ success: false, message: '新密碼需至少10字元並且含字母與數字' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用戶不存在' });
    }

    const ok = await user.comparePassword(oldPassword);
    if (!ok) {
      return res.status(401).json({ success: false, message: '原密碼不正確' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({ success: true, message: '密碼已更新', data: { updatedAt: user.updatedAt } });
  } catch (error) {
    console.error('修改密碼錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器內部錯誤' });
  }
};

// 創建用戶（僅限管理員）
exports.register = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    // 檢查用戶名或郵箱是否已存在
    const existingUser = await User.findOne({ 
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用戶名或郵箱已存在'
      });
    }

    // 創建新用戶
    const newUser = await User.create({
      username,
      password,
      email,
      role: role || 'staff'
    });

    res.status(201).json({
      success: true,
      message: '用戶創建成功',
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// 獲取當前用戶資訊
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器內部錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
}; 