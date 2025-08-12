const RetryUtil = require('../RetryUtil');
const { createSyncError, SyncErrorTypes } = require('../../interfaces');

describe('RetryUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryUtil.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await RetryUtil.withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 10 // Fast for testing
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      const retryCondition = jest.fn().mockReturnValue(false);
      
      await expect(RetryUtil.withRetry(operation, { retryCondition }))
        .rejects.toThrow('Invalid credentials');
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(retryCondition).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should respect maxAttempts limit', async () => {
      const error = new Error('Connection timeout');
      error.code = 'ETIMEDOUT';
      
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(RetryUtil.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10
      })).rejects.toThrow('Connection timeout');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await RetryUtil.withRetry(operation, {
        maxAttempts: 2,
        baseDelay: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });

    it('should handle circuit breaker', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      const circuitBreaker = RetryUtil.createCircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000
      });
      
      // First call should fail and open circuit breaker
      await expect(RetryUtil.withRetry(operation, {
        maxAttempts: 1,
        circuitBreaker
      })).rejects.toThrow('Service error');
      
      // Second call should be blocked by circuit breaker
      await expect(RetryUtil.withRetry(operation, {
        maxAttempts: 1,
        circuitBreaker
      })).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = {
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: false
      };
      
      expect(RetryUtil.calculateDelay(1, config)).toBe(1000);
      expect(RetryUtil.calculateDelay(2, config)).toBe(2000);
      expect(RetryUtil.calculateDelay(3, config)).toBe(4000);
    });

    it('should respect maxDelay', () => {
      const config = {
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 2,
        jitter: false
      };
      
      expect(RetryUtil.calculateDelay(10, config)).toBe(5000);
    });

    it('should add jitter when enabled', () => {
      const config = {
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: true
      };
      
      const delay1 = RetryUtil.calculateDelay(2, config);
      const delay2 = RetryUtil.calculateDelay(2, config);
      
      // With jitter, delays should be different
      expect(delay1).not.toBe(delay2);
      expect(delay1).toBeGreaterThan(1800); // Base 2000 - 10% jitter
      expect(delay1).toBeLessThan(2200); // Base 2000 + 10% jitter
    });

    it('should enforce minimum delay', () => {
      const config = {
        baseDelay: 50,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: false
      };
      
      expect(RetryUtil.calculateDelay(1, config)).toBe(100); // Minimum 100ms
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkErrors = [
        { code: 'ENOTFOUND' },
        { code: 'ECONNREFUSED' },
        { code: 'ETIMEDOUT' },
        { code: 'ECONNRESET' }
      ];
      
      networkErrors.forEach(error => {
        expect(RetryUtil.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify retryable HTTP status codes', () => {
      const retryableStatuses = [500, 502, 503, 504, 429, 408];
      
      retryableStatuses.forEach(status => {
        const error = { response: { status } };
        expect(RetryUtil.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable HTTP status codes', () => {
      const nonRetryableStatuses = [400, 401, 403, 404];
      
      nonRetryableStatuses.forEach(status => {
        const error = { response: { status } };
        expect(RetryUtil.isRetryableError(error)).toBe(false);
      });
    });

    it('should identify retryable error messages', () => {
      const retryableMessages = [
        'Connection timeout',
        'Network error',
        'Service temporarily unavailable',
        'Rate limit exceeded'
      ];
      
      retryableMessages.forEach(message => {
        const error = new Error(message);
        expect(RetryUtil.isRetryableError(error)).toBe(true);
      });
    });
  });

  describe('createRetryCondition', () => {
    it('should create custom retry condition', () => {
      const retryCondition = RetryUtil.createRetryCondition(
        ['custom_error', 'retry_me'],
        ['never_retry', 'fatal']
      );
      
      expect(retryCondition(new Error('custom_error occurred'))).toBe(true);
      expect(retryCondition(new Error('retry_me please'))).toBe(true);
      expect(retryCondition(new Error('never_retry this'))).toBe(false);
      expect(retryCondition(new Error('fatal error'))).toBe(false);
    });
  });

  describe('getRetryConfig', () => {
    it('should return config for mutual fund sync', () => {
      const config = RetryUtil.getRetryConfig('mutual_fund_sync');
      
      expect(config).toHaveProperty('maxAttempts', 3);
      expect(config).toHaveProperty('baseDelay', 2000);
      expect(config).toHaveProperty('retryCondition');
    });

    it('should return config for EPF sync', () => {
      const config = RetryUtil.getRetryConfig('epf_sync');
      
      expect(config).toHaveProperty('maxAttempts', 2);
      expect(config).toHaveProperty('baseDelay', 5000);
      expect(config).toHaveProperty('backoffFactor', 3);
    });

    it('should return config for stock sync', () => {
      const config = RetryUtil.getRetryConfig('stock_sync');
      
      expect(config).toHaveProperty('maxAttempts', 2);
      expect(config).toHaveProperty('baseDelay', 1000);
      expect(config).toHaveProperty('maxDelay', 10000);
    });

    it('should return default config for unknown type', () => {
      const config = RetryUtil.getRetryConfig('unknown_type');
      
      expect(config).toHaveProperty('maxAttempts');
      expect(config).toHaveProperty('baseDelay');
      expect(config).toHaveProperty('retryCondition');
    });
  });

  describe('createCircuitBreaker', () => {
    let circuitBreaker;
    
    beforeEach(() => {
      circuitBreaker = RetryUtil.createCircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeout: 1000
      });
    });

    it('should start in CLOSED state', () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
    });

    it('should open after failure threshold', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // First failure
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Service error');
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      
      // Second failure should open circuit
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Service error');
      expect(circuitBreaker.getState().state).toBe('OPEN');
    });

    it('should block operations when OPEN', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Force circuit to OPEN state
      circuitBreaker.recordFailure(new Error('Test'));
      circuitBreaker.recordFailure(new Error('Test'));
      
      await expect(circuitBreaker.execute(operation))
        .rejects.toThrow('Circuit breaker is OPEN');
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Open circuit
      circuitBreaker.recordFailure(new Error('Test'));
      circuitBreaker.recordFailure(new Error('Test'));
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next operation should transition to HALF_OPEN
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('CLOSED'); // Success threshold met
    });

    it('should reset to CLOSED after successful operations in HALF_OPEN', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Create a new circuit breaker that starts in HALF_OPEN state
      const halfOpenCircuitBreaker = RetryUtil.createCircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeout: 1000
      });
      
      // Open circuit first
      halfOpenCircuitBreaker.recordFailure(new Error('Test'));
      halfOpenCircuitBreaker.recordFailure(new Error('Test'));
      expect(halfOpenCircuitBreaker.getState().state).toBe('OPEN');
      
      // Wait for reset timeout to transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Successful operation should close circuit
      await halfOpenCircuitBreaker.execute(operation);
      expect(halfOpenCircuitBreaker.getState().state).toBe('CLOSED');
    });

    it('should allow manual reset', () => {
      // Open circuit
      circuitBreaker.recordFailure(new Error('Test'));
      circuitBreaker.recordFailure(new Error('Test'));
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Manual reset
      circuitBreaker.reset();
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });
  });

  describe('createSyncCircuitBreaker', () => {
    it('should create circuit breaker for mutual fund sync', () => {
      const cb = RetryUtil.createSyncCircuitBreaker('mutual_fund_sync');
      const state = cb.getState();
      
      expect(state.config.failureThreshold).toBe(3);
      expect(state.config.resetTimeout).toBe(300000); // 5 minutes
    });

    it('should create circuit breaker for EPF sync', () => {
      const cb = RetryUtil.createSyncCircuitBreaker('epf_sync');
      const state = cb.getState();
      
      expect(state.config.failureThreshold).toBe(2);
      expect(state.config.resetTimeout).toBe(900000); // 15 minutes
    });

    it('should create circuit breaker for stock sync', () => {
      const cb = RetryUtil.createSyncCircuitBreaker('stock_sync');
      const state = cb.getState();
      
      expect(state.config.failureThreshold).toBe(5);
      expect(state.config.resetTimeout).toBe(180000); // 3 minutes
    });
  });

  describe('withRetryWrapper', () => {
    it('should create wrapped function with retry logic', async () => {
      const error = new Error('Connection reset');
      error.code = 'ECONNRESET';
      
      const originalFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const wrappedFn = RetryUtil.withRetryWrapper(originalFn, {
        maxAttempts: 2,
        baseDelay: 10
      });
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledTimes(2);
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('batchRetry', () => {
    it('should execute operations in batches', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockResolvedValue('result2'),
        jest.fn().mockResolvedValue('result3')
      ];
      
      const result = await RetryUtil.batchRetry(operations, {
        concurrency: 2,
        retryConfig: { maxAttempts: 1, baseDelay: 10 }
      });
      
      expect(result.results).toEqual(['result1', 'result2', 'result3']);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
    });

    it('should handle partial failures', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(new Error('Failed')),
        jest.fn().mockResolvedValue('result3')
      ];
      
      const result = await RetryUtil.batchRetry(operations, {
        concurrency: 3,
        retryConfig: { maxAttempts: 1, baseDelay: 10 },
        failFast: false
      });
      
      expect(result.results).toEqual(['result1', null, 'result3']);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error.message).toBe('Failed');
    });

    it('should fail fast when configured', async () => {
      const operations = [
        jest.fn().mockResolvedValue('result1'),
        jest.fn().mockRejectedValue(new Error('Failed')),
        jest.fn().mockResolvedValue('result3')
      ];
      
      await expect(RetryUtil.batchRetry(operations, {
        concurrency: 3,
        retryConfig: { maxAttempts: 1, baseDelay: 10 },
        failFast: true
      })).rejects.toThrow();
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await RetryUtil.sleep(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(end - start).toBeLessThan(150);
    });
  });
});