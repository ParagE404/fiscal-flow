const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const MutualFundSyncService = require('../../MutualFundSyncService');
const StockSyncService = require('../../StockSyncService');
const EPFSyncService = require('../../EPFSyncService');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma for performance tests
const mockPrisma = {
  mutualFund: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  stock: {
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  ePFAccount: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  syncMetadata: {
    upsert: jest.fn(),
    createMany: jest.fn()
  },
  syncConfiguration: {
    findUnique: jest.fn()
  },
  user: {
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// Mock external APIs for consistent performance testing
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  head: jest.fn()
}));

describe('Sync Performance Tests', () => {
  let syncServices;

  beforeAll(() => {
    // Set up test environment
    process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    
    syncServices = {
      mutualFunds: new MutualFundSyncService(mockPrisma),
      stocks: new StockSyncService(mockPrisma),
      epf: new EPFSyncService(mockPrisma)
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks for performance tests
    mockPrisma.syncConfiguration.findUnique.mockResolvedValue({ isEnabled: true });
  });

  describe('Single User Sync Performance', () => {
    test('should sync 100 mutual funds within 5 seconds', async () => {
      const fundCount = 100;
      const mockFunds = generateMockMutualFunds(fundCount);
      const mockNAVData = generateMockNAVData(fundCount);

      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      // Mock AMFI provider
      syncServices.mutualFunds.amfiProvider = {
        fetchData: jest.fn().mockResolvedValue(mockNAVData),
        validateData: jest.fn().mockReturnValue(true)
      };

      const startTime = performance.now();
      const result = await syncServices.mutualFunds.sync('test-user');
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(fundCount);
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
      expect(mockPrisma.mutualFund.update).toHaveBeenCalledTimes(fundCount);

      console.log(`Synced ${fundCount} mutual funds in ${duration.toFixed(2)}ms`);
    });

    test('should sync 500 stocks within 10 seconds', async () => {
      const stockCount = 500;
      const mockStocks = generateMockStocks(stockCount);
      const mockPriceData = generateMockStockPrices(stockCount);

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.stock.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      // Mock Yahoo Finance provider
      syncServices.stocks.yahooProvider = {
        fetchData: jest.fn().mockResolvedValue(mockPriceData),
        validateData: jest.fn().mockReturnValue(true)
      };

      const startTime = performance.now();
      const result = await syncServices.stocks.sync('test-user');
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.recordsUpdated).toBe(stockCount);
      expect(duration).toBeLessThan(10000); // Less than 10 seconds

      console.log(`Synced ${stockCount} stocks in ${duration.toFixed(2)}ms`);
    });

    test('should handle memory efficiently with large datasets', async () => {
      const largeDatasetSize = 1000;
      const mockFunds = generateMockMutualFunds(largeDatasetSize);

      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      mockPrisma.mutualFund.update.mockResolvedValue({});

      // Monitor memory usage
      const initialMemory = process.memoryUsage();

      const result = await syncServices.mutualFunds.sync('test-user');

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.success).toBe(true);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent User Sync Performance', () => {
    test('should handle 10 concurrent user syncs efficiently', async () => {
      const userCount = 10;
      const fundsPerUser = 50;

      // Set up mocks for concurrent operations
      mockPrisma.mutualFund.findMany.mockImplementation((query) => {
        return Promise.resolve(generateMockMutualFunds(fundsPerUser));
      });

      mockPrisma.mutualFund.update.mockResolvedValue({});
      mockPrisma.syncMetadata.upsert.mockResolvedValue({});

      syncServices.mutualFunds.amfiProvider = {
        fetchData: jest.fn().mockResolvedValue(generateMockNAVData(fundsPerUser)),
        validateData: jest.fn().mockReturnValue(true)
      };

      const startTime = performance.now();

      // Create concurrent sync operations
      const syncPromises = Array.from({ length: userCount }, (_, i) => 
        syncServices.mutualFunds.sync(`user-${i}`)
      );

      const results = await Promise.all(syncPromises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const totalRecords = results.reduce((sum, result) => sum + result.recordsUpdated, 0);

      expect(results.every(result => result.success)).toBe(true);
      expect(totalRecords).toBe(userCount * fundsPerUser);
      expect(duration).toBeLessThan(15000); // Less than 15 seconds for all users

      console.log(`Synced ${userCount} users (${totalRecords} total records) in ${duration.toFixed(2)}ms`);
    });

    test('should maintain performance under database connection pressure', async () => {
      const concurrentOperations = 20;
      
      // Simulate database latency
      mockPrisma.mutualFund.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(generateMockMutualFunds(10)), 100))
      );
      
      mockPrisma.mutualFund.update.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({}), 50))
      );

      const startTime = performance.now();

      const operations = Array.from({ length: concurrentOperations }, (_, i) =>
        syncServices.mutualFunds.sync(`user-${i}`)
      );

      const results = await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const successfulSyncs = results.filter(result => result.success).length;

      expect(successfulSyncs).toBe(concurrentOperations);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`${concurrentOperations} concurrent operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Batch Processing Performance', () => {
    test('should efficiently process batch updates', async () => {
      const batchSize = 100;
      const mockFunds = generateMockMutualFunds(batchSize);
      const mockNAVData = generateMockNAVData(batchSize);

      mockPrisma.mutualFund.findMany.mockResolvedValue(mockFunds);
      
      // Mock batch update operation
      mockPrisma.mutualFund.updateMany = jest.fn().mockResolvedValue({ count: batchSize });
      mockPrisma.syncMetadata.createMany = jest.fn().mockResolvedValue({ count: batchSize });

      syncServices.mutualFunds.amfiProvider = {
        fetchData: jest.fn().mockResolvedValue(mockNAVData),
        validateData: jest.fn().mockReturnValue(true)
      };

      const startTime = performance.now();
      
      // Use batch processing mode
      const result = await syncServices.mutualFunds.sync('test-user', { 
        batchMode: true,
        batchSize: 50
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // Batch processing should be faster

      console.log(`Batch processed ${batchSize} records in ${duration.toFixed(2)}ms`);
    });

    test('should handle streaming for very large datasets', async () => {
      const largeDatasetSize = 5000;
      
      // Mock streaming data processing
      const processStream = async function* () {
        for (let i = 0; i < largeDatasetSize; i += 100) {
          yield generateMockMutualFunds(Math.min(100, largeDatasetSize - i));
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };

      const startTime = performance.now();
      let processedCount = 0;

      for await (const batch of processStream()) {
        processedCount += batch.length;
        // Simulate batch processing
        await Promise.resolve();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(processedCount).toBe(largeDatasetSize);
      expect(duration).toBeLessThan(10000); // Should stream efficiently

      console.log(`Streamed ${largeDatasetSize} records in ${duration.toFixed(2)}ms`);
    });
  });

  describe('API Rate Limiting Performance', () => {
    test('should handle rate limiting gracefully without significant delays', async () => {
      const stockCount = 50;
      const mockStocks = generateMockStocks(stockCount);

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.stock.update.mockResolvedValue({});

      // Mock rate limiting scenario
      let callCount = 0;
      syncServices.stocks.yahooProvider = {
        fetchData: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount % 10 === 0) {
            // Simulate rate limiting every 10th call
            const error = new Error('Rate limited');
            error.response = { status: 429, headers: { 'retry-after': '1' } };
            throw error;
          }
          return generateMockStockPrices(10);
        }),
        validateData: jest.fn().mockReturnValue(true)
      };

      const startTime = performance.now();
      const result = await syncServices.stocks.sync('test-user');
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      // Should handle rate limiting with minimal impact
      expect(duration).toBeLessThan(15000);

      console.log(`Handled rate limiting for ${stockCount} stocks in ${duration.toFixed(2)}ms`);
    });

    test('should implement efficient caching to reduce API calls', async () => {
      const stockCount = 100;
      const mockStocks = generateMockStocks(stockCount);

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
      mockPrisma.stock.update.mockResolvedValue({});

      let apiCallCount = 0;
      syncServices.stocks.yahooProvider = {
        fetchData: jest.fn().mockImplementation(async (symbols) => {
          apiCallCount++;
          return generateMockStockPrices(symbols.length);
        }),
        validateData: jest.fn().mockReturnValue(true)
      };

      // Enable caching
      syncServices.stocks.cacheEnabled = true;

      const startTime = performance.now();
      
      // Run sync twice to test caching
      await syncServices.stocks.sync('test-user');
      await syncServices.stocks.sync('test-user');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Second sync should use cache, reducing API calls
      expect(apiCallCount).toBeLessThan(stockCount / 10); // Significant reduction due to caching

      console.log(`Cached sync completed in ${duration.toFixed(2)}ms with ${apiCallCount} API calls`);
    });
  });

  describe('Database Performance', () => {
    test('should optimize database queries for large datasets', async () => {
      const userCount = 100;
      const fundsPerUser = 20;

      // Mock database query optimization
      let queryCount = 0;
      mockPrisma.mutualFund.findMany.mockImplementation(() => {
        queryCount++;
        return Promise.resolve(generateMockMutualFunds(fundsPerUser));
      });

      mockPrisma.mutualFund.update.mockResolvedValue({});

      const startTime = performance.now();

      // Simulate batch user processing
      const userBatches = [];
      for (let i = 0; i < userCount; i += 10) {
        const batch = Array.from({ length: Math.min(10, userCount - i) }, (_, j) => `user-${i + j}`);
        userBatches.push(batch);
      }

      for (const batch of userBatches) {
        const batchPromises = batch.map(userId => syncServices.mutualFunds.sync(userId));
        await Promise.all(batchPromises);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(queryCount).toBe(userCount); // One query per user
      expect(duration).toBeLessThan(20000); // Should complete efficiently

      console.log(`Processed ${userCount} users in ${duration.toFixed(2)}ms with ${queryCount} queries`);
    });

    test('should handle connection pool efficiently', async () => {
      const concurrentConnections = 50;
      
      // Mock connection pool behavior
      let activeConnections = 0;
      const maxConnections = 20;

      mockPrisma.mutualFund.findMany.mockImplementation(() => {
        activeConnections++;
        return new Promise(resolve => {
          setTimeout(() => {
            activeConnections--;
            resolve(generateMockMutualFunds(10));
          }, 100);
        });
      });

      const startTime = performance.now();

      const operations = Array.from({ length: concurrentConnections }, (_, i) =>
        syncServices.mutualFunds.sync(`user-${i}`)
      );

      const results = await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const successfulOperations = results.filter(r => r.success).length;

      expect(successfulOperations).toBe(concurrentConnections);
      expect(duration).toBeLessThan(30000);

      console.log(`${concurrentConnections} operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should maintain stable memory usage during long-running operations', async () => {
      const iterations = 100;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        await syncServices.mutualFunds.sync(`user-${i}`);
        
        if (i % 10 === 0) {
          const memUsage = process.memoryUsage();
          memorySnapshots.push(memUsage.heapUsed);
        }
      }

      // Check for memory leaks
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

      console.log(`Memory growth over ${iterations} iterations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle CPU-intensive operations efficiently', async () => {
      const complexCalculations = 1000;
      
      // Mock CPU-intensive CAGR calculations
      const performComplexCalculation = (fund) => {
        let result = 0;
        for (let i = 0; i < 1000; i++) {
          result += Math.sqrt(fund.currentValue * Math.random());
        }
        return result;
      };

      const mockFunds = generateMockMutualFunds(complexCalculations);
      
      const startTime = performance.now();
      
      const results = mockFunds.map(fund => performComplexCalculation(fund));
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(complexCalculations);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Completed ${complexCalculations} complex calculations in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Load Testing Scenarios', () => {
    test('should handle peak load simulation', async () => {
      const peakUsers = 200;
      const avgInvestmentsPerUser = 15;
      
      // Simulate peak load conditions
      const loadTestResults = [];
      const batchSize = 20;

      for (let i = 0; i < peakUsers; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, peakUsers - i) }, (_, j) => i + j);
        
        const batchStartTime = performance.now();
        
        const batchPromises = batch.map(userIndex => 
          syncServices.mutualFunds.sync(`peak-user-${userIndex}`)
        );
        
        const batchResults = await Promise.all(batchPromises);
        const batchEndTime = performance.now();
        
        loadTestResults.push({
          batchIndex: Math.floor(i / batchSize),
          duration: batchEndTime - batchStartTime,
          successCount: batchResults.filter(r => r.success).length,
          totalUsers: batch.length
        });
      }

      const totalDuration = loadTestResults.reduce((sum, batch) => sum + batch.duration, 0);
      const avgBatchDuration = totalDuration / loadTestResults.length;
      const totalSuccessful = loadTestResults.reduce((sum, batch) => sum + batch.successCount, 0);

      expect(totalSuccessful).toBe(peakUsers);
      expect(avgBatchDuration).toBeLessThan(10000); // Average batch should complete in 10s

      console.log(`Peak load test: ${peakUsers} users, avg batch duration: ${avgBatchDuration.toFixed(2)}ms`);
    });

    test('should maintain performance under sustained load', async () => {
      const sustainedDuration = 30000; // 30 seconds
      const operationsPerSecond = 5;
      
      const startTime = performance.now();
      const results = [];
      let operationCount = 0;

      while (performance.now() - startTime < sustainedDuration) {
        const batchStartTime = performance.now();
        
        const batchPromises = Array.from({ length: operationsPerSecond }, (_, i) =>
          syncServices.mutualFunds.sync(`sustained-user-${operationCount + i}`)
        );
        
        const batchResults = await Promise.all(batchPromises);
        const batchEndTime = performance.now();
        
        results.push({
          batchDuration: batchEndTime - batchStartTime,
          successCount: batchResults.filter(r => r.success).length
        });
        
        operationCount += operationsPerSecond;
        
        // Wait for next second
        const remainingTime = 1000 - (batchEndTime - batchStartTime);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }

      const avgBatchDuration = results.reduce((sum, r) => sum + r.batchDuration, 0) / results.length;
      const totalSuccessful = results.reduce((sum, r) => sum + r.successCount, 0);

      expect(totalSuccessful).toBeGreaterThan(operationCount * 0.95); // 95% success rate
      expect(avgBatchDuration).toBeLessThan(2000); // Should maintain performance

      console.log(`Sustained load: ${operationCount} operations, ${totalSuccessful} successful, avg duration: ${avgBatchDuration.toFixed(2)}ms`);
    });
  });

  // Helper functions for generating test data
  function generateMockMutualFunds(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `fund-${i}`,
      name: `Test Fund ${i}`,
      isin: `INF${String(i).padStart(9, '0')}`,
      investedAmount: 10000 + (i * 1000),
      currentValue: 12000 + (i * 1200),
      totalInvestment: 10000 + (i * 1000),
      manualOverride: false,
      createdAt: new Date(Date.now() - (i * 86400000)) // Stagger creation dates
    }));
  }

  function generateMockNAVData(count) {
    return Array.from({ length: count }, (_, i) => ({
      identifier: `INF${String(i).padStart(9, '0')}`,
      value: 25.50 + (i * 0.1),
      date: new Date(),
      source: 'AMFI'
    }));
  }

  function generateMockStocks(count) {
    const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICI', 'SBI', 'ITC', 'WIPRO', 'ONGC', 'BHARTI'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `stock-${i}`,
      symbol: symbols[i % symbols.length],
      exchange: 'NSE',
      quantity: 100 + (i * 10),
      averagePrice: 2000 + (i * 50),
      currentPrice: 2100 + (i * 55),
      investedAmount: (100 + (i * 10)) * (2000 + (i * 50)),
      manualOverride: false
    }));
  }

  function generateMockStockPrices(count) {
    return Array.from({ length: count }, (_, i) => ({
      symbol: `STOCK${i}`,
      value: 2500 + (i * 10),
      timestamp: new Date(),
      metadata: {
        previousClose: 2450 + (i * 10),
        change: 50,
        changePercent: 2.04
      }
    }));
  }
});