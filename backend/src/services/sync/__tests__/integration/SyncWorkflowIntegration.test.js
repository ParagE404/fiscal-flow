const { PrismaClient } = require('@prisma/client');
const MutualFundSyncService = require('../../MutualFundSyncService');
const EPFSyncService = require('../../EPFSyncService');
const StockSyncService = require('../../StockSyncService');
const JobScheduler = require('../../../scheduler/JobScheduler');
const nock = require('nock');

// Use a test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/finvista_test'
    }
  }
});

describe('Sync Workflow Integration Tests', () => {
  let testUser;
  let testMutualFund;
  let testEPFAccount;
  let testStock;

  beforeAll(async () => {
    // Set up test environment
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test user and investments for each test
    testUser = await createTestUser();
    testMutualFund = await createTestMutualFund(testUser.id);
    testEPFAccount = await createTestEPFAccount(testUser.id);
    testStock = await createTestStock(testUser.id);
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
    nock.cleanAll();
  });

  describe('End-to-End Mutual Fund Sync Workflow', () => {
    test('should complete full mutual fund sync from API call to database update', async () => {
      // Mock AMFI NAV data
      const mockNAVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;${testMutualFund.isin};INF209K01165;Test Mutual Fund;125.50;01-Jan-2024`;

      nock('https://www.amfiindia.com')
        .get('/spages/NAVAll.txt')
        .reply(200, mockNAVData);

      // Create sync service and execute sync
      const syncService = new MutualFundSyncService(prisma);
      const result = await syncService.sync(testUser.id);

      // Verify sync result
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify database updates
      const updatedFund = await prisma.mutualFund.findUnique({
        where: { id: testMutualFund.id }
      });

      expect(updatedFund.currentValue).toBeGreaterThan(testMutualFund.currentValue);
      expect(updatedFund.syncStatus).toBe('synced');
      expect(updatedFund.lastSyncAt).toBeDefined();

      // Verify sync metadata was created
      const syncMetadata = await prisma.syncMetadata.findFirst({
        where: {
          userId: testUser.id,
          investmentType: 'mutual_funds',
          investmentId: testMutualFund.id
        }
      });

      expect(syncMetadata).toBeDefined();
      expect(syncMetadata.syncStatus).toBe('success');
      expect(syncMetadata.lastSyncAt).toBeDefined();
    });

    test('should handle partial sync failures gracefully', async () => {
      // Create multiple test funds
      const testFund2 = await createTestMutualFund(testUser.id, {
        isin: 'INF209K01999',
        name: 'Test Fund 2'
      });

      // Mock AMFI data with only one fund (missing data for second fund)
      const mockNAVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;${testMutualFund.isin};INF209K01165;Test Mutual Fund;125.50;01-Jan-2024`;

      nock('https://www.amfiindia.com')
        .get('/spages/NAVAll.txt')
        .reply(200, mockNAVData);

      const syncService = new MutualFundSyncService(prisma);
      const result = await syncService.sync(testUser.id);

      // Should succeed overall but with warnings
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1); // Only one fund had data
      expect(result.recordsUpdated).toBe(1);
      expect(result.warnings).toHaveLength(1);

      // First fund should be updated
      const updatedFund1 = await prisma.mutualFund.findUnique({
        where: { id: testMutualFund.id }
      });
      expect(updatedFund1.syncStatus).toBe('synced');

      // Second fund should remain unchanged
      const updatedFund2 = await prisma.mutualFund.findUnique({
        where: { id: testFund2.id }
      });
      expect(updatedFund2.syncStatus).toBe('manual');
    });

    test('should handle API failures with proper error logging', async () => {
      // Mock API failure
      nock('https://www.amfiindia.com')
        .get('/spages/NAVAll.txt')
        .reply(500, 'Internal Server Error');

      const syncService = new MutualFundSyncService(prisma);
      const result = await syncService.sync(testUser.id);

      // Should handle failure gracefully
      expect(result.success).toBe(true); // Returns success with warning when no data available
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('no_nav_data');

      // Verify error was logged in sync metadata
      const syncMetadata = await prisma.syncMetadata.findFirst({
        where: {
          userId: testUser.id,
          investmentType: 'mutual_funds'
        }
      });

      expect(syncMetadata).toBeDefined();
      expect(syncMetadata.syncStatus).toBe('failed');
    });
  });

  describe('End-to-End EPF Sync Workflow', () => {
    test('should complete full EPF sync with credential handling', async () => {
      // Store test credentials
      const epfService = new EPFSyncService(prisma);
      await epfService.credentialService.storeCredentials(testUser.id, 'epfo', {
        uan: testEPFAccount.uan,
        password: 'testpassword'
      });

      // Mock EPFO portal responses
      nock('https://unifiedportal-mem.epfindia.gov.in')
        .post('/memberinterface/login')
        .reply(200, { success: true, sessionId: 'test-session' });

      nock('https://unifiedportal-mem.epfindia.gov.in')
        .get('/memberinterface/passbook')
        .reply(200, {
          accounts: [{
            uan: testEPFAccount.uan,
            accountNumber: testEPFAccount.pfNumber,
            currentBalance: 550000,
            employeeShare: 275000,
            employerShare: 225000,
            pensionShare: 50000,
            employeeName: 'Test User',
            employerName: 'Test Company',
            lastUpdated: '2024-01-01'
          }]
        });

      const result = await epfService.sync(testUser.id);

      // Verify sync result
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);

      // Verify database updates
      const updatedAccount = await prisma.ePFAccount.findUnique({
        where: { id: testEPFAccount.id }
      });

      expect(updatedAccount.totalBalance).toBe(550000);
      expect(updatedAccount.employeeContribution).toBe(275000);
      expect(updatedAccount.employerContribution).toBe(225000);
      expect(updatedAccount.pensionFund).toBe(50000);
      expect(updatedAccount.syncStatus).toBe('synced');
    });

    test('should handle authentication failures properly', async () => {
      // Store invalid credentials
      const epfService = new EPFSyncService(prisma);
      await epfService.credentialService.storeCredentials(testUser.id, 'epfo', {
        uan: testEPFAccount.uan,
        password: 'wrongpassword'
      });

      // Mock authentication failure
      nock('https://unifiedportal-mem.epfindia.gov.in')
        .post('/memberinterface/login')
        .reply(401, { success: false, error: 'Invalid credentials' });

      const result = await epfService.sync(testUser.id);

      // Should fail with authentication error
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('credential_error');

      // Account should remain unchanged
      const unchangedAccount = await prisma.ePFAccount.findUnique({
        where: { id: testEPFAccount.id }
      });
      expect(unchangedAccount.syncStatus).toBe('manual');
    });
  });

  describe('End-to-End Stock Sync Workflow', () => {
    test('should complete full stock sync with price updates and P&L calculation', async () => {
      // Mock Yahoo Finance API response
      nock('https://query1.finance.yahoo.com')
        .get('/v8/finance/chart/RELIANCE.NS')
        .reply(200, {
          chart: {
            result: [{
              meta: {
                symbol: 'RELIANCE.NS',
                regularMarketPrice: 2650.75,
                previousClose: 2600.50,
                regularMarketTime: 1704067800
              },
              indicators: {
                quote: [{
                  close: [2650.75]
                }]
              }
            }]
          }
        });

      const stockService = new StockSyncService(prisma);
      const result = await stockService.sync(testUser.id);

      // Verify sync result
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);

      // Verify database updates
      const updatedStock = await prisma.stock.findUnique({
        where: { id: testStock.id }
      });

      expect(updatedStock.currentPrice).toBe(2650.75);
      expect(updatedStock.currentValue).toBe(2650.75 * testStock.quantity);
      expect(updatedStock.pnl).toBeDefined();
      expect(updatedStock.pnlPercentage).toBeDefined();
      expect(updatedStock.syncStatus).toBe('synced');
    });

    test('should handle rate limiting with proper retry logic', async () => {
      // Mock rate limiting response followed by success
      nock('https://query1.finance.yahoo.com')
        .get('/v8/finance/chart/RELIANCE.NS')
        .reply(429, 'Too Many Requests', {
          'retry-after': '1'
        });

      nock('https://query1.finance.yahoo.com')
        .get('/v8/finance/chart/RELIANCE.NS')
        .delay(1100) // Simulate waiting for retry-after
        .reply(200, {
          chart: {
            result: [{
              meta: {
                symbol: 'RELIANCE.NS',
                regularMarketPrice: 2650.75,
                previousClose: 2600.50
              }
            }]
          }
        });

      const stockService = new StockSyncService(prisma);
      const startTime = Date.now();
      const result = await stockService.sync(testUser.id);
      const endTime = Date.now();

      // Should succeed after retry
      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1);
      
      // Should have waited for retry-after period
      expect(endTime - startTime).toBeGreaterThan(1000);
    });
  });

  describe('Job Scheduler Integration', () => {
    test('should execute scheduled sync jobs correctly', async () => {
      // Create job scheduler
      const jobScheduler = new JobScheduler(prisma);
      
      // Mock external APIs
      mockAllAPIs();

      // Manually trigger sync jobs (simulating cron execution)
      const mfResult = await jobScheduler.runSyncForAllUsers('mutual_funds');
      const epfResult = await jobScheduler.runSyncForAllUsers('epf');
      const stockResult = await jobScheduler.runSyncForAllUsers('stocks');

      // Verify all jobs completed
      expect(mfResult).toBeDefined();
      expect(epfResult).toBeDefined();
      expect(stockResult).toBeDefined();

      // Verify sync metadata was updated for all investment types
      const syncMetadata = await prisma.syncMetadata.findMany({
        where: { userId: testUser.id }
      });

      expect(syncMetadata.length).toBeGreaterThan(0);
    });

    test('should handle job failures without affecting other jobs', async () => {
      const jobScheduler = new JobScheduler(prisma);

      // Mock MF API to fail
      nock('https://www.amfiindia.com')
        .get('/spages/NAVAll.txt')
        .reply(500, 'Server Error');

      // Mock stock API to succeed
      nock('https://query1.finance.yahoo.com')
        .get('/v8/finance/chart/RELIANCE.NS')
        .reply(200, {
          chart: {
            result: [{
              meta: {
                symbol: 'RELIANCE.NS',
                regularMarketPrice: 2650.75
              }
            }]
          }
        });

      // Run jobs
      await jobScheduler.runSyncForAllUsers('mutual_funds');
      await jobScheduler.runSyncForAllUsers('stocks');

      // Stock sync should succeed despite MF sync failure
      const stockMetadata = await prisma.syncMetadata.findFirst({
        where: {
          userId: testUser.id,
          investmentType: 'stocks'
        }
      });

      expect(stockMetadata).toBeDefined();
    });
  });

  describe('Error Recovery Integration', () => {
    test('should implement fallback data sources when primary fails', async () => {
      // Mock Yahoo Finance failure
      nock('https://query1.finance.yahoo.com')
        .get('/v8/finance/chart/RELIANCE.NS')
        .reply(503, 'Service Unavailable');

      // Mock NSE API success (fallback)
      nock('https://www.nseindia.com')
        .get('/api/quote-equity')
        .query({ symbol: 'RELIANCE' })
        .reply(200, {
          data: {
            symbol: 'RELIANCE',
            lastPrice: 2650.75,
            pChange: 1.93,
            previousClose: 2600.50
          }
        });

      const stockService = new StockSyncService(prisma);
      const result = await stockService.sync(testUser.id, { 
        enableFallback: true 
      });

      // Should succeed using fallback source
      expect(result.success).toBe(true);
      expect(result.source).toBe('nse_india');
      expect(result.recordsUpdated).toBe(1);
    });

    test('should handle credential rotation during sync', async () => {
      const epfService = new EPFSyncService(prisma);
      
      // Store initial credentials
      await epfService.credentialService.storeCredentials(testUser.id, 'epfo', {
        uan: testEPFAccount.uan,
        password: 'oldpassword'
      });

      // Mock authentication failure with old credentials
      nock('https://unifiedportal-mem.epfindia.gov.in')
        .post('/memberinterface/login')
        .reply(401, { success: false, error: 'Invalid credentials' });

      const result = await epfService.sync(testUser.id);

      // Should fail and trigger credential rotation notification
      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('credential_error');

      // Verify sync was disabled for this service
      const syncConfig = await prisma.syncConfiguration.findUnique({
        where: {
          userId_investmentType: {
            userId: testUser.id,
            investmentType: 'epf'
          }
        }
      });

      // Should be disabled after authentication failure
      expect(syncConfig?.isEnabled).toBe(false);
    });
  });

  describe('Data Validation Integration', () => {
    test('should validate and quarantine suspicious data', async () => {
      // Mock AMFI data with suspicious NAV value (huge change)
      const mockNAVData = `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;${testMutualFund.isin};INF209K01165;Test Mutual Fund;1000.00;01-Jan-2024`; // 10x increase

      nock('https://www.amfiindia.com')
        .get('/spages/NAVAll.txt')
        .reply(200, mockNAVData);

      const syncService = new MutualFundSyncService(prisma);
      const result = await syncService.sync(testUser.id);

      // Should complete but flag anomaly
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('anomaly_detected');

      // Data should be quarantined, not applied
      const updatedFund = await prisma.mutualFund.findUnique({
        where: { id: testMutualFund.id }
      });
      expect(updatedFund.syncStatus).toBe('manual'); // Should remain manual due to anomaly
    });
  });

  // Helper functions
  async function cleanupTestData() {
    await prisma.syncMetadata.deleteMany({});
    await prisma.mutualFund.deleteMany({});
    await prisma.ePFAccount.deleteMany({});
    await prisma.stock.deleteMany({});
    await prisma.encryptedCredentials.deleteMany({});
    await prisma.syncConfiguration.deleteMany({});
    await prisma.user.deleteMany({});
  }

  async function createTestUser() {
    return await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        emailVerified: true
      }
    });
  }

  async function createTestMutualFund(userId, overrides = {}) {
    return await prisma.mutualFund.create({
      data: {
        userId,
        name: 'Test Mutual Fund',
        isin: 'INF209K01157',
        investedAmount: 10000,
        currentValue: 12000,
        totalInvestment: 10000,
        syncStatus: 'manual',
        ...overrides
      }
    });
  }

  async function createTestEPFAccount(userId, overrides = {}) {
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
        ...overrides
      }
    });
  }

  async function createTestStock(userId, overrides = {}) {
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
        ...overrides
      }
    });
  }

  function mockAllAPIs() {
    // Mock AMFI
    nock('https://www.amfiindia.com')
      .get('/spages/NAVAll.txt')
      .reply(200, `Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
119551;INF209K01157;INF209K01165;Test Mutual Fund;125.50;01-Jan-2024`);

    // Mock Yahoo Finance
    nock('https://query1.finance.yahoo.com')
      .get('/v8/finance/chart/RELIANCE.NS')
      .reply(200, {
        chart: {
          result: [{
            meta: {
              symbol: 'RELIANCE.NS',
              regularMarketPrice: 2650.75,
              previousClose: 2600.50
            }
          }]
        }
      });

    // Mock EPFO (if credentials exist)
    nock('https://unifiedportal-mem.epfindia.gov.in')
      .post('/memberinterface/login')
      .reply(200, { success: true, sessionId: 'test-session' });

    nock('https://unifiedportal-mem.epfindia.gov.in')
      .get('/memberinterface/passbook')
      .reply(200, {
        accounts: [{
          uan: '123456789012',
          currentBalance: 550000,
          employeeShare: 275000,
          employerShare: 225000,
          pensionShare: 50000
        }]
      });
  }
});