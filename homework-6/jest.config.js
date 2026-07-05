'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // The installed `uuid` package (v14) is ESM-only; Jest's CommonJS module
  // registry can't `require()` it directly even though Node itself can.
  // Redirect it to a small CommonJS shim used only inside the test runner
  // (see tests/__mocks__/uuid.js) -- production code is unaffected.
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'pipeline/**/*.js',
    'lib/**/*.js',
    'orchestrator.js',
  ],
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
};
