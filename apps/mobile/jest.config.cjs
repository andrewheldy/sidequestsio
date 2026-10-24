module.exports = {
  preset: 'jest-expo',
  // Pure logic tests (.test.ts) and UI tests (.test.tsx) both count; a run
  // that discovers zero tests is not evidence.
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/__tests__/**/*.test.tsx'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
};
