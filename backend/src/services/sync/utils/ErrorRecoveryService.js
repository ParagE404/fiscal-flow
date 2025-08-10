/**
 * Error Recovery Service for handling sync failures and manual intervention workflows
 * Provides context-aware recovery strategies and escalation mechanisms
 */

const { createSyncError, createRecoveryAction, SyncErrorTypes, RecoveryActions } = require('../interfaces');
const { getInstance: getDataSourceManager } = require('./DataSourceManager');
const RetryUtil = require('./RetryUtil');

class ErrorRecoveryService {
  constructor() {
    this.recoveryStrategies = new Map();
    this.escalationRules = new Map();
    this.interventionQueue = new Map(); // userId -> interventions
    this.recoveryHistory = new Map(); // Track recovery attempts
    
    this.initializeRecoveryStrategies();
    this.initializeEscalationRules();
  }

  /**
   * Initialize default recovery strategies for different error types
   * @private
   */
  initializeRecoveryStrategies() {
    // Network and connectivity errors
    this.recoveryStrategies.set(SyncErrorTypes.NETWORK_ERROR, {
      strategy: 'retry_with_backoff',
      maxAttempts: 3,
      baseDelay: 2000,
      escalateAfter: 3,
      fallbackAction: RecoveryActions.FALLBACK_SOURCE
    });

    this.recoveryStrategies.set(SyncErrorTypes.NETWORK_TIMEOUT, {
      strategy: 'retry_with_backoff',
      maxAttempts: 2,
      baseDelay: 5000,
      escalateAfter: 2,
      fallbackAction: RecoveryActions.FALLBACK_SOURCE
    });

    // Authentication and authorization errors
    this.recoveryStrategies.set(SyncErrorTypes.AUTHENTICATION_FAILED, {
      strategy: 'manual_intervention',
      maxAttempts: 0,
      escalateAfter: 1,
      interventionType: 'credential_update',
      fallbackAction: RecoveryActions.DISABLE_SYNC
    });

    this.recoveryStrategies.set(SyncErrorTypes.AUTHORIZATION_FAILED, {
      strategy: 'manual_intervention',
      maxAttempts: 0,
      escalateAfter: 1,
      interventionType: 'permission_check',
      fallbackAction: RecoveryActions.DISABLE_SYNC
    });

    // Rate limiting errors
    this.recoveryStrategies.set(SyncErrorTypes.RATE_LIMIT_EXCEEDED, {
      strategy: 'delay_and_retry',
      maxAttempts: 2,
      baseDelay: 60000, // 1 minute
      escalateAfter: 3,
      fallbackAction: RecoveryActions.FALLBACK_SOURCE
    });

    // Service availability errors
    this.recoveryStrategies.set(SyncErrorTypes.SERVICE_UNAVAILABLE, {
      strategy: 'fallback_with_retry',
      maxAttempts: 1,
      baseDelay: 10000,
      escalateAfter: 2,
      fallbackAction: RecoveryActions.FALLBACK_SOURCE
    });

    // Data validation and parsing errors
    this.recoveryStrategies.set(SyncErrorTypes.DATA_VALIDATION_FAILED, {
      strategy: 'skip_and_continue',
      maxAttempts: 1,
      escalateAfter: 5, // Escalate if many validation failures
      fallbackAction: RecoveryActions.SKIP_RECORD
    });

    this.recoveryStrategies.set(SyncErrorTypes.DATA_PARSING_FAILED, {
      strategy: 'fallback_with_skip',
      maxAttempts: 1,
      escalateAfter: 3,
      fallbackAction: RecoveryActions.FALLBACK_SOURCE
    });

    // Database errors
    this.recoveryStrategies.set(SyncErrorTypes.DATABASE_ERROR, {
      strategy: 'retry_with_backoff',
      maxAttempts: 2,
      baseDelay: 1000,
      escalateAfter: 3,
      fallbackAction: RecoveryActions.MANUAL_INTERVENTION
    });

    // Configuration errors
    this.recoveryStrategies.set(SyncErrorTypes.CONFIGURATION_ERROR, {
      strategy: 'manual_intervention',
      maxAttempts: 0,
      escalateAfter: 1,
      interventionType: 'configuration_fix',
      fallbackAction: RecoveryActions.DISABLE_SYNC
    });

    // Credential errors
    this.recoveryStrategies.set(SyncErrorTypes.CREDENTIAL_ERROR, {
      strategy: 'manual_intervention',
      maxAttempts: 0,
      escalateAfter: 1,
      interventionType: 'credential_update',
      fallbackAction: RecoveryActions.DISABLE_SYNC
    });
  }

