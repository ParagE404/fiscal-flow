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

describe('MutualFundSyncService - Edge Cases', () => {
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

  describe('fetchNAVDataWithFallback', () => {
    test('should use primary provider when available', async () => {
      const mockNavData = [
        { identifier: 'INF123456789', value: 25.50, date: new Date() }
      ];

      mockAMFIProvider.fetchData.mockResolvedValue(mockNavData);
      mockAMFIProvider.validateData.mockReturnValue(true);

      const result = await syncService.fetchNAVDataWithFallback(['INF123456789']);

      expect(result).toEqual(mockNavData);
      expect(mockAMFIProvider.fetchData).toHaveBeenCalledTimes(1);
    });

    test('should fallback to historical data when providers fail', async () => {
      mockAMFIProvider.fetchData.mockRejectedValue(new Error('Provider failed'));
      
      // Mock historical data
      const mockHistoricalData = [
        {
          investmentType: 'mutual_funds',
          syncStatus: 'success',
          lastSyncAt: new Date(),
          user: {
            mutualFunds: [
              {
                id: 'fund1',
                isin: 'INF123456789',
                name: 'Test Fund',
                currentValue: 12500,
                totalInvestment: 10000
              }
            ]
          }
        }
      ];

      mockPrisma.syncMetadata.findMany.mockResolvedValue(mockHistoricalData);

      const result = await syncService.fetchNAVDataWithFallback(['INF123456789']);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('historical');
      expect(result[0].metadata.isHistorical).toBe(true);
    });
  });

  describe('validateNAVData', () => {
    test('should reject zero or negative NAV values', () => {
      const navRecord = { value: 0, date: new Date() };
      const fund = { currentValue: 10000 };

      const result = syncService.validateNAVData(navRecord, fund);

      expect(result.isValid).toBe(false);
      expect(result.critical).toBe(true);
      expect(result.message).toContain('Invalid NAV value');
    });

    test('should warn about old NAV data', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old

      const navRecord = { value: 25.50, date: oldDate };
      const fund = { currentValue: 10000 };

      const result = syncService.validateNAVData(navRecord, fund);

      expect(result.isValid).toBe(false);
      expect(result.critical).toBe(false);
      expect(result.message).toContain('days old');
      expect(result.details.daysDiff).toBe(10);
    });

    test('should detect unusual NAV changes', () => {
      const navRecord = { value: 50.0, date: new Date() };
      const fund = { 
        currentValue: 10000,
        totalInvestment: 10000 // This implies current NAV around 10
      };

      // Mock estimateCurrentNAV to return 20
      jest.spyOn(syncService, 'estimateCurrentNAV').mockReturnValue(20);

      const result = syncService.validateNAVData(navRecord, fund);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unusual NAV change');
      expect(result.details.changePercent).toBeGreaterThan(20);
    });

    test('should pass validation for normal NAV data', () => {
      const navRecord = { value: 25.50, date: new Date() };
      const fund = { currentValue: 10000 };

      const result = syncService.validateNAVData(navRecord, fund);

      expect(result.isValid).toBe(true);
      expect(result.critical).toBe(false);
    });
  });

  describe('isWeekendOrHoliday', () => {
    test('should detect weekends', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      const sunday = new Date('2024-01-07'); // Sunday
      const monday = new Date('2024-01-08'); // Monday

      expect(syncService.isWeekendOrHoliday(saturday)).toBe(true);
      expect(syncService.isWeekendOrHoliday(sunday)).toBe(true);
      expect(syncService.isWeekendOrHoliday(monday)).toBe(false);
    });

    test('should detect Indian holidays', () => {
      const newYear = new Date('2024-01-01');
      const republicDay = new Date('2024-01-26');
      const independenceDay = new Date('2024-08-15');
      const gandhiJayanti = new Date('2024-10-02');
      const regularDay = new Date('2024-03-15');

      expect(syncService.isWeekendOrHoliday(newYear)).toBe(true);
      expect(syncService.isWeekendOrHoliday(republicDay)).toBe(true);
      expect(syncService.isWeekendOrHoliday(independenceDay)).toBe(true);
      expect(syncService.isWeekendOrHoliday(gandhiJayanti)).toBe(true);
      expect(syncService.isWeekendOrHoliday(regularDay)).toBe(false);
    });
  });

  describe('checkForSchemeMerger', () => {
    test('should detect potential scheme mergers', async () => {
      const fund = {
        id: 'fund1',
        name: 'HDFC Equity Fund',
        isin: 'INF123456789'
      };

      const similarFunds = [
        {
          id: 'fund2',
          name: 'HDFC Growth Fund',
          isin: 'INF987654321',
          lastSyncAt: new Date()
        }
      ];

      mockPrisma.mutualFund.findMany.mockResolvedValue(similarFunds);

      const result = await syncService.checkForSchemeMerger(fund);

      expect(result.found).toBe(true);
      expect(result.reason).toBe('similar_funds_active');
      expect(result.details.similarFunds).toHaveLength(1);
    });

    test('should return false when no similar funds found', async () => {
      const fund = {
        id: 'fund1',
        name: 'HDFC Equity Fund',
        isin: 'INF123456789'
      };

      mockPrisma.mutualFund.findMany.mockResolvedValue([]);

      const result = await syncService.checkForSchemeMerger(fund);

      expect(result.found).toBe(false);
    });
  });

  describe('checkIfFundDiscontinued', () => {
    test('should detect discontinued funds based on sync history', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const fund = {
        id: 'fund1',
        name: 'Old Fund',
        lastSyncAt: oldDate
      };

      const result = await syncService.checkIfFundDiscontinued(fund);

      expect(result.discontinued).toBe(true);
      expect(result.reason).toBe('no_sync_for_long_period');
      expect(result.details.daysSinceLastSync).toBeGreaterThan(90);
    });

    test('should not flag recently synced funds as discontinued', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const fund = {
        id: 'fund1',
        name: 'Active Fund',
        lastSyncAt: recentDate
      };

      const result = await syncService.checkIfFundDiscontinued(fund);

      expect(result.discontinued).toBe(false);
    });
  });

  describe('setManualOverride', () => {
    test('should enable manual override for a fund', async () => {
      const userId = 'user123';
      const fundId = 'fund123';
      const mockFund = {
        id: fundId,
        name: 'Test Fund',
        userId: userId
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.setManualOverride(userId, fundId, true, 'User requested');

      expect(result).toBe(true);
      expect(mockPrisma.mutualFund.update).toHaveBeenCalledWith({
        where: { id: fundId },
        data: {
          manualOverride: true,
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should handle fund not found', async () => {
      const userId = 'user123';
      const fundId = 'nonexistent';

      mockPrisma.mutualFund.findFirst.mockResolvedValue(null);

      const result = await syncService.setManualOverride(userId, fundId, true);

      expect(result).toBe(false);
    });
  });

  describe('getFundsRequiringManualReview', () => {
    test('should return funds requiring manual review', async () => {
      const userId = 'user123';
      const mockMetadata = [
        {
          investmentId: 'fund1',
          syncStatus: 'manual_review_required',
          lastSyncAt: new Date(),
          errorMessage: 'Scheme merger detected',
          dataHash: JSON.stringify({ reason: 'merger' }),
          user: {
            mutualFunds: [
              {
                id: 'fund1',
                name: 'Test Fund',
                userId: userId
              }
            ]
          }
        }
      ];

      mockPrisma.syncMetadata.findMany.mockResolvedValue(mockMetadata);

      const result = await syncService.getFundsRequiringManualReview(userId);

      expect(result).toHaveLength(1);
      expect(result[0].fund.name).toBe('Test Fund');
      expect(result[0].metadata.syncStatus).toBe('manual_review_required');
      expect(result[0].metadata.details.reason).toBe('merger');
    });
  });

  describe('resolveManualReview', () => {
    test('should resolve manual review with ignore action', async () => {
      const userId = 'user123';
      const fundId = 'fund123';
      const mockFund = {
        id: fundId,
        name: 'Test Fund',
        userId: userId
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.resolveManualReview(userId, fundId, 'ignore');

      expect(result).toBe(true);
      expect(mockPrisma.syncMetadata.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            syncStatus: 'manual_review_resolved',
            errorMessage: 'User chose to ignore the issue'
          })
        })
      );
    });

    test('should resolve manual review with ISIN update', async () => {
      const userId = 'user123';
      const fundId = 'fund123';
      const mockFund = {
        id: fundId,
        name: 'Test Fund',
        userId: userId,
        isin: 'INF123456789'
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      const result = await syncService.resolveManualReview(
        userId, 
        fundId, 
        'update_isin', 
        { newISIN: 'INF987654321' }
      );

      expect(result).toBe(true);
      expect(mockPrisma.mutualFund.update).toHaveBeenCalledWith({
        where: { id: fundId },
        data: {
          isin: 'INF987654321',
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should handle unknown resolution action', async () => {
      const userId = 'user123';
      const fundId = 'fund123';
      const mockFund = {
        id: fundId,
        name: 'Test Fund',
        userId: userId
      };

      mockPrisma.mutualFund.findFirst.mockResolvedValue(mockFund);

      const result = await syncService.resolveManualReview(userId, fundId, 'unknown_action');

      expect(result).toBe(false);
    });
  });

  describe('estimateCurrentNAV', () => {
    test('should estimate NAV based on growth ratio', () => {
      const fund = {
        currentValue: 12000,
        totalInvestment: 10000
      };

      const estimatedNAV = syncService.estimateCurrentNAV(fund);

      expect(estimatedNAV).toBe(12); // 10 * (12000/10000) = 12
    });

    test('should return 0 for invalid fund data', () => {
      const fund = {
        currentValue: 0,
        totalInvestment: 0
      };

      const estimatedNAV = syncService.estimateCurrentNAV(fund);

      expect(estimatedNAV).toBe(0);
    });
  });

  describe('handleMissingNAVData', () => {
    test('should handle weekend/holiday scenario', async () => {
      const fund = {
        id: 'fund1',
        name: 'Test Fund',
        isin: 'INF123456789'
      };

      const result = { warnings: [], errors: [] };

      // Mock weekend detection
      jest.spyOn(syncService, 'isWeekendOrHoliday').mockReturnValue(true);

      const updatedResult = await syncService.handleMissingNAVData(fund, result);

      expect(updatedResult.warnings).toHaveLength(1);
      expect(updatedResult.warnings[0].type).toBe('weekend_holiday_nav');
    });

    test('should handle scheme merger scenario', async () => {
      const fund = {
        id: 'fund1',
        name: 'Test Fund',
        isin: 'INF123456789'
      };

      const result = { warnings: [], errors: [] };

      // Mock weekend detection as false
      jest.spyOn(syncService, 'isWeekendOrHoliday').mockReturnValue(false);
      
      // Mock scheme merger detection
      jest.spyOn(syncService, 'checkForSchemeMerger').mockResolvedValue({
        found: true,
        reason: 'similar_funds_active',
        details: {}
      });

      jest.spyOn(syncService, 'flagForManualReview').mockResolvedValue();

      const updatedResult = await syncService.handleMissingNAVData(fund, result);

      expect(updatedResult.warnings).toHaveLength(1);
      expect(updatedResult.warnings[0].type).toBe('scheme_merger_detected');
    });
  });
});