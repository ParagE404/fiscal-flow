module.exports = {
  displayName: 'Sync Services Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '../**/*.js',
    '!../**/__tests__/**',
    '!../**/*.test.js',
    '!../**/*.spec.js',
    '!../node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000, // 30 seconds for integration and performance tests
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Test categories
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/**/!(integration|performance)/**/*.test.js',
        '<rootDir>/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/integration/',
        '<rootDir>/performance/'
      ],
      testTimeout: 10000
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/integration/**/*.test.js'
      ],
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js']
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/performance/**/*.test.js'
      ],
      testTimeout: 120000, // 2 minutes for performance tests
      setupFilesAfterEnv: ['<rootDir>/jest.performance.setup.js'],
      maxWorkers: 1 // Run performance tests sequentially
    }
  ],

  // Global test configuration
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      CREDENTIAL_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      TEST_DATABASE_URL: 'postgresql://test:test@localhost:5432/finvista_test'
    }
  },

  // Module name mapping for easier imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../$1',
    '^@services/(.*)$': '<rootDir>/../$1',
    '^@utils/(.*)$': '<rootDir>/../utils/$1',
    '^@types/(.*)$': '<rootDir>/../types/$1'
  },

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './MutualFundSyncService.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './StockSyncService.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './EPFSyncService.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Verbose output for debugging
  verbose: true,

  // Collect coverage from all relevant files
  collectCoverage: true,

  // Error handling
  errorOnDeprecated: true,
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/jest.results.processor.js'
};