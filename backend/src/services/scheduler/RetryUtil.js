/**
 * Retry Utility for handling failed operations with exponential backoff
 */
class RetryUtil {
  /**
   * Execute an operation with retry logic
   * @param {Function} operation - Async function to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Result of the operation
   */
  static async withRetry(operation, options = {}) {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      retryCondition = (error) => true,
      onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!retryCondition(error)) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        let delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, error.message);
        
        // Call retry callback if provided
        if (onRetry) {
          await onRetry(error, attempt, delay);
        }
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
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
   * Create a retry condition function for specific error types
   * @param {Array<string>} retryableErrors - Array of error types/messages to retry
   * @returns {Function} Retry condition function
   */
  static createRetryCondition(retryableErrors) {
    return (error) => {
      const errorMessage = error.message.toLowerCase();
      const errorType = error.constructor.name.toLowerCase();
      
      return retryableErrors.some(retryable => 
        errorMessage.includes(retryable.toLowerCase()) ||
        errorType.includes(retryable.toLowerCase())
      );
    };
  }

  /**
   * Get default retry options for different operation types
   * @param {string} operationType - Type of operation (network, database, etc.)
   * @returns {Object} Default retry options
   */
  static getDefaultOptions(operationType) {
    const defaults = {
      network: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        retryCondition: this.createRetryCondition([
          'timeout', 'network', 'connection', 'econnreset', 'enotfound'
        ])
      },
      database: {
        maxAttempts: 2,
        baseDelay: 500,
        maxDelay: 5000,
        backoffFactor: 2,
        retryCondition: this.createRetryCondition([
          'connection', 'timeout', 'lock', 'deadlock'
        ])
      },
      api: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffFactor: 2,
        retryCondition: (error) => {
          // Retry on 5xx errors and specific 4xx errors
          if (error.response && error.response.status) {
            const status = error.response.status;
            return status >= 500 || status === 429 || status === 408;
          }
          return this.createRetryCondition(['timeout', 'network'])(error);
        }
      },
      sync: {
        maxAttempts: 2,
        baseDelay: 5000,
        maxDelay: 60000,
        backoffFactor: 3,
        retryCondition: this.createRetryCondition([
          'timeout', 'network', 'temporary', 'rate limit'
        ])
      }
    };

    return defaults[operationType] || defaults.network;
  }

  /**
   * Create a circuit breaker for preventing cascading failures
   * @param {Object} options - Circuit breaker options
   * @returns {Object} Circuit breaker instance
   */
  static createCircuitBreaker(options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      monitoringPeriod = 60000
    } = options;

    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let lastFailureTime = null;
    let successCount = 0;

    return {
      async execute(operation) {
        if (state === 'OPEN') {
          if (Date.now() - lastFailureTime > resetTimeout) {
            state = 'HALF_OPEN';
            successCount = 0;
          } else {
            throw new Error('Circuit breaker is OPEN');
          }
        }

        try {
          const result = await operation();
          
          if (state === 'HALF_OPEN') {
            successCount++;
            if (successCount >= 2) {
              state = 'CLOSED';
              failureCount = 0;
            }
          } else if (state === 'CLOSED') {
            failureCount = 0;
          }
          
          return result;
        } catch (error) {
          failureCount++;
          lastFailureTime = Date.now();
          
          if (failureCount >= failureThreshold) {
            state = 'OPEN';
          }
          
          throw error;
        }
      },

      getState() {
        return {
          state,
          failureCount,
          lastFailureTime,
          successCount
        };
      },

      reset() {
        state = 'CLOSED';
        failureCount = 0;
        lastFailureTime = null;
        successCount = 0;
      }
    };
  }
}

module.exports = RetryUtil;