/**
 * Enhanced Retry Utility for Sync Operations
 * Provides comprehensive retry logic, exponential backoff, and circuit breaker patterns
 * specifically designed for financial data synchronization operations
 */

const { createSyncError, SyncErrorTypes, RecoveryActions } = require('../interfaces');

class RetryUtil {
  /**
   * Execute an operation with advanced retry logic and circuit breaker protection
   * @param {Function} operation - Async function to execute
   * @param {Object} options - Retry configuration options
   * @returns {Promise<any>} Result of the operation
   */
  static async withRetry(operation, options = {}) {
    const config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      retryCondition: (error) => this.isRetryableError(error),
      onRetry: null,
      circuitBreaker: null,
      operationType: 'sync',
      ...options
    };

    let lastError;
    let circuitBreakerError = null;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check circuit breaker if configured
        if (config.circuitBreaker) {
          if (!config.circuitBreaker.isOperationAllowed()) {
            circuitBreakerError = createSyncError({
              type: 'circuit_breaker_open',
              message: 'Circuit breaker is OPEN - operation blocked'
            });
            break;
          }
        }

        const result = await operation();
        
        // Reset circuit breaker on success
        if (config.circuitBreaker && attempt > 1) {
          config.circuitBreaker.recordSuccess();
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Record failure in circuit breaker
        if (config.circuitBreaker) {
          config.circuitBreaker.recordFailure(error);
        }
        
        // Check if we should retry this error
        if (!config.retryCondition(error)) {
          console.warn(`Non-retryable error encountered:`, error.message);
          break;
        }
        
        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) {
          console.error(`Max retry attempts (${config.maxAttempts}) reached for operation`);
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        
        console.warn(
          `Sync operation attempt ${attempt}/${config.maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
          error.message
        );
        
        // Call retry callback if provided
        if (config.onRetry) {
          try {
            await config.onRetry(error, attempt, delay);
          } catch (callbackError) {
            console.error('Retry callback failed:', callbackError.message);
          }
        }
        
        await this.sleep(delay);
      }
    }
    
    // Throw circuit breaker error if that's what stopped us
    if (circuitBreakerError) {
      const error = new Error(circuitBreakerError.message);
      error.type = circuitBreakerError.type;
      throw error;
    }
    
    throw lastError;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  static calculateDelay(attempt, config) {
    let delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd problem
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }
    
    return Math.max(delay, 100); // Minimum 100ms delay
  }

  /**
   * Determine if an error is retryable based on error type and characteristics
   * @param {Error} error - Error to evaluate
   * @returns {boolean} True if error is retryable
   */
  static isRetryableError(error) {
    // Network-related errors are generally retryable
    const networkErrors = [
      'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 
      'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE'
    ];
    
    if (networkErrors.includes(error.code)) {
      return true;
    }
    
    // HTTP status codes that are retryable
    if (error.response && error.response.status) {
      const status = error.response.status;
      // Retry on 5xx server errors and specific 4xx errors
      return status >= 500 || status === 429 || status === 408 || status === 502 || status === 503 || status === 504;
    }
    
    // Message-based error detection
    const retryableMessages = [
      'timeout', 'network', 'connection', 'temporary', 'rate limit',
      'service unavailable', 'temporarily unavailable', 'internal server error', 'bad gateway'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Create a retry condition function for specific error types
   * @param {Array<string>} retryableErrors - Array of error types/messages to retry
   * @param {Array<string>} nonRetryableErrors - Array of error types/messages to never retry
   * @returns {Function} Retry condition function
   */
  static createRetryCondition(retryableErrors = [], nonRetryableErrors = []) {
    return (error) => {
      const errorMessage = error.message.toLowerCase();
      const errorType = error.constructor.name.toLowerCase();
      const errorCode = error.code || '';
      
      // Check non-retryable errors first
      const isNonRetryable = nonRetryableErrors.some(nonRetryable => 
        errorMessage.includes(nonRetryable.toLowerCase()) ||
        errorType.includes(nonRetryable.toLowerCase()) ||
        errorCode.includes(nonRetryable.toLowerCase())
      );
      
      if (isNonRetryable) {
        return false;
      }
      
      // Check retryable errors
      const isRetryable = retryableErrors.some(retryable => 
        errorMessage.includes(retryable.toLowerCase()) ||
        errorType.includes(retryable.toLowerCase()) ||
        errorCode.includes(retryable.toLowerCase())
      );
      
      return isRetryable || this.isRetryableError(error);
    };
  }

  /**
   * Get predefined retry configurations for different sync operation types
   * @param {string} operationType - Type of sync operation
   * @returns {Object} Retry configuration
   */
  static getRetryConfig(operationType) {
    const configs = {
      // Mutual fund NAV sync - daily operation, can be more patient
      mutual_fund_sync: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffFactor: 2,
        retryCondition: this.createRetryCondition(
          ['timeout', 'network', 'connection', 'amfi', 'nav'],
          ['authentication', 'invalid', 'malformed']
        )
      },
      
      // EPF sync - monthly operation, needs credential handling
      epf_sync: {
        maxAttempts: 2,
        baseDelay: 5000,
        maxDelay: 60000,
        backoffFactor: 3,
        retryCondition: this.createRetryCondition(
          ['timeout', 'network', 'connection', 'epfo', 'portal'],
          ['authentication', 'credential', 'login', 'captcha']
        )
      },
      
      // Stock price sync - frequent operation, needs to be fast
      stock_sync: {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryCondition: this.createRetryCondition(
          ['timeout', 'network', 'rate limit', 'yahoo', 'nse'],
          ['authentication', 'invalid symbol', 'not found']
        )
      },
      
      // Database operations
      database: {
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 5000,
        backoffFactor: 2,
        retryCondition: this.createRetryCondition(
          ['connection', 'timeout', 'lock', 'deadlock', 'constraint'],
          ['syntax', 'permission', 'not found']
        )
      },
      
      // External API calls
      api_call: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 15000,
        backoffFactor: 2,
        retryCondition: (error) => {
          if (error.response && error.response.status) {
            const status = error.response.status;
            return status >= 500 || status === 429 || status === 408;
          }
          return this.isRetryableError(error);
        }
      }
    };

    return configs[operationType] || configs.api_call;
  }

  /**
   * Create a circuit breaker for preventing cascading failures
   * @param {Object} options - Circuit breaker configuration
   * @returns {Object} Circuit breaker instance
   */
  static createCircuitBreaker(options = {}) {
    const config = {
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeout: 60000,
      monitoringPeriod: 60000,
      ...options
    };

    const state = {
      current: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null
    };

    const circuitBreaker = {
      /**
       * Execute operation through circuit breaker
       * @param {Function} operation - Operation to execute
       * @returns {Promise<any>} Operation result
       */
      async execute(operation) {
        if (state.current === 'OPEN') {
          if (Date.now() - state.lastFailureTime > config.resetTimeout) {
            state.current = 'HALF_OPEN';
            state.successCount = 0;
            console.log('Circuit breaker transitioning to HALF_OPEN state');
          } else {
            const error = new Error(`Circuit breaker is OPEN. Next retry in ${Math.round((config.resetTimeout - (Date.now() - state.lastFailureTime)) / 1000)}s`);
            error.type = 'circuit_breaker_open';
            error.details = { state: this.getState() };
            throw error;
          }
        }

        try {
          const result = await operation();
          this.recordSuccess();
          return result;
        } catch (error) {
          this.recordFailure(error);
          throw error;
        }
      },

      /**
       * Record a successful operation
       */
      recordSuccess() {
        state.lastSuccessTime = Date.now();
        
        if (state.current === 'HALF_OPEN') {
          state.successCount++;
          if (state.successCount >= config.successThreshold) {
            state.current = 'CLOSED';
            state.failureCount = 0;
            console.log('Circuit breaker reset to CLOSED state after successful operations');
          }
        } else if (state.current === 'CLOSED') {
          state.failureCount = Math.max(0, state.failureCount - 1); // Gradually reduce failure count on success
        }
      },

      /**
       * Record a failed operation
       * @param {Error} error - The error that occurred
       */
      recordFailure(error) {
        state.failureCount++;
        state.lastFailureTime = Date.now();
        
        if (state.current === 'CLOSED' && state.failureCount >= config.failureThreshold) {
          state.current = 'OPEN';
          console.warn(`Circuit breaker opened after ${state.failureCount} failures. Error: ${error.message}`);
        } else if (state.current === 'HALF_OPEN') {
          state.current = 'OPEN';
          console.warn('Circuit breaker reopened after failure in HALF_OPEN state');
        }
      },

      /**
       * Get current circuit breaker state
       * @returns {Object} Current state information
       */
      getState() {
        return {
          state: state.current,
          failureCount: state.failureCount,
          successCount: state.successCount,
          lastFailureTime: state.lastFailureTime,
          lastSuccessTime: state.lastSuccessTime,
          config
        };
      },

      /**
       * Manually reset circuit breaker to CLOSED state
       */
      reset() {
        state.current = 'CLOSED';
        state.failureCount = 0;
        state.successCount = 0;
        state.lastFailureTime = null;
        state.lastSuccessTime = null;
        console.log('Circuit breaker manually reset to CLOSED state');
      },

      /**
       * Check if circuit breaker allows operation
       * @returns {boolean} True if operation is allowed
       */
      isOperationAllowed() {
        if (state.current === 'CLOSED') return true;
        if (state.current === 'HALF_OPEN') return true;
        if (state.current === 'OPEN') {
          return Date.now() - state.lastFailureTime > config.resetTimeout;
        }
        return false;
      }
    };

    return circuitBreaker;
  }

  /**
   * Create a specialized circuit breaker for sync operations
   * @param {string} syncType - Type of sync operation
   * @returns {Object} Configured circuit breaker
   */
  static createSyncCircuitBreaker(syncType) {
    const configs = {
      mutual_fund_sync: {
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 300000, // 5 minutes
        monitoringPeriod: 600000 // 10 minutes
      },
      epf_sync: {
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeout: 900000, // 15 minutes
        monitoringPeriod: 1800000 // 30 minutes
      },
      stock_sync: {
        failureThreshold: 5,
        successThreshold: 3,
        resetTimeout: 180000, // 3 minutes
        monitoringPeriod: 300000 // 5 minutes
      }
    };

    const config = configs[syncType] || configs.stock_sync;
    return this.createCircuitBreaker(config);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for a function with predefined configuration
   * @param {Function} fn - Function to wrap
   * @param {Object} retryConfig - Retry configuration
   * @returns {Function} Wrapped function with retry logic
   */
  static withRetryWrapper(fn, retryConfig) {
    return async (...args) => {
      return this.withRetry(() => fn(...args), retryConfig);
    };
  }

  /**
   * Batch retry operations with concurrency control
   * @param {Array<Function>} operations - Array of operations to execute
   * @param {Object} options - Batch retry options
   * @returns {Promise<Array>} Array of results
   */
  static async batchRetry(operations, options = {}) {
    const config = {
      concurrency: 3,
      retryConfig: this.getRetryConfig('api_call'),
      failFast: false,
      ...options
    };

    const results = [];
    const errors = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += config.concurrency) {
      const batch = operations.slice(i, i + config.concurrency);
      
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await this.withRetry(operation, config.retryConfig);
          return { success: true, result, index: i + index };
        } catch (error) {
          const errorResult = { success: false, error, index: i + index };
          if (config.failFast) {
            throw error; // Throw the original error for failFast
          }
          return errorResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result.success) {
          results[result.index] = result.result;
        } else {
          errors.push(result);
          results[result.index] = null;
        }
      }
    }

    return {
      results,
      errors,
      successCount: results.filter(r => r !== null).length,
      errorCount: errors.length
    };
  }
}

module.exports = RetryUtil;