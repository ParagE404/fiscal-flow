const { performance } = require('perf_hooks');
const cluster = require('cluster');
const os = require('os');
const EventEmitter = require('events');

// Load testing utilities
class LoadTestRunner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxConcurrency: options.maxConcurrency || 50,
      duration: options.duration || 60000, // 1 minute
      rampUpTime: options.rampUpTime || 10000, // 10 seconds
      rampDownTime: options.rampDownTime || 5000, // 5 seconds
      ...options
    };
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: [],
      responseTimePercentiles: {}
    };
    
    this.responseTimes = [];
    this.isRunning = false;
  }

  async runLoadTest(testFunction) {
    this.isRunning = true;
    const startTime = performance.now();
    
    console.log(`Starting load test with ${this.options.maxConcurrency} max concurrent users for ${this.options.duration}ms`);
    
    // Ramp up phase
    await this.rampUp(testFunction);
    
    // Sustained load phase
    await this.sustainedLoad(testFunction);
    
    // Ramp down phase
    await this.rampDown();
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    this.calculateMetrics(totalDuration);
    this.isRunning = false;
    
    return this.metrics;
  }

  async rampUp(testFunction) {
    const rampUpSteps = 10;
    const stepDuration = this.options.rampUpTime / rampUpSteps;
    const concurrencyStep = Math.floor(this.options.maxConcurrency / rampUpSteps);
    
    for (let step = 1; step <= rampUpSteps; step++) {
      const currentConcurrency = Math.min(step * concurrencyStep, this.options.maxConcurrency);
      console.log(`Ramp up step ${step}: ${currentConcurrency} concurrent users`);
      
      await this.runConcurrentRequests(testFunction, currentConcurrency, stepDuration);
      
      if (!this.isRunning) break;
    }
  }

  async sustainedLoad(testFunction) {
    const sustainedDuration = this.options.duration - this.options.rampUpTime - this.options.rampDownTime;
    console.log(`Sustained load: ${this.options.maxConcurrency} concurrent users for ${sustainedDuration}ms`);
    
    await this.runConcurrentRequests(testFunction, this.options.maxConcurrency, sustainedDuration);
  }

  async rampDown() {
    console.log('Ramping down...');
    await new Promise(resolve => setTimeout(resolve, this.options.rampDownTime));
  }

  async runConcurrentRequests(testFunction, concurrency, duration) {
    const startTime = performance.now();
    const activeRequests = new Set();
    
    const makeRequest = async () => {
      const requestId = Math.random().toString(36).substr(2, 9);
      activeRequests.add(requestId);
      
      try {
        const requestStart = performance.now();
        await testFunction();
        const requestEnd = performance.now();
        
        const responseTime = requestEnd - requestStart;
        this.recordSuccess(responseTime);
        
      } catch (error) {
        this.recordFailure(error);
      } finally {
        activeRequests.delete(requestId);
      }
    };

    // Start initial batch of requests
    for (let i = 0; i < concurrency; i++) {
      makeRequest();
    }

    // Keep spawning new requests to maintain concurrency
    const interval = setInterval(() => {
      if (performance.now() - startTime >= duration) {
        clearInterval(interval);
        return;
      }

      while (activeRequests.size < concurrency && this.isRunning) {
        makeRequest();
      }
    }, 100);

    // Wait for duration to complete
    await new Promise(resolve => setTimeout(resolve, duration));
    clearInterval(interval);

    // Wait for remaining requests to complete
    while (activeRequests.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  recordSuccess(responseTime) {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.responseTimes.push(responseTime);
    
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    
    this.emit('success', { responseTime });
  }

  recordFailure(error) {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.errors.push({
      message: error.message,
      timestamp: new Date(),
      stack: error.stack
    });
    
    this.emit('failure', { error });
  }

  calculateMetrics(totalDuration) {
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      
      // Calculate percentiles
      const sortedTimes = this.responseTimes.sort((a, b) => a - b);
      this.metrics.responseTimePercentiles = {
        p50: this.getPercentile(sortedTimes, 50),
        p90: this.getPercentile(sortedTimes, 90),
        p95: this.getPercentile(sortedTimes, 95),
        p99: this.getPercentile(sortedTimes, 99)
      };
    }
    
    this.metrics.requestsPerSecond = (this.metrics.totalRequests / totalDuration) * 1000;
    this.metrics.successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
  }

  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }
}

