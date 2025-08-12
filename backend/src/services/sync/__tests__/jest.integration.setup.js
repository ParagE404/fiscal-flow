// Integration test setup
const { PrismaClient } = require('@prisma/client');
const nock = require('nock');

// Set up test database
let prisma;

beforeAll(async () => {
  // Initialize test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/finvista_test'
      }
    }
  });

  // Ensure database is connected
  try {
    await prisma.$connect();
    console.log('Connected to test database');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up database connection
  if (prisma) {
    await prisma.$disconnect();
  }
});

beforeEach(async () => {
  // Clean up any existing test data before each test
  if (prisma) {
    await cleanupTestData();
  }
  
  // Reset all HTTP mocks
  nock.cleanAll();
});

afterEach(async () => {
  // Clean up test data after each test
  if (prisma) {
    await cleanupTestData();
  }
  
  // Verify all HTTP mocks were used
  if (!nock.isDone()) {
    console.warn('Unused HTTP mocks detected');
    nock.cleanAll();
  }
});

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    // Delete in correct order to respect foreign key constraints
    await prisma.syncMetadata.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.encryptedCredentials.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.syncConfiguration.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.mutualFund.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.stock.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.ePFAccount.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

// Global integration test utilities
global.integrationUtils = {
  prisma,
  
  // Create test user in database
  createTestUser: async (overrides = {}) => {
    return await prisma.user.create({
      data: {
        id: `test-user-${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'hashedpassword',
        emailVerified: true,
        ...overrides
      }
    });
  },

  // Create test mutual fund in database
  createTestMutualFund: async (userId, overrides = {}) => {
    return await prisma.mutualFund.create({
      data: {
        userId,
        name: 'Test Mutual Fund',
        isin: 'INF209K01157',
        investedAmount: 10000,
        currentValue: 12000,
        totalInvestment: 10000,
        syncStatus: 'manual',
        manualOverride: false,
        ...overrides
      }
    });
  },

  // Create test stock in database
  createTestStock: async (userId, overrides = {}) => {
    return await prisma.stock.create({
      data: {
        userId,
        symbol: 'RELIANCE',
        exchange: 'NSE',
        quantity: 100,
        averagePrice: 2500,
        currentPrice: 2600,
        investedAmount: 250000,
        currentValue: 260000,
        syncStatus: 'manual',
        manualOverride: false,
        ...overrides
      }
    });
  },

  // Create test EPF account in database
  createTestEPFAccount: async (userId, overrides = {}) => {
    return await prisma.ePFAccount.create({
      data: {
        userId,
        uan: '123456789012',
        pfNumber: 'PF123456',
        employerName: 'Test Company',
        totalBalance: 500000,
        employeeContribution: 250000,
        employerContribution: 200000,
        pensionFund: 50000,
        syncStatus: 'manual',
        manualOverride: false,
        ...overrides
      }
    });
  },

  // Mock external APIs
  mockAMFIAPI: (navData) => {
    const csvData = navData.map(nav => 
      `119551;${nav.isin};INF209K01165;${nav.name || 'Test Fund'};${nav.value};01-Jan-2024`
    ).join('\n');
    
    const fullCSV = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date\n${csvData}`;
    
    return nock('https://www.amfiindia.com')
      .get('/spages/NAVAll.txt')
      .reply(200, fullCSV);
  },

  mockYahooFinanceAPI: (stockData) => {
    const results = stockData.map(stock => ({
      meta: {
        symbol: `${stock.symbol}.NS`,
        regularMarketPrice: stock.price,
        previousClose: stock.previousClose || stock.price - 50,
        regularMarketTime: Math.floor(Date.now() / 1000)
      }
    }));

    return nock('https://query1.finance.yahoo.com')
      .get(/\/v8\/finance\/chart\/.*/)
      .reply(200, {
        chart: { result: results }
      });
  },

  mockEPFOAPI: (epfData) => {
    // Mock login
    nock('https://unifiedportal-mem.epfindia.gov.in')
      .post('/memberinterface/login')
      .reply(200, { success: true, sessionId: 'test-session' });

    // Mock data fetch
    return nock('https://unifiedportal-mem.epfindia.gov.in')
      .get('/memberinterface/passbook')
      .reply(200, { accounts: epfData });
  },

  // Wait for database operations to complete
  waitForDB: async (ms = 100) => {
    await new Promise(resolve => setTimeout(resolve, ms));
  },

  // Verify database state
  verifyDatabaseState: async (expectations) => {
    const results = {};
    
    if (expectations.users) {
      results.users = await prisma.user.count();
    }
    
    if (expectations.mutualFunds) {
      results.mutualFunds = await prisma.mutualFund.count();
    }
    
    if (expectations.stocks) {
      results.stocks = await prisma.stock.count();
    }
    
    if (expectations.epfAccounts) {
      results.epfAccounts = await prisma.ePFAccount.count();
    }
    
    if (expectations.syncMetadata) {
      results.syncMetadata = await prisma.syncMetadata.count();
    }
    
    return results;
  }
};

// Increase timeout for integration tests
jest.setTimeout(60000);