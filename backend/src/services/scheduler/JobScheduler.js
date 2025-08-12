const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const MutualFundSyncService = require('../sync/MutualFundSyncService');
const EPFSyncService = require('../sync/EPFSyncService');
const StockSyncService = require('../sync/StockSyncService');
const JobPersistence = require('./JobPersistence');
const MarketHoursUtil = require('./MarketHoursUtil');
const JobQueueManager = require('./JobQueueManager');
const RetryUtil = require('./RetryUtil');

// Initialize Prisma client
let prisma;
if (process.env.NODE_ENV === 'test') {
  prisma = null;
} else {
  prisma = new PrismaClient();
}

/**
 * Job Scheduler for automated sync operations
 * Manages scheduled jobs for different investment types with timezone support
 */
class JobScheduler {
  constructor(prismaClient = null) {
    this.prisma = prismaClient || prisma || new PrismaClient();
    this.jobs = new Map();
    this.syncServices = new Map();
    this.jobLocks = new Map();
    this.jobStatus = new Map();
    this.isStarted = false;
    
    // Initialize sync services
    this.syncServices.set('mutual_funds', new MutualFundSyncService(this.prisma));
    this.syncServices.set('epf', new EPFSyncService(this.prisma));
    this.syncServices.set('stocks', new StockSyncService(this.prisma));
    
    // Job persistence service
    this.persistence = new JobPersistence(this.prisma);
    
    // Market hours utility
    this.marketHours = new MarketHoursUtil();
    
    // Job queue manager for handling concurrent executions
    this.queueManager = new JobQueueManager({
      maxConcurrentJobs: 2, // Limit concurrent sync operations
      maxQueueSize: 50,
      defaultJobTimeout: 10 * 60 * 1000 // 10 minutes timeout
    });
    
    // Job execution tracking
    this.executionHistory = new Map();
    this.maxHistorySize = 1000;
  }

  /**
   * Start the job scheduler with all configured jobs
   */
  async start() {
    if (this.isStarted) {
      console.log('Job scheduler is already running');
      return;
    }

    console.log('Starting job scheduler with Asia/Kolkata timezone...');
    
    try {
      // Clean up any stuck jobs from previous runs
      await this.persistence.markStuckJobsAsFailed(2);
      
      // Start the job queue manager
      this.queueManager.start();
      
      // Load job configurations from database or register defaults
      await this.loadOrRegisterJobs();
      
      this.startAllJobs();
      this.isStarted = true;
      
      console.log('Job scheduler started successfully');
      this.logJobStatus();
    } catch (error) {
      console.error('Failed to start job scheduler:', error);
      throw error;
    }
  }

  /**
   * Load job configurations from database or register default jobs
   */
  async loadOrRegisterJobs() {
    try {
      const savedConfigs = await this.persistence.loadJobConfigurations();
      
      if (savedConfigs.length > 0) {
        console.log(`Loading ${savedConfigs.length} job configurations from database`);
        
        for (const config of savedConfigs) {
          this.registerJobFromConfig(config);
        }
      } else {
        console.log('No saved job configurations found, registering default jobs');
        this.registerDefaultJobs();
        
        // Save default configurations to database
        for (const [jobName, jobConfig] of this.jobStatus.entries()) {
          await this.persistence.saveJobConfiguration(jobName, jobConfig);
        }
      }
    } catch (error) {
      console.error('Error loading job configurations, falling back to defaults:', error);
      this.registerDefaultJobs();
    }
  }

  /**
   * Register a job from saved configuration
   * @param {Object} config - Saved job configuration
   */
  registerJobFromConfig(config) {
    const conditionFn = config.condition ? 
      new Function('return ' + config.condition)() : null;
    
    this.registerJob(config.jobName, {
      schedule: config.schedule,
      syncType: config.syncType,
      description: config.description,
      timezone: config.timezone,
      enabled: config.enabled,
      condition: conditionFn
    });
  }

  /**
   * Stop the job scheduler and all running jobs
   */
  stop() {
    if (!this.isStarted) {
      console.log('Job scheduler is not running');
      return;
    }

    console.log('Stopping job scheduler...');
    
    // Stop the job queue manager
    this.queueManager.stop();
    
    // Stop all jobs
    this.jobs.forEach((job, jobName) => {
      try {
        job.stop();
        console.log(`Stopped job: ${jobName}`);
      } catch (error) {
        console.error(`Error stopping job ${jobName}:`, error);
      }
    });

    // Clear job locks
    this.jobLocks.clear();
    this.isStarted = false;
    
    console.log('Job scheduler stopped');
  }

