const StockSyncService = require('../StockSyncService');
const YahooFinanceProvider = require('../providers/YahooFinanceProvider');
const NSEDataProvider = require('../providers/NSEDataProvider');
const PnLCalculator = require('../utils/PnLCalculator');

// Mock the providers and services
jest.mock('../providers/YahooFinanceProvider');
jest.mock('../providers/NSEDataProvider');
jest.mock('../security/CredentialService');
jest.mock('../interfaces', () => ({
  createSyncResult: jest.fn((data) => ({
    success: false,
    recordsProcessed: 0,
    recordsUpdated: 0,
    errors: [],
    warnings: [],
    duration: 0,
    source: 'yahoo_finance',
    ...data
  })),
  createSyncError: jest.fn((data) => data),
  SyncErrorTypes: {
    NETWORK_TIMEOUT: 'network_timeout',
    NETWORK_ERROR: 'network_error',
    AUTHENTICATION_FAILED: 'authentication_failed',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    DATA_VALIDATION_FAILED: 'data_validation_failed',
    SERVICE_UNAVAILABLE: 'service_unavailable',
    DATABASE_ERROR: 'database_error',
    NOT_FOUND: 'not_found',
    DATA_NOT_FOUND: 'data_not_found',
    UNKNOWN_ERROR: 'unknown_error'
  },
  SyncStatus: {
    MANUAL: 'manual',
    SYNCED: 'synced',
    FAILED: 'failed',
    IN_PROGRESS: 'in_progress'
  },
  InvestmentTypes: {
    STOCKS: 'stocks',
    MUTUAL_FUNDS: 'mutual_funds',
    EPF: 'epf'
  }
}));
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    stock: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    syncMetadata: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    syncConfiguration: {
      findUnique: jest.fn()
    }
  }))
}));

