/**
 * Schedule admin controller 測試
 */

jest.mock('../src/models/system-setting.model');
jest.mock('../src/services/scheduler.service', () => ({
  rescheduleRegistrationOpening: jest.fn().mockResolvedValue()
}));
jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()
}));

const SystemSetting = require('../src/models/system-setting.model');
const scheduleController = require('../src/controllers/admin/schedule.admin.controller');

const mockReq = (body = {}, user = { id: 'admin1' }) => ({ body, user });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Schedule Admin Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getScheduledOpenTime', () => {
    test('無排程時回傳 null', async () => {
      SystemSetting.getSettings.mockResolvedValue({ scheduledOpenTime: null, autoOpenEnabled: false });
      const res = mockRes();

      await scheduleController.getScheduledOpenTime({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = res.json.mock.calls[0][0].data;
      expect(data.scheduledOpenTime).toBeNull();
      expect(data.isExpired).toBe(false);
      expect(data.autoOpenEnabled).toBe(false);
    });

    test('排程過期時 isExpired 為 true', async () => {
      const pastDate = new Date('2020-01-01');
      SystemSetting.getSettings.mockResolvedValue({ scheduledOpenTime: pastDate, autoOpenEnabled: true });
      const res = mockRes();

      await scheduleController.getScheduledOpenTime({}, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.scheduledOpenTime).toBe(pastDate.toISOString());
      expect(data.isExpired).toBe(true);
    });

    test('未來排程時 isExpired 為 false', async () => {
      const futureDate = new Date('2099-12-31');
      SystemSetting.getSettings.mockResolvedValue({ scheduledOpenTime: futureDate, autoOpenEnabled: true });
      const res = mockRes();

      await scheduleController.getScheduledOpenTime({}, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.isExpired).toBe(false);
    });

    test('無效日期回傳 null', async () => {
      SystemSetting.getSettings.mockResolvedValue({ scheduledOpenTime: 'invalid-date', autoOpenEnabled: false });
      const res = mockRes();

      await scheduleController.getScheduledOpenTime({}, res);

      const data = res.json.mock.calls[0][0].data;
      expect(data.scheduledOpenTime).toBeNull();
    });
  });

  describe('updateScheduledOpenTime', () => {
    test('無效日期應回 400', async () => {
      const mockSettings = { save: jest.fn() };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq({ scheduledOpenTime: 'not-a-date' });
      const res = mockRes();

      await scheduleController.updateScheduledOpenTime(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('null 值應清除排程', async () => {
      const mockSettings = { save: jest.fn().mockResolvedValue(true), scheduledOpenTime: new Date() };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq({ scheduledOpenTime: null });
      const res = mockRes();

      await scheduleController.updateScheduledOpenTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSettings.scheduledOpenTime).toBeNull();
    });

    test('有效日期應更新成功', async () => {
      const mockSettings = { save: jest.fn().mockResolvedValue(true) };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq({ scheduledOpenTime: '2099-06-01T12:00:00Z' });
      const res = mockRes();

      await scheduleController.updateScheduledOpenTime(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSettings.scheduledOpenTime).toBeInstanceOf(Date);
    });
  });

  describe('setAutoOpenEnabled', () => {
    test('啟用定時開放', async () => {
      const mockSettings = { save: jest.fn().mockResolvedValue(true) };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq({ autoOpenEnabled: true });
      const res = mockRes();

      await scheduleController.setAutoOpenEnabled(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSettings.autoOpenEnabled).toBe(true);
    });

    test('停用定時開放', async () => {
      const mockSettings = { save: jest.fn().mockResolvedValue(true) };
      SystemSetting.getSettings.mockResolvedValue(mockSettings);
      const req = mockReq({ autoOpenEnabled: false });
      const res = mockRes();

      await scheduleController.setAutoOpenEnabled(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSettings.autoOpenEnabled).toBe(false);
    });
  });
});
