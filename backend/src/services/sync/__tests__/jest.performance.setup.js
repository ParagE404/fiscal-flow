// Performance test setup
const { performance } = require('perf_hooks');

// Performance monitoring utilities
global.performanceUtils = {
  // Measure execution time of a function
  measureTime: async (fn, label = 'Operation') => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`${label} took ${duration.toFixed(2)}ms`);
    
    return {
      result,
      duration,
      start,
      end
    };
  },

  // Monitor memory usage during operation
  measureMemory: async (fn, label = 'Operation') => {
    const initialMemory = process.memoryUsage();
    const result = await fn();
    const finalMemory = process.memoryUsage();
    
    const memoryDiff = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };
    
    console.log(`${label} memory usage:`, {
      heapUsed: `${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memoryDiff.external / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(memoryDiff.rss / 1024 / 1024).toFixed(2)}MB`
    });
    
    return {
      result,
      initialMemory,
      finalMemory,
      memoryDiff
    };
  },

  // Measure both time and memory
  measurePerformance: async (fn, label = 'Operation') => {
    const start = performance.now();
    const initialMemory = process.memoryUsage();
    
    const result = await fn();
    
    const end = performance.now();
    const finalMemory = process.memoryUsage();
    
    const duration = end - start;
    const memoryDiff = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external,
      rss: finalMemory.rss - initialMemory.rss
    };
    
    console.log(`${label} performance:`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryIncrease: `${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`
    });
    
    return {
      result,
      duration,
      memoryDiff,
      initialMemory,
      finalMemory
    };
  },

  // Create performance benchmark
  benchmark: async (operations, iterations = 100, label = 'Benchmark') => {
    const results = [];
    
    console.log(`Starting ${label} with ${iterations} iterations...`);
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operations();
      const end = performance.now();
      results.push(end - start);
    }
    
    const stats = {
      iterations,
      total: results.reduce((a, b) => a + b, 0),
      average: results.reduce((a, b) => a + b, 0) / results.length,
      min: Math.min(...results),
      max: Math.max(...results),
      median: results.sort((a, b) => a - b)[Math.floor(results.length / 2)],
      p95: results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)],
      p99: results.sort((a, b) => a - b)[Math.floor(results.length * 0.99)]
    };
    
    console.log(`${label} results:`, {
      average: `${stats.average.toFixed(2)}ms`,
      min: `${stats.min.toFixed(2)}ms`,
      max: `${stats.max.toFixed(2)}ms`,
      median: `${stats.median.toFixed(2)}ms`,
      p95: `${stats.p95.toFixed(2)}ms`,
      p99: `${stats.p99.toFixed(2)}ms`
    });
    
    return stats;
  },

  // Monitor resource usage over time
  monitorResources: (intervalMs = 1000) => {
    const snapshots = [];
    let monitoring = true;
    
    const monitor = setInterval(() => {
      if (!monitoring) {
        clearInterval(monitor);
        return;
      }
      
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      snapshots.push({
        timestamp: Date.now(),
        memory: memUsage,
        cpu: cpuUsage
      });
    }, intervalMs);
    
    return {
      stop: () => {
        monitoring = false;
        clearInterval(monitor);
        return snapshots;
      },
      getSnapshots: () => snapshots
    };
  },

  // Generate test data for performance tests
  generateTestData: {
    mutualFunds: (count) => Array.from({ length: count }, (_, i) => ({
      id: `perf-fund-${i}`,
      name: `Performance Test Fund ${i}`,
      isin: `INF${String(i).padStart(9, '0')}`,
      investedAmount: 10000 + (i * 1000),
      currentValue: 12000 + (i * 1200),
      manualOverride: false
    })),

    stocks: (count) => {
      const symbols = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICI', 'SBI', 'ITC', 'WIPRO', 'ONGC', 'BHARTI'];
      return Array.from({ length: count }, (_, i) => ({
        id: `perf-stock-${i}`,
        symbol: symbols[i % symbols.length],
        exchange: 'NSE',
        quantity: 100 + (i * 10),
        averagePrice: 2000 + (i * 50),
        currentPrice: 2100 + (i * 55),
        manualOverride: false
      }));
    },

    epfAccounts: (count) => Array.from({ length: count }, (_, i) => ({
      id: `perf-epf-${i}`,
      uan: `${String(i).padStart(12, '0')}`,
      pfNumber: `PF${String(i).padStart(6, '0')}`,
      employerName: `Performance Test Company ${i}`,
      totalBalance: 500000 + (i * 50000),
      manualOverride: false
    })),

    navData: (count) => Array.from({ length: count }, (_, i) => ({
      identifier: `INF${String(i).padStart(9, '0')}`,
      value: 25.50 + (i * 0.1),
      date: new Date(),
      source: 'AMFI'
    })),

    stockPrices: (count) => Array.from({ length: count }, (_, i) => ({
      symbol: `STOCK${i}`,
      value: 2500 + (i * 10),
      timestamp: new Date(),
      metadata: {
        previousClose: 2450 + (i * 10),
        change: 50,
        changePercent: 2.04
      }
    }))
  },

  // Performance assertions
  assertPerformance: {
    responseTime: (duration, maxMs, operation = 'Operation') => {
      if (duration > maxMs) {
        throw new Error(`${operation} took ${duration.toFixed(2)}ms, expected less than ${maxMs}ms`);
      }
    },

    memoryUsage: (memoryIncrease, maxMB, operation = 'Operation') => {
      const increaseMB = memoryIncrease / 1024 / 1024;
      if (increaseMB > maxMB) {
        throw new Error(`${operation} used ${increaseMB.toFixed(2)}MB memory, expected less than ${maxMB}MB`);
      }
    },

    throughput: (operations, duration, minOpsPerSec, operation = 'Operation') => {
      const opsPerSec = (operations / duration) * 1000;
      if (opsPerSec < minOpsPerSec) {
        throw new Error(`${operation} achieved ${opsPerSec.toFixed(2)} ops/sec, expected at least ${minOpsPerSec} ops/sec`);
      }
    }
  }
};