// Mock sync services for load testing
const mockSyncService = {
  sync: jest.fn(),
  syncSingle: jest.fn()
};

describe('Load Testing for Sync Services', () => {
  let loadTestRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    loadTestRunner = new LoadTestRunner({
      maxConcurrency: 20,
      duration: 10000, // 10 seconds for tests
      rampUpTime: 2000,
      rampDownTime: 1000
    });
  });

  describe('Mutual Fund Sync Load Tests', () => {
    test('should handle high concurrency mutual fund sync requests', async () => {
      // Mock successful sync responses with realistic timing
      mockSyncService.sync.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            recordsUpdated: Math.floor(Math.random() * 50) + 10,
            duration: Math.random() * 2000 + 500
          }), Math.random() * 1000 + 200);
        })
      );

      const testFunction = async () => {
        const userId = `user-${Math.floor(Math.random() * 1000)}`;
        return await mockSyncService.sync(userId);
      };

      const results = await loadTestRunner.runLoadTest(testFunction);

      expect(results.totalRequests).toBeGreaterThan(50);
      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(2000);
      expect(results.requestsPerSecond).toBeGreaterThan(5);

      console.log('Mutual Fund Sync Load Test Results:', {
        totalRequests: results.totalRequests,
        successRate: `${results.successRate.toFixed(2)}%`,
        avgResponseTime: `${results.averageResponseTime.toFixed(2)}ms`,
        requestsPerSecond: results.requestsPerSecond.toFixed(2),
        p95ResponseTime: `${results.responseTimePercentiles.p95.toFixed(2)}ms`
      });
    });

    test('should handle error scenarios gracefully under load', async () => {
      // Mock mixed success/failure responses
      mockSyncService.sync.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => {
            if (Math.random() < 0.1) { // 10% failure rate
              reject(new Error('Simulated sync failure'));
            } else {
              resolve({ success: true, recordsUpdated: 25 });
            }
          }, Math.random() * 500 + 100);
        })
      );

      const testFunction = async () => {
        const userId = `user-${Math.floor(Math.random() * 100)}`;
        return await mockSyncService.sync(userId);
      };

      const results = await loadTestRunner.runLoadTest(testFunction);

      expect(results.totalRequests).toBeGreaterThan(30);
      expect(results.successRate).toBeGreaterThan(85); // Should handle 10% failure rate
      expect(results.failedRequests).toBeGreaterThan(0);
      expect(results.errors.length).toBe(results.failedRequests);

      console.log('Error Handling Load Test Results:', {
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        successRate: `${results.successRate.toFixed(2)}%`
      });
    });
  });

  describe('Stock Sync Load Tests', () => {
    test('should handle stock price sync under varying load conditions', async () => {
      // Mock stock sync with rate limiting simulation
      let requestCount = 0;
      mockSyncService.sync.mockImplementation(() => 
        new Promise((resolve, reject) => {
          requestCount++;
          
          // Simulate rate limiting every 50 requests
          if (requestCount % 50 === 0) {
            setTimeout(() => reject(new Error('Rate limit exceeded')), 100);
          } else {
            setTimeout(() => resolve({
              success: true,
              recordsUpdated: Math.floor(Math.random() * 20) + 5,
              source: 'yahoo_finance'
            }), Math.random() * 800 + 200);
          }
        })
      );

      const testFunction = async () => {
        const userId = `stock-user-${Math.floor(Math.random() * 50)}`;
        return await mockSyncService.sync(userId);
      };

      const results = await loadTestRunner.runLoadTest(testFunction);

      expect(results.totalRequests).toBeGreaterThan(40);
      expect(results.successRate).toBeGreaterThan(90);
      
      // Should have some rate limiting errors
      const rateLimitErrors = results.errors.filter(e => 
        e.message.includes('Rate limit exceeded')
      );
      expect(rateLimitErrors.length).toBeGreaterThan(0);

      console.log('Stock Sync Load Test Results:', {
        totalRequests: results.totalRequests,
        successRate: `${results.successRate.toFixed(2)}%`,
        rateLimitErrors: rateLimitErrors.length,
        p90ResponseTime: `${results.responseTimePercentiles.p90.toFixed(2)}ms`
      });
    });
  });

  describe('Mixed Workload Load Tests', () => {
    test('should handle mixed sync operations efficiently', async () => {
      const syncTypes = ['mutual_funds', 'stocks', 'epf'];
      
      // Mock different response times for different sync types
      mockSyncService.sync.mockImplementation((userId, type) => 
        new Promise(resolve => {
          let baseTime = 500;
          let recordsUpdated = 10;
          
          switch (type) {
            case 'mutual_funds':
              baseTime = 800;
              recordsUpdated = Math.floor(Math.random() * 30) + 10;
              break;
            case 'stocks':
              baseTime = 400;
              recordsUpdated = Math.floor(Math.random() * 15) + 5;
              break;
            case 'epf':
              baseTime = 1200;
              recordsUpdated = Math.floor(Math.random() * 5) + 1;
              break;
          }
          
          setTimeout(() => resolve({
            success: true,
            recordsUpdated,
            syncType: type
          }), baseTime + Math.random() * 300);
        })
      );

      const testFunction = async () => {
        const userId = `mixed-user-${Math.floor(Math.random() * 100)}`;
        const syncType = syncTypes[Math.floor(Math.random() * syncTypes.length)];
        return await mockSyncService.sync(userId, syncType);
      };

      const results = await loadTestRunner.runLoadTest(testFunction);

      expect(results.totalRequests).toBeGreaterThan(30);
      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(1500);

      console.log('Mixed Workload Load Test Results:', {
        totalRequests: results.totalRequests,
        successRate: `${results.successRate.toFixed(2)}%`,
        avgResponseTime: `${results.averageResponseTime.toFixed(2)}ms`,
        responseTimePercentiles: {
          p50: `${results.responseTimePercentiles.p50.toFixed(2)}ms`,
          p95: `${results.responseTimePercentiles.p95.toFixed(2)}ms`,
          p99: `${results.responseTimePercentiles.p99.toFixed(2)}ms`
        }
      });
    });
  });

  describe('Stress Testing', () => {
    test('should identify breaking point under extreme load', async () => {
      const stressTestRunner = new LoadTestRunner({
        maxConcurrency: 100, // High concurrency
        duration: 15000, // 15 seconds
        rampUpTime: 3000,
        rampDownTime: 2000
      });

      // Mock service that degrades under high load
      let activeRequests = 0;
      mockSyncService.sync.mockImplementation(() => 
        new Promise((resolve, reject) => {
          activeRequests++;
          
          // Simulate degradation when too many concurrent requests
          const responseTime = activeRequests > 50 ? 
            Math.random() * 5000 + 2000 : // Slow response under high load
            Math.random() * 1000 + 300;   // Normal response time
          
          setTimeout(() => {
            activeRequests--;
            
            // Higher failure rate under stress
            if (activeRequests > 75 && Math.random() < 0.2) {
              reject(new Error('Service overloaded'));
            } else {
              resolve({ success: true, recordsUpdated: 15 });
            }
          }, responseTime);
        })
      );

      const testFunction = async () => {
        const userId = `stress-user-${Math.floor(Math.random() * 200)}`;
        return await mockSyncService.sync(userId);
      };

      const results = await stressTestRunner.runLoadTest(testFunction);

      expect(results.totalRequests).toBeGreaterThan(100);
      
      // Under stress, we expect some degradation
      console.log('Stress Test Results:', {
        totalRequests: results.totalRequests,
        successRate: `${results.successRate.toFixed(2)}%`,
        avgResponseTime: `${results.averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${results.maxResponseTime.toFixed(2)}ms`,
        requestsPerSecond: results.requestsPerSecond.toFixed(2),
        errorCount: results.failedRequests
      });

      // Identify performance degradation points
      if (results.averageResponseTime > 2000) {
        console.warn('Performance degradation detected under high load');
      }
      
      if (results.successRate < 90) {
        console.warn('High failure rate detected under stress');
      }
    });

    test('should recover gracefully after stress period', async () => {
      let isStressPeriod = false;
      
      // Mock service that has temporary stress
      mockSyncService.sync.mockImplementation(() => 
        new Promise((resolve, reject) => {
          const responseTime = isStressPeriod ? 
            Math.random() * 3000 + 1000 : // Slow during stress
            Math.random() * 500 + 200;    // Fast during normal operation
          
          setTimeout(() => {
            if (isStressPeriod && Math.random() < 0.15) {
              reject(new Error('Temporary overload'));
            } else {
              resolve({ success: true, recordsUpdated: 20 });
            }
          }, responseTime);
        })
      );

      const testFunction = async () => {
        const userId = `recovery-user-${Math.floor(Math.random() * 50)}`;
        return await mockSyncService.sync(userId);
      };

      // Phase 1: Normal operation
      console.log('Phase 1: Normal operation');
      const normalResults = await new LoadTestRunner({
        maxConcurrency: 10,
        duration: 5000,
        rampUpTime: 1000,
        rampDownTime: 500
      }).runLoadTest(testFunction);

      // Phase 2: Stress period
      console.log('Phase 2: Stress period');
      isStressPeriod = true;
      const stressResults = await new LoadTestRunner({
        maxConcurrency: 30,
        duration: 5000,
        rampUpTime: 1000,
        rampDownTime: 500
      }).runLoadTest(testFunction);

      // Phase 3: Recovery period
      console.log('Phase 3: Recovery period');
      isStressPeriod = false;
      const recoveryResults = await new LoadTestRunner({
        maxConcurrency: 10,
        duration: 5000,
        rampUpTime: 1000,
        rampDownTime: 500
      }).runLoadTest(testFunction);

      // Verify recovery
      expect(recoveryResults.successRate).toBeGreaterThan(stressResults.successRate);
      expect(recoveryResults.averageResponseTime).toBeLessThan(stressResults.averageResponseTime);

      console.log('Recovery Test Results:', {
        normal: {
          successRate: `${normalResults.successRate.toFixed(2)}%`,
          avgResponseTime: `${normalResults.averageResponseTime.toFixed(2)}ms`
        },
        stress: {
          successRate: `${stressResults.successRate.toFixed(2)}%`,
          avgResponseTime: `${stressResults.averageResponseTime.toFixed(2)}ms`
        },
        recovery: {
          successRate: `${recoveryResults.successRate.toFixed(2)}%`,
          avgResponseTime: `${recoveryResults.averageResponseTime.toFixed(2)}ms`
        }
      });
    });
  });

  describe('Resource Utilization Tests', () => {
    test('should monitor memory usage during load test', async () => {
      const memorySnapshots = [];
      
      mockSyncService.sync.mockImplementation(() => 
        new Promise(resolve => {
          // Simulate some memory allocation
          const largeArray = new Array(1000).fill(Math.random());
          
          setTimeout(() => {
            resolve({ success: true, recordsUpdated: 10, data: largeArray });
          }, Math.random() * 500 + 100);
        })
      );

      const testFunction = async () => {
        const userId = `memory-user-${Math.floor(Math.random() * 20)}`;
        return await mockSyncService.sync(userId);
      };

      // Monitor memory during load test
      const memoryMonitor = setInterval(() => {
        const memUsage = process.memoryUsage();
        memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        });
      }, 1000);

      const results = await loadTestRunner.runLoadTest(testFunction);
      clearInterval(memoryMonitor);

      // Analyze memory usage
      const initialMemory = memorySnapshots[0]?.heapUsed || 0;
      const peakMemory = Math.max(...memorySnapshots.map(s => s.heapUsed));
      const finalMemory = memorySnapshots[memorySnapshots.length - 1]?.heapUsed || 0;

      const memoryGrowth = finalMemory - initialMemory;
      const peakMemoryIncrease = peakMemory - initialMemory;

      console.log('Memory Usage Analysis:', {
        initialMemory: `${(initialMemory / 1024 / 1024).toFixed(2)}MB`,
        peakMemory: `${(peakMemory / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
        memoryGrowth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        peakIncrease: `${(peakMemoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        totalRequests: results.totalRequests
      });

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      expect(results.successRate).toBeGreaterThan(90);
    });
  });
});