  /**
   * Initialize escalation rules for different contexts
   * @private
   */
  initializeEscalationRules() {
    // Escalate based on error frequency
    this.escalationRules.set('error_frequency', {
      threshold: 5, // errors per hour
      timeWindow: 3600000, // 1 hour
      action: 'disable_sync_temporarily'
    });

    // Escalate based on consecutive failures
    this.escalationRules.set('consecutive_failures', {
      threshold: 3,
      action: 'require_manual_intervention'
    });

    // Escalate based on critical investment types
    this.escalationRules.set('critical_investment', {
      investmentTypes: ['epf'], // EPF is critical
      threshold: 2,
      action: 'immediate_notification'
    });

    // Escalate based on data source health
    this.escalationRules.set('data_source_health', {
      unhealthyThreshold: 0.5, // 50% of sources unhealthy
      action: 'system_health_alert'
    });
  }

  /**
   * Handle sync error and determine recovery action
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the sync operation
   * @returns {Promise<Object>} Recovery action to take
   */
  async handleSyncError(error, context = {}) {
    const {
      userId,
      investmentType,
      investmentId,
      source,
      attempt = 1,
      syncHistory = []
    } = context;

    // Categorize the error
    const syncError = this.categorizeError(error);
    
    // Get recovery strategy for this error type
    const strategy = this.recoveryStrategies.get(syncError.type) || 
                    this.recoveryStrategies.get(SyncErrorTypes.UNKNOWN_ERROR);

    // Check if escalation is needed
    const shouldEscalate = await this.shouldEscalate(syncError, context, strategy);
    
    if (shouldEscalate) {
      return await this.escalateError(syncError, context);
    }

    // Apply recovery strategy
    return await this.applyRecoveryStrategy(syncError, context, strategy);
  }

  /**
   * Apply recovery strategy based on error type and context
   * @param {Object} syncError - Categorized sync error
   * @param {Object} context - Sync context
   * @param {Object} strategy - Recovery strategy
   * @returns {Promise<Object>} Recovery action
   * @private
   */
  async applyRecoveryStrategy(syncError, context, strategy) {
    const { userId, investmentType, source, attempt = 1 } = context;

    switch (strategy.strategy) {
      case 'retry_with_backoff':
        if (attempt <= strategy.maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt, strategy.baseDelay);
          return createRecoveryAction({
            action: RecoveryActions.RETRY,
            delay,
            reason: `Retrying after ${delay}ms (attempt ${attempt}/${strategy.maxAttempts})`,
            maxRetries: strategy.maxAttempts
          });
        }
        break;

      case 'delay_and_retry':
        const retryAfter = this.extractRetryAfter(syncError) || strategy.baseDelay;
        return createRecoveryAction({
          action: RecoveryActions.DELAY,
          delay: retryAfter,
          reason: `Rate limited, retrying after ${retryAfter}ms`
        });

      case 'fallback_with_retry':
        const dataSourceManager = getDataSourceManager();
        const fallbackSource = await dataSourceManager.getBestAvailableSource(source, {
          excludeSources: [source]
        });
        
        if (fallbackSource !== source) {
          return createRecoveryAction({
            action: RecoveryActions.FALLBACK_SOURCE,
            source: fallbackSource,
            reason: `Falling back to ${fallbackSource}`
          });
        }
        break;

      case 'skip_and_continue':
        return createRecoveryAction({
          action: RecoveryActions.SKIP_RECORD,
          reason: 'Skipping invalid record and continuing'
        });

      case 'fallback_with_skip':
        // Try fallback first, then skip if no fallback available
        const fallbackAction = await this.applyRecoveryStrategy(
          syncError, 
          context, 
          { strategy: 'fallback_with_retry', ...strategy }
        );
        
        if (fallbackAction.action === RecoveryActions.FALLBACK_SOURCE) {
          return fallbackAction;
        }
        
        return createRecoveryAction({
          action: RecoveryActions.SKIP_RECORD,
          reason: 'No fallback available, skipping record'
        });

      case 'manual_intervention':
        await this.queueManualIntervention(userId, {
          errorType: syncError.type,
          interventionType: strategy.interventionType,
          investmentType,
          source,
          error: syncError,
          context
        });
        
        return createRecoveryAction({
          action: RecoveryActions.MANUAL_INTERVENTION,
          reason: `Manual intervention required: ${strategy.interventionType}`
        });
    }

