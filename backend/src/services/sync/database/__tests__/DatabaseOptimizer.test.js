/**
 * Tests for DatabaseOptimizer
 */

const databaseOptimizer = require('../DatabaseOptimizer');

// Mock Prisma client
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  syncMetadata: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    groupBy: jest.fn()
  },
  user: {
    findMany: jest.fn()
  },
  mutualFund: {
    findMany: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn()
  },
  stock: {
    findMany: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn()
  },
  ePFAccount: {
    findMany: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn()
  },
  fixedDeposit: {
    aggregate: jest.fn()
  }
};

// Mock PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

describe('DatabaseOptimizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the optimizer instance
    databaseOptimizer.prisma = null;
    databaseOptimizer.batchQueue.clear();
    databaseOptimizer.activeBatches = 0;
  });

  describe('Initialization', () => {
    it('should initialize Prisma client with connection pooling', async () => {
      mockPrisma.$connect.mockResolvedValue();
      
      const prisma = await databaseOptimizer.initialize();
      
      expect(mockPrisma.$connect).toHaveBeenCalled();
      expect(prisma).toBe(mockPrisma);
    });

    it('should return existing Prisma client if already initialized', async () => {
      databaseOptimizer.prisma = mockPrisma;
      
      const prisma = await databaseOptimizer.initialize();
      
      expect(mockPrisma.$connect).not.toHaveBeenCalled();
      expect(prisma).toBe(mockPrisma);
    });
  });

  describe('Sync Metadata Queries', () => {
    beforeEach(async () => {
      databaseOptimizer.prisma = mockPrisma;
    });

    it('should get bulk sync metadata efficiently', async () => {
      const mockMetadata = [
        { investmentId: '1', syncStatus: 'synced', lastSyncAt: new Date() },
        { investmentId: '2', syncStatus: 'failed', lastSyncAt: new Date() }
      ];
      
      mockPrisma.syncMetadata.findMany.mockResolvedValue(mockMetadata);
      
      const queries = databaseOptimizer.getSyncMetadataQueries();
      const result = await queries.getBulkSyncMetadata('user1', 'mutual_funds', ['1', '2']);
      
      expect(mockPrisma.syncMetadata.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          investmentType: 'mutual_funds',
          investmentId: { in: ['1', '2'] }
        },
        select: {
          investmentId: true,
          lastSyncAt: true,
          syncStatus: true,
          syncSource: true,
          errorMessage: true,
          dataHash: true
        }
      });
      
      expect(result).toEqual(mockMetadata);
    });

    it('should update bulk sync metadata in transaction', async () => {
      const updates = [
        {
          userId: 'user1',
          investmentType: 'mutual_funds',
          investmentId: '1',
          syncStatus: 'synced',
          lastSyncAt: new Date()
        }
      ];
      
      mockPrisma.$transaction.mockResolvedValue([]);
      
      const queries = databaseOptimizer.getSyncMetadataQueries();
      await queries.updateBulkSyncMetadata(updates);
      
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should get users with enabled sync configurations', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          syncConfigurations: [{ syncFrequency: 'daily', isEnabled: true }]
        }
      ];
      
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      
      const queries = databaseOptimizer.getSyncMetadataQueries();
      const result = await queries.getUsersWithEnabledSync('mutual_funds');
      
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          syncConfigurations: {
            some: {
              investmentType: 'mutual_funds',
              isEnabled: true
            }
          }
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          syncConfigurations: expect.any(Object)
        })
      });
      
      expect(result).toEqual(mockUsers);
    });
  });

  describe('Investment Queries', () => {
    beforeEach(async () => {
      databaseOptimizer.prisma = mockPrisma;
    });

    it('should get mutual funds for sync with optimization', async () => {
      const mockFunds = [
        {
          id: '1',
          name: 'Test Fund',
          isin: 'INF123456789',
          investedAmount: 10000,
          syncStatus: 'manual'
        }
      ];
      
      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      
      const queries = databaseOptimizer.getInvestmentQueries();
      const result = await queries.getMutualFundsForSync('user1');
      
      expect(mockPrisma.mutualFund.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          manualOverride: false,
          isin: { not: null }
        },
        select: expect.objectContaining({
          id: true,
          name: true,
          isin: true,
          investedAmount: true
        }),
        orderBy: { lastSyncAt: 'asc' }
      });
      
      expect(result).toEqual(mockFunds);
    });

    it('should get stocks for sync with exchange filtering', async () => {
      const mockStocks = [
        {
          id: '1',
          symbol: 'RELIANCE',
          exchange: 'NSE',
          quantity: 10,
          syncStatus: 'manual'
        }
      ];
      
      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
      
      const queries = databaseOptimizer.getInvestmentQueries();
      const result = await queries.getStocksForSync('user1');
      
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          manualOverride: false
        },
        select: expect.objectContaining({
          id: true,
          symbol: true,
          exchange: true,
          quantity: true
        }),
        orderBy: { lastSyncAt: 'asc' }
      });
      
      expect(result).toEqual(mockStocks);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      databaseOptimizer.prisma = mockPrisma;
      // Clear any existing timers
      if (databaseOptimizer.batchTimer) {
        clearTimeout(databaseOptimizer.batchTimer);
        databaseOptimizer.batchTimer = null;
      }
    });

    it('should queue mutual fund updates for batch processing', () => {
      const batchOps = databaseOptimizer.getBatchOperations();
      
      batchOps.queueMutualFundUpdate('fund1', { currentValue: 15000 });
      batchOps.queueMutualFundUpdate('fund2', { currentValue: 20000 });
      
      expect(databaseOptimizer.batchQueue.has('mutualFund')).toBe(true);
      expect(databaseOptimizer.batchQueue.get('mutualFund').size).toBe(2);
    });

    it('should process batches when queue is full', (done) => {
      const batchOps = databaseOptimizer.getBatchOperations();
      
      // Mock the batch processing
      jest.spyOn(databaseOptimizer, 'processBatches').mockImplementation(() => {
        done();
        return Promise.resolve();
      });
      
      // Fill the batch queue to trigger immediate processing
      for (let i = 0; i < databaseOptimizer.batchConfig.maxBatchSize; i++) {
        batchOps.queueMutualFundUpdate(`fund${i}`, { currentValue: 1000 * i });
      }
    });

    it('should batch update mutual funds in transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);
      
      const batchData = new Map([
        ['fund1', { data: { currentValue: 15000 }, timestamp: Date.now() }],
        ['fund2', { data: { currentValue: 20000 }, timestamp: Date.now() }]
      ]);
      
      await databaseOptimizer.batchUpdateMutualFunds(batchData);
      
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            // This would be the actual Prisma update operation
          })
        ])
      );
    });

    it('should flush all batches on demand', async () => {
      const batchOps = databaseOptimizer.getBatchOperations();
      
      batchOps.queueMutualFundUpdate('fund1', { currentValue: 15000 });
      batchOps.queueStockUpdate('stock1', { currentPrice: 2500 });
      
      jest.spyOn(databaseOptimizer, 'processBatches').mockResolvedValue();
      
      await batchOps.flushBatches();
      
      expect(databaseOptimizer.processBatches).toHaveBeenCalledWith(true);
    });
  });

  describe('Aggregation Queries', () => {
    beforeEach(async () => {
      databaseOptimizer.prisma = mockPrisma;
    });

    it('should get sync statistics by type', async () => {
      const mockStats = [
        {
          investmentType: 'mutual_funds',
          syncStatus: 'synced',
          _count: { id: 5 },
          _max: { lastSyncAt: new Date() }
        }
      ];
      
      mockPrisma.syncMetadata.groupBy.mockResolvedValue(mockStats);
      
      const aggregationQueries = databaseOptimizer.getAggregationQueries();
      const result = await aggregationQueries.getSyncStatsByType('user1');
      
      expect(mockPrisma.syncMetadata.groupBy).toHaveBeenCalledWith({
        by: ['investmentType', 'syncStatus'],
        where: { userId: 'user1' },
        _count: { id: true },
        _max: { lastSyncAt: true },
        _min: { lastSyncAt: true }
      });
      
      expect(result).toEqual(mockStats);
    });

    it('should get portfolio summary with parallel aggregation', async () => {
      const mockAggregates = {
        _sum: { totalInvestment: 100000, currentValue: 110000 },
        _count: { id: 5 }
      };
      
      mockPrisma.mutualFund.aggregate.mockResolvedValue(mockAggregates);
      mockPrisma.stock.aggregate.mockResolvedValue(mockAggregates);
      mockPrisma.ePFAccount.aggregate.mockResolvedValue(mockAggregates);
      mockPrisma.fixedDeposit.aggregate.mockResolvedValue(mockAggregates);
      
      const aggregationQueries = databaseOptimizer.getAggregationQueries();
      const result = await aggregationQueries.getPortfolioSummary('user1');
      
      expect(result).toHaveProperty('mutualFunds');
      expect(result).toHaveProperty('stocks');
      expect(result).toHaveProperty('epfAccounts');
      expect(result).toHaveProperty('fixedDeposits');
      expect(result).toHaveProperty('totalInvested');
      expect(result).toHaveProperty('totalCurrent');
    });
  });

  describe('Performance Statistics', () => {
    it('should provide performance statistics', async () => {
      const stats = await databaseOptimizer.getPerformanceStats();
      
      expect(stats).toHaveProperty('connectionPool');
      expect(stats).toHaveProperty('batchQueue');
      expect(stats).toHaveProperty('activeBatches');
      expect(stats.batchQueue).toHaveProperty('totalQueued');
      expect(stats.batchQueue).toHaveProperty('byOperation');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      databaseOptimizer.prisma = mockPrisma;
      mockPrisma.$disconnect.mockResolvedValue();
      
      jest.spyOn(databaseOptimizer, 'processBatches').mockResolvedValue();
      
      await databaseOptimizer.cleanup();
      
      expect(databaseOptimizer.processBatches).toHaveBeenCalledWith(true);
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
      expect(databaseOptimizer.prisma).toBeNull();
    });
  });
});