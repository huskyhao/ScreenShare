module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    electron: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // 代码风格
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // 最佳实践
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // 安全性
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // 代码复杂度
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', 50],
    
    // 错误处理
    'no-empty-catch': 'error',
    'no-throw-literal': 'error'
  },
  globals: {
    // Electron globals
    'require': 'readonly',
    'module': 'readonly',
    'exports': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'process': 'readonly',
    'global': 'readonly',
    'Buffer': 'readonly'
  },
  overrides: [
    {
      files: ['src/main.js', 'src/**/*.js'],
      env: {
        node: true,
        electron: true
      }
    },
    {
      files: ['public/**/*.js'],
      env: {
        browser: true
      },
      globals: {
        'io': 'readonly',
        'adapter': 'readonly'
      }
    }
  ]
};
