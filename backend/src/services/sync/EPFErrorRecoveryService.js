const {
  createSyncError,
  createRecoveryAction,
  createSyncWarning,
  SyncErrorTypes,
  RecoveryActions
} = require('./types/SyncTypes');

/**
 * EPF-specific error recovery service
 * Handles EPFO portal connectivity issues, credential problems, and sync failures
 */
class EPFErrorRecoveryService {
  constructor() {
    this.maxRetryAttempts = 5; // Higher for EPF due to portal instability
    this.baseRetryDelay = 2000; // 2 seconds
    this.maxRetryDelay = 300000; // 5 minutes
    this.credentialRetryLimit = 3; // Max attempts before disabling sync
    this.portalDowntimeThreshold = 30 * 60 * 1000; // 30 minutes
    
    // Track retry attempts per user
    this.userRetryAttempts = new Map();
    this.credentialFailures = new Map();
    this.portalDowntimeStart = null;
  }

  /**
   * Handle EPF sync errors and determine recovery actions
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the sync operation
   * @returns {Promise<Object>} Recovery action to take
   */
  async handleEPFSyncError(error, context = {}) {
    const { userId, attempt = 1, accountId } = context;
    
    // Categorize the error
    const categorizedError = this.categorizeEPFError(error);
    
    switch (categorizedError.type) {
      case SyncErrorTypes.NETWORK_TIMEOUT:
      case SyncErrorTypes.NETWORK_ERROR:
        return this.handleNetworkError(categorizedError, context);
        
      case SyncErrorTypes.AUTHENTICATION_FAILED:
      case SyncErrorTypes.CREDENTIAL_ERROR:
        return this.handleCredentialError(categorizedError, context);
        
      case SyncErrorTypes.SERVICE_UNAVAILABLE:
        return this.handlePortalDowntime(categorizedError, context);
        
      case SyncErrorTypes.RATE_LIMIT_EXCEEDED:
        return this.handleRateLimit(categorizedError, context);
        
      case 'CAPTCHA_REQUIRED':
        return this.handleCaptchaRequired(categorizedError, context);
        
      case 'PORTAL_MAINTENANCE':
        return this.handlePortalMaintenance(categorizedError, context);
        
      case 'SESSION_EXPIRED':
        return this.handleSessionExpired(categorizedError, context);
        
      case SyncErrorTypes.DATA_PARSING_FAILED:
        return this.handleDataParsingError(categorizedError, context);
        
      default:
        return this.handleUnknownError(categorizedError, context);
    }
  }

