module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-this-alias': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-undef': 'error'
  },
  ignorePatterns: [
    'src/adapters/**/*.js',
    'dist/**/*',
    'node_modules/**/*',
  ]
};