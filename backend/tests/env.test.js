/**
 * 環境變數檢查測試
 */

describe('config/env.js', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('缺少所有 MongoDB 連線字串時應 exit(1)', () => {
    delete process.env.MONGODB_URI;
    delete process.env.DATABASE_URL;
    delete process.env.MONGO_CONNECTION_STRING;
    process.env.JWT_SECRET = 'test-secret';

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    expect(() => require('../src/config/env')).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test('有 MONGODB_URI 時應正常載入', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret';

    expect(() => require('../src/config/env')).not.toThrow();
  });

  test('有 MONGO_CONNECTION_STRING 時也應正常載入', () => {
    delete process.env.MONGODB_URI;
    delete process.env.DATABASE_URL;
    process.env.MONGO_CONNECTION_STRING = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret';

    expect(() => require('../src/config/env')).not.toThrow();
  });

  test('JWT_SECRET 未設定時應給預設值並警告', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    delete process.env.JWT_SECRET;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    require('../src/config/env');
    
    expect(process.env.JWT_SECRET).toBe('default-jwt-secret-please-change');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('非必要變數應有預設值', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;

    require('../src/config/env');
    
    expect(process.env.PORT).toBe('8080');
    expect(process.env.CORS_ORIGIN).toBe('http://localhost:3100');
  });
});
