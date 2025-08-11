/**
 * Metrics Collector for Auto-Sync Integration
 * Collects and exposes Prometheus metrics for sync operations
 */

const client = require('prom-client');

class MetricsCollector {
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });
    
    this.initializeMetrics();
  }

  initializeMetrics() {
    // Sync Job Metrics
    this.syncJobTotal = new client.Counter({
      name: 'sync_job_total',
      help: 'Total number of sync jobs executed',
      labelNames: ['job_type', 'user_id', 'status'],
      registers: [this.register]
    });

    this.syncJobDuration = new client.Histogram({
      name: 'sync_job_duration_seconds',
      help: 'Duration of sync jobs in seconds',
      labelNames: ['job_type', 'user_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.register]
    });

    this.syncJobSuccess = new client.Counter({
      name: 'sync_job_success_total',
      help: 'Total number of successful sync jobs',
      labelNames: ['job_type', 'user_id'],
      registers: [this.register]
    });

    this.syncJobFailures = new client.Counter({
      name: 'sync_job_failures_total',
      help: 'Total number of failed sync jobs',
      labelNames: ['job_type', 'user_id', 'error_type'],
      registers: [this.register]
    });

    this.syncJobLastSuccess = new client.Gauge({
      name: 'sync_job_last_success_timestamp',
      help: 'Timestamp of last successful sync job',
      labelNames: ['job_type', 'user_id'],
      registers: [this.register]
    });

    this.syncActiveJobs = new client.Gauge({
      name: 'sync_active_jobs_count',
      help: 'Number of currently active sync jobs',
      labelNames: ['job_type'],
      registers: [this.register]
    });

    // Database Metrics
    this.databaseConnectionErrors = new client.Counter({
      name: 'sync_database_connection_errors_total',
      help: 'Total database connection errors during sync',
      registers: [this.register]
    });

    this.databaseQueryDuration = new client.Histogram({
      name: 'sync_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    this.databaseConnectionPoolUtilization = new client.Gauge({
      name: 'sync_database_connection_pool_utilization',
      help: 'Database connection pool utilization ratio',
      registers: [this.register]
    });

    // External API Metrics
    this.apiRequestTotal = new client.Counter({
      name: 'sync_api_requests_total',
      help: 'Total API requests made during sync',
      labelNames: ['api_provider', 'endpoint', 'status_code'],
      registers: [this.register]
    });

    this.apiRequestDuration = new client.Histogram({
      name: 'sync_api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['api_provider', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.register]
    });

    this.apiRateLimitExceeded = new client.Counter({
      name: 'sync_api_rate_limit_exceeded_total',
      help: 'Total API rate limit exceeded events',
      labelNames: ['api_provider'],
      registers: [this.register]
    });

    this.apiAvailability = new client.Gauge({
      name: 'sync_api_availability',
      help: 'API availability status (1 = available, 0 = unavailable)',
      labelNames: ['api_provider'],
      registers: [this.register]
    });

    // Data Validation Metrics
    this.dataValidationFailures = new client.Counter({
      name: 'sync_data_validation_failures_total',
      help: 'Total data validation failures',
      labelNames: ['job_type', 'validation_type'],
      registers: [this.register]
    });

    this.recordsProcessed = new client.Counter({
      name: 'sync_records_processed_total',
      help: 'Total records processed during sync',
      labelNames: ['job_type', 'user_id'],
      registers: [this.register]
    });

    this.recordsUpdated = new client.Counter({
      name: 'sync_records_updated_total',
      help: 'Total records updated during sync',
      labelNames: ['job_type', 'user_id'],
      registers: [this.register]
    });

    // Security Metrics
    this.credentialDecryptionFailures = new client.Counter({
      name: 'sync_credential_decryption_failures_total',
      help: 'Total credential decryption failures',
      labelNames: ['service'],
      registers: [this.register]
    });

    this.unauthorizedAttempts = new client.Counter({
      name: 'sync_unauthorized_attempts_total',
      help: 'Total unauthorized sync attempts',
      labelNames: ['user_id', 'endpoint'],
      registers: [this.register]
    });

    // Business Metrics
    this.activeUsersCount = new client.Gauge({
      name: 'sync_active_users_count',
      help: 'Number of users with active sync configurations',
      registers: [this.register]
    });

    this.credentialsExpiringCount = new client.Gauge({
      name: 'sync_user_credentials_expiring_count',
      help: 'Number of users with credentials expiring soon',
      registers: [this.register]
    });

    // Error Metrics
    this.errorsTotal = new client.Counter({
      name: 'sync_errors_total',
      help: 'Total sync errors by type',
      labelNames: ['error_type', 'job_type'],
      registers: [this.register]
    });

    // Cache Metrics
    this.cacheHits = new client.Counter({
      name: 'sync_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_type'],
      registers: [this.register]
    });

    this.cacheMisses = new client.Counter({
      name: 'sync_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_type'],
      registers: [this.register]
    });
  }

  // Sync Job Metrics Methods
  recordSyncJobStart(jobType, userId) {
    this.syncActiveJobs.inc({ job_type: jobType });
    this.syncJobTotal.inc({ job_type: jobType, user_id: userId, status: 'started' });
  }

  recordSyncJobSuccess(jobType, userId, duration, recordsProcessed, recordsUpdated) {
    this.syncActiveJobs.dec({ job_type: jobType });
    this.syncJobSuccess.inc({ job_type: jobType, user_id: userId });
    this.syncJobDuration.observe({ job_type: jobType, user_id: userId }, duration);
    this.syncJobLastSuccess.set({ job_type: jobType, user_id: userId }, Date.now() / 1000);
    this.recordsProcessed.inc({ job_type: jobType, user_id: userId }, recordsProcessed);
    this.recordsUpdated.inc({ job_type: jobType, user_id: userId }, recordsUpdated);
  }

  recordSyncJobFailure(jobType, userId, duration, errorType) {
    this.syncActiveJobs.dec({ job_type: jobType });
    this.syncJobFailures.inc({ job_type: jobType, user_id: userId, error_type: errorType });
    this.syncJobDuration.observe({ job_type: jobType, user_id: userId }, duration);
    this.errorsTotal.inc({ error_type: errorType, job_type: jobType });
  }

  // Database Metrics Methods
  recordDatabaseConnectionError() {
    this.databaseConnectionErrors.inc();
  }

  recordDatabaseQuery(operation, table, duration) {
    this.databaseQueryDuration.observe({ operation, table }, duration);
  }

  updateConnectionPoolUtilization(utilization) {
    this.databaseConnectionPoolUtilization.set(utilization);
  }

  // API Metrics Methods
  recordApiRequest(provider, endpoint, statusCode, duration) {
    this.apiRequestTotal.inc({ api_provider: provider, endpoint, status_code: statusCode });
    this.apiRequestDuration.observe({ api_provider: provider, endpoint }, duration);
  }

  recordApiRateLimitExceeded(provider) {
    this.apiRateLimitExceeded.inc({ api_provider: provider });
  }

  updateApiAvailability(provider, isAvailable) {
    this.apiAvailability.set({ api_provider: provider }, isAvailable ? 1 : 0);
  }

  // Data Validation Methods
  recordDataValidationFailure(jobType, validationType) {
    this.dataValidationFailures.inc({ job_type: jobType, validation_type: validationType });
  }

  // Security Methods
  recordCredentialDecryptionFailure(service) {
    this.credentialDecryptionFailures.inc({ service });
  }

  recordUnauthorizedAttempt(userId, endpoint) {
    this.unauthorizedAttempts.inc({ user_id: userId, endpoint });
  }

  // Business Methods
  updateActiveUsersCount(count) {
    this.activeUsersCount.set(count);
  }

  updateCredentialsExpiringCount(count) {
    this.credentialsExpiringCount.set(count);
  }

  // Cache Methods
  recordCacheHit(cacheType) {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType) {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  // Get metrics for Prometheus scraping
  getMetrics() {
    return this.register.metrics();
  }

  // Get register for custom metrics
  getRegister() {
    return this.register;
  }
}

module.exports = new MetricsCollector();