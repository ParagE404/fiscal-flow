// Global test setup for all sync service tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/finvista_test';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock user data
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date(),
    ...overrides
  }),

  // Helper to create mock mutual fund data
  createMockMutualFund: (overrides = {}) => ({
    id: 'test-fund-id',
    userId: 'test-user-id',
    name: 'Test Mutual Fund',
    isin: 'INF209K01157',
    investedAmount: 10000,
    currentValue: 12000,
    totalInvestment: 10000,
    syncStatus: 'manual',
    manualOverride: false,
    createdAt: new Date(),
    ...overrides
  }),

  // Helper to create mock stock data
  createMockStock: (overrides = {}) => ({
    id: 'test-stock-id',
    userId: 'test-user-id',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    quantity: 100,
    averagePrice: 2500,
    currentPrice: 2600,
    investedAmount: 250000,
    currentValue: 260000,
    syncStatus: 'manual',
    manualOverride: false,
    createdAt: new Date(),
    ...overrides
  }),

  // Helper to create mock EPF account data
  createMockEPFAccount: (overrides = {}) => ({
    id: 'test-epf-id',
    userId: 'test-user-id',
    uan: '123456789012',
    pfNumber: 'PF123456',
    employerName: 'Test Company',
    totalBalance: 500000,
    employeeContribution: 250000,
    employerContribution: 200000,
    pensionFund: 50000,
    syncStatus: 'manual',
    manualOverride: false,
    createdAt: new Date(),
    ...overrides
  }),

  // Helper to create mock sync result
  createMockSyncResult: (overrides = {}) => ({
    success: true,
    recordsProcessed: 1,
    recordsUpdated: 1,
    errors: [],
    warnings: [],
    duration: 1000,
    source: 'test',
    ...overrides
  }),

  // Helper to create mock NAV data
  createMockNAVData: (isin = 'INF209K01157', nav = 25.50) => ({
    identifier: isin,
    value: nav,
    date: new Date(),
    source: 'AMFI'
  }),

  // Helper to create mock stock price data
  createMockStockPrice: (symbol = 'RELIANCE', price = 2650.75) => ({
    symbol,
    value: price,
    timestamp: new Date(),
    metadata: {
      previousClose: price - 50,
      change: 50,
      changePercent: 1.92
    }
  }),

  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random test data
  generateRandomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  // Helper to generate random numbers
  generateRandomNumber: (min = 1, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

// Global test matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveValidSyncResult(received) {
    const pass = received && 
                 typeof received.success === 'boolean' &&
                 typeof received.recordsProcessed === 'number' &&
                 typeof received.recordsUpdated === 'number' &&
                 Array.isArray(received.errors) &&
                 typeof received.duration === 'number';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid sync result`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid sync result`,
        pass: false,
      };
    }
  },

  toHaveValidCredentials(received, service) {
    let pass = false;
    let message = '';

    switch (service) {
      case 'epfo':
        pass = received && 
               typeof received.uan === 'string' && 
               received.uan.length === 12 &&
               typeof received.password === 'string' &&
               received.password.length > 0;
        message = 'expected valid EPFO credentials with UAN and password';
        break;
      
      case 'yahoo_finance':
      case 'nse':
        pass = received && typeof received.apiKey === 'string' && received.apiKey.length > 0;
        message = 'expected valid API key credentials';
        break;
      
      default:
        pass = received && Object.keys(received).length > 0;
        message = 'expected non-empty credentials object';
    }

    return {
      message: () => message,
      pass
    };
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for all tests
jest.setTimeout(30000);