  /**
   * Handle network connectivity errors
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleNetworkError(error, context) {
    const { userId, attempt = 1 } = context;
    
    if (attempt >= this.maxRetryAttempts) {
      return createRecoveryAction({
        action: RecoveryActions.MANUAL_INTERVENTION,
        reason: 'Network connectivity issues persist after multiple attempts',
        metadata: {
          notifyUser: true,
          disableTemporarily: true,
          retryAfter: 60 * 60 * 1000 // 1 hour
        }
      });
    }
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
      this.maxRetryDelay
    );
    
    return createRecoveryAction({
      action: RecoveryActions.RETRY,
      delay,
      reason: `Network error - retrying in ${Math.round(delay / 1000)} seconds`,
      maxRetries: this.maxRetryAttempts,
      metadata: {
        attempt: attempt + 1,
        errorType: 'network'
      }
    });
  }

  /**
   * Handle credential-related errors
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleCredentialError(error, context) {
    const { userId } = context;
    
    // Track credential failures
    const failures = this.credentialFailures.get(userId) || 0;
    this.credentialFailures.set(userId, failures + 1);
    
    if (failures >= this.credentialRetryLimit) {
      return createRecoveryAction({
        action: RecoveryActions.DISABLE_SYNC,
        reason: 'Multiple credential failures - sync disabled for security',
        metadata: {
          notifyUser: true,
          requireCredentialUpdate: true,
          securityLock: true
        }
      });
    }
    
    // For first few failures, allow manual intervention
    return createRecoveryAction({
      action: RecoveryActions.MANUAL_INTERVENTION,
      reason: 'Invalid credentials - please update your EPFO login details',
      metadata: {
        notifyUser: true,
        credentialUpdate: true,
        failureCount: failures + 1
      }
    });
  }

  /**
   * Handle EPFO portal downtime
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handlePortalDowntime(error, context) {
    const now = Date.now();
    
    // Track portal downtime
    if (!this.portalDowntimeStart) {
      this.portalDowntimeStart = now;
    }
    
    const downtimeDuration = now - this.portalDowntimeStart;
    
    if (downtimeDuration > this.portalDowntimeThreshold) {
      // Portal has been down for too long
      return createRecoveryAction({
        action: RecoveryActions.DISABLE_SYNC,
        reason: 'EPFO portal has been unavailable for extended period',
        metadata: {
          notifyUser: true,
          temporaryDisable: true,
          retryAfter: 4 * 60 * 60 * 1000, // 4 hours
          downtimeDuration
        }
      });
    }
    
    // Retry with increasing delays
    const delay = Math.min(5 * 60 * 1000, downtimeDuration / 10); // 5 minutes max
    
    return createRecoveryAction({
      action: RecoveryActions.DELAY,
      delay,
      reason: `EPFO portal unavailable - retrying in ${Math.round(delay / 60000)} minutes`,
      metadata: {
        portalDown: true,
        downtimeDuration
      }
    });
  }

  /**
   * Handle rate limiting from EPFO portal
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleRateLimit(error, context) {
    // EPFO portal is strict about rate limiting
    const delay = error.retryAfter ? error.retryAfter * 1000 : 15 * 60 * 1000; // 15 minutes default
    
    return createRecoveryAction({
      action: RecoveryActions.DELAY,
      delay,
      reason: `Rate limit exceeded - waiting ${Math.round(delay / 60000)} minutes`,
      metadata: {
        rateLimited: true,
        respectPortalLimits: true
      }
    });
  }

  /**
   * Handle CAPTCHA requirement
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleCaptchaRequired(error, context) {
    return createRecoveryAction({
      action: RecoveryActions.MANUAL_INTERVENTION,
      reason: 'CAPTCHA verification required - manual login needed',
      metadata: {
        notifyUser: true,
        captchaRequired: true,
        requireManualLogin: true
      }
    });
  }

  /**
   * Handle portal maintenance
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handlePortalMaintenance(error, context) {
    // EPFO portal maintenance usually lasts several hours
    const maintenanceDelay = 6 * 60 * 60 * 1000; // 6 hours
    
    return createRecoveryAction({
      action: RecoveryActions.DELAY,
      delay: maintenanceDelay,
      reason: 'EPFO portal is under maintenance - will retry later',
      metadata: {
        maintenance: true,
        notifyUser: true,
        scheduledRetry: true
      }
    });
  }

  /**
   * Handle session expiration
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleSessionExpired(error, context) {
    return createRecoveryAction({
      action: RecoveryActions.RETRY,
      delay: 1000, // Immediate retry with re-authentication
      reason: 'Session expired - re-authenticating',
      maxRetries: 2, // Limited retries for session issues
      metadata: {
        reauthenticate: true,
        clearSession: true
      }
    });
  }

  /**
   * Handle data parsing errors
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleDataParsingError(error, context) {
    const { accountId } = context;
    
    return createRecoveryAction({
      action: RecoveryActions.SKIP_RECORD,
      reason: 'Unable to parse EPF data - portal format may have changed',
      metadata: {
        notifyAdmin: true,
        accountId,
        requiresInvestigation: true
      }
    });
  }

  /**
   * Handle unknown errors
   * @param {Object} error - Categorized error
   * @param {Object} context - Error context
   * @returns {Object} Recovery action
   * @private
   */
  handleUnknownError(error, context) {
    const { attempt = 1 } = context;
    
    if (attempt >= 2) {
      return createRecoveryAction({
        action: RecoveryActions.MANUAL_INTERVENTION,
        reason: `Unknown error occurred: ${error.message}`,
        metadata: {
          notifyAdmin: true,
          errorDetails: error,
          requiresInvestigation: true
        }
      });
    }
    
    return createRecoveryAction({
      action: RecoveryActions.RETRY,
      delay: 30000, // 30 seconds
      reason: 'Unknown error - retrying once',
      maxRetries: 2,
      metadata: {
        attempt: attempt + 1
      }
    });
  }

