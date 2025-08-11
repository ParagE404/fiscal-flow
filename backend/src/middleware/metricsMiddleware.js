/**
 * Metrics Middleware for Auto-Sync Integration
 * Integrates metrics collection with Express routes and sync operations
 */

const metricsCollector = require('../services/monitoring/MetricsCollector');

/**
 * Express middleware to collect HTTP metrics
 */
const httpMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Record HTTP request metrics
    metricsCollector.recordApiRequest(
      'internal',
      req.route?.path || req.path,
      res.statusCode,
      duration
    );
    
    // Call original end method
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Database operation wrapper to collect database metrics
 */
const withDatabaseMetrics = (operation, table) => {
  return async (queryFunction) => {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordDatabaseQuery(operation, table, duration);
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      metricsCollector.recordDatabaseQuery(operation, table, duration);
      metricsCollector.recordDatabaseConnectionError();
      throw error;
    }
  };
};

/**
 * External API call wrapper to collect API metrics
 */
const withApiMetrics = (provider, endpoint) => {
  return async (apiFunction) => {
    const startTime = Date.now();
    
    try {
      const result = await apiFunction();
      const duration = (Date.now() - startTime) / 1000;
      
      // Determine status code from result or assume success
      const statusCode = result?.status || result?.statusCode || 200;
      
      metricsCollector.recordApiRequest(provider, endpoint, statusCode, duration);
      metricsCollector.updateApiAvailability(provider, true);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = error?.response?.status || error?.statusCode || 500;
      
      metricsCollector.recordApiRequest(provider, endpoint, statusCode, duration);
      metricsCollector.updateApiAvailability(provider, false);
      
      // Check for rate limiting
      if (statusCode === 429 || error.message?.includes('rate limit')) {
        metricsCollector.recordApiRateLimitExceeded(provider);
      }
      
      throw error;
    }
  };
};

/**
 * Sync job wrapper to collect sync metrics
 */
const withSyncMetrics = (jobType, userId) => {
  return async (syncFunction) => {
    const startTime = Date.now();
    
    // Record job start
    metricsCollector.recordSyncJobStart(jobType, userId);
    
    try {
      const result = await syncFunction();
      const duration = (Date.now() - startTime) / 1000;
      
      // Record success metrics
      metricsCollector.recordSyncJobSuccess(
        jobType,
        userId,
        duration,
        result.recordsProcessed || 0,
        result.recordsUpdated || 0
      );
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorType = error.type || error.name || 'unknown_error';
      
      // Record failure metrics
      metricsCollector.recordSyncJobFailure(jobType, userId, duration, errorType);
      
      throw error;
    }
  };
};

/**
 * Cache operation wrapper to collect cache metrics
 */
const withCacheMetrics = (cacheType) => {
  return {
    get: async (key, getFunction) => {
      try {
        const result = await getFunction(key);
        if (result !== null && result !== undefined) {
          metricsCollector.recordCacheHit(cacheType);
        } else {
          metricsCollector.recordCacheMiss(cacheType);
        }
        return result;
      } catch (error) {
        metricsCollector.recordCacheMiss(cacheType);
        throw error;
      }
    },
    
    set: async (key, value, setFunction) => {
      return await setFunction(key, value);
    }
  };
};

/**
 * Security operation wrapper to collect security metrics
 */
const withSecurityMetrics = {
  recordCredentialDecryptionFailure: (service) => {
    metricsCollector.recordCredentialDecryptionFailure(service);
  },
  
  recordUnauthorizedAttempt: (userId, endpoint) => {
    metricsCollector.recordUnauthorizedAttempt(userId, endpoint);
  },
  
  recordDataValidationFailure: (jobType, validationType) => {
    metricsCollector.recordDataValidationFailure(jobType, validationType);
  }
};

/**
 * Business metrics updater
 */
const updateBusinessMetrics = {
  activeUsers: (count) => {
    metricsCollector.updateActiveUsersCount(count);
  },
  
  credentialsExpiring: (count) => {
    metricsCollector.updateCredentialsExpiringCount(count);
  }
};

/**
 * Connection pool metrics updater
 */
const updateConnectionPoolMetrics = (utilization) => {
  metricsCollector.updateConnectionPoolUtilization(utilization);
};

module.exports = {
  httpMetricsMiddleware,
  withDatabaseMetrics,
  withApiMetrics,
  withSyncMetrics,
  withCacheMetrics,
  withSecurityMetrics,
  updateBusinessMetrics,
  updateConnectionPoolMetrics,
  metricsCollector
};