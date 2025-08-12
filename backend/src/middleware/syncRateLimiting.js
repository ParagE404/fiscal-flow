const RateLimitingService = require('./rateLimitingMiddleware');

/**
 * Sync-specific rate limiting middleware
 * Applies appropriate rate limits to different sync operations
 */
class SyncRateLimitingMiddleware {
  constructor() {
    this.rateLimiter = new RateLimitingService();
  }

  /**
   * Apply rate limiting to manual sync endpoints
   * @returns {Function} Express middleware
   */
  applyManualSyncLimits() {
    return [
      this.rateLimiter.createIPBlockChecker(),
      this.rateLimiter.createUserLockChecker(),
      this.rateLimiter.createManualSyncLimiter(),
      this.rateLimiter.createDynamicLimiter('manual_sync')
    ];
  }

  /**
   * Apply rate limiting to sync configuration endpoints
   * @returns {Function} Express middleware
   */
  applySyncConfigLimits() {
    return [
      this.rateLimiter.createIPBlockChecker(),
      this.rateLimiter.createUserLockChecker(),
      this.rateLimiter.createApiLimiter()
    ];
  }

  /**
   * Apply rate limiting to credential management endpoints
   * @returns {Function} Express middleware
   */
  applyCredentialLimits() {
    return [
      this.rateLimiter.createIPBlockChecker(),
      this.rateLimiter.createUserLockChecker(),
      this.rateLimiter.createCredentialLimiter(),
      this.rateLimiter.createDynamicLimiter('credentials')
    ];
  }

  /**
   * Apply rate limiting to sync status endpoints
   * @returns {Function} Express middleware
   */
  applySyncStatusLimits() {
    return [
      this.rateLimiter.createIPBlockChecker(),
      this.rateLimiter.createApiLimiter()
    ];
  }

  /**
   * Custom rate limiter for bulk sync operations
   * @returns {Function} Express middleware
   */
  applyBulkSyncLimits() {
    return async (req, res, next) => {
      const userId = req.user?.id;
      const ip = req.ip;
      
      // Check for recent bulk sync operations
      const recentBulkSyncs = await this.getRecentBulkSyncs(userId, ip);
      
      if (recentBulkSyncs >= 2) { // Max 2 bulk syncs per hour
        await this.rateLimiter.logRateLimitExceeded(req, 'bulk_sync');
        return res.status(429).json({
          error: 'Bulk sync rate limit exceeded',
          message: 'Please wait before triggering another bulk sync operation',
          retryAfter: 3600 // 1 hour
        });
      }
      
      next();
    };
  }

  /**
   * Get recent bulk sync count for user/IP
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @returns {Promise<number>} Recent bulk sync count
   */
  async getRecentBulkSyncs(userId, ip) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const count = await prisma.auditLog.count({
      where: {
        userId,
        ipAddress: ip,
        auditType: 'bulk_sync_started',
        timestamp: { gte: oneHourAgo }
      }
    });
    
    return count;
  }

  /**
   * Middleware to track sync operation metrics
   * @returns {Function} Express middleware
   */
  trackSyncMetrics() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(data) {
        const duration = Date.now() - startTime;
        
        // Track sync metrics asynchronously
        setImmediate(async () => {
          try {
            await trackSyncOperation(req, res, duration, data);
          } catch (error) {
            console.error('Failed to track sync metrics:', error);
          }
        });
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }
}

/**
 * Track sync operation for metrics and abuse detection
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {number} duration - Operation duration
 * @param {Object} responseData - Response data
 */
async function trackSyncOperation(req, res, duration, responseData) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const userId = req.user?.id;
  const ip = req.ip;
  const endpoint = req.path;
  const method = req.method;
  const success = res.statusCode < 400;
  
  // Extract sync type from endpoint
  let syncType = 'unknown';
  if (endpoint.includes('/mutual-funds')) syncType = 'mutual_funds';
  else if (endpoint.includes('/epf')) syncType = 'epf';
  else if (endpoint.includes('/stocks')) syncType = 'stocks';
  else if (endpoint.includes('/sync')) syncType = 'general';
  
  // Log the operation
  await prisma.syncOperationLog.create({
    data: {
      userId,
      ipAddress: ip,
      endpoint,
      method,
      syncType,
      duration,
      success,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    }
  });
  
  // Check for abuse patterns
  if (!success) {
    await checkForAbusePatterns(userId, ip, syncType);
  }
}

/**
 * Check for abuse patterns in sync operations
 * @param {string} userId - User ID
 * @param {string} ip - IP address
 * @param {string} syncType - Type of sync operation
 */
async function checkForAbusePatterns(userId, ip, syncType) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Check failure rate
  const totalOps = await prisma.syncOperationLog.count({
    where: {
      userId,
      ipAddress: ip,
      syncType,
      timestamp: { gte: oneHourAgo }
    }
  });
  
  const failedOps = await prisma.syncOperationLog.count({
    where: {
      userId,
      ipAddress: ip,
      syncType,
      success: false,
      timestamp: { gte: oneHourAgo }
    }
  });
  
  const failureRate = totalOps > 0 ? failedOps / totalOps : 0;
  
  // Flag if failure rate is too high
  if (failureRate > 0.7 && totalOps >= 5) {
    await prisma.suspiciousActivity.create({
      data: {
        userId,
        ipAddress: ip,
        activityType: 'high_sync_failure_rate',
        details: JSON.stringify({
          syncType,
          failureRate,
          totalOperations: totalOps,
          failedOperations: failedOps
        }),
        severity: Math.min(10, Math.floor(failureRate * 10)),
        timestamp: new Date()
      }
    });
  }
}

module.exports = SyncRateLimitingMiddleware;