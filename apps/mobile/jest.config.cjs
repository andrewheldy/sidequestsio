module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  setupFiles: ['<rootDir>/__tests__/support/setup.ts'],
  // Cold transform caches made the first router render exceed Jest's 5 s default.
  testTimeout: 30000,
};
