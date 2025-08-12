const RetryUtil = require('./RetryUtil');

/**
 * Job Queue Manager for handling job execution with queuing and concurrency control
 */
class JobQueueManager {
  constructor(options = {}) {
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.maxQueueSize = options.maxQueueSize || 100;
    this.defaultJobTimeout = options.defaultJobTimeout || 30 * 60 * 1000; // 30 minutes
    
    // Job queues by priority
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
    
    // Currently running jobs
    this.runningJobs = new Map();
    
    // Job execution history
    this.executionHistory = [];
    this.maxHistorySize = 1000;
    
    // Circuit breakers for different job types
    this.circuitBreakers = new Map();
    
    // Queue processing state
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * Start the queue processor
   */
  start() {
    if (this.isProcessing) {
      console.log('Job queue manager is already running');
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check queue every second

    console.log('Job queue manager started');
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (!this.isProcessing) {
      console.log('Job queue manager is not running');
      return;
    }

    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('Job queue manager stopped');
  }

  /**
   * Add a job to the queue
   * @param {Object} job - Job to queue
   * @returns {string} Job ID
   */
  enqueue(job) {
    const {
      id = this.generateJobId(),
      name,
      type,
      operation,
      priority = 'normal',
      timeout = this.defaultJobTimeout,
      retryOptions = {},
      metadata = {}
    } = job;

    if (!name || !operation) {
      throw new Error('Job must have name and operation');
    }

    const queuedJob = {
      id,
      name,
      type,
      operation,
      priority,
      timeout,
      retryOptions: {
        ...RetryUtil.getDefaultOptions('sync'),
        ...retryOptions
      },
      metadata,
      queuedAt: new Date(),
      attempts: 0,
      maxAttempts: retryOptions.maxAttempts || 3,
      status: 'queued'
    };

    // Check queue size limit
    const totalQueueSize = this.getTotalQueueSize();
    if (totalQueueSize >= this.maxQueueSize) {
      throw new Error(`Queue is full (${totalQueueSize}/${this.maxQueueSize})`);
    }

    // Add to appropriate priority queue
    this.queues[priority].push(queuedJob);
    
    console.log(`Job ${name} (${id}) queued with ${priority} priority`);
    
    return id;
  }

  /**
   * Process the job queue
   */
  async processQueue() {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return; // Max concurrent jobs reached
    }

    // Get next job from highest priority queue
    const job = this.getNextJob();
    if (!job) {
      return; // No jobs to process
    }

    // Check circuit breaker for this job type
    const circuitBreaker = this.getCircuitBreaker(job.type);
    const breakerState = circuitBreaker.getState();
    
    if (breakerState.state === 'OPEN') {
      console.warn(`Circuit breaker is OPEN for job type ${job.type}, requeueing job ${job.id}`);
      // Requeue with delay
      setTimeout(() => {
        this.queues[job.priority].unshift(job);
      }, 30000); // 30 second delay
      return;
    }

    // Execute the job
    this.executeJob(job);
  }

  /**
   * Execute a job with timeout and retry logic
   * @param {Object} job - Job to execute
   */
  async executeJob(job) {
    const { id, name, operation, timeout, retryOptions } = job;
    
    // Mark job as running
    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;
    this.runningJobs.set(id, job);

    console.log(`Executing job ${name} (${id}), attempt ${job.attempts}`);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Job timeout after ${timeout}ms`)), timeout);
      });

      // Execute with circuit breaker and retry logic
      const circuitBreaker = this.getCircuitBreaker(job.type);
      
      const result = await Promise.race([
        circuitBreaker.execute(async () => {
          return await RetryUtil.withRetry(operation, {
            ...retryOptions,
            onRetry: (error, attempt, delay) => {
              console.log(`Job ${name} retry ${attempt}: ${error.message}, waiting ${delay}ms`);
            }
          });
        }),
        timeoutPromise
      ]);

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      console.log(`Job ${name} (${id}) completed successfully`);
      
      this.recordJobExecution(job, true);
    } catch (error) {
      console.error(`Job ${name} (${id}) failed:`, error.message);
      
      // Check if we should retry
      if (job.attempts < job.maxAttempts && this.shouldRetry(error, job)) {
        job.status = 'queued';
        job.lastError = error.message;
        
        // Requeue with exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 30000);
        setTimeout(() => {
          this.queues[job.priority].unshift(job);
          console.log(`Job ${name} (${id}) requeued for retry ${job.attempts + 1}/${job.maxAttempts}`);
        }, delay);
      } else {
        // Job failed permanently
        job.status = 'failed';
        job.completedAt = new Date();
        job.error = error.message;
        
        console.error(`Job ${name} (${id}) failed permanently after ${job.attempts} attempts`);
        
        this.recordJobExecution(job, false, error);
      }
    } finally {
      // Remove from running jobs
      this.runningJobs.delete(id);
    }
  }

  /**
   * Get the next job from the highest priority queue
   * @returns {Object|null} Next job to execute
   */
  getNextJob() {
    // Check high priority first, then normal, then low
    for (const priority of ['high', 'normal', 'low']) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return null;
  }

  /**
   * Get circuit breaker for a job type
   * @param {string} jobType - Job type
   * @returns {Object} Circuit breaker instance
   */
  getCircuitBreaker(jobType) {
    if (!this.circuitBreakers.has(jobType)) {
      this.circuitBreakers.set(jobType, RetryUtil.createCircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000
      }));
    }
    return this.circuitBreakers.get(jobType);
  }

  /**
   * Check if a job should be retried based on error type
   * @param {Error} error - The error that occurred
   * @param {Object} job - The job that failed
   * @returns {boolean} True if should retry
   */
  shouldRetry(error, job) {
    // Don't retry timeout errors
    if (error.message.includes('timeout')) {
      return false;
    }

    // Don't retry authentication errors
    if (error.message.toLowerCase().includes('auth')) {
      return false;
    }

    // Don't retry validation errors
    if (error.message.toLowerCase().includes('validation')) {
      return false;
    }

    // Retry network and temporary errors
    const retryableErrors = ['network', 'connection', 'temporary', 'rate limit', 'service unavailable'];
    return retryableErrors.some(retryable => 
      error.message.toLowerCase().includes(retryable)
    );
  }

  /**
   * Record job execution in history
   * @param {Object} job - Executed job
   * @param {boolean} success - Whether job succeeded
   * @param {Error} error - Error if job failed
   */
  recordJobExecution(job, success, error = null) {
    const execution = {
      id: job.id,
      name: job.name,
      type: job.type,
      priority: job.priority,
      success,
      attempts: job.attempts,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      duration: job.completedAt ? job.completedAt.getTime() - job.startedAt.getTime() : null,
      error: error ? error.message : null,
      metadata: job.metadata
    };

    this.executionHistory.unshift(execution);
    
    // Keep history size manageable
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.splice(this.maxHistorySize);
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    const totalQueued = this.getTotalQueueSize();
    const running = this.runningJobs.size;
    
    const recentExecutions = this.executionHistory.slice(0, 100);
    const successful = recentExecutions.filter(e => e.success).length;
    const failed = recentExecutions.filter(e => !e.success).length;
    
    return {
      queued: {
        high: this.queues.high.length,
        normal: this.queues.normal.length,
        low: this.queues.low.length,
        total: totalQueued
      },
      running,
      capacity: this.maxConcurrentJobs,
      recentExecutions: {
        total: recentExecutions.length,
        successful,
        failed,
        successRate: recentExecutions.length > 0 ? (successful / recentExecutions.length) * 100 : 0
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([type, breaker]) => ({
        type,
        state: breaker.getState()
      }))
    };
  }

  /**
   * Get total number of queued jobs
   * @returns {number} Total queued jobs
   */
  getTotalQueueSize() {
    return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
  }

  /**
   * Generate a unique job ID
   * @returns {string} Job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancel a queued job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} True if job was cancelled
   */
  cancelJob(jobId) {
    for (const priority of ['high', 'normal', 'low']) {
      const queue = this.queues[priority];
      const index = queue.findIndex(job => job.id === jobId);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`Cancelled queued job ${jobId}`);
        return true;
      }
    }
    
    // Check if job is currently running
    if (this.runningJobs.has(jobId)) {
      console.warn(`Cannot cancel running job ${jobId}`);
      return false;
    }
    
    return false;
  }

  /**
   * Get job execution history
   * @param {number} limit - Maximum number of records to return
   * @returns {Array} Job execution history
   */
  getExecutionHistory(limit = 50) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Clear completed jobs from history
   * @param {number} olderThanHours - Clear jobs older than specified hours
   */
  clearHistory(olderThanHours = 24) {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.executionHistory = this.executionHistory.filter(
      execution => execution.completedAt > cutoffTime
    );
    console.log(`Cleared job history older than ${olderThanHours} hours`);
  }
}

module.exports = JobQueueManager;