  /**
   * Register default scheduled jobs for all sync types
   */
  registerDefaultJobs() {
    const optimalTimes = this.marketHours.getOptimalSyncTimes();
    
    // Daily mutual fund sync at 6 PM IST (after market close)
    this.registerJob('mutual_funds_daily', {
      schedule: optimalTimes.mutualFunds.schedule,
      syncType: 'mutual_funds',
      description: optimalTimes.mutualFunds.description,
      timezone: optimalTimes.mutualFunds.timezone,
      enabled: true
    });

    // Monthly EPF sync on 1st of each month at 2 AM IST
    this.registerJob('epf_monthly', {
      schedule: optimalTimes.epf.schedule,
      syncType: 'epf',
      description: optimalTimes.epf.description,
      timezone: optimalTimes.epf.timezone,
      enabled: true
    });

    // Hourly stock sync during market hours
    this.registerJob('stocks_hourly', {
      schedule: optimalTimes.stocks.schedule,
      syncType: 'stocks',
      description: optimalTimes.stocks.description,
      timezone: optimalTimes.stocks.timezone,
      enabled: true,
      condition: () => this.marketHours.isMarketOpen()
    });

    // End-of-day stock sync for comprehensive price updates
    this.registerJob('stocks_eod', {
      schedule: optimalTimes.stocksEndOfDay.schedule,
      syncType: 'stocks',
      description: optimalTimes.stocksEndOfDay.description,
      timezone: optimalTimes.stocksEndOfDay.timezone,
      enabled: true,
      condition: optimalTimes.stocksEndOfDay.condition
    });
  }

  /**
   * Register a new scheduled job
   * @param {string} jobName - Unique job identifier
   * @param {Object} jobConfig - Job configuration
   */
  registerJob(jobName, jobConfig) {
    const {
      schedule,
      syncType,
      description,
      timezone = 'Asia/Kolkata',
      enabled = true,
      condition = null
    } = jobConfig;

    if (this.jobs.has(jobName)) {
      throw new Error(`Job ${jobName} is already registered`);
    }

    if (!this.syncServices.has(syncType)) {
      throw new Error(`Sync service not found for type: ${syncType}`);
    }

    // Create cron job
    const cronJob = cron.schedule(schedule, async () => {
      await this.executeJob(jobName, syncType, condition);
    }, {
      scheduled: false,
      timezone: timezone
    });

    // Store job configuration
    this.jobs.set(jobName, cronJob);
    this.jobStatus.set(jobName, {
      name: jobName,
      syncType,
      schedule,
      description,
      timezone,
      enabled,
      condition: condition ? condition.toString() : null,
      lastExecution: null,
      nextExecution: null,
      status: 'registered'
    });

    console.log(`Registered job: ${jobName} (${description})`);
  }

  /**
   * Start all registered jobs
   */
  startAllJobs() {
    this.jobs.forEach((job, jobName) => {
      const jobConfig = this.jobStatus.get(jobName);
      if (jobConfig.enabled) {
        job.start();
        jobConfig.status = 'running';
        jobConfig.nextExecution = this.getNextExecutionTime(jobName);
        console.log(`Started job: ${jobName}`);
      } else {
        console.log(`Skipped disabled job: ${jobName}`);
      }
    });
  }

  /**
   * Execute a specific job with locking and error handling
   * @param {string} jobName - Job identifier
   * @param {string} syncType - Type of sync to perform
   * @param {Function} condition - Optional condition function
   */
  async executeJob(jobName, syncType, condition = null) {
    // Check condition if provided
    if (condition && !condition()) {
      console.log(`Job ${jobName} condition not met, skipping execution`);
      return;
    }

    const jobConfig = this.jobStatus.get(jobName);
    
    // Queue the job for execution
    try {
      const jobId = this.queueManager.enqueue({
        name: jobName,
        type: syncType,
        operation: async () => {
          return await this.runSyncForAllUsers(syncType, jobName);
        },
        priority: this.getJobPriority(syncType),
        timeout: this.getJobTimeout(syncType),
        retryOptions: {
          maxAttempts: 2,
          baseDelay: 5000,
          maxDelay: 60000,
          retryCondition: (error) => {
            // Retry on network and temporary errors, but not on auth or validation errors
            const retryableErrors = ['network', 'timeout', 'connection', 'temporary', 'rate limit'];
            const nonRetryableErrors = ['auth', 'validation', 'permission', 'credential'];
            
            const errorMessage = error.message.toLowerCase();
            const shouldRetry = retryableErrors.some(e => errorMessage.includes(e));
            const shouldNotRetry = nonRetryableErrors.some(e => errorMessage.includes(e));
            
            return shouldRetry && !shouldNotRetry;
          }
        },
        metadata: {
          jobName,
          syncType,
          scheduledAt: new Date()
        }
      });

      jobConfig.lastExecution = new Date();
      jobConfig.status = 'queued';
      jobConfig.queuedJobId = jobId;
      
      console.log(`Job ${jobName} queued for execution with ID: ${jobId}`);
    } catch (error) {
      console.error(`Failed to queue job ${jobName}:`, error);
      jobConfig.status = 'failed';
      jobConfig.lastError = error.message;
    }
  }

