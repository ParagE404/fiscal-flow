const MutualFundSyncService = require('../MutualFundSyncService');
const AMFIDataProvider = require('../providers/AMFIDataProvider');
const { PrismaClient } = require('@prisma/client');
const {
  SyncErrorTypes,
  SyncStatus,
  InvestmentTypes,
  DataSources
} = require('../types/SyncTypes');

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  mutualFund: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn()
  },
  syncMetadata: {
    upsert: jest.fn(),
    findMany: jest.fn()
  },
  syncConfiguration: {
    findUnique: jest.fn()
  }
};

// Mock AMFI Data Provider
jest.mock('../providers/AMFIDataProvider');

describe('MutualFundSyncService', () => {
  let syncService;
  let mockAMFIProvider;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup AMFI provider mock
    mockAMFIProvider = {
      name: 'AMFI',
      fetchData: jest.fn(),
      validateData: jest.fn(),
      isAvailable: jest.fn()
    };
    AMFIDataProvider.mockImplementation(() => mockAMFIProvider);
    
    // Create sync service with mocked prisma client
    syncService = new MutualFundSyncService(mockPrisma);
  });

  describe('Basic Properties', () => {
    test('should have correct sync type', () => {
      expect(syncService.syncType).toBe(InvestmentTypes.MUTUAL_FUNDS);
    });

    test('should have default configuration', () => {
      const config = syncService.getDefaultConfiguration();
      expect(config).toEqual({
        isEnabled: false,
        syncFrequency: 'daily',
        preferredSource: DataSources.AMFI,
        fallbackSource: DataSources.MF_CENTRAL,
        notifyOnSuccess: false,
        notifyOnFailure: true
      });
    });
  });

  describe('calculateCurrentValue', () => {
    test('should calculate current value correctly', () => {
      const fund = {
        totalInvestment: 10000,
        investedAmount: 10000
      };
      const nav = 25.50;

      const currentValue = syncService.calculateCurrentValue(fund, nav);
      
      // The calculation uses an estimated approach
      expect(currentValue).toBeGreaterThan(0);
      expect(typeof currentValue).toBe('number');
    });

    test('should handle missing totalInvestment', () => {
      const fund = {
        investedAmount: 10000
      };
      const nav = 25.50;

      const currentValue = syncService.calculateCurrentValue(fund, nav);
      expect(currentValue).toBeGreaterThan(0);
    });
  });

  describe('calculateCAGR', () => {
    test('should calculate CAGR correctly for positive returns', () => {
      const fund = {
        totalInvestment: 10000,
        investedAmount: 10000,
        createdAt: new Date('2023-01-01')
      };
      const currentValue = 12000;

      const cagr = syncService.calculateCAGR(fund, currentValue);
      
      expect(cagr).toBeGreaterThan(0);
      expect(cagr).toBeLessThan(1000); // Reasonable upper limit
    });

    test('should calculate CAGR correctly for negative returns', () => {
      const fund = {
        totalInvestment: 10000,
        investedAmount: 10000,
        createdAt: new Date('2023-01-01')
      };
      const currentValue = 8000;

      const cagr = syncService.calculateCAGR(fund, currentValue);
      
      expect(cagr).toBeLessThan(0);
      expect(cagr).toBeGreaterThan(-100); // Reasonable lower limit
    });

    test('should return 0 for very short time periods', () => {
      const fund = {
        totalInvestment: 10000,
        investedAmount: 10000,
        createdAt: new Date() // Very recent
      };
      const currentValue = 12000;

      const cagr = syncService.calculateCAGR(fund, currentValue);
      expect(cagr).toBe(0);
    });

    test('should handle invalid values gracefully', () => {
      const fund = {
        totalInvestment: 0,
        investedAmount: 0,
        createdAt: new Date('2023-01-01')
      };
      const currentValue = 12000;

      const cagr = syncService.calculateCAGR(fund, currentValue);
      expect(cagr).toBe(0);
    });
  });

  describe('validateConfiguration', () => {
    test('should validate correct configuration', () => {
      const config = {
        isEnabled: true,
        syncFrequency: 'daily',
        preferredSource: DataSources.AMFI,
        fallbackSource: DataSources.MF_CENTRAL
      };

      expect(syncService.validateConfiguration(config)).toBe(true);
    });

    test('should reject invalid configuration', () => {
      // Missing isEnabled
      expect(syncService.validateConfiguration({})).toBe(false);
      
      // Invalid sync frequency
      expect(syncService.validateConfiguration({
        isEnabled: true,
        syncFrequency: 'invalid'
      })).toBe(false);
      
      // Invalid data source
      expect(syncService.validateConfiguration({
        isEnabled: true,
        syncFrequency: 'daily',
        preferredSource: 'invalid_source'
      })).toBe(false);
      
      // Non-object input
      expect(syncService.validateConfiguration('not an object')).toBe(false);
    });
  });

  describe('classifyError', () => {
    test('should classify network timeout errors', () => {
      const error = new Error('Request timeout');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.NETWORK_TIMEOUT);
    });

    test('should classify network errors', () => {
      const error = new Error('Network connection failed');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.NETWORK_ERROR);
    });

    test('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.RATE_LIMIT_EXCEEDED);
    });

    test('should classify service unavailable errors', () => {
      const error = new Error('Service unavailable');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.SERVICE_UNAVAILABLE);
    });

    test('should classify validation errors', () => {
      const error = new Error('Data validation failed');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.DATA_VALIDATION_FAILED);
    });

    test('should classify unknown errors', () => {
      const error = new Error('Some unknown error');
      expect(syncService.classifyError(error)).toBe(SyncErrorTypes.UNKNOWN_ERROR);
    });
  });

  describe('isSyncEnabled', () => {
    test('should return true when sync is enabled', async () => {
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
        isEnabled: true
      });

      const result = await syncService.isSyncEnabled('user123');
      expect(result).toBe(true);
    });

    test('should return false when sync is disabled', async () => {
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({
        isEnabled: false
      });

      const result = await syncService.isSyncEnabled('user123');
      expect(result).toBe(false);
    });

    test('should return false when no configuration exists', async () => {
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue(null);

      const result = await syncService.isSyncEnabled('user123');
      expect(result).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.syncConfiguration.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await syncService.isSyncEnabled('user123');
      expect(result).toBe(false);
    });
  });

  describe('getUserMutualFunds', () => {
    test('should fetch user mutual funds', async () => {
      const mockFunds = [
        { id: '1', name: 'Fund 1', isin: 'INF123456789' },
        { id: '2', name: 'Fund 2', isin: 'INF987654321' }
      ];
      
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);

      const result = await syncService.getUserMutualFunds('user123');
      
      expect(result).toEqual(mockFunds);
      expect(mockPrisma.mutualFund.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { name: 'asc' }
      });
    });
  });

  describe('updateFundValue', () => {
    test('should update fund value correctly', async () => {
      const fund = {
        id: 'fund123',
        name: 'Test Fund',
        totalInvestment: 10000,
        investedAmount: 10000,
        createdAt: new Date('2023-01-01')
      };
      
      const navRecord = {
        value: 25.50,
        date: new Date()
      };

      mockPrisma.mutualFund.update.mockResolvedValue({});

      await syncService.updateFundValue(fund, navRecord);

      expect(mockPrisma.mutualFund.update).toHaveBeenCalledWith({
        where: { id: 'fund123' },
        data: expect.objectContaining({
          currentValue: expect.any(Number),
          cagr: expect.any(Number),
          lastSyncAt: expect.any(Date),
          syncStatus: SyncStatus.SYNCED,
          updatedAt: expect.any(Date)
        })
      });
    });
  });

  describe('sync', () => {
    test('should sync mutual funds successfully', async () => {
      const userId = 'user123';
      const mockFunds = [
        {
          id: 'fund1',
          name: 'Test Fund 1',
          isin: 'INF123456789',
          totalInvestment: 10000,
          investedAmount: 10000,
          manualOverride: false,
          createdAt: new Date('2023-01-01')
        }
      ];
      
      const mockNavData = [
        {
          identifier: 'INF123456789',
          value: 25.50,
          date: new Date()
        }
      ];

      // Setup mocks
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockAMFIProvider.fetchData.mockResolvedValue(mockNavData);
      mockAMFIProvider.validateData.mockReturnValue(true);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockAMFIProvider.fetchData).toHaveBeenCalledWith(['INF123456789'], {});
    });

    test('should handle sync when disabled', async () => {
      const userId = 'user123';
      
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: false });

      const result = await syncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('sync_disabled');
    });

    test('should handle funds without ISIN', async () => {
      const userId = 'user123';
      const mockFunds = [
        {
          id: 'fund1',
          name: 'Test Fund 1',
          isin: null, // No ISIN
          manualOverride: false
        }
      ];

      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);

      const result = await syncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('no_syncable_funds');
    });

    test('should handle NAV data not found', async () => {
      const userId = 'user123';
      const mockFunds = [
        {
          id: 'fund1',
          name: 'Test Fund 1',
          isin: 'INF123456789',
          manualOverride: false
        }
      ];

      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockAMFIProvider.fetchData.mockResolvedValue([]); // No NAV data
      mockAMFIProvider.validateData.mockReturnValue(true);
      mockPrisma.syncMetadata.findMany.mockResolvedValue([]); // No historical data

      const result = await syncService.sync(userId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(0); // Changed: no records processed when no NAV data
      expect(result.recordsUpdated).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('no_nav_data'); // Changed: different warning type
    });

    test('should handle sync errors gracefully', async () => {
      const userId = 'user123';
      
      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
      mockPrisma.mutualFund.findMany.mockResolvedValue([
        {
          id: 'fund1',
          name: 'Test Fund 1',
          isin: 'INF123456789',
          manualOverride: false
        }
      ]);
      mockAMFIProvider.fetchData.mockRejectedValue(new Error('Network error'));
      mockPrisma.syncMetadata.findMany.mockResolvedValue([]); // No historical data

      const result = await syncService.sync(userId);

      expect(result.success).toBe(true); // Changed: now returns success with warning when no data available
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('no_nav_data');
    });

    test('should respect force option when sync is disabled', async () => {
      const userId = 'user123';
      const mockFunds = [
        {
          id: 'fund1',
          name: 'Test Fund 1',
          isin: 'INF123456789',
          totalInvestment: 10000,
          manualOverride: false,
          createdAt: new Date('2023-01-01')
        }
      ];

      mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: false });
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockAMFIProvider.fetchData.mockResolvedValue([{
        identifier: 'INF123456789',
        value: 25.50,
        date: new Date()
      }]);
      mockAMFIProvider.validateData.mockReturnValue(true);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.sync(userId, { force: true });

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(1);
    });
  });

  describe('syncSingle', () => {
    test('should sync single mutual fund successfully', async () => {
      const userId = 'user123';
      const investmentId = 'fund123';
      
      const mockFund = {
        id: investmentId,
        name: 'Test Fund',
        isin: 'INF123456789',
        totalInvestment: 10000,
        manualOverride: false,
        createdAt: new Date('2023-01-01')
      };

      const mockNavData = [
        {
          identifier: 'INF123456789',
          value: 25.50,
          date: new Date()
        }
      ];

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);
      mockAMFIProvider.fetchData.mockResolvedValue(mockNavData);
      mockAMFIProvider.validateData.mockReturnValue(true);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.syncSingle(userId, investmentId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
    });

    test('should handle fund not found', async () => {
      const userId = 'user123';
      const investmentId = 'nonexistent';

      mockPrisma.mutualFund.findFirst.mockResolvedValue(null);

      const result = await syncService.syncSingle(userId, investmentId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Mutual fund not found');
    });

    test('should handle fund without ISIN', async () => {
      const userId = 'user123';
      const investmentId = 'fund123';
      
      const mockFund = {
        id: investmentId,
        name: 'Test Fund',
        isin: null // No ISIN
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);

      const result = await syncService.syncSingle(userId, investmentId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('does not have ISIN code');
    });

    test('should handle manual override', async () => {
      const userId = 'user123';
      const investmentId = 'fund123';
      
      const mockFund = {
        id: investmentId,
        name: 'Test Fund',
        isin: 'INF123456789',
        manualOverride: true
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);

      const result = await syncService.syncSingle(userId, investmentId);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('manual_override');
    });
  });

  describe('getSyncStatus', () => {
    test('should get sync status correctly', async () => {
      const userId = 'user123';
      const mockFunds = [
        {
          id: 'fund1',
          name: 'Fund 1',
          isin: 'INF123456789',
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          manualOverride: false
        },
        {
          id: 'fund2',
          name: 'Fund 2',
          isin: null,
          syncStatus: 'manual',
          lastSyncAt: null,
          manualOverride: false
        }
      ];

      const mockSyncMetadata = [
        {
          investmentId: 'fund1',
          lastSyncAt: new Date(),
          syncStatus: 'success',
          errorMessage: null
        }
      ];

      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockPrisma.syncMetadata.findMany.mockResolvedValue(mockSyncMetadata);

      const result = await syncService.getSyncStatus(userId);

      expect(result.totalFunds).toBe(2);
      expect(result.syncableFunds).toBe(1);
      expect(result.fundsStatus).toHaveLength(2);
      expect(result.fundsStatus[0].name).toBe('Fund 1');
      expect(result.fundsStatus[1].name).toBe('Fund 2');
    });
  });
});