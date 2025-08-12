/**
 * Data Source Manager for handling fallback mechanisms and health monitoring
 * Provides automatic switching between primary and secondary data sources
 */

const { createSyncError, SyncErrorTypes, DataSources } = require('../interfaces');
const RetryUtil = require('./RetryUtil');

class DataSourceManager {
  constructor() {
    this.healthStatus = new Map();
    this.fallbackMappings = new Map();
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    this.healthCheckTimeouts = new Map();
    this.circuitBreakers = new Map();
    
    this.initializeFallbackMappings();
    this.startHealthMonitoring();
  }

  /**
   * Initialize fallback mappings for different data sources
   * @private
   */
  initializeFallbackMappings() {
    // Mutual Fund data sources
    this.fallbackMappings.set(DataSources.AMFI, [DataSources.MF_CENTRAL]);
    this.fallbackMappings.set(DataSources.MF_CENTRAL, [DataSources.AMFI]);
    
    // Stock price data sources
    this.fallbackMappings.set(DataSources.YAHOO_FINANCE, [DataSources.NSE, DataSources.ALPHA_VANTAGE]);
    this.fallbackMappings.set(DataSources.NSE, [DataSources.YAHOO_FINANCE, DataSources.BSE]);
    this.fallbackMappings.set(DataSources.BSE, [DataSources.NSE, DataSources.YAHOO_FINANCE]);
    this.fallbackMappings.set(DataSources.ALPHA_VANTAGE, [DataSources.YAHOO_FINANCE, DataSources.NSE]);
    
    // EPF data sources (currently only EPFO, but prepared for Account Aggregator)
    this.fallbackMappings.set(DataSources.EPFO, []); // No fallback yet
    
    // Initialize health status for all sources
    Object.values(DataSources).forEach(source => {
      this.healthStatus.set(source, {
        isHealthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        lastError: null,
        responseTime: null,
        uptime: 100
      });
      
      // Create circuit breaker for each source
      this.circuitBreakers.set(source, RetryUtil.createCircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 300000 // 5 minutes
      }));
    });
  }

  /**
   * Get the best available data source for a given primary source
   * @param {string} primarySource - Primary data source
   * @param {Object} options - Options for source selection
   * @returns {Promise<string>} Best available data source
   */
  async getBestAvailableSource(primarySource, options = {}) {
    const {
      skipHealthCheck = false,
      preferredFallbacks = [],
      excludeSources = []
    } = options;

    // Check if primary source is healthy and available
    if (!excludeSources.includes(primarySource)) {
      const primaryHealth = await this.checkSourceHealth(primarySource, skipHealthCheck);
      if (primaryHealth.isHealthy) {
        return primarySource;
      }
    }

    // Get fallback sources
    const fallbacks = preferredFallbacks.length > 0 
      ? preferredFallbacks 
      : this.fallbackMappings.get(primarySource) || [];

    // Try fallback sources in order
    for (const fallbackSource of fallbacks) {
      if (excludeSources.includes(fallbackSource)) {
        continue;
      }

      const fallbackHealth = await this.checkSourceHealth(fallbackSource, skipHealthCheck);
      if (fallbackHealth.isHealthy) {
        console.log(`Falling back from ${primarySource} to ${fallbackSource}`);
        return fallbackSource;
      }
    }

    // If no healthy sources found, return primary source anyway
    // The calling code will handle the failure
    console.warn(`No healthy data sources found for ${primarySource}, using primary source`);
    return primarySource;
  }

  /**
   * Execute operation with automatic fallback to secondary sources
   * @param {string} primarySource - Primary data source
   * @param {Function} operation - Operation to execute (receives source as parameter)
   * @param {Object} options - Execution options
   * @returns {Promise<any>} Operation result
   */
  async executeWithFallback(primarySource, operation, options = {}) {
    const {
      maxFallbacks = 3,
      retryConfig = RetryUtil.getRetryConfig('api_call'),
      onFallback = null
    } = options;

    const attemptedSources = [];
    let lastError;

    for (let attempt = 0; attempt < maxFallbacks + 1; attempt++) {
      try {
        const currentSource = await this.getBestAvailableSource(
          primarySource, 
          { excludeSources: attemptedSources }
        );

        if (attemptedSources.includes(currentSource)) {
          // All sources have been tried
          break;
        }

        attemptedSources.push(currentSource);

        // Get circuit breaker for this source
        const circuitBreaker = this.circuitBreakers.get(currentSource);
        
        // Check if circuit breaker allows operation
        if (!circuitBreaker.isOperationAllowed()) {
          throw new Error(`Circuit breaker is OPEN for ${currentSource}`);
        }
        
        // Execute operation with retry logic
        const result = await RetryUtil.withRetry(
          () => operation(currentSource),
          retryConfig
        );

        // Record successful operation
        this.recordSourceSuccess(currentSource);
        
        return {
          result,
          source: currentSource,
          attemptedSources,
          fallbackUsed: currentSource !== primarySource
        };

      } catch (error) {
        lastError = error;
        const currentSource = attemptedSources[attemptedSources.length - 1];
        
        // Record failure
        this.recordSourceFailure(currentSource, error);
        
        // Call fallback callback if provided
        if (onFallback && attempt < maxFallbacks) {
          try {
            await onFallback(currentSource, error, attempt + 1);
          } catch (callbackError) {
            console.error('Fallback callback failed:', callbackError.message);
          }
        }

        console.warn(`Data source ${currentSource} failed (attempt ${attempt + 1}):`, error.message);
      }
    }

    // All sources failed
    throw createSyncError({
      type: SyncErrorTypes.SERVICE_UNAVAILABLE,
      message: `All data sources failed for ${primarySource}. Attempted: ${attemptedSources.join(', ')}`,
      details: {
        primarySource,
        attemptedSources,
        lastError: lastError.message
      }
    });
  }

  /**
   * Check health status of a data source
   * @param {string} source - Data source to check
   * @param {boolean} skipCheck - Skip actual health check and return cached status
   * @returns {Promise<Object>} Health status
   */
  async checkSourceHealth(source, skipCheck = false) {
    const currentStatus = this.healthStatus.get(source);
    
    if (!currentStatus) {
      throw new Error(`Unknown data source: ${source}`);
    }

    // Return cached status if skip check is requested or recent check exists
    const timeSinceLastCheck = Date.now() - currentStatus.lastCheck.getTime();
    if (skipCheck || timeSinceLastCheck < this.healthCheckInterval) {
      return { ...currentStatus };
    }

    // Perform health check
    try {
      const startTime = Date.now();
      await this.performHealthCheck(source);
      const responseTime = Date.now() - startTime;

      // Update health status
      const updatedStatus = {
        ...currentStatus,
        isHealthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        lastError: null,
        responseTime,
        uptime: Math.min(100, currentStatus.uptime + 1)
      };

      this.healthStatus.set(source, updatedStatus);
      return { ...updatedStatus };

    } catch (error) {
      // Update health status with failure
      const consecutiveFailures = currentStatus.consecutiveFailures + 1;
      const isHealthy = consecutiveFailures < 3; // Mark unhealthy after 3 consecutive failures

      const updatedStatus = {
        ...currentStatus,
        isHealthy,
        lastCheck: new Date(),
        consecutiveFailures,
        lastError: error.message,
        responseTime: null,
        uptime: Math.max(0, currentStatus.uptime - 5)
      };

      this.healthStatus.set(source, updatedStatus);
      
      // If this was a real health check (not cached), throw the error
      if (!skipCheck) {
        throw error;
      }
      
      return { ...updatedStatus };
    }
  }

  /**
   * Perform actual health check for a data source
   * @param {string} source - Data source to check
   * @returns {Promise<void>}
   * @private
   */
  async performHealthCheck(source) {
    const axios = require('axios');
    
    const healthCheckUrls = {
      [DataSources.AMFI]: 'https://www.amfiindia.com/spages/NAVAll.txt',
      [DataSources.YAHOO_FINANCE]: 'https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS',
      [DataSources.NSE]: 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050',
      [DataSources.BSE]: 'https://api.bseindia.com/BseIndiaAPI/api/DefaultData/w',
      [DataSources.ALPHA_VANTAGE]: 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=1min&apikey=demo'
    };

    const url = healthCheckUrls[source];
    if (!url) {
      throw new Error(`No health check URL configured for source: ${source}`);
    }

    // Perform lightweight health check
    const response = await axios.head(url, {
      timeout: 10000,
      validateStatus: (status) => status < 500 // Accept 4xx as healthy (might be auth issues)
    });

    if (response.status >= 500) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
  }

  /**
   * Record successful operation for a data source
   * @param {string} source - Data source
   */
  recordSourceSuccess(source) {
    const currentStatus = this.healthStatus.get(source);
    if (currentStatus) {
      this.healthStatus.set(source, {
        ...currentStatus,
        isHealthy: true,
        consecutiveFailures: 0,
        lastError: null,
        uptime: Math.min(100, currentStatus.uptime + 2)
      });
    }

    // Record success in circuit breaker
    const circuitBreaker = this.circuitBreakers.get(source);
    if (circuitBreaker) {
      circuitBreaker.recordSuccess();
    }
  }

  /**
   * Record failed operation for a data source
   * @param {string} source - Data source
   * @param {Error} error - Error that occurred
   */
  recordSourceFailure(source, error) {
    const currentStatus = this.healthStatus.get(source);
    if (currentStatus) {
      const consecutiveFailures = currentStatus.consecutiveFailures + 1;
      this.healthStatus.set(source, {
        ...currentStatus,
        isHealthy: consecutiveFailures < 3,
        consecutiveFailures,
        lastError: error.message,
        uptime: Math.max(0, currentStatus.uptime - 3)
      });
    }

    // Record failure in circuit breaker
    const circuitBreaker = this.circuitBreakers.get(source);
    if (circuitBreaker) {
      circuitBreaker.recordFailure(error);
    }
  }

  /**
   * Get health status for all data sources
   * @returns {Object} Health status map
   */
  getAllHealthStatus() {
    const status = {};
    this.healthStatus.forEach((health, source) => {
      status[source] = { ...health };
    });
    return status;
  }

  /**
   * Get health status for a specific data source
   * @param {string} source - Data source
   * @returns {Object|null} Health status or null if source not found
   */
  getSourceHealth(source) {
    const status = this.healthStatus.get(source);
    return status ? { ...status } : null;
  }

  /**
   * Manually override health status for a data source
   * @param {string} source - Data source
   * @param {boolean} isHealthy - Health status to set
   * @param {string} reason - Reason for manual override
   */
  setSourceHealth(source, isHealthy, reason = 'Manual override') {
    const currentStatus = this.healthStatus.get(source);
    if (currentStatus) {
      this.healthStatus.set(source, {
        ...currentStatus,
        isHealthy,
        lastError: isHealthy ? null : reason,
        consecutiveFailures: isHealthy ? 0 : currentStatus.consecutiveFailures
      });

      // Reset circuit breaker if marking as healthy
      if (isHealthy) {
        const circuitBreaker = this.circuitBreakers.get(source);
        if (circuitBreaker) {
          circuitBreaker.reset();
        }
      }

      console.log(`Manually set ${source} health to ${isHealthy ? 'healthy' : 'unhealthy'}: ${reason}`);
    }
  }

  /**
   * Add or update fallback mapping for a data source
   * @param {string} primarySource - Primary data source
   * @param {string[]} fallbackSources - Array of fallback sources in priority order
   */
  setFallbackMapping(primarySource, fallbackSources) {
    this.fallbackMappings.set(primarySource, [...fallbackSources]);
    console.log(`Updated fallback mapping for ${primarySource}:`, fallbackSources);
  }

  /**
   * Get fallback sources for a primary source
   * @param {string} primarySource - Primary data source
   * @returns {string[]} Array of fallback sources
   */
  getFallbackSources(primarySource) {
    return this.fallbackMappings.get(primarySource) || [];
  }

  /**
   * Start periodic health monitoring
   * @private
   */
  startHealthMonitoring() {
    // Perform health checks every 5 minutes
    this.healthMonitoringInterval = setInterval(async () => {
      const sources = Array.from(this.healthStatus.keys());
      
      for (const source of sources) {
        try {
          await this.checkSourceHealth(source, false);
        } catch (error) {
          console.error(`Health check failed for ${source}:`, error.message);
        }
      }
    }, this.healthCheckInterval);

    console.log('Data source health monitoring started');
  }

  /**
   * Stop health monitoring (for testing or shutdown)
   */
  stopHealthMonitoring() {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = null;
    }
    this.healthCheckTimeouts.forEach(timeout => clearTimeout(timeout));
    this.healthCheckTimeouts.clear();
    console.log('Data source health monitoring stopped');
  }

  /**
   * Get circuit breaker state for a data source
   * @param {string} source - Data source
   * @returns {Object|null} Circuit breaker state
   */
  getCircuitBreakerState(source) {
    const circuitBreaker = this.circuitBreakers.get(source);
    return circuitBreaker ? circuitBreaker.getState() : null;
  }

  /**
   * Reset circuit breaker for a data source
   * @param {string} source - Data source
   */
  resetCircuitBreaker(source) {
    const circuitBreaker = this.circuitBreakers.get(source);
    if (circuitBreaker) {
      circuitBreaker.reset();
      console.log(`Circuit breaker reset for ${source}`);
    }
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of DataSourceManager
 * @returns {DataSourceManager} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new DataSourceManager();
  }
  return instance;
}

module.exports = {
  DataSourceManager,
  getInstance
};