  /**
   * Get job priority based on sync type
   * @param {string} syncType - Type of sync
   * @returns {string} Priority level
   */
  getJobPriority(syncType) {
    const priorities = {
      'stocks': 'high',      // Stock prices need frequent updates
      'mutual_funds': 'normal', // Daily updates are sufficient
      'epf': 'low'           // Monthly updates are sufficient
    };
    
    return priorities[syncType] || 'normal';
  }

  /**
   * Get job timeout based on sync type
   * @param {string} syncType - Type of sync
   * @returns {number} Timeout in milliseconds
   */
  getJobTimeout(syncType) {
    const timeouts = {
      'stocks': 5 * 60 * 1000,      // 5 minutes for stock sync
      'mutual_funds': 10 * 60 * 1000, // 10 minutes for MF sync
      'epf': 15 * 60 * 1000         // 15 minutes for EPF sync
    };
    
    return timeouts[syncType] || 10 * 60 * 1000;
  }

  /**
   * Run sync for all users with enabled sync configuration
   * @param {string} syncType - Type of sync to perform
   * @param {string} jobName - Job name for logging
   * @returns {Promise<Object>} Sync execution summary
   */
  async runSyncForAllUsers(syncType, jobName) {
    const syncService = this.syncServices.get(syncType);
    if (!syncService) {
      throw new Error(`Sync service not found for type: ${syncType}`);
    }

    // Get users with enabled sync for this type
    const users = await this.getActiveUsers(syncType);
    console.log(`Found ${users.length} users with enabled ${syncType} sync`);

    let successCount = 0;
    let errorCount = 0;
    let totalRecordsUpdated = 0;

    for (const user of users) {
      try {
        console.log(`Running ${syncType} sync for user: ${user.id}`);
        const result = await syncService.sync(user.id, { 
          source: 'scheduled_job',
          jobName 
        });
        
        if (result.success) {
          successCount++;
          totalRecordsUpdated += result.recordsUpdated || 0;
          console.log(`Sync successful for user ${user.id}: ${result.recordsUpdated} records updated`);
        } else {
          errorCount++;
          console.error(`Sync failed for user ${user.id}:`, result.errors);
        }
      } catch (error) {
        errorCount++;
        console.error(`Sync error for user ${user.id}:`, error);
      }
    }

    const summary = {
      usersProcessed: users.length,
      successCount,
      errorCount,
      recordsUpdated: totalRecordsUpdated
    };

    console.log(`Job ${jobName} summary: ${successCount} successful, ${errorCount} failed out of ${users.length} users, ${totalRecordsUpdated} records updated`);
    
    return summary;
  }

