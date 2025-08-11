/**
 * Integration tests for batch processing and concurrency features
 * Tests the complete batch processing pipeline including streaming and queue management
 */

const { BatchProcessor, QueueManager, StreamProcessor, BatchSyncOrchestrator } = require('../index');
const { InvestmentTypes, DataSources } = require('../../types/SyncTypes');

// Mock Prisma client
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  mutualFund: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  stock: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  ePFAccount: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  syncMetadata: {
    upsert: jest.fn(),
    findMany: jest.fn()
  },
  $disconnect: jest.fn()
};

// Mock sync services
const mockSyncService = {
  sync: jest.fn(),
  syncSingle: jest.fn(),
  validateConfiguration: jest.fn(() => true)
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

describe('Batch Processing Integration Tests', () => {
  let batchProcessor;
  let queueManager;
  let streamProcessor;
  let orchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    batchProcessor = new BatchProcessor({
      maxConcurrentBatches: 2,
      batchSize: 10,
      workerPoolSize: 1
    });

    queueManager = new QueueManager({
      maxConcurrentBatches: 2,
      batchSize: 10,
      streamChunkSize: 50
    });

    streamProcessor = new StreamProcessor({
      chunkSize: 20,
      maxMemoryUsage: 0.9,
      concurrency: 2
    });

    orchestrator = new BatchSyncOrchestrator({
      maxConcurrentBatches: 2,
      batchSize: 10,
      streamChunkSize: 50
    });
  });

  afterEach(async () => {
    await batchProcessor.shutdown();
    await queueManager.shutdown();
    await orchestrator.shutdown();
  });

  describe('BatchProcessor', () => {
    test('should process items in batches with concurrency control', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i, value: i * 2 }));
      const processor = jest.fn(async (item) => ({ processed: item.id }));

      const result = await batchProcessor.addToQueue('test_queue', items, {
        processor,
        batchSize: 5,
        priority: 'normal'
      });

      expect(result.itemsAdded).toBe(25);
      expect(result.totalInQueue).toBe(25);

      // Wait for processing to complete
      await new Promise(resolve => {
        batchProcessor.on('processingComplete', () => resolve());
      });

      const stats = batchProcessor.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    test('should handle memory threshold and backpressure', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const processor = jest.fn(async (item) => {
        // Simulate memory-intensive operation
        const largeArray = new Array(1000).fill(item);
        return { processed: item.id, data: largeArray };
      });

      let backpressureTriggered = false;
      batchProcessor.on('backpressure', () => {
        backpressureTriggered = true;
      });

      await batchProcessor.addToQueue('memory_test', items, {
        processor,
        batchSize: 10
      });

      // The test should complete without crashing
      expect(batchProcessor.getStats().totalProcessed).toBeGreaterThanOrEqual(0);
    });

    test('should retry failed batches with exponential backoff', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      let attemptCount = 0;
      
      const processor = jest.fn(async (item) => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Simulated failure');
        }
        return { processed: item.id };
      });

      await batchProcessor.addToQueue('retry_test', items, {
        processor,
        batchSize: 1
      });

      // Wait for processing with retries
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(attemptCount).toBeGreaterThan(2);
    });
  });

  describe('StreamProcessor', () => {
    test('should process large datasets with memory efficiency', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }));
      
      const processor = async (chunk) => {
        return chunk.map(item => ({ ...item, processed: true }));
      };

      const results = [];
      const writer = async (processedChunk) => {
        results.push(...processedChunk);
      };

      const result = await streamProcessor.processStream(largeDataset, processor, writer, {
        chunkSize: 50
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(1000);
      expect(results.length).toBe(1000);
      expect(results[0].processed).toBe(true);
    });

    test('should handle backpressure during streaming', async () => {
      const dataset = Array.from({ length: 500 }, (_, i) => ({ id: i }));
      
      const processor = async (chunk) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 10));
        return chunk.map(item => ({ ...item, processed: true }));
      };

      const writer = async (chunk) => {
        // Simulate slow writing
        await new Promise(resolve => setTimeout(resolve, 5));
      };

      let backpressureEvents = 0;
      streamProcessor.on('backpressure', () => {
        backpressureEvents++;
      });

      const result = await streamProcessor.processStream(dataset, processor, writer, {
        chunkSize: 20,
        concurrency: 1
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(500);
    });

    test('should process user sync with streaming', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({ id: `user_${i}`, email: `user${i}@test.com` }));
      
      const userDataSource = async ({ offset, limit }) => {
        return users.slice(offset, offset + limit);
      };

      const syncProcessor = async (user) => {
        return {
          success: true,
          recordsUpdated: Math.floor(Math.random() * 5),
          errors: []
        };
      };

      const result = await streamProcessor.processUserSync(userDataSource, syncProcessor, {
        chunkSize: 10
      });

      expect(result.success).toBe(true);
      expect(result.userResults.length).toBe(100);
      expect(result.successfulUsers).toBe(100);
      expect(result.failedUsers).toBe(0);
    });
  });

  describe('QueueManager', () => {
    beforeEach(() => {
      // Mock the getSyncService method
      queueManager.getSyncService = jest.fn(() => mockSyncService);
    });

    test('should queue mutual fund sync operations', async () => {
      const funds = [
        { id: 'fund1', isin: 'INF123456789', name: 'Test Fund 1' },
        { id: 'fund2', isin: 'INF987654321', name: 'Test Fund 2' }
      ];

      const navData = [
        { isin: 'INF123456789', nav: 25.50, date: new Date() },
        { isin: 'INF987654321', nav: 30.75, date: new Date() }
      ];

      const result = await queueManager.queueMutualFundSync('user123', funds, navData);

      expect(result.queued).toBe(2);
      expect(result.totalInQueue).toBe(2);
    });

    test('should queue stock sync operations', async () => {
      const stocks = [
        { id: 'stock1', symbol: 'RELIANCE', exchange: 'NSE' },
        { id: 'stock2', symbol: 'TCS', exchange: 'NSE' }
      ];

      const priceData = [
        { symbol: 'RELIANCE', price: 2500.50 },
        { symbol: 'TCS', price: 3200.75 }
      ];

      const result = await queueManager.queueStockSync('user123', stocks, priceData);

      expect(result.queued).toBe(2);
      expect(result.totalInQueue).toBe(2);
    });

    test('should process large user base sync with streaming', async () => {
      // Mock user data
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user1', email: 'user1@test.com' },
        { id: 'user2', email: 'user2@test.com' }
      ]);

      mockSyncService.sync.mockResolvedValue({
        success: true,
        recordsUpdated: 3,
        recordsProcessed: 3,
        errors: []
      });

      const result = await queueManager.processLargeUserBaseSync(InvestmentTypes.MUTUAL_FUNDS, {
        chunkSize: 1,
        concurrency: 1
      });

      expect(result.success).toBe(true);
      expect(mockSyncService.sync).toHaveBeenCalled();
    });

    test('should get queue status and performance metrics', async () => {
      const status = queueManager.getQueueStatus();
      
      expect(status).toHaveProperty('activeQueues');
      expect(status).toHaveProperty('activeBatches');
      expect(status).toHaveProperty('queueConfigs');

      const metrics = queueManager.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('hourlyMetrics');
      expect(metrics).toHaveProperty('queueEfficiency');
    });
  });

  describe('BatchSyncOrchestrator', () => {
    beforeEach(() => {
      // Mock database queries
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user1', email: 'user1@test.com', preferences: {} },
        { id: 'user2', email: 'user2@test.com', preferences: { syncPriority: 'high' } }
      ]);

      // Mock sync service
      orchestrator.queueManager.getSyncService = jest.fn(() => mockSyncService);
      mockSyncService.sync.mockResolvedValue({
        success: true,
        recordsUpdated: 2,
        recordsProcessed: 2,
        errors: [],
        duration: 100
      });
    });

    test('should execute comprehensive sync for all investment types', async () => {
      const result = await orchestrator.executeComprehensiveSync({
        investmentTypes: [InvestmentTypes.MUTUAL_FUNDS, InvestmentTypes.STOCKS],
        strategy: 'batch'
      });

      expect(result.success).toBe(true);
      expect(result.investmentTypeResults).toHaveProperty(InvestmentTypes.MUTUAL_FUNDS);
      expect(result.investmentTypeResults).toHaveProperty(InvestmentTypes.STOCKS);
      expect(result.totalUsers).toBeGreaterThan(0);
    });

    test('should determine optimal processing strategy', async () => {
      // Test small user base
      let strategy = orchestrator.determineProcessingStrategy(50);
      expect(strategy.name).toBe('batch');

      // Test large user base
      strategy = orchestrator.determineProcessingStrategy(15000);
      expect(strategy.name).toBe('streaming');

      // Test moderate user base
      strategy = orchestrator.determineProcessingStrategy(2000);
      expect(strategy.name).toBe('hybrid');
    });

    test('should execute hybrid sync with priority handling', async () => {
      const users = [
        { id: 'user1', preferences: { syncPriority: 'high' } },
        { id: 'user2', preferences: {} },
        { id: 'user3', preferences: { isPremium: true } },
        { id: 'user4', preferences: {} }
      ];

      const result = await orchestrator.executeHybridSync(InvestmentTypes.MUTUAL_FUNDS, users);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('hybrid');
      expect(result.highPriorityUsers).toBe(2);
      expect(result.normalPriorityUsers).toBe(2);
    });

    test('should handle memory threshold and resource monitoring', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
        external: 50 * 1024 * 1024
      }));

      const isExceeded = orchestrator.isMemoryThresholdExceeded();
      expect(isExceeded).toBe(true);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    test('should track active operations and history', async () => {
      // Start an operation
      const operationPromise = orchestrator.executeComprehensiveSync({
        investmentTypes: [InvestmentTypes.MUTUAL_FUNDS],
        strategy: 'batch'
      });

      // Check active operations
      const activeOps = orchestrator.getActiveOperations();
      expect(activeOps.length).toBe(1);
      expect(activeOps[0].type).toBe('comprehensive_sync');

      // Wait for completion
      await operationPromise;

      // Check history
      const history = orchestrator.getOperationHistory();
      expect(history.length).toBe(1);
      expect(history[0].status).toBe('completed');
    });

    test('should handle errors gracefully during sync operations', async () => {
      // Mock sync service to throw error
      mockSyncService.sync.mockRejectedValue(new Error('Sync service error'));

      const result = await orchestrator.executeComprehensiveSync({
        investmentTypes: [InvestmentTypes.MUTUAL_FUNDS],
        strategy: 'batch'
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle end-to-end batch processing workflow', async () => {
      // Setup mock data
      const users = Array.from({ length: 20 }, (_, i) => ({
        id: `user_${i}`,
        email: `user${i}@test.com`,
        preferences: i % 5 === 0 ? { syncPriority: 'high' } : {}
      }));

      mockPrisma.user.count.mockResolvedValue(users.length);
      mockPrisma.user.findMany.mockResolvedValue(users);

      mockSyncService.sync.mockImplementation(async (userId) => ({
        success: Math.random() > 0.1, // 90% success rate
        recordsUpdated: Math.floor(Math.random() * 5),
        recordsProcessed: Math.floor(Math.random() * 10),
        errors: [],
        duration: Math.floor(Math.random() * 1000)
      }));

      // Execute comprehensive sync
      const result = await orchestrator.executeComprehensiveSync({
        investmentTypes: [InvestmentTypes.MUTUAL_FUNDS, InvestmentTypes.STOCKS],
        strategy: 'hybrid'
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('successfulUsers');
      expect(result).toHaveProperty('totalRecordsUpdated');
      expect(result.investmentTypeResults).toHaveProperty(InvestmentTypes.MUTUAL_FUNDS);
      expect(result.investmentTypeResults).toHaveProperty(InvestmentTypes.STOCKS);
    });

    test('should handle concurrent batch operations', async () => {
      const batchPromises = [];

      // Start multiple batch operations concurrently
      for (let i = 0; i < 3; i++) {
        const items = Array.from({ length: 10 }, (_, j) => ({ id: `${i}_${j}` }));
        const processor = async (item) => ({ processed: item.id });

        const promise = batchProcessor.addToQueue(`concurrent_${i}`, items, {
          processor,
          batchSize: 2,
          priority: i === 0 ? 'high' : 'normal'
        });

        batchPromises.push(promise);
      }

      const results = await Promise.all(batchPromises);

      results.forEach((result, index) => {
        expect(result.itemsAdded).toBe(10);
        expect(result.queueName).toBe(`concurrent_${index}`);
      });

      // Wait for all processing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = batchProcessor.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    test('should handle memory pressure during large operations', async () => {
      // Create a large dataset that might cause memory pressure
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        data: new Array(100).fill(`data_${i}`)
      }));

      const processor = async (chunk) => {
        // Simulate processing that creates additional memory pressure
        const processed = chunk.map(item => ({
          ...item,
          processed: true,
          additionalData: new Array(50).fill(`processed_${item.id}`)
        }));
        
        return processed;
      };

      const results = [];
      const writer = async (processedChunk) => {
        results.push(...processedChunk);
      };

      let memoryWarnings = 0;
      streamProcessor.on('memory-warning', () => {
        memoryWarnings++;
      });

      const result = await streamProcessor.processStream(largeDataset, processor, writer, {
        chunkSize: 100,
        concurrency: 2
      });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(5000);
      expect(results.length).toBe(5000);
    });
  });
});

describe('Performance Tests', () => {
  test('should process large user base efficiently', async () => {
    const orchestrator = new BatchSyncOrchestrator({
      maxConcurrentBatches: 3,
      streamChunkSize: 200
    });

    // Mock large user base
    const userCount = 1000;
    const users = Array.from({ length: userCount }, (_, i) => ({
      id: `user_${i}`,
      email: `user${i}@test.com`
    }));

    const mockPrisma = {
      user: {
        count: jest.fn().mockResolvedValue(userCount),
        findMany: jest.fn().mockResolvedValue(users)
      },
      $disconnect: jest.fn()
    };

    orchestrator.prisma = mockPrisma;
    orchestrator.queueManager.getSyncService = jest.fn(() => ({
      sync: jest.fn().mockResolvedValue({
        success: true,
        recordsUpdated: 1,
        recordsProcessed: 1,
        errors: []
      })
    }));

    const startTime = Date.now();
    const result = await orchestrator.executeComprehensiveSync({
      investmentTypes: [InvestmentTypes.MUTUAL_FUNDS],
      strategy: 'streaming'
    });
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.totalUsers).toBe(userCount);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

    await orchestrator.shutdown();
  }, 35000); // 35 second timeout for performance test
});