  /**
   * Categorize EPF-specific errors
   * @param {Error} error - Error to categorize
   * @returns {Object} Categorized error
   * @private
   */
  categorizeEPFError(error) {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.response?.status;
    
    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return createSyncError({
        type: SyncErrorTypes.NETWORK_ERROR,
        message: error.message,
        code: error.code
      });
    }
    
    if (error.code === 'ETIMEDOUT' || message.includes('timeout')) {
      return createSyncError({
        type: SyncErrorTypes.NETWORK_TIMEOUT,
        message: error.message,
        code: error.code
      });
    }
    
    // Authentication errors
    if (statusCode === 401 || message.includes('invalid') || message.includes('login')) {
      return createSyncError({
        type: SyncErrorTypes.AUTHENTICATION_FAILED,
        message: 'EPFO authentication failed',
        code: statusCode
      });
    }
    
    // CAPTCHA requirement
    if (message.includes('captcha') || message.includes('verification')) {
      return createSyncError({
        type: 'CAPTCHA_REQUIRED',
        message: 'CAPTCHA verification required',
        code: statusCode
      });
    }
    
    // Portal maintenance
    if (message.includes('maintenance') || message.includes('temporarily unavailable')) {
      return createSyncError({
        type: 'PORTAL_MAINTENANCE',
        message: 'EPFO portal is under maintenance',
        code: statusCode
      });
    }
    
    // Session expiration
    if (message.includes('session') || message.includes('expired')) {
      return createSyncError({
        type: 'SESSION_EXPIRED',
        message: 'EPFO session expired',
        code: statusCode
      });
    }
    
    // Rate limiting
    if (statusCode === 429 || message.includes('rate limit') || message.includes('too many')) {
      return createSyncError({
        type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
        message: 'EPFO portal rate limit exceeded',
        code: statusCode,
        retryAfter: error.response?.headers?.['retry-after']
      });
    }
    
    // Service unavailable
    if (statusCode >= 500 || message.includes('server error') || message.includes('unavailable')) {
      return createSyncError({
        type: SyncErrorTypes.SERVICE_UNAVAILABLE,
        message: 'EPFO portal is temporarily unavailable',
        code: statusCode
      });
    }
    
    // Data parsing errors
    if (message.includes('parse') || message.includes('format') || message.includes('invalid data')) {
      return createSyncError({
        type: SyncErrorTypes.DATA_PARSING_FAILED,
        message: error.message,
        code: error.code
      });
    }
    
    // Default to unknown error
    return createSyncError({
      type: SyncErrorTypes.UNKNOWN_ERROR,
      message: error.message,
      code: error.code
    });
  }

  /**
   * Reset portal downtime tracking when service is available
   */
  resetPortalDowntime() {
    this.portalDowntimeStart = null;
  }

  /**
   * Reset credential failure count for a user
   * @param {string} userId - User ID
   */
  resetCredentialFailures(userId) {
    this.credentialFailures.delete(userId);
  }

  /**
   * Get retry statistics for monitoring
   * @returns {Object} Retry statistics
   */
  getRetryStatistics() {
    return {
      activeRetries: this.userRetryAttempts.size,
      credentialFailures: this.credentialFailures.size,
      portalDowntime: this.portalDowntimeStart ? Date.now() - this.portalDowntimeStart : 0
    };
  }

  /**
   * Check if user has exceeded retry limits
   * @param {string} userId - User ID
   * @returns {boolean} True if retry limit exceeded
   */
  hasExceededRetryLimit(userId) {
    const attempts = this.userRetryAttempts.get(userId) || 0;
    return attempts >= this.maxRetryAttempts;
  }

  /**
   * Increment retry count for user
   * @param {string} userId - User ID
   */
  incrementRetryCount(userId) {
    const attempts = this.userRetryAttempts.get(userId) || 0;
    this.userRetryAttempts.set(userId, attempts + 1);
  }

  /**
   * Reset retry count for user
   * @param {string} userId - User ID
   */
  resetRetryCount(userId) {
    this.userRetryAttempts.delete(userId);
  }

  /**
   * Clean up old retry tracking data
   */
  cleanup() {
    // Clean up retry attempts older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    
    // This is a simplified cleanup - in production, you'd want to track timestamps
    if (this.portalDowntimeStart && (Date.now() - this.portalDowntimeStart) > cutoff) {
      this.resetPortalDowntime();
    }
  }
}

module.exports = EPFErrorRecoveryService;