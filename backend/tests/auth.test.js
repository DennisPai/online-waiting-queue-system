/**
 * Auth controller 測試
 */

const jwt = require('jsonwebtoken');

// Mock models and dependencies before requiring controller
jest.mock('../src/models/user.model');
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const User = require('../src/models/user.model');
const authController = require('../src/controllers/auth.controller');

// Helper: create mock req/res
const mockReq = (body = {}, user = null) => ({
  body,
  user: user || { id: 'user123' }
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  describe('login', () => {
    test('用戶不存在應回 404', async () => {
      User.findOne.mockResolvedValue(null);
      const req = mockReq({ username: 'ghost', password: '123' });
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('密碼錯誤應回 401', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user123',
        username: 'admin',
        comparePassword: jest.fn().mockResolvedValue(false)
      });
      const req = mockReq({ username: 'admin', password: 'wrong' });
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('登入成功應回 200 + token', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user123',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        mustChangePassword: false,
        comparePassword: jest.fn().mockResolvedValue(true)
      });
      const req = mockReq({ username: 'admin', password: 'correct' });
      const res = mockRes();

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
      expect(jsonCall.data.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(jsonCall.data.token, 'test-secret');
      expect(decoded.username).toBe('admin');
    });
  });

  describe('changePassword', () => {
    test('缺少參數應回 400', async () => {
      const req = mockReq({ oldPassword: '', newPassword: '' });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('新密碼太短應回 400', async () => {
      const req = mockReq({ oldPassword: 'old123', newPassword: 'short' });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('新密碼與舊密碼相同應回 400', async () => {
      const req = mockReq({ oldPassword: 'Password123', newPassword: 'Password123' });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('舊密碼錯誤應回 401', async () => {
      User.findById.mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false)
      });
      const req = mockReq({ oldPassword: 'wrongOld1', newPassword: 'NewPass123' });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('成功更改密碼應回 200', async () => {
      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        password: 'old',
        mustChangePassword: true,
        updatedAt: new Date()
      };
      User.findById.mockResolvedValue(mockUser);
      const req = mockReq({ oldPassword: 'OldPass123', newPassword: 'NewPass123' });
      const res = mockRes();

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockUser.password).toBe('NewPass123');
      expect(mockUser.mustChangePassword).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