    // Fallback to strategy's fallback action
    return createRecoveryAction({
      action: strategy.fallbackAction,
      reason: `Applying fallback action: ${strategy.fallbackAction}`
    });
  }

  /**
   * Check if error should be escalated based on context and rules
   * @param {Object} syncError - Categorized sync error
   * @param {Object} context - Sync context
   * @param {Object} strategy - Recovery strategy
   * @returns {Promise<boolean>} True if should escalate
   * @private
   */
  async shouldEscalate(syncError, context, strategy) {
    const { userId, investmentType, attempt = 1 } = context;

    // Check if exceeded max attempts for this strategy
    if (attempt > strategy.escalateAfter) {
      return true;
    }

    // Check consecutive failures rule
    const consecutiveFailures = await this.getConsecutiveFailures(userId, investmentType);
    const consecutiveRule = this.escalationRules.get('consecutive_failures');
    if (consecutiveFailures >= consecutiveRule.threshold) {
      return true;
    }

    // Check error frequency rule
    const errorFrequency = await this.getErrorFrequency(userId, investmentType);
    const frequencyRule = this.escalationRules.get('error_frequency');
    if (errorFrequency >= frequencyRule.threshold) {
      return true;
    }

    // Check critical investment rule
    const criticalRule = this.escalationRules.get('critical_investment');
    if (criticalRule.investmentTypes.includes(investmentType) && attempt >= criticalRule.threshold) {
      return true;
    }

    // Check data source health rule
    const dataSourceManager = getDataSourceManager();
    const healthStatus = dataSourceManager.getAllHealthStatus();
    const healthySources = Object.values(healthStatus).filter(h => h.isHealthy).length;
    const totalSources = Object.keys(healthStatus).length;
    const healthRatio = healthySources / totalSources;
    
    const healthRule = this.escalationRules.get('data_source_health');
    if (healthRatio < healthRule.unhealthyThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Escalate error to manual intervention or system alerts
   * @param {Object} syncError - Categorized sync error
   * @param {Object} context - Sync context
   * @returns {Promise<Object>} Escalation recovery action
   * @private
   */
  async escalateError(syncError, context) {
    const { userId, investmentType, source } = context;

    // Queue manual intervention
    await this.queueManualIntervention(userId, {
      errorType: syncError.type,
      interventionType: 'escalated_failure',
      investmentType,
      source,
      error: syncError,
      context,
      priority: 'high',
      escalated: true
    });

    // For critical errors, also disable sync temporarily
    const criticalErrors = [
      SyncErrorTypes.AUTHENTICATION_FAILED,
      SyncErrorTypes.CREDENTIAL_ERROR,
      SyncErrorTypes.CONFIGURATION_ERROR
    ];

    if (criticalErrors.includes(syncError.type)) {
      return createRecoveryAction({
        action: RecoveryActions.DISABLE_SYNC,
        reason: 'Critical error escalated - sync disabled pending manual intervention'
      });
    }

    return createRecoveryAction({
      action: RecoveryActions.MANUAL_INTERVENTION,
      reason: 'Error escalated to manual intervention due to repeated failures'
    });
  }

  /**
   * Queue manual intervention for user attention
   * @param {string} userId - User ID
   * @param {Object} intervention - Intervention details
   * @returns {Promise<void>}
   * @private
   */
  async queueManualIntervention(userId, intervention) {
    if (!this.interventionQueue.has(userId)) {
      this.interventionQueue.set(userId, []);
    }

    const interventions = this.interventionQueue.get(userId);
    
    // Add intervention with timestamp and ID
    const interventionRecord = {
      id: this.generateInterventionId(),
      timestamp: new Date(),
      status: 'pending',
      ...intervention
    };

    interventions.push(interventionRecord);

    // Keep only last 50 interventions per user
    if (interventions.length > 50) {
      interventions.splice(0, interventions.length - 50);
    }

    console.log(`Queued manual intervention for user ${userId}:`, intervention.interventionType);
  }

  /**
   * Get pending manual interventions for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of pending interventions
   */
  getPendingInterventions(userId) {
    const interventions = this.interventionQueue.get(userId) || [];
    return interventions.filter(i => i.status === 'pending');
  }

  /**
   * Get all interventions for a user (pending and resolved)
   * @param {string} userId - User ID
   * @returns {Array} Array of all interventions
   */
  getAllInterventions(userId) {
    return this.interventionQueue.get(userId) || [];
  }

  /**
   * Mark intervention as resolved
   * @param {string} userId - User ID
   * @param {string} interventionId - Intervention ID
   * @param {string} resolution - Resolution description
   * @returns {boolean} True if intervention was found and marked resolved
   */
  resolveIntervention(userId, interventionId, resolution = 'Resolved by user') {
    const interventions = this.interventionQueue.get(userId) || [];
    const intervention = interventions.find(i => i.id === interventionId);
    
    if (intervention) {
      intervention.status = 'resolved';
      intervention.resolvedAt = new Date();
      intervention.resolution = resolution;
      console.log(`Resolved intervention ${interventionId} for user ${userId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Clear all interventions for a user
   * @param {string} userId - User ID
   */
  clearInterventions(userId) {
    this.interventionQueue.delete(userId);
  }

  /**
   * Get recovery suggestions for manual intervention
   * @param {string} interventionType - Type of intervention needed
   * @param {Object} context - Context information
   * @returns {Object} Recovery suggestions
   */
  getRecoverySuggestions(interventionType, context = {}) {
    const suggestions = {
      credential_update: {
        title: 'Update Credentials',
        description: 'Your login credentials appear to be invalid or expired.',
        steps: [
          'Go to Sync Settings',
          'Update your login credentials for the affected service',
          'Test the connection',
          'Re-enable sync if disabled'
        ],
        urgency: 'high'
      },
      
      permission_check: {
        title: 'Check Permissions',
        description: 'Access to the data source has been denied.',
        steps: [
          'Verify your account has necessary permissions',
          'Check if your account is locked or suspended',
          'Contact the service provider if needed',
          'Update credentials if permissions were restored'
        ],
        urgency: 'medium'
      },
      
      configuration_fix: {
        title: 'Fix Configuration',
        description: 'There is an issue with the sync configuration.',
        steps: [
          'Review sync settings for errors',
          'Check data source URLs and endpoints',
          'Verify API keys and configuration parameters',
          'Reset to default settings if needed'
        ],
        urgency: 'medium'
      },
      
      escalated_failure: {
        title: 'Resolve Persistent Issues',
        description: 'Multiple sync attempts have failed. Manual review is needed.',
        steps: [
          'Review error details and patterns',
          'Check service status and availability',
          'Verify network connectivity',
          'Consider temporary manual data entry',
          'Contact support if issues persist'
        ],
        urgency: 'high'
      }
    };

    return suggestions[interventionType] || {
      title: 'Manual Review Required',
      description: 'A sync issue requires your attention.',
      steps: [
        'Review the error details',
        'Check sync settings and configuration',
        'Try manual sync to test connectivity',
        'Contact support if needed'
      ],
      urgency: 'medium'
    };
  }

  /**
   * Categorize error into sync error types
   * @param {Error} error - Error to categorize
   * @returns {Object} Categorized sync error
   * @private
   */
  categorizeError(error) {
    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return createSyncError({
        type: SyncErrorTypes.NETWORK_ERROR,
        message: error.message,
        code: error.code
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return createSyncError({
        type: SyncErrorTypes.NETWORK_TIMEOUT,
        message: error.message,
        code: error.code
      });
    }
    
    // HTTP status code errors
    if (error.response?.status === 401) {
      return createSyncError({
        type: SyncErrorTypes.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
        code: error.response.status
      });
    }
    
    if (error.response?.status === 403) {
      return createSyncError({
        type: SyncErrorTypes.AUTHORIZATION_FAILED,
        message: 'Access denied',
        code: error.response.status
      });
    }
    
    if (error.response?.status === 429) {
      return createSyncError({
        type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        code: error.response.status,
        retryAfter: error.response.headers?.['retry-after']
      });
    }
    
    if (error.response?.status >= 500) {
      return createSyncError({
        type: SyncErrorTypes.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        code: error.response.status
      });
    }
    
    // Database errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      return createSyncError({
        type: SyncErrorTypes.DATABASE_ERROR,
        message: error.message
      });
    }
    
    // Validation errors (check before parsing errors since "invalid" is more specific)
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return createSyncError({
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: error.message
      });
    }
    
    // Parsing errors
    if (error.message.includes('parse') || error.message.includes('format')) {
      return createSyncError({
        type: SyncErrorTypes.DATA_PARSING_FAILED,
        message: error.message
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
   * Calculate backoff delay for retry attempts
   * @param {number} attempt - Current attempt number
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {number} Calculated delay
   * @private
   */
  calculateBackoffDelay(attempt, baseDelay) {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 300000); // Max 5 minutes
  }

  /**
   * Extract retry-after value from error
   * @param {Object} syncError - Sync error object
   * @returns {number|null} Retry after delay in milliseconds
   * @private
   */
  extractRetryAfter(syncError) {
    if (syncError.retryAfter) {
      return parseInt(syncError.retryAfter) * 1000; // Convert to milliseconds
    }
    return null;
  }

  /**
   * Get consecutive failure count for user and investment type
   * @param {string} userId - User ID
   * @param {string} investmentType - Investment type
   * @returns {Promise<number>} Consecutive failure count
   * @private
   */
  async getConsecutiveFailures(userId, investmentType) {
    // This would typically query the database for recent sync history
    // For now, return a mock value
    const key = `${userId}:${investmentType}`;
    return this.recoveryHistory.get(key)?.consecutiveFailures || 0;
  }

  /**
   * Get error frequency for user and investment type
   * @param {string} userId - User ID
   * @param {string} investmentType - Investment type
   * @returns {Promise<number>} Error frequency (errors per hour)
   * @private
   */
  async getErrorFrequency(userId, investmentType) {
    // This would typically query the database for recent error history
    // For now, return a mock value
    const key = `${userId}:${investmentType}`;
    return this.recoveryHistory.get(key)?.errorFrequency || 0;
  }

  /**
   * Generate unique intervention ID
   * @returns {string} Unique intervention ID
   * @private
   */
  generateInterventionId() {
    return `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update recovery history for tracking
   * @param {string} userId - User ID
   * @param {string} investmentType - Investment type
   * @param {boolean} success - Whether the operation was successful
   */
  updateRecoveryHistory(userId, investmentType, success) {
    const key = `${userId}:${investmentType}`;
    const history = this.recoveryHistory.get(key) || {
      consecutiveFailures: 0,
      errorFrequency: 0,
      lastUpdate: new Date()
    };

    if (success) {
      history.consecutiveFailures = 0;
    } else {
      history.consecutiveFailures++;
      history.errorFrequency++;
    }

    history.lastUpdate = new Date();
    this.recoveryHistory.set(key, history);
  }

  /**
   * Get recovery statistics for monitoring
   * @returns {Object} Recovery statistics
   */
  getRecoveryStatistics() {
    const totalInterventions = Array.from(this.interventionQueue.values())
      .reduce((total, interventions) => total + interventions.length, 0);
    
    const pendingInterventions = Array.from(this.interventionQueue.values())
      .reduce((total, interventions) => 
        total + interventions.filter(i => i.status === 'pending').length, 0);

    return {
      totalInterventions,
      pendingInterventions,
      resolvedInterventions: totalInterventions - pendingInterventions,
      activeUsers: this.interventionQueue.size,
      recoveryStrategies: this.recoveryStrategies.size,
      escalationRules: this.escalationRules.size
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of ErrorRecoveryService
 * @returns {ErrorRecoveryService} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new ErrorRecoveryService();
  }
  return instance;
}

module.exports = {
  ErrorRecoveryService,
  getInstance
};