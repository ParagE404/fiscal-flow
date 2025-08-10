const { PrismaClient } = require('@prisma/client');
const SyncService = require('../interfaces/SyncService');
const CredentialService = require('../security/CredentialService');
const {
  createSyncResult,
  createSyncError,
  createSyncWarning,
  createRecoveryAction,
  SyncErrorTypes,
  SyncStatus,
  RecoveryActions,
  InvestmentTypes
} = require('../interfaces');

const prisma = new PrismaClient();

/**
 * Abstract base class for all sync services
 * Provides common functionality for sync operations, error handling, and metadata management
 */
class BaseSyncService extends SyncService {
  constructor() {
    super();
    this.credentialService = new CredentialService();
    this.maxRetryAttempts = 3;
    this.baseRetryDelay = 1000; // 1 second
    this.maxRetryDelay = 30000; // 30 seconds
  }

  /**
   * Update sync metadata for a user's investment type
   * @param {string} userId - User ID
   * @param {string} investmentId - Investment ID (optional, for single investment sync)
   * @param {Object} syncResult - Result of sync operation
   * @returns {Promise<void>}
   * @protected
   */
  async updateSyncMetadata(userId, syncResult, investmentId = null) {
    try {
      const syncStatus = syncResult.success ? SyncStatus.SYNCED : SyncStatus.FAILED;
      const errorMessage = syncResult.errors.length > 0 
        ? syncResult.errors.map(e => e.message).join('; ')
        : null;

      // Create a hash of the sync result for change detection
      const dataHash = this.createDataHash(syncResult);

      if (investmentId) {
        // Update metadata for specific investment
        await prisma.syncMetadata.upsert({
          where: {
            userId_investmentType_investmentId: {
              userId,
              investmentType: this.syncType,
              investmentId
            }
          },
          update: {
            lastSyncAt: new Date(),
            syncStatus,
            syncSource: syncResult.source,
            errorMessage,
            dataHash
          },
          create: {
            userId,
            investmentType: this.syncType,
            investmentId,
            lastSyncAt: new Date(),
            syncStatus,
            syncSource: syncResult.source,
            errorMessage,
            dataHash
          }
        });
      } else {
        // Update metadata for all investments of this type
        const existingMetadata = await prisma.syncMetadata.findMany({
          where: {
            userId,
            investmentType: this.syncType
          }
        });

        // Update existing records
        for (const metadata of existingMetadata) {
          await prisma.syncMetadata.update({
            where: { id: metadata.id },
            data: {
              lastSyncAt: new Date(),
              syncStatus,
              syncSource: syncResult.source,
              errorMessage,
              dataHash
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to update sync metadata for user ${userId}:`, error.message);
      // Don't throw here as this is a secondary operation
    }
  }

  /**
   * Get sync configuration for a user and investment type
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Sync configuration or null if not found
   * @protected
   */
  async getSyncConfiguration(userId) {
    try {
      const config = await prisma.syncConfiguration.findUnique({
        where: {
          userId_investmentType: {
            userId,
            investmentType: this.syncType
          }
        }
      });

      return config || this.getDefaultConfiguration();
    } catch (error) {
      console.error(`Failed to get sync configuration for user ${userId}:`, error.message);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Check if sync is enabled for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if sync is enabled
   */
  async isSyncEnabled(userId) {
    try {
      const config = await this.getSyncConfiguration(userId);
      return config && config.isEnabled;
    } catch (error) {
      console.error(`Failed to check sync status for user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Get sync status for a user's investments
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync status information
   */
  async getSyncStatus(userId) {
    try {
      const metadata = await prisma.syncMetadata.findMany({
        where: {
          userId,
          investmentType: this.syncType
        },
        orderBy: {
          lastSyncAt: 'desc'
        }
      });

      const config = await this.getSyncConfiguration(userId);

      return {
        isEnabled: config?.isEnabled || false,
        lastSyncAt: metadata.length > 0 ? metadata[0].lastSyncAt : null,
        syncStatus: this.aggregateSyncStatus(metadata),
        totalInvestments: metadata.length,
        successfulSyncs: metadata.filter(m => m.syncStatus === SyncStatus.SYNCED).length,
        failedSyncs: metadata.filter(m => m.syncStatus === SyncStatus.FAILED).length,
        source: metadata.length > 0 ? metadata[0].syncSource : null,
        errors: metadata
          .filter(m => m.errorMessage)
          .map(m => ({ investmentId: m.investmentId, error: m.errorMessage }))
      };
    } catch (error) {
      console.error(`Failed to get sync status for user ${userId}:`, error.message);
      return {
        isEnabled: false,
        lastSyncAt: null,
        syncStatus: SyncStatus.FAILED,
        totalInvestments: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        source: null,
        errors: [{ error: error.message }]
      };
    }
  }

  /**
   * Handle sync errors and determine recovery actions
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the sync operation
   * @returns {Promise<Object>} Recovery action to take
   */
  async handleSyncError(error, context = {}) {
    const syncError = this.categorizeError(error);
    
    switch (syncError.type) {
      case SyncErrorTypes.NETWORK_TIMEOUT:
      case SyncErrorTypes.NETWORK_ERROR:
        return createRecoveryAction({
          action: RecoveryActions.RETRY,
          delay: this.calculateRetryDelay(context.attempt || 1),
          reason: 'Network connectivity issue',
          maxRetries: this.maxRetryAttempts
        });

      case SyncErrorTypes.RATE_LIMIT_EXCEEDED:
        return createRecoveryAction({
          action: RecoveryActions.DELAY,
          delay: this.calculateRateLimitDelay(error),
          reason: 'API rate limit exceeded'
        });

      case SyncErrorTypes.AUTHENTICATION_FAILED:
      case SyncErrorTypes.CREDENTIAL_ERROR:
        return createRecoveryAction({
          action: RecoveryActions.DISABLE_SYNC,
          reason: 'Invalid or expired credentials'
        });

      case SyncErrorTypes.DATA_VALIDATION_FAILED:
        return createRecoveryAction({
          action: RecoveryActions.SKIP_RECORD,
          reason: 'Data validation failed'
        });

      case SyncErrorTypes.SERVICE_UNAVAILABLE:
        return createRecoveryAction({
          action: RecoveryActions.FALLBACK_SOURCE,
          source: this.getFallbackSource(context.source),
          reason: 'Primary service unavailable'
        });

      default:
        return createRecoveryAction({
          action: RecoveryActions.MANUAL_INTERVENTION,
          reason: syncError.message
        });
    }
  }

  /**
   * Validate data according to business rules and constraints
   * @param {Array} data - Data to validate
   * @param {Object} validationRules - Validation rules to apply
   * @returns {Object} Validation result with valid data and errors
   * @protected
   */
  validateData(data, validationRules = {}) {
    const validData = [];
    const errors = [];
    const warnings = [];

    for (const record of data) {
      try {
        // Basic validation
        if (!record || typeof record !== 'object') {
          errors.push(createSyncError({
            type: SyncErrorTypes.DATA_VALIDATION_FAILED,
            message: 'Invalid data record format',
            details: { record }
          }));
          continue;
        }

        // Apply specific validation rules
        const validationResult = this.applyValidationRules(record, validationRules);
        
        if (validationResult.isValid) {
          validData.push(record);
          
          // Add warnings if any
          if (validationResult.warnings.length > 0) {
            warnings.push(...validationResult.warnings);
          }
        } else {
          errors.push(createSyncError({
            type: SyncErrorTypes.DATA_VALIDATION_FAILED,
            message: validationResult.errors.join('; '),
            details: { record, validationErrors: validationResult.errors }
          }));
        }
      } catch (error) {
        errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Validation error: ${error.message}`,
          details: { record }
        }));
      }
    }

    return {
      validData,
      errors,
      warnings,
      totalRecords: data.length,
      validRecords: validData.length,
      invalidRecords: errors.length
    };
  }

  /**
   * Transform raw data into standardized format
   * @param {Array} data - Raw data to transform
   * @param {Object} transformationRules - Rules for data transformation
   * @returns {Array} Transformed data
   * @protected
   */
  transformData(data, transformationRules = {}) {
    return data.map(record => {
      try {
        return this.applyTransformationRules(record, transformationRules);
      } catch (error) {
        console.warn(`Failed to transform record:`, error.message, record);
        return record; // Return original record if transformation fails
      }
    });
  }

  /**
   * Handle conflicts between manual and synced data
   * @param {Object} existingData - Current data in database
   * @param {Object} syncedData - New data from sync operation
   * @param {Object} options - Conflict resolution options
   * @returns {Object} Resolved data and conflict information
   * @protected
   */
  resolveDataConflicts(existingData, syncedData, options = {}) {
    const conflicts = [];
    const resolvedData = { ...existingData };

    // If manual override is set, keep existing data
    if (existingData.manualOverride) {
      conflicts.push({
        field: 'all',
        existingValue: 'manual override',
        syncedValue: 'synced data',
        resolution: 'kept manual override'
      });
      return { resolvedData, conflicts };
    }

    // Compare key fields and resolve conflicts
    const fieldsToSync = this.getSyncableFields();
    
    for (const field of fieldsToSync) {
      if (existingData[field] !== undefined && syncedData[field] !== undefined) {
        if (existingData[field] !== syncedData[field]) {
          conflicts.push({
            field,
            existingValue: existingData[field],
            syncedValue: syncedData[field],
            resolution: 'used synced value'
          });
          resolvedData[field] = syncedData[field];
        }
      } else if (syncedData[field] !== undefined) {
        resolvedData[field] = syncedData[field];
      }
    }

    return { resolvedData, conflicts };
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Operation result
   * @protected
   */
  async withRetry(operation, options = {}) {
    const maxAttempts = options.maxAttempts || this.maxRetryAttempts;
    const baseDelay = options.baseDelay || this.baseRetryDelay;
    const maxDelay = options.maxDelay || this.maxRetryDelay;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Check if error is retryable
        const recoveryAction = await this.handleSyncError(error, { attempt });
        
        if (recoveryAction.action !== RecoveryActions.RETRY) {
          break;
        }
        
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1),
          maxDelay
        );
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Protected helper methods

  /**
   * Create a hash of sync result data for change detection
   * @param {Object} syncResult - Sync result to hash
   * @returns {string} Hash string
   * @protected
   */
  createDataHash(syncResult) {
    const crypto = require('crypto');
    const hashData = {
      recordsProcessed: syncResult.recordsProcessed,
      recordsUpdated: syncResult.recordsUpdated,
      source: syncResult.source,
      timestamp: new Date().toISOString().split('T')[0] // Date only
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
      .substring(0, 16); // First 16 characters
  }

  /**
   * Aggregate sync status from multiple metadata records
   * @param {Array} metadataRecords - Array of sync metadata records
   * @returns {string} Aggregated sync status
   * @protected
   */
  aggregateSyncStatus(metadataRecords) {
    if (metadataRecords.length === 0) {
      return SyncStatus.MANUAL;
    }

    const statuses = metadataRecords.map(m => m.syncStatus);
    
    if (statuses.includes(SyncStatus.IN_PROGRESS)) {
      return SyncStatus.IN_PROGRESS;
    }
    
    if (statuses.includes(SyncStatus.FAILED)) {
      return SyncStatus.FAILED;
    }
    
    if (statuses.every(s => s === SyncStatus.SYNCED)) {
      return SyncStatus.SYNCED;
    }
    
    return SyncStatus.FAILED; // Mixed status defaults to failed
  }

  /**
   * Categorize error into sync error types
   * @param {Error} error - Error to categorize
   * @returns {Object} Categorized sync error
   * @protected
   */
  categorizeError(error) {
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
    
    if (error.response?.status === 401) {
      return createSyncError({
        type: SyncErrorTypes.AUTHENTICATION_FAILED,
        message: 'Authentication failed',
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
    
    return createSyncError({
      type: SyncErrorTypes.UNKNOWN_ERROR,
      message: error.message,
      code: error.code
    });
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} Delay in milliseconds
   * @protected
   */
  calculateRetryDelay(attempt) {
    return Math.min(
      this.baseRetryDelay * Math.pow(2, attempt - 1),
      this.maxRetryDelay
    );
  }

  /**
   * Calculate delay for rate limit handling
   * @param {Error} error - Rate limit error
   * @returns {number} Delay in milliseconds
   * @protected
   */
  calculateRateLimitDelay(error) {
    const retryAfter = error.retryAfter || error.response?.headers?.['retry-after'];
    
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // Convert to milliseconds
    }
    
    return 60000; // Default 1 minute delay
  }

  /**
   * Get fallback data source for the current source
   * @param {string} currentSource - Current data source
   * @returns {string|null} Fallback source or null if none available
   * @protected
   */
  getFallbackSource(currentSource) {
    // To be implemented by subclasses based on available sources
    return null;
  }

  /**
   * Apply validation rules to a data record
   * @param {Object} record - Data record to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   * @protected
   */
  applyValidationRules(record, rules) {
    // To be implemented by subclasses with specific validation logic
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Apply transformation rules to a data record
   * @param {Object} record - Data record to transform
   * @param {Object} rules - Transformation rules
   * @returns {Object} Transformed record
   * @protected
   */
  applyTransformationRules(record, rules) {
    // To be implemented by subclasses with specific transformation logic
    return record;
  }

  /**
   * Get list of fields that can be synced (not manually overridden)
   * @returns {string[]} Array of field names
   * @protected
   */
  getSyncableFields() {
    // To be implemented by subclasses
    return [];
  }
}

module.exports = BaseSyncService;