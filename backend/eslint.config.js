// ESLint flat config（CJS）— WS4 / tasks.md 4.4
// 最小可行設定：把 CONTRIBUTING 宣稱卻不存在的 lint gate 補成真。
// 範圍 = backend；前端有獨立 toolchain（CRA），不在此 config 管轄。
//
// 取向：以 @eslint/js recommended 為底抓真 bug（未定義變數、unreachable code…），
// 但把純風格 / 既有大量存量的規則降為 warn，避免一上來就被存量問題擋住 CI（與本專案
// 「lint baseline 不 block」一致；嚴格化屬日後另案）。CI 用 `eslint .`（warn 不 fail）。

'use strict';

const js = require('@eslint/js');

module.exports = [
  // 忽略不該被 lint 的目錄
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'build/**'],
  },

  // 主程式碼（CommonJS）
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js 執行環境
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        global: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // 既有存量大、屬風格/漸進清理範疇 → 降 warn 不 block CI
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-console': 'off',
      // 既有 util（removeUniqueIndex.js）的 block 內函式宣告；非真 bug，且 eslint8/9
      // recommended 對此規則收錄不一致（跨版本穩定起見明確降 warn）。
      'no-inner-declarations': 'warn',
    },
  },

  // 測試檔：補 Jest globals
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
];
