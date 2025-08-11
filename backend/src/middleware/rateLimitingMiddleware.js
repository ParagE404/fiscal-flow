const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Enhanced rate limiting middleware with user-specific and IP-based limits
 * Implements configurable thresholds and suspicious activity detection
 */
class RateLimitingService {
  constructor() {
    // Rate limiting configurations
    this.configs = {
      // Manual sync operations - user-specific limits
      manualSync: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10, // 10 manual syncs per 15 minutes per user
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      
      // API endpoints - IP-based limits
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // 100 requests per 15 minutes per IP
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      },
      
      // Authentication endpoints - stricter limits
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 login attempts per 15 minutes per IP
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      },
      
      // Credential management - very strict limits
      credentials: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3, // 3 credential operations per hour per user
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    };
    
    // Suspicious activity thresholds
    this.suspiciousThresholds = {
      rapidRequests: 50, // Requests per minute
      failureRate: 0.8, // 80% failure rate
      multipleIPs: 5, // Same user from 5+ different IPs
      unusualHours: true // Activity during unusual hours (2-6 AM IST)
    };
  }

  /**
   * Create rate limiter for manual sync operations (user-specific)
   * @returns {Function} Express middleware
   */
  createManualSyncLimiter() {
    return rateLimit({
      windowMs: this.configs.manualSync.windowMs,
      max: this.configs.manualSync.maxRequests,
      keyGenerator: (req) => {
        // Use user ID for user-specific limiting
        return `manual_sync:${req.user?.id || req.ip}`;
      },
      handler: async (req, res) => {
        await this.logRateLimitExceeded(req, 'manual_sync');
        res.status(429).json({
          error: 'Too many manual sync requests',
          message: 'Please wait before triggering another manual sync',
          retryAfter: Math.ceil(this.configs.manualSync.windowMs / 1000)
        });
      },
      onLimitReached: async (req, res, options) => {
        await this.detectSuspiciousActivity(req, 'manual_sync_limit_reached');
      }
    });
  }

  /**
   * Create rate limiter for general API endpoints (IP-based)
   * @returns {Function} Express middleware
   */
  createApiLimiter() {
    return rateLimit({
      windowMs: this.configs.api.windowMs,
      max: this.configs.api.maxRequests,
      keyGenerator: (req) => {
        return `api:${req.ip}`;
      },
      skip: (req) => {
        // Skip rate limiting for successful GET requests
        return req.method === 'GET' && this.configs.api.skipSuccessfulRequests;
      },
      handler: async (req, res) => {
        await this.logRateLimitExceeded(req, 'api');
        res.status(429).json({
          error: 'Too many requests',
          message: 'API rate limit exceeded',
          retryAfter: Math.ceil(this.configs.api.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Create rate limiter for authentication endpoints
   * @returns {Function} Express middleware
   */
  createAuthLimiter() {
    return rateLimit({
      windowMs: this.configs.auth.windowMs,
      max: this.configs.auth.maxRequests,
      keyGenerator: (req) => {
        return `auth:${req.ip}`;
      },
      handler: async (req, res) => {
        await this.logRateLimitExceeded(req, 'auth');
        await this.detectSuspiciousActivity(req, 'auth_rate_limit');
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please wait before trying again',
          retryAfter: Math.ceil(this.configs.auth.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Create rate limiter for credential management endpoints
   * @returns {Function} Express middleware
   */
  createCredentialLimiter() {
    return rateLimit({
      windowMs: this.configs.credentials.windowMs,
      max: this.configs.credentials.maxRequests,
      keyGenerator: (req) => {
        return `credentials:${req.user?.id || req.ip}`;
      },
      handler: async (req, res) => {
        await this.logRateLimitExceeded(req, 'credentials');
        await this.detectSuspiciousActivity(req, 'credential_rate_limit');
        
        res.status(429).json({
          error: 'Too many credential operations',
          message: 'Credential management rate limit exceeded',
          retryAfter: Math.ceil(this.configs.credentials.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Dynamic rate limiter that adjusts based on user behavior
   * @param {string} type - Rate limit type
   * @returns {Function} Express middleware
   */
  createDynamicLimiter(type) {
    return async (req, res, next) => {
      const userId = req.user?.id;
      const ip = req.ip;
      
      // Get user's recent activity
      const userActivity = await this.getUserActivity(userId, ip);
      
      // Adjust limits based on user reputation
      const adjustedLimits = this.calculateDynamicLimits(type, userActivity);
      
      // Check if request should be allowed
      const allowed = await this.checkDynamicLimit(userId, ip, type, adjustedLimits);
      
      if (!allowed) {
        await this.logRateLimitExceeded(req, `dynamic_${type}`);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Request frequency too high for your current reputation',
          retryAfter: adjustedLimits.retryAfter
        });
      }
      
      // Track the request
      await this.trackRequest(userId, ip, type);
      next();
    };
  }

  /**
   * Log rate limit exceeded events
   * @param {Object} req - Express request object
   * @param {string} limitType - Type of rate limit
   * @returns {Promise<void>}
   */
  async logRateLimitExceeded(req, limitType) {
    try {
      await prisma.rateLimitLog.create({
        data: {
          userId: req.user?.id || null,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
          limitType,
          endpoint: req.path,
          method: req.method,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log rate limit exceeded:', error);
    }
  }

  /**
   * Detect suspicious activity patterns
   * @param {Object} req - Express request object
   * @param {string} activityType - Type of suspicious activity
   * @returns {Promise<void>}
   */
  async detectSuspiciousActivity(req, activityType) {
    const userId = req.user?.id;
    const ip = req.ip;
    
    try {
      // Check for rapid requests from same IP
      const recentRequests = await this.getRecentRequests(ip, 60000); // Last minute
      if (recentRequests >= this.suspiciousThresholds.rapidRequests) {
        await this.flagSuspiciousActivity(userId, ip, 'rapid_requests', {
          requestCount: recentRequests,
          timeWindow: '1 minute'
        });
      }
      
      // Check for high failure rate
      const failureRate = await this.getFailureRate(userId, ip);
      if (failureRate >= this.suspiciousThresholds.failureRate) {
        await this.flagSuspiciousActivity(userId, ip, 'high_failure_rate', {
          failureRate: failureRate,
          threshold: this.suspiciousThresholds.failureRate
        });
      }
      
      // Check for multiple IPs for same user
      if (userId) {
        const uniqueIPs = await this.getUserUniqueIPs(userId, 24 * 60 * 60 * 1000); // Last 24 hours
        if (uniqueIPs >= this.suspiciousThresholds.multipleIPs) {
          await this.flagSuspiciousActivity(userId, ip, 'multiple_ips', {
            uniqueIPCount: uniqueIPs,
            threshold: this.suspiciousThresholds.multipleIPs
          });
        }
      }
      
      // Check for unusual hours activity
      if (this.suspiciousThresholds.unusualHours && this.isUnusualHour()) {
        await this.flagSuspiciousActivity(userId, ip, 'unusual_hours', {
          hour: new Date().getHours(),
          timezone: 'Asia/Kolkata'
        });
      }
      
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
    }
  }

  /**
   * Flag suspicious activity and take protective actions
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @param {string} type - Suspicious activity type
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async flagSuspiciousActivity(userId, ip, type, details) {
    // Log the suspicious activity
    await prisma.suspiciousActivity.create({
      data: {
        userId,
        ipAddress: ip,
        activityType: type,
        details: JSON.stringify(details),
        severity: this.calculateSeverity(type, details),
        timestamp: new Date()
      }
    });
    
    // Take protective actions based on severity
    const severity = this.calculateSeverity(type, details);
    
    if (severity >= 8) { // High severity
      await this.temporaryBlockIP(ip, 60 * 60 * 1000); // 1 hour block
      if (userId) {
        await this.temporaryLockUser(userId, 30 * 60 * 1000); // 30 minute lock
      }
    } else if (severity >= 6) { // Medium severity
      await this.temporaryBlockIP(ip, 15 * 60 * 1000); // 15 minute block
    }
    
    // Send alert to administrators for high severity
    if (severity >= 8) {
      await this.sendSecurityAlert(type, { userId, ip, details, severity });
    }
  }

  /**
   * Calculate severity score for suspicious activity
   * @param {string} type - Activity type
   * @param {Object} details - Activity details
   * @returns {number} Severity score (1-10)
   */
  calculateSeverity(type, details) {
    let severity = 1;
    
    switch (type) {
      case 'rapid_requests':
        severity = Math.min(10, Math.floor(details.requestCount / 10));
        break;
      case 'high_failure_rate':
        severity = Math.floor(details.failureRate * 10);
        break;
      case 'multiple_ips':
        severity = Math.min(10, Math.floor(details.uniqueIPCount / 2));
        break;
      case 'unusual_hours':
        severity = 3;
        break;
      case 'auth_rate_limit':
        severity = 7;
        break;
      case 'credential_rate_limit':
        severity = 9;
        break;
      default:
        severity = 5;
    }
    
    return Math.max(1, Math.min(10, severity));
  }

  /**
   * Temporarily block an IP address
   * @param {string} ip - IP address to block
   * @param {number} duration - Block duration in milliseconds
   * @returns {Promise<void>}
   */
  async temporaryBlockIP(ip, duration) {
    const expiresAt = new Date(Date.now() + duration);
    
    await prisma.ipBlock.create({
      data: {
        ipAddress: ip,
        reason: 'Suspicious activity detected',
        blockedAt: new Date(),
        expiresAt,
        isActive: true
      }
    });
  }

  /**
   * Temporarily lock a user account
   * @param {string} userId - User ID to lock
   * @param {number} duration - Lock duration in milliseconds
   * @returns {Promise<void>}
   */
  async temporaryLockUser(userId, duration) {
    const expiresAt = new Date(Date.now() + duration);
    
    await prisma.userLock.create({
      data: {
        userId,
        reason: 'Suspicious activity detected',
        lockedAt: new Date(),
        expiresAt,
        isActive: true
      }
    });
  }

  /**
   * Check if current time is during unusual hours (2-6 AM IST)
   * @returns {boolean} True if unusual hour
   */
  isUnusualHour() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hour = istTime.getHours();
    
    return hour >= 2 && hour <= 6;
  }

  /**
   * Get recent request count for an IP
   * @param {string} ip - IP address
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Promise<number>} Request count
   */
  async getRecentRequests(ip, timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    
    const count = await prisma.rateLimitLog.count({
      where: {
        ipAddress: ip,
        timestamp: { gte: since }
      }
    });
    
    return count;
  }

  /**
   * Get failure rate for user/IP combination
   * @param {string} userId - User ID
   * @param {string} ip - IP address
   * @returns {Promise<number>} Failure rate (0-1)
   */
  async getFailureRate(userId, ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    
    const total = await prisma.auditLog.count({
      where: {
        userId,
        ipAddress: ip,
        timestamp: { gte: since }
      }
    });
    
    if (total === 0) return 0;
    
    const failures = await prisma.auditLog.count({
      where: {
        userId,
        ipAddress: ip,
        timestamp: { gte: since },
        auditType: { contains: 'failed' }
      }
    });
    
    return failures / total;
  }

  /**
   * Get unique IP count for a user
   * @param {string} userId - User ID
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Promise<number>} Unique IP count
   */
  async getUserUniqueIPs(userId, timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    
    const result = await prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        userId,
        timestamp: { gte: since },
        ipAddress: { not: null }
      }
    });
    
    return result.length;
  }

  /**
   * Send security alert to administrators
   * @param {string} type - Alert type
   * @param {Object} details - Alert details
   * @returns {Promise<void>}
   */
  async sendSecurityAlert(type, details) {
    // This would integrate with notification service
    console.warn(`SECURITY ALERT: ${type}`, details);
    
    // Log the alert
    await prisma.securityAlert.create({
      data: {
        alertType: type,
        severity: details.severity,
        details: JSON.stringify(details),
        timestamp: new Date(),
        acknowledged: false
      }
    });
  }

  /**
   * Middleware to check if IP is blocked
   * @returns {Function} Express middleware
   */
  createIPBlockChecker() {
    return async (req, res, next) => {
      const ip = req.ip;
      
      const block = await prisma.ipBlock.findFirst({
        where: {
          ipAddress: ip,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (block) {
        return res.status(403).json({
          error: 'IP address blocked',
          message: 'Your IP address has been temporarily blocked due to suspicious activity',
          blockedUntil: block.expiresAt
        });
      }
      
      next();
    };
  }

  /**
   * Middleware to check if user is locked
   * @returns {Function} Express middleware
   */
  createUserLockChecker() {
    return async (req, res, next) => {
      const userId = req.user?.id;
      
      if (!userId) {
        return next();
      }
      
      const lock = await prisma.userLock.findFirst({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (lock) {
        return res.status(403).json({
          error: 'Account temporarily locked',
          message: 'Your account has been temporarily locked due to suspicious activity',
          lockedUntil: lock.expiresAt
        });
      }
      
      next();
    };
  }
}

module.exports = RateLimitingService;