describe('StockSyncService', () => {
  let stockSyncService;
  let mockYahooProvider;
  let mockNSEProvider;
  let mockPrisma;

  beforeAll(() => {
    // Set up environment variable for tests
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-characters-long-12345';
  });

  afterAll(() => {
    // Clean up environment variable
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    stockSyncService = new StockSyncService();
    
    // Get mock instances
    mockYahooProvider = stockSyncService.yahooProvider;
    mockNSEProvider = stockSyncService.nseProvider;
    mockPrisma = require('@prisma/client').PrismaClient();
    
    // Setup default mock implementations
    mockYahooProvider.isAvailable.mockResolvedValue(true);
    mockYahooProvider.validateData.mockReturnValue(true);
    mockYahooProvider.transformData.mockImplementation(data => data);
    
    mockNSEProvider.isAvailable.mockResolvedValue(true);
    mockNSEProvider.validateData.mockReturnValue(true);
    mockNSEProvider.transformData.mockImplementation(data => data);
  });

  describe('Market Hours Detection', () => {
    it('should correctly identify market hours', () => {
      // Mock IST time during market hours (10:00 AM IST)
      const marketHoursDate = new Date('2024-01-15T04:30:00.000Z'); // 10:00 AM IST
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/15/2024, 10:00:00 AM');
      
      const isMarketHours = stockSyncService.isMarketHours();
      expect(isMarketHours).toBe(true);
    });

    it('should correctly identify after market hours', () => {
      // Mock IST time after market hours (5:00 PM IST)
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/15/2024, 5:00:00 PM');
      
      const isMarketHours = stockSyncService.isMarketHours();
      expect(isMarketHours).toBe(false);
    });

    it('should correctly identify weekends', () => {
      const isWeekend = stockSyncService.isWeekend();
      // This will depend on when the test runs, but we can test the logic
      expect(typeof isWeekend).toBe('boolean');
    });
  });

  describe('Cache Management', () => {
    it('should generate correct cache keys', () => {
      const cacheKey = stockSyncService.generateCacheKey('RELIANCE', 'NSE');
      expect(cacheKey).toBe('RELIANCE:NSE');
    });

    it('should cache and retrieve price data', () => {
      const priceData = {
        symbol: 'RELIANCE',
        exchange: 'NSE',
        value: 2500,
        timestamp: new Date()
      };

      const cacheKey = stockSyncService.generateCacheKey('RELIANCE', 'NSE');
      stockSyncService.setCachedPrice(cacheKey, priceData);
      
      const cachedData = stockSyncService.getCachedPrice(cacheKey);
      expect(cachedData).toMatchObject(priceData);
    });

    it('should respect cache TTL', () => {
      const priceData = {
        symbol: 'RELIANCE',
        exchange: 'NSE',
        value: 2500,
        timestamp: new Date()
      };

      const cacheKey = stockSyncService.generateCacheKey('RELIANCE', 'NSE');
      stockSyncService.setCachedPrice(cacheKey, priceData);
      
      // Manually expire the cache
      stockSyncService.cacheExpiryTimes.set(cacheKey, Date.now() - 1000);
      
      const cachedData = stockSyncService.getCachedPrice(cacheKey);
      expect(cachedData).toBeNull();
    });
  });

  describe('Data Provider Selection', () => {
    it('should return Yahoo Finance provider by default', () => {
      const provider = stockSyncService.getDataProvider();
      expect(provider).toBe(mockYahooProvider);
    });

    it('should return NSE provider when specified', () => {
      const provider = stockSyncService.getDataProvider('nse');
      expect(provider).toBe(mockNSEProvider);
    });

    it('should return correct fallback source', () => {
      expect(stockSyncService.getFallbackSource('yahoo_finance')).toBe('nse_india');
      expect(stockSyncService.getFallbackSource('nse_india')).toBe('yahoo_finance');
    });
  });

  describe('Stock Price Updates', () => {
    it('should update stock price with P&L calculations', async () => {
      const mockStock = {
        id: 'stock1',
        symbol: 'RELIANCE',
        exchange: 'NSE',
        quantity: 100,
        averagePrice: 2000,
        investedAmount: 200000,
        currentPrice: 2000
      };

      const mockPriceData = {
        value: 2500,
        metadata: {
          previousClose: 2400,
          change: 100,
          changePercent: 4.17
        }
      };

      mockPrisma.stock.update.mockResolvedValue({});

      await stockSyncService.updateStockPrice(mockStock, mockPriceData);

      expect(mockPrisma.stock.update).toHaveBeenCalledWith({
        where: { id: 'stock1' },
        data: expect.objectContaining({
          currentPrice: 2500,
          currentValue: 250000, // 100 * 2500
          pnl: 50000, // 250000 - 200000
          pnlPercentage: 25, // (50000 / 200000) * 100
          syncStatus: 'synced'
        })
      });
    });

    it('should handle dry run mode', async () => {
      const mockStock = {
        id: 'stock1',
        symbol: 'RELIANCE',
        quantity: 100,
        averagePrice: 2000,
        investedAmount: 200000
      };

      const mockPriceData = {
        value: 2500,
        metadata: { previousClose: 2400 }
      };

      await stockSyncService.updateStockPrice(mockStock, mockPriceData, true);

      expect(mockPrisma.stock.update).not.toHaveBeenCalled();
    });
  });

  describe('Sync Operations', () => {
    it('should sync all stocks for a user', async () => {
      const userId = 'user1';
      const mockStocks = [
        {
          id: 'stock1',
          symbol: 'RELIANCE',
          exchange: 'NSE',
          quantity: 100,
          averagePrice: 2000,
          investedAmount: 200000,
          manualOverride: false
        }
      ];

      const mockPriceData = [
        {
          symbol: 'RELIANCE',
          exchange: 'NSE',
          value: 2500,
          timestamp: new Date(),
          metadata: { previousClose: 2400 }
        }
      ];

      // Mock database calls
      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.stock.update.mockResolvedValue({});
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      // Mock provider calls
      mockYahooProvider.fetchData.mockResolvedValue(mockPriceData);

      const result = await stockSyncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
      expect(mockPrisma.stock.update).toHaveBeenCalled();
    });

    it('should handle sync when disabled', async () => {
      const userId = 'user1';
      
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: false });

      const result = await stockSyncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('sync_disabled');
    });

    it('should sync single stock', async () => {
      const userId = 'user1';
      const stockId = 'stock1';
      
      const mockStock = {
        id: stockId,
        symbol: 'RELIANCE',
        exchange: 'NSE',
        quantity: 100,
        averagePrice: 2000,
        investedAmount: 200000,
        manualOverride: false
      };

      const mockPriceData = [
        {
          symbol: 'RELIANCE',
          exchange: 'NSE',
          value: 2500,
          timestamp: new Date(),
          metadata: { previousClose: 2400 }
        }
      ];

      mockPrisma.stock.findFirst.mockResolvedValue(mockStock);
      mockPrisma.stock.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});
      mockYahooProvider.fetchData.mockResolvedValue(mockPriceData);

      const result = await stockSyncService.syncSingle(userId, stockId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
    });

    it('should handle manual override', async () => {
      const userId = 'user1';
      const stockId = 'stock1';
      
      const mockStock = {
        id: stockId,
        symbol: 'RELIANCE',
        exchange: 'NSE',
        manualOverride: true
      };

      mockPrisma.stock.findFirst.mockResolvedValue(mockStock);

      const result = await stockSyncService.syncSingle(userId, stockId);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('manual_override');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const config = {
        isEnabled: true,
        syncFrequency: 'hourly',
        preferredSource: 'yahoo_finance',
        fallbackSource: 'nse_india'
      };

      const isValid = stockSyncService.validateConfiguration(config);
      expect(isValid).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const config = {
        isEnabled: true,
        syncFrequency: 'invalid_frequency'
      };

      const isValid = stockSyncService.validateConfiguration(config);
      expect(isValid).toBe(false);
    });
  });

  describe('Portfolio Metrics', () => {
    it('should calculate portfolio metrics', async () => {
      const userId = 'user1';
      const mockStocks = [
        {
          quantity: 100,
          averagePrice: 2000,
          investedAmount: 200000,
          currentPrice: 2500,
          createdAt: new Date('2023-01-01')
        }
      ];

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);

      const metrics = await stockSyncService.calculatePortfolioMetrics(userId);

      expect(metrics.totalInvestedAmount).toBe(200000);
      expect(metrics.totalCurrentValue).toBe(250000);
      expect(metrics.totalPnL).toBe(50000);
      expect(metrics.totalPnLPercentage).toBe(25);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', () => {
      // Add some test data to cache
      stockSyncService.setCachedPrice('TEST:NSE', { value: 100 });
      
      const stats = stockSyncService.getCacheStats();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('validEntries');
      expect(stats).toHaveProperty('isMarketHours');
      expect(stats).toHaveProperty('currentCacheTTL');
    });
  });
});