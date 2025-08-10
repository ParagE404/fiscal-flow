/**
 * Type definitions and factory functions for sync operations
 */

/**
 * Create a SyncResult object
 * @param {Object} params - Parameters for the sync result
 * @returns {Object} SyncResult object
 */
function createSyncResult({
  success = false,
  recordsProcessed = 0,
  recordsUpdated = 0,
  recordsSkipped = 0,
  errors = [],
  warnings = [],
  duration = 0,
  source = null,
  startTime = null,
  endTime = null,
  metadata = {}
} = {}) {
  return {
    success,
    recordsProcessed,
    recordsUpdated,
    recordsSkipped,
    errors,
    warnings,
    duration,
    source,
    startTime,
    endTime,
    metadata
  };
}

/**
 * Create a SyncOptions object
 * @param {Object} params - Parameters for sync options
 * @returns {Object} SyncOptions object
 */
function createSyncOptions({
  force = false,
  dryRun = false,
  source = null,
  timeout = 30000,
  retryAttempts = 3,
  skipValidation = false,
  batchSize = 100,
  parallelRequests = 5,
  customSchedule = null,
  metadata = {}
} = {}) {
  return {
    force,
    dryRun,
    source,
    timeout,
    retryAttempts,
    skipValidation,
    batchSize,
    parallelRequests,
    customSchedule,
    metadata
  };
}

/**
 * Create a SyncError object
 * @param {Object} params - Parameters for the sync error
 * @returns {Object} SyncError object
 */
function createSyncError({
  type = 'unknown_error',
  message = 'An unknown error occurred',
  code = null,
  details = {},
  investmentId = null,
  source = null,
  timestamp = new Date(),
  recoverable = true,
  retryAfter = null
} = {}) {
  return {
    type,
    message,
    code,
    details,
    investmentId,
    source,
    timestamp,
    recoverable,
    retryAfter
  };
}

/**
 * Create a SyncWarning object
 * @param {Object} params - Parameters for the sync warning
 * @returns {Object} SyncWarning object
 */
function createSyncWarning({
  type = 'general_warning',
  message = 'A warning occurred during sync',
  investmentId = null,
  source = null,
  timestamp = new Date(),
  details = {}
} = {}) {
  return {
    type,
    message,
    investmentId,
    source,
    timestamp,
    details
  };
}

/**
 * Sync error types enumeration
 */
const SyncErrorTypes = {
  NETWORK_ERROR: 'network_error',
  NETWORK_TIMEOUT: 'network_timeout',
  AUTHENTICATION_FAILED: 'authentication_failed',
  AUTHORIZATION_FAILED: 'authorization_failed',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  DATA_VALIDATION_FAILED: 'data_validation_failed',
  DATA_PARSING_FAILED: 'data_parsing_failed',
  DATABASE_ERROR: 'database_error',
  CONFIGURATION_ERROR: 'configuration_error',
  CREDENTIAL_ERROR: 'credential_error',
  UNKNOWN_ERROR: 'unknown_error'
};

/**
 * Sync status enumeration
 */
const SyncStatus = {
  MANUAL: 'manual',
  SYNCED: 'synced',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  DISABLED: 'disabled',
  PENDING: 'pending'
};

/**
 * Sync frequency options
 */
const SyncFrequency = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
};

/**
 * Investment types for sync operations
 */
const InvestmentTypes = {
  MUTUAL_FUNDS: 'mutual_funds',
  EPF: 'epf',
  STOCKS: 'stocks',
  FIXED_DEPOSITS: 'fixed_deposits'
};

/**
 * Data source identifiers
 */
const DataSources = {
  AMFI: 'amfi',
  MF_CENTRAL: 'mf_central',
  EPFO: 'epfo',
  YAHOO_FINANCE: 'yahoo_finance',
  NSE: 'nse',
  BSE: 'bse',
  ALPHA_VANTAGE: 'alpha_vantage'
};

/**
 * Recovery actions for error handling
 */
const RecoveryActions = {
  RETRY: 'retry',
  DELAY: 'delay',
  SKIP_RECORD: 'skip_record',
  FALLBACK_SOURCE: 'fallback_source',
  DISABLE_SYNC: 'disable_sync',
  MANUAL_INTERVENTION: 'manual_intervention',
  IGNORE: 'ignore'
};

/**
 * Validate a SyncResult object
 * @param {Object} syncResult - SyncResult to validate
 * @returns {boolean} True if valid
 */
function validateSyncResult(syncResult) {
  if (!syncResult || typeof syncResult !== 'object') {
    return false;
  }

  const requiredFields = ['success', 'recordsProcessed', 'recordsUpdated', 'errors', 'duration'];
  return requiredFields.every(field => syncResult.hasOwnProperty(field));
}

/**
 * Validate a SyncOptions object
 * @param {Object} syncOptions - SyncOptions to validate
 * @returns {boolean} True if valid
 */
function validateSyncOptions(syncOptions) {
  if (!syncOptions || typeof syncOptions !== 'object') {
    return false;
  }

  // Check that timeout is a positive number
  if (syncOptions.timeout && (typeof syncOptions.timeout !== 'number' || syncOptions.timeout <= 0)) {
    return false;
  }

  // Check that retryAttempts is a non-negative number
  if (syncOptions.retryAttempts && (typeof syncOptions.retryAttempts !== 'number' || syncOptions.retryAttempts < 0)) {
    return false;
  }

  return true;
}

/**
 * Create a recovery action object
 * @param {Object} params - Parameters for the recovery action
 * @returns {Object} Recovery action object
 */
function createRecoveryAction({
  action = RecoveryActions.MANUAL_INTERVENTION,
  delay = 0,
  reason = null,
  source = null,
  maxRetries = 3,
  metadata = {}
} = {}) {
  return {
    action,
    delay,
    reason,
    source,
    maxRetries,
    metadata
  };
}

module.exports = {
  createSyncResult,
  createSyncOptions,
  createSyncError,
  createSyncWarning,
  createRecoveryAction,
  validateSyncResult,
  validateSyncOptions,
  SyncErrorTypes,
  SyncStatus,
  SyncFrequency,
  InvestmentTypes,
  DataSources,
  RecoveryActions
};