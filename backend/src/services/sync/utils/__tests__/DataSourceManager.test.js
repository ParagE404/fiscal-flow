const { DataSourceManager, getInstance } = require('../DataSourceManager');
const { DataSources } = require('../../interfaces');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('DataSourceManager', () => {
  let dataSourceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    dataSourceManager = new DataSourceManager();
    dataSourceManager.stopHealthMonitoring(); // Stop automatic health checks for testing
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (dataSourceManager) {
      dataSourceManager.stopHealthMonitoring();
    }
  });

  describe('constructor', () => {
    it('should initialize with default fallback mappings', () => {
      const amfiFallbacks = dataSourceManager.getFallbackSources(DataSources.AMFI);
      expect(amfiFallbacks).toContain(DataSources.MF_CENTRAL);

      const yahooFallbacks = dataSourceManager.getFallbackSources(DataSources.YAHOO_FINANCE);
      expect(yahooFallbacks).toContain(DataSources.NSE);
      expect(yahooFallbacks).toContain(DataSources.ALPHA_VANTAGE);
    });

    it('should initialize health status for all sources', () => {
      const healthStatus = dataSourceManager.getAllHealthStatus();
      
      Object.values(DataSources).forEach(source => {
        expect(healthStatus[source]).toBeDefined();
        expect(healthStatus[source].isHealthy).toBe(true);
        expect(healthStatus[source].consecutiveFailures).toBe(0);
      });
    });
  });

  describe('getBestAvailableSource', () => {
    it('should return primary source when healthy', async () => {
      const source = await dataSourceManager.getBestAvailableSource(DataSources.AMFI, {
        skipHealthCheck: true
      });
      
      expect(source).toBe(DataSources.AMFI);
    });

    it('should return fallback source when primary is unhealthy', async () => {
      // Mark primary source as unhealthy
      dataSourceManager.setSourceHealth(DataSources.AMFI, false, 'Test failure');
      
      const source = await dataSourceManager.getBestAvailableSource(DataSources.AMFI, {
        skipHealthCheck: true
      });
      
      expect(source).toBe(DataSources.MF_CENTRAL);
    });

    it('should respect excluded sources', async () => {
      const source = await dataSourceManager.getBestAvailableSource(DataSources.YAHOO_FINANCE, {
        skipHealthCheck: true,
        excludeSources: [DataSources.YAHOO_FINANCE, DataSources.NSE]
      });
      
      expect(source).toBe(DataSources.ALPHA_VANTAGE);
    });

    it('should use preferred fallbacks when provided', async () => {
      dataSourceManager.setSourceHealth(DataSources.YAHOO_FINANCE, false, 'Test failure');
      
      const source = await dataSourceManager.getBestAvailableSource(DataSources.YAHOO_FINANCE, {
        skipHealthCheck: true,
        preferredFallbacks: [DataSources.ALPHA_VANTAGE, DataSources.NSE]
      });
      
      expect(source).toBe(DataSources.ALPHA_VANTAGE);
    });

    it('should return primary source when no healthy fallbacks exist', async () => {
      // Mark all sources as unhealthy
      dataSourceManager.setSourceHealth(DataSources.AMFI, false, 'Test failure');
      dataSourceManager.setSourceHealth(DataSources.MF_CENTRAL, false, 'Test failure');
      
      const source = await dataSourceManager.getBestAvailableSource(DataSources.AMFI, {
        skipHealthCheck: true
      });
      
      expect(source).toBe(DataSources.AMFI);
    });
  });

  describe('executeWithFallback', () => {
    it('should execute operation with primary source when healthy', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await dataSourceManager.executeWithFallback(
        DataSources.AMFI,
        mockOperation,
        { maxFallbacks: 2 }
      );
      
      expect(result.result).toBe('success');
      expect(result.source).toBe(DataSources.AMFI);
      expect(result.fallbackUsed).toBe(false);
      expect(mockOperation).toHaveBeenCalledWith(DataSources.AMFI);
    });

    it('should fallback to secondary source when primary fails', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Primary source failed'))
        .mockResolvedValue('fallback success');
      
      const result = await dataSourceManager.executeWithFallback(
        DataSources.AMFI,
        mockOperation,
        { maxFallbacks: 2 }
      );
      
      expect(result.result).toBe('fallback success');
      expect(result.source).toBe(DataSources.MF_CENTRAL);
      expect(result.fallbackUsed).toBe(true);
      expect(result.attemptedSources).toEqual([DataSources.AMFI, DataSources.MF_CENTRAL]);
    });

    it('should call onFallback callback when falling back', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Primary source failed'))
        .mockResolvedValue('fallback success');
      
      const onFallback = jest.fn();
      
      await dataSourceManager.executeWithFallback(
        DataSources.AMFI,
        mockOperation,
        { maxFallbacks: 2, onFallback }
      );
      
      expect(onFallback).toHaveBeenCalledWith(
        DataSources.AMFI,
        expect.any(Error),
        1
      );
    });

    it('should throw error when all sources fail', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('All sources failed'));
      
      try {
        const result = await dataSourceManager.executeWithFallback(
          DataSources.AMFI,
          mockOperation,
          { 
            maxFallbacks: 2,
            retryConfig: { maxAttempts: 1, baseDelay: 10 } // Disable retries for this test
          }
        );
        console.log('Unexpected success:', result);
        fail('Expected operation to throw but it succeeded');
      } catch (error) {
        expect(error.message).toContain('All data sources failed');
      }
    });

    it('should respect maxFallbacks limit', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Source failed'));
      
      try {
        await dataSourceManager.executeWithFallback(
          DataSources.YAHOO_FINANCE,
          mockOperation,
          { 
            maxFallbacks: 1,
            retryConfig: { maxAttempts: 1, baseDelay: 10 } // Disable retries for this test
          }
        );
        fail('Expected operation to throw but it succeeded');
      } catch (error) {
        expect(error.message).toContain('All data sources failed');
      }
      
      // Should try primary + 1 fallback = 2 attempts max
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkSourceHealth', () => {
    beforeEach(() => {
      mockedAxios.head.mockResolvedValue({ status: 200 });
    });

    it('should return cached status when skipCheck is true', async () => {
      const health = await dataSourceManager.checkSourceHealth(DataSources.AMFI, true);
      
      expect(health.isHealthy).toBe(true);
      expect(mockedAxios.head).not.toHaveBeenCalled();
    });

    it('should perform health check when not skipped', async () => {
      // Set last check to old time to force new check
      const currentStatus = dataSourceManager.getSourceHealth(DataSources.AMFI);
      currentStatus.lastCheck = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      dataSourceManager.healthStatus.set(DataSources.AMFI, currentStatus);
      
      // Mock successful response
      mockedAxios.head.mockResolvedValue({ status: 200 });
      
      const health = await dataSourceManager.checkSourceHealth(DataSources.AMFI, false);
      
      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockedAxios.head).toHaveBeenCalled();
    });

    it('should mark source as unhealthy after consecutive failures', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Network error'));
      
      // Set last check to old time to force new checks
      const currentStatus = dataSourceManager.getSourceHealth(DataSources.AMFI);
      currentStatus.lastCheck = new Date(Date.now() - 10 * 60 * 1000);
      dataSourceManager.healthStatus.set(DataSources.AMFI, currentStatus);
      
      // Simulate 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        try {
          await dataSourceManager.checkSourceHealth(DataSources.AMFI, false);
        } catch (error) {
          // Expected to throw
        }
        // Force next check by updating last check time
        const status = dataSourceManager.getSourceHealth(DataSources.AMFI);
        status.lastCheck = new Date(Date.now() - 10 * 60 * 1000);
        dataSourceManager.healthStatus.set(DataSources.AMFI, status);
      }
      
      const health = dataSourceManager.getSourceHealth(DataSources.AMFI);
      expect(health.isHealthy).toBe(false);
      expect(health.consecutiveFailures).toBe(3);
    });

    it('should recover health status after successful check', async () => {
      // First mark as unhealthy
      dataSourceManager.setSourceHealth(DataSources.AMFI, false, 'Test failure');
      
      // Set last check to old time to force new check
      const currentStatus = dataSourceManager.getSourceHealth(DataSources.AMFI);
      currentStatus.lastCheck = new Date(Date.now() - 10 * 60 * 1000);
      dataSourceManager.healthStatus.set(DataSources.AMFI, currentStatus);
      
      // Then perform successful health check
      mockedAxios.head.mockResolvedValue({ status: 200 });
      
      const health = await dataSourceManager.checkSourceHealth(DataSources.AMFI, false);
      
      expect(health.isHealthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.lastError).toBeNull();
    });
  });

  describe('recordSourceSuccess', () => {
    it('should update health status on success', () => {
      // First mark as unhealthy
      dataSourceManager.setSourceHealth(DataSources.AMFI, false, 'Test failure');
      
      // Record success
      dataSourceManager.recordSourceSuccess(DataSources.AMFI);
      
      const health = dataSourceManager.getSourceHealth(DataSources.AMFI);
      expect(health.isHealthy).toBe(true);
      expect(health.consecutiveFailures).toBe(0);
      expect(health.lastError).toBeNull();
    });
  });

  describe('recordSourceFailure', () => {
    it('should update health status on failure', () => {
      const error = new Error('Test failure');
      
      dataSourceManager.recordSourceFailure(DataSources.AMFI, error);
      
      const health = dataSourceManager.getSourceHealth(DataSources.AMFI);
      expect(health.consecutiveFailures).toBe(1);
      expect(health.lastError).toBe('Test failure');
    });

    it('should mark source as unhealthy after 3 failures', () => {
      const error = new Error('Test failure');
      
      // Record 3 failures
      for (let i = 0; i < 3; i++) {
        dataSourceManager.recordSourceFailure(DataSources.AMFI, error);
      }
      
      const health = dataSourceManager.getSourceHealth(DataSources.AMFI);
      expect(health.isHealthy).toBe(false);
      expect(health.consecutiveFailures).toBe(3);
    });
  });

  describe('setSourceHealth', () => {
    it('should manually override health status', () => {
      dataSourceManager.setSourceHealth(DataSources.AMFI, false, 'Manual override');
      
      const health = dataSourceManager.getSourceHealth(DataSources.AMFI);
      expect(health.isHealthy).toBe(false);
      expect(health.lastError).toBe('Manual override');
    });

    it('should reset circuit breaker when marking as healthy', () => {
      const circuitBreaker = dataSourceManager.circuitBreakers.get(DataSources.AMFI);
      const resetSpy = jest.spyOn(circuitBreaker, 'reset');
      
      dataSourceManager.setSourceHealth(DataSources.AMFI, true, 'Manual recovery');
      
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('setFallbackMapping', () => {
    it('should update fallback mapping', () => {
      const newFallbacks = [DataSources.NSE, DataSources.BSE];
      
      dataSourceManager.setFallbackMapping(DataSources.YAHOO_FINANCE, newFallbacks);
      
      const fallbacks = dataSourceManager.getFallbackSources(DataSources.YAHOO_FINANCE);
      expect(fallbacks).toEqual(newFallbacks);
    });
  });

  describe('circuit breaker integration', () => {
    it('should get circuit breaker state', () => {
      const state = dataSourceManager.getCircuitBreakerState(DataSources.AMFI);
      
      expect(state).toBeDefined();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
    });

    it('should reset circuit breaker', () => {
      const circuitBreaker = dataSourceManager.circuitBreakers.get(DataSources.AMFI);
      const resetSpy = jest.spyOn(circuitBreaker, 'reset');
      
      dataSourceManager.resetCircuitBreaker(DataSources.AMFI);
      
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('singleton getInstance', () => {
    it('should return same instance', () => {
      const instance1 = getInstance();
      const instance2 = getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(DataSourceManager);
    });
  });

  describe('error handling', () => {
    it('should throw error for unknown data source', async () => {
      await expect(dataSourceManager.checkSourceHealth('unknown_source'))
        .rejects.toThrow('Unknown data source: unknown_source');
    });

    it('should handle health check callback errors gracefully', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValue('success');
      
      const onFallback = jest.fn().mockRejectedValue(new Error('Callback failed'));
      
      // Should not throw despite callback error
      const result = await dataSourceManager.executeWithFallback(
        DataSources.AMFI,
        mockOperation,
        { onFallback }
      );
      
      expect(result.result).toBe('success');
    });
  });

  describe('health monitoring', () => {
    it('should start and stop health monitoring', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const manager = new DataSourceManager();
      expect(setIntervalSpy).toHaveBeenCalled();
      
      manager.stopHealthMonitoring();
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});