  /**
   * Get users with active sync configuration for a specific type
   * @param {string} syncType - Type of sync
   * @returns {Promise<Array>} Array of user objects
   */
  async getActiveUsers(syncType) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          syncConfigurations: {
            some: {
              investmentType: syncType,
              isEnabled: true
            }
          }
        },
        select: {
          id: true,
          email: true,
          syncConfigurations: {
            where: {
              investmentType: syncType,
              isEnabled: true
            }
          }
        }
      });

      return users;
    } catch (error) {
      console.error(`Error fetching active users for ${syncType}:`, error);
      return [];
    }
  }

  /**
   * Get market status information
   * @returns {Object} Current market status
   */
  getMarketStatus() {
    return this.marketHours.getMarketStatus();
  }

  /**
   * Check if market is currently open (legacy method for backward compatibility)
   * @returns {boolean} True if market is open
   */
  isMarketHours() {
    return this.marketHours.isMarketOpen();
  }

  /**
   * Get next execution time for a job
   * @param {string} jobName - Job name
   * @returns {Date|null} Next execution time
   */
  getNextExecutionTime(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) return null;

    try {
      // This is a simplified implementation
      // In a real scenario, you'd parse the cron expression
      return new Date(Date.now() + 60 * 60 * 1000); // Placeholder: 1 hour from now
    } catch (error) {
      console.error(`Error calculating next execution time for ${jobName}:`, error);
      return null;
    }
  }

  /**
   * Record job execution history
   * @param {string} jobName - Job name
   * @param {Object} execution - Execution details
   */
  recordJobExecution(jobName, execution) {
    if (!this.executionHistory.has(jobName)) {
      this.executionHistory.set(jobName, []);
    }

    const history = this.executionHistory.get(jobName);
    history.unshift(execution);

    // Keep only recent executions
    if (history.length > this.maxHistorySize) {
      history.splice(this.maxHistorySize);
    }
  }

  /**
   * Get job execution history
   * @param {string} jobName - Job name
   * @param {number} limit - Maximum number of records to return
   * @returns {Array} Execution history
   */
  getJobHistory(jobName, limit = 10) {
    const history = this.executionHistory.get(jobName) || [];
    return history.slice(0, limit);
  }

  /**
   * Get current status of all jobs
   * @returns {Array} Array of job status objects
   */
  getJobsStatus() {
    return Array.from(this.jobStatus.values());
  }

  /**
   * Enable or disable a specific job
   * @param {string} jobName - Job name
   * @param {boolean} enabled - Enable/disable flag
   */
  setJobEnabled(jobName, enabled) {
    const job = this.jobs.get(jobName);
    const jobConfig = this.jobStatus.get(jobName);
    
    if (!job || !jobConfig) {
      throw new Error(`Job ${jobName} not found`);
    }

    if (enabled && !jobConfig.enabled) {
      job.start();
      jobConfig.enabled = true;
      jobConfig.status = 'running';
      console.log(`Enabled job: ${jobName}`);
    } else if (!enabled && jobConfig.enabled) {
      job.stop();
      jobConfig.enabled = false;
      jobConfig.status = 'disabled';
      console.log(`Disabled job: ${jobName}`);
    }
  }

  /**
   * Manually trigger a job execution
   * @param {string} jobName - Job name to execute
   * @returns {Promise<void>}
   */
  async triggerJob(jobName) {
    const jobConfig = this.jobStatus.get(jobName);
    if (!jobConfig) {
      throw new Error(`Job ${jobName} not found`);
    }

    console.log(`Manually triggering job: ${jobName}`);
    await this.executeJob(jobName, jobConfig.syncType, jobConfig.condition);
  }

  /**
   * Get comprehensive scheduler statistics
   * @returns {Object} Scheduler statistics
   */
  getSchedulerStats() {
    const jobStats = Array.from(this.jobStatus.values());
    const queueStats = this.queueManager.getQueueStats();
    const marketStatus = this.getMarketStatus();
    
    return {
      scheduler: {
        isStarted: this.isStarted,
        totalJobs: jobStats.length,
        enabledJobs: jobStats.filter(j => j.enabled).length,
        disabledJobs: jobStats.filter(j => !j.enabled).length
      },
      queue: queueStats,
      market: marketStatus,
      jobs: jobStats
    };
  }

  /**
   * Get job queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    return this.queueManager.getQueueStats();
  }

  /**
   * Get job execution history from queue manager
   * @param {number} limit - Maximum records to return
   * @returns {Array} Execution history
   */
  getJobExecutionHistory(limit = 50) {
    return this.queueManager.getExecutionHistory(limit);
  }

  /**
   * Cancel a queued job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if cancelled
   */
  cancelQueuedJob(jobId) {
    return this.queueManager.cancelJob(jobId);
  }

  /**
   * Clear old execution history
   * @param {number} olderThanHours - Clear jobs older than specified hours
   */
  clearExecutionHistory(olderThanHours = 24) {
    this.queueManager.clearHistory(olderThanHours);
  }

  /**
   * Log current job status to console
   */
  logJobStatus() {
    console.log('\n=== Job Scheduler Status ===');
    
    // Job configurations
    this.jobStatus.forEach((config, jobName) => {
      console.log(`${jobName}:`);
      console.log(`  Status: ${config.status}`);
      console.log(`  Schedule: ${config.schedule} (${config.timezone})`);
      console.log(`  Enabled: ${config.enabled}`);
      console.log(`  Last Execution: ${config.lastExecution || 'Never'}`);
      console.log(`  Next Execution: ${config.nextExecution || 'Unknown'}`);
      if (config.lastError) {
        console.log(`  Last Error: ${config.lastError}`);
      }
      if (config.queuedJobId) {
        console.log(`  Queued Job ID: ${config.queuedJobId}`);
      }
      console.log('');
    });
    
    // Queue statistics
    const queueStats = this.getQueueStats();
    console.log('Queue Status:');
    console.log(`  Total Queued: ${queueStats.queued.total}`);
    console.log(`  Running: ${queueStats.running}/${queueStats.capacity}`);
    console.log(`  Success Rate: ${queueStats.recentExecutions.successRate.toFixed(1)}%`);
    
    // Market status
    const marketStatus = this.getMarketStatus();
    console.log(`Market Status: ${marketStatus.message}`);
    
    console.log('============================\n');
  }
}

module.exports = JobScheduler;