// Performance test matchers
expect.extend({
  toCompleteWithin(received, maxDuration) {
    const pass = received <= maxDuration;
    if (pass) {
      return {
        message: () => `expected operation not to complete within ${maxDuration}ms, but it took ${received.toFixed(2)}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected operation to complete within ${maxDuration}ms, but it took ${received.toFixed(2)}ms`,
        pass: false,
      };
    }
  },

  toUseMemoryLessThan(received, maxMemoryMB) {
    const memoryMB = received / 1024 / 1024;
    const pass = memoryMB <= maxMemoryMB;
    if (pass) {
      return {
        message: () => `expected operation not to use less than ${maxMemoryMB}MB, but it used ${memoryMB.toFixed(2)}MB`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected operation to use less than ${maxMemoryMB}MB, but it used ${memoryMB.toFixed(2)}MB`,
        pass: false,
      };
    }
  },

  toHaveThroughputOf(received, minOpsPerSec) {
    const { operations, duration } = received;
    const opsPerSec = (operations / duration) * 1000;
    const pass = opsPerSec >= minOpsPerSec;
    
    if (pass) {
      return {
        message: () => `expected throughput not to be at least ${minOpsPerSec} ops/sec, but it was ${opsPerSec.toFixed(2)} ops/sec`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected throughput to be at least ${minOpsPerSec} ops/sec, but it was ${opsPerSec.toFixed(2)} ops/sec`,
        pass: false,
      };
    }
  }
});

// Set longer timeout for performance tests
jest.setTimeout(120000); // 2 minutes

// Suppress console output for performance tests unless explicitly needed
beforeAll(() => {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    // Only log performance-related messages
    if (args.some(arg => typeof arg === 'string' && 
        (arg.includes('performance') || arg.includes('took') || arg.includes('results')))) {
      originalConsoleLog(...args);
    }
  };
});

// Clean up after performance tests
afterEach(() => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});