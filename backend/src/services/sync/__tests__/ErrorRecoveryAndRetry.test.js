const ErrorRecoveryService = require('../utils/ErrorRecoveryService');
const RetryUtil = require('../utils/RetryUtil');
const { SyncErrorTypes } = require('../types/SyncTypes');

// Mock dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    syncMetadata: {
      update: jest.fn(),
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  }))
}));

describe('Error Recovery and Retry Utilities', () => {
  describe('ErrorRecoveryService', () => {
    let errorRecoveryService;

    beforeEach(() => {
      jest.clearAllMocks();
      errorRecoveryService = new ErrorRecoveryService();
    });

    describe('handleSyncError', () => {
      test('should recommend retry for network timeout errors', async () => {
        const error = {
          type: SyncErrorTypes.NETWORK_TIMEOUT,
          message: 'Request timeout',
          details: { timeout: 30000 }
        };

        const context = {
          userId: 'user123',
          service: 'amfi',
          attemptCount: 1
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('retry');
        expect(recovery.delay).toBeGreaterThan(0);
        expect(recovery.maxRetries).toBeDefined();
      });

      test('should recommend delay for rate limit errors', async () => {
        const error = {
          type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          details: { retryAfter: 60 }
        };

        const context = {
          userId: 'user123',
          service: 'yahoo_finance',
          attemptCount: 1
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('delay');
        expect(recovery.delay).toBe(60000); // 60 seconds in milliseconds
      });

      test('should recommend disable sync for authentication failures', async () => {
        const error = {
          type: SyncErrorTypes.AUTHENTICATION_FAILED,
          message: 'Invalid credentials',
          details: { statusCode: 401 }
        };

        const context = {
          userId: 'user123',
          service: 'epfo',
          attemptCount: 3
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('disable_sync');
        expect(recovery.reason).toContain('Invalid credentials');
      });

      test('should recommend fallback source for service unavailable', async () => {
        const error = {
          type: SyncErrorTypes.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable',
          details: { statusCode: 503 }
        };

        const context = {
          userId: 'user123',
          service: 'yahoo_finance',
          source: 'yahoo_finance',
          attemptCount: 1
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('fallback_source');
        expect(recovery.source).toBe('nse_india');
      });

      test('should recommend skip record for data validation failures', async () => {
        const error = {
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: 'Invalid NAV value',
          details: { field: 'nav', value: -10 }
        };

        const context = {
          userId: 'user123',
          service: 'amfi',
          recordId: 'fund123'
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('skip_record');
        expect(recovery.reason).toContain('Invalid data format');
      });

      test('should recommend manual intervention for unknown errors', async () => {
        const error = {
          type: SyncErrorTypes.UNKNOWN_ERROR,
          message: 'Unexpected error occurred',
          details: {}
        };

        const context = {
          userId: 'user123',
          service: 'amfi',
          attemptCount: 5
        };

        const recovery = await errorRecoveryService.handleSyncError(error, context);

        expect(recovery.action).toBe('manual_intervention');
        expect(recovery.reason).toBe('Unexpected error occurred');
      });
    });

    describe('calculateRateLimitDelay', () => {
      test('should use retry-after header when available', () => {
        const error = {
          type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
          details: { retryAfter: 120 }
        };

        const delay = errorRecoveryService.calculateRateLimitDelay(error);

        expect(delay).toBe(120000); // 120 seconds in milliseconds
      });

      test('should use default delay when retry-after not available', () => {
        const error = {
          type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
          details: {}
        };

        const delay = errorRecoveryService.calculateRateLimitDelay(error);

        expect(delay).toBe(60000); // Default 1 minute
      });

      test('should cap maximum delay', () => {
        const error = {
          type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
          details: { retryAfter: 3600 } // 1 hour
        };

        const delay = errorRecoveryService.calculateRateLimitDelay(error);

        expect(delay).toBeLessThanOrEqual(1800000); // Max 30 minutes
      });
    });

    describe('getFallbackSource', () => {
      test('should return correct fallback for Yahoo Finance', () => {
        const fallback = errorRecoveryService.getFallbackSource('yahoo_finance');
        expect(fallback).toBe('nse_india');
      });

      test('should return correct fallback for NSE', () => {
        const fallback = errorRecoveryService.getFallbackSource('nse_india');
        expect(fallback).toBe('yahoo_finance');
      });

      test('should return null for services without fallback', () => {
        const fallback = errorRecoveryService.getFallbackSource('amfi');
        expect(fallback).toBeNull();
      });
    });

    describe('shouldDisableSync', () => {
      test('should disable sync after multiple authentication failures', () => {
        const context = {
          userId: 'user123',
          service: 'epfo',
          attemptCount: 5,
          errorHistory: [
            { type: SyncErrorTypes.AUTHENTICATION_FAILED },
            { type: SyncErrorTypes.AUTHENTICATION_FAILED },
            { type: SyncErrorTypes.AUTHENTICATION_FAILED }
          ]
        };

        const shouldDisable = errorRecoveryService.shouldDisableSync(context);

        expect(shouldDisable).toBe(true);
      });

      test('should not disable sync for occasional failures', () => {
        const context = {
          userId: 'user123',
          service: 'amfi',
          attemptCount: 2,
          errorHistory: [
            { type: SyncErrorTypes.NETWORK_TIMEOUT }
          ]
        };

        const shouldDisable = errorRecoveryService.shouldDisableSync(context);

        expect(shouldDisable).toBe(false);
      });
    });

    describe('logRecoveryAction', () => {
      test('should log recovery actions to audit trail', async () => {
        const context = {
          userId: 'user123',
          service: 'amfi',
          investmentId: 'fund123'
        };

        const recovery = {
          action: 'retry',
          delay: 5000,
          reason: 'Network timeout'
        };

        await errorRecoveryService.logRecoveryAction(context, recovery);

        const { PrismaClient } = require('@prisma/client');
        const mockPrisma = new PrismaClient();

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'user123',
            auditType: 'error_recovery',
            source: 'amfi',
            details: expect.objectContaining({
              action: 'retry',
              delay: 5000,
              reason: 'Network timeout'
            })
          })
        });
      });
    });
  });

  describe('RetryUtil', () => {
    let retryUtil;

    beforeEach(() => {
      jest.clearAllMocks();
      retryUtil = new RetryUtil();
    });

    describe('withRetry', () => {
      test('should succeed on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await retryUtil.withRetry(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      test('should retry on failure and eventually succeed', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockRejectedValueOnce(new Error('Second failure'))
          .mockResolvedValue('success');

        const result = await retryUtil.withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 100
        });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      test('should fail after max attempts', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

        await expect(retryUtil.withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 100
        })).rejects.toThrow('Persistent failure');

        expect(operation).toHaveBeenCalledTimes(3);
      });

      test('should use exponential backoff', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockRejectedValueOnce(new Error('Second failure'))
          .mockResolvedValue('success');

        const startTime = Date.now();
        
        await retryUtil.withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 100,
          backoffFactor: 2
        });

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should have waited at least 100ms + 200ms = 300ms
        expect(totalTime).toBeGreaterThan(250);
      });

      test('should respect max delay', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValue('success');

        const startTime = Date.now();
        
        await retryUtil.withRetry(operation, {
          maxAttempts: 2,
          baseDelay: 1000,
          maxDelay: 500, // Max delay is less than base delay
          backoffFactor: 2
        });

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should have waited max 500ms, not 1000ms
        expect(totalTime).toBeLessThan(800);
      });

      test('should handle custom retry conditions', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('Retryable error'))
          .mockRejectedValueOnce(new Error('Non-retryable error'))
          .mockResolvedValue('success');

        const shouldRetry = (error) => error.message === 'Retryable error';

        await expect(retryUtil.withRetry(operation, {
          maxAttempts: 3,
          baseDelay: 100,
          shouldRetry
        })).rejects.toThrow('Non-retryable error');

        expect(operation).toHaveBeenCalledTimes(2);
      });
    });

    describe('withCircuitBreaker', () => {
      test('should allow requests when circuit is closed', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await retryUtil.withCircuitBreaker('test-service', operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      test('should open circuit after failure threshold', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('Service failure'));

        // Fail enough times to open the circuit
        for (let i = 0; i < 5; i++) {
          try {
            await retryUtil.withCircuitBreaker('test-service', operation, {
              failureThreshold: 3,
              resetTimeout: 1000
            });
          } catch (error) {
            // Expected failures
          }
        }

        // Circuit should now be open
        await expect(retryUtil.withCircuitBreaker('test-service', operation))
          .rejects.toThrow('Circuit breaker is open');
      });

      test('should reset circuit after timeout', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new Error('Initial failure'))
          .mockResolvedValue('success');

        // Open the circuit
        try {
          await retryUtil.withCircuitBreaker('test-service', operation, {
            failureThreshold: 1,
            resetTimeout: 100
          });
        } catch (error) {
          // Expected failure
        }

        // Wait for reset timeout
        await new Promise(resolve => setTimeout(resolve, 150));

        // Circuit should be half-open, allowing one test request
        const result = await retryUtil.withCircuitBreaker('test-service', operation);

        expect(result).toBe('success');
      });
    });

    describe('calculateDelay', () => {
      test('should calculate exponential backoff correctly', () => {
        const delay1 = retryUtil.calculateDelay(1, 1000, 2, 10000);
        const delay2 = retryUtil.calculateDelay(2, 1000, 2, 10000);
        const delay3 = retryUtil.calculateDelay(3, 1000, 2, 10000);

        expect(delay1).toBe(1000);
        expect(delay2).toBe(2000);
        expect(delay3).toBe(4000);
      });

      test('should respect maximum delay', () => {
        const delay = retryUtil.calculateDelay(10, 1000, 2, 5000);

        expect(delay).toBe(5000);
      });

      test('should add jitter to prevent thundering herd', () => {
        const delays = [];
        for (let i = 0; i < 10; i++) {
          delays.push(retryUtil.calculateDelay(1, 1000, 2, 10000, true));
        }

        // All delays should be different due to jitter
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);

        // All delays should be within reasonable range
        delays.forEach(delay => {
          expect(delay).toBeGreaterThan(500);
          expect(delay).toBeLessThan(1500);
        });
      });
    });

    describe('isRetryableError', () => {
      test('should identify retryable network errors', () => {
        const networkError = new Error('ECONNRESET');
        const timeoutError = new Error('ETIMEDOUT');
        const dnsError = new Error('ENOTFOUND');

        expect(retryUtil.isRetryableError(networkError)).toBe(true);
        expect(retryUtil.isRetryableError(timeoutError)).toBe(true);
        expect(retryUtil.isRetryableError(dnsError)).toBe(true);
      });

      test('should identify retryable HTTP status codes', () => {
        const serverError = { response: { status: 500 } };
        const badGateway = { response: { status: 502 } };
        const serviceUnavailable = { response: { status: 503 } };
        const gatewayTimeout = { response: { status: 504 } };

        expect(retryUtil.isRetryableError(serverError)).toBe(true);
        expect(retryUtil.isRetryableError(badGateway)).toBe(true);
        expect(retryUtil.isRetryableError(serviceUnavailable)).toBe(true);
        expect(retryUtil.isRetryableError(gatewayTimeout)).toBe(true);
      });

      test('should not retry client errors', () => {
        const badRequest = { response: { status: 400 } };
        const unauthorized = { response: { status: 401 } };
        const forbidden = { response: { status: 403 } };
        const notFound = { response: { status: 404 } };

        expect(retryUtil.isRetryableError(badRequest)).toBe(false);
        expect(retryUtil.isRetryableError(unauthorized)).toBe(false);
        expect(retryUtil.isRetryableError(forbidden)).toBe(false);
        expect(retryUtil.isRetryableError(notFound)).toBe(false);
      });

      test('should handle rate limiting specially', () => {
        const rateLimited = { response: { status: 429 } };

        expect(retryUtil.isRetryableError(rateLimited)).toBe(true);
      });
    });

    describe('getRetryDelay', () => {
      test('should extract retry-after header', () => {
        const error = {
          response: {
            status: 429,
            headers: { 'retry-after': '60' }
          }
        };

        const delay = retryUtil.getRetryDelay(error);

        expect(delay).toBe(60000); // 60 seconds in milliseconds
      });

      test('should use default delay when no retry-after header', () => {
        const error = {
          response: {
            status: 500
          }
        };

        const delay = retryUtil.getRetryDelay(error, 1, 1000, 2);

        expect(delay).toBe(1000);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex error recovery scenarios', async () => {
      const errorRecoveryService = new ErrorRecoveryService();
      const retryUtil = new RetryUtil();

      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw { response: { status: 503 } }; // Service unavailable
        } else if (attemptCount === 2) {
          throw { response: { status: 429, headers: { 'retry-after': '1' } } }; // Rate limited
        } else {
          return 'success';
        }
      });

      const result = await retryUtil.withRetry(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        shouldRetry: (error) => retryUtil.isRetryableError(error)
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should coordinate error recovery with retry logic', async () => {
      const errorRecoveryService = new ErrorRecoveryService();
      const retryUtil = new RetryUtil();

      const error = {
        type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        details: { retryAfter: 2 }
      };

      const context = {
        userId: 'user123',
        service: 'yahoo_finance',
        attemptCount: 1
      };

      const recovery = await errorRecoveryService.handleSyncError(error, context);

      expect(recovery.action).toBe('delay');
      expect(recovery.delay).toBe(2000);

      // Simulate using the recovery recommendation in retry logic
      const operation = jest.fn().mockResolvedValue('success');
      
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, recovery.delay));
      const result = await operation();
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(endTime - startTime).toBeGreaterThan(1900); // Should have waited ~2 seconds
    });
  });
});