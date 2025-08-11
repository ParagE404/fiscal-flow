/**
 * Batch Sync Orchestrator
 * Coordinates large-scale sync operations across multiple users and investment types
 * Provides intelligent scheduling, resource management, and progress monitoring
 */

const QueueManager = require('./QueueManager');
const StreamProcessor = require('./StreamProcessor');
const { InvestmentTypes, DataSources, createSyncResult } = require('../types/SyncTypes');
const { PrismaClient } = require('@prisma/client');

class BatchSyncOrchestrator {
  constructor(options = {}) {
    this.queueManager = new QueueManager({
      maxConcurrentBatches: options.maxConcurrentBatches || 5,
      batchSize: options.batchSize || 100,
      streamChunkSize: options.streamChunkSize || 1000,
      maxMemoryUsage: options.maxMemoryUsage || 0.75,
      streamConcurrency: options.streamConcurrency || 3,
      ...options
    });

    this.prisma = new PrismaClient();
    
    this.config = {
      maxUsersPerBatch: options.maxUsersPerBatch || 10000,
      memoryThreshold: options.memoryThreshold || 0.8,
      maxConcurrentSyncs: options.maxConcurrentSyncs || 3,
      progressReportInterval: options.progressReportInterval || 5000,
      ...options
    };

    this.activeOperations = new Map();
    this.operationHistory = [];
    this.resourceMonitor = null;
  }

  /**
   * Execute comprehensive sync for all users and investment types
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Comprehensive sync result
   */
  async executeComprehensiveSync(options = {}) {
    const operationId = `comprehensive_sync_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`Starting comprehensive sync operation: ${operationId}`);
    
    const operation = {
      id: operationId,
      type: 'comprehensive_sync',
      startTime: new Date(),
      status: 'running',
      progress: {
        totalUsers: 0,
        processedUsers: 0,
        totalInvestments: 0,
        processedInvestments: 0,
        errors: []
      },
      results: {}
    };

    this.activeOperations.set(operationId, operation);
    
    try {
      // Start resource monitoring
      this.startResourceMonitoring(operationId);
      
      // Get total user count for progress tracking
      const totalUsers = await this.getTotalEnabledUsers();
      operation.progress.totalUsers = totalUsers;
      
      console.log(`Found ${totalUsers} users with sync enabled`);
      
      // Determine optimal processing strategy based on user count
      const processingStrategy = this.determineProcessingStrategy(totalUsers, options);
      console.log(`Using processing strategy: ${processingStrategy.name}`);
      
      // Execute sync for each investment type
      const investmentTypes = options.investmentTypes || [
        InvestmentTypes.MUTUAL_FUNDS,
        InvestmentTypes.STOCKS,
        InvestmentTypes.EPF
      ];
      
      for (const investmentType of investmentTypes) {
        console.log(`Starting sync for investment type: ${investmentType}`);
        
        try {
          const typeResult = await this.executeSyncForInvestmentType(
            investmentType,
            processingStrategy,
            {
              ...options,
              operationId,
              onProgress: (progress) => this.updateOperationProgress(operationId, progress)
            }
          );
          
          operation.results[investmentType] = typeResult;
          console.log(`Completed sync for ${investmentType}:`, {
            successfulUsers: typeResult.successfulUsers,
            failedUsers: typeResult.failedUsers,
            totalRecordsUpdated: typeResult.totalRecordsUpdated
          });
          
        } catch (error) {
          console.error(`Failed to sync ${investmentType}:`, error);
          operation.results[investmentType] = {
            success: false,
            error: error.message,
            successfulUsers: 0,
            failedUsers: 0
          };
          operation.progress.errors.push({
            investmentType,
            error: error.message,
            timestamp: new Date()
          });
        }
      }
      
      // Calculate final results
      const finalResult = this.calculateComprehensiveResults(operation.results);
      
      operation.status = finalResult.success ? 'completed' : 'completed_with_errors';
      operation.endTime = new Date();
      operation.duration = Date.now() - startTime;
      operation.finalResult = finalResult;
      
      console.log(`Comprehensive sync completed:`, {
        operationId,
        duration: `${operation.duration}ms`,
        totalUsers: finalResult.totalUsers,
        successfulUsers: finalResult.successfulUsers,
        failedUsers: finalResult.failedUsers,
        totalRecordsUpdated: finalResult.totalRecordsUpdated
      });
      
      // Store operation in history
      this.operationHistory.push({
        ...operation,
        activeOperations: undefined // Remove circular reference
      });
      
      // Keep only last 100 operations
      if (this.operationHistory.length > 100) {
        this.operationHistory = this.operationHistory.slice(-100);
      }
      
      return finalResult;
      
    } catch (error) {
      console.error(`Comprehensive sync failed:`, error);
      
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.duration = Date.now() - startTime;
      operation.error = error.message;
      
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
      this.stopResourceMonitoring();
    }
  }

  /**
   * Execute sync for a specific investment type
   * @param {string} investmentType - Investment type to sync
   * @param {Object} strategy - Processing strategy
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result for the investment type
   */
  async executeSyncForInvestmentType(investmentType, strategy, options = {}) {
    const startTime = Date.now();
    
    // Get users with this investment type enabled
    const enabledUsers = await this.getEnabledUsersForInvestmentType(investmentType);
    
    if (enabledUsers.length === 0) {
      return {
        success: true,
        successfulUsers: 0,
        failedUsers: 0,
        totalRecordsUpdated: 0,
        message: `No users found with ${investmentType} sync enabled`
      };
    }
    
    console.log(`Processing ${enabledUsers.length} users for ${investmentType}`);
    
    let result;
    
    switch (strategy.name) {
      case 'streaming':
        result = await this.executeStreamingSync(investmentType, enabledUsers, options);
        break;
        
      case 'batch':
        result = await this.executeBatchSync(investmentType, enabledUsers, options);
        break;
        
      case 'hybrid':
        result = await this.executeHybridSync(investmentType, enabledUsers, options);
        break;
        
      default:
        throw new Error(`Unknown processing strategy: ${strategy.name}`);
    }
    
    result.duration = Date.now() - startTime;
    result.investmentType = investmentType;
    
    return result;
  }

  /**
   * Execute streaming sync for large user bases
   * @param {string} investmentType - Investment type
   * @param {Array} users - Users to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Streaming sync result
   */
  async executeStreamingSync(investmentType, users, options = {}) {
    console.log(`Executing streaming sync for ${investmentType} with ${users.length} users`);
    
    // Create user data source from the provided users array
    const userDataSource = (users) => {
      let index = 0;
      return async ({ offset, limit }) => {
        const chunk = users.slice(index, index + limit);
        index += limit;
        return chunk;
      };
    };
    
    const result = await this.queueManager.processLargeUserBaseSync(investmentType, {
      ...options,
      chunkSize: Math.min(options.chunkSize || 100, 500),
      concurrency: options.concurrency || 3,
      dataSource: options.dataSource
    });
    
    return {
      success: result.success,
      successfulUsers: result.successfulUsers,
      failedUsers: result.failedUsers,
      totalRecordsUpdated: result.userResults.reduce((sum, user) => sum + (user.recordsUpdated || 0), 0),
      processingRate: result.processingRate,
      peakMemoryUsage: result.peakMemoryUsage,
      userResults: result.userResults,
      userErrors: result.userErrors
    };
  }

  /**
   * Execute batch sync for moderate user bases
   * @param {string} investmentType - Investment type
   * @param {Array} users - Users to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Batch sync result
   */
  async executeBatchSync(investmentType, users, options = {}) {
    console.log(`Executing batch sync for ${investmentType} with ${users.length} users`);
    
    const batchSize = options.batchSize || 50;
    const results = [];
    const errors = [];
    let totalRecordsUpdated = 0;
    
    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.processBatch(investmentType, batch, options);
        results.push(...batchResults.results);
        errors.push(...batchResults.errors);
        totalRecordsUpdated += batchResults.totalRecordsUpdated;
        
        // Report progress
        if (options.onProgress) {
          options.onProgress({
            investmentType,
            processedUsers: Math.min(i + batchSize, users.length),
            totalUsers: users.length,
            successfulUsers: results.filter(r => r.success).length,
            failedUsers: results.filter(r => !r.success).length
          });
        }
        
        // Check memory usage and pause if necessary
        if (this.isMemoryThresholdExceeded()) {
          console.warn('Memory threshold exceeded, pausing batch processing');
          await this.waitForMemoryRelease();
        }
        
      } catch (error) {
        console.error(`Batch processing failed for users ${i}-${i + batchSize}:`, error);
        
        // Add error for each user in the failed batch
        batch.forEach(user => {
          errors.push({
            userId: user.id,
            error: error.message
          });
        });
      }
    }
    
    return {
      success: errors.length === 0,
      successfulUsers: results.filter(r => r.success).length,
      failedUsers: results.filter(r => !r.success).length + errors.length,
      totalRecordsUpdated,
      userResults: results,
      userErrors: errors
    };
  }

  /**
   * Execute hybrid sync (combination of streaming and batch)
   * @param {string} investmentType - Investment type
   * @param {Array} users - Users to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Hybrid sync result
   */
  async executeHybridSync(investmentType, users, options = {}) {
    console.log(`Executing hybrid sync for ${investmentType} with ${users.length} users`);
    
    // Split users into high-priority and normal-priority groups
    const highPriorityUsers = users.filter(user => 
      user.preferences?.syncPriority === 'high' || 
      user.preferences?.isPremium === true
    );
    
    const normalPriorityUsers = users.filter(user => 
      !highPriorityUsers.includes(user)
    );
    
    console.log(`High priority users: ${highPriorityUsers.length}, Normal priority: ${normalPriorityUsers.length}`);
    
    const results = [];
    const errors = [];
    let totalRecordsUpdated = 0;
    
    // Process high-priority users with batch processing for faster response
    if (highPriorityUsers.length > 0) {
      console.log('Processing high-priority users with batch sync');
      const highPriorityResult = await this.executeBatchSync(investmentType, highPriorityUsers, {
        ...options,
        batchSize: Math.min(options.batchSize || 25, 50)
      });
      
      results.push(...highPriorityResult.userResults);
      errors.push(...highPriorityResult.userErrors);
      totalRecordsUpdated += highPriorityResult.totalRecordsUpdated;
    }
    
    // Process normal-priority users with streaming for memory efficiency
    if (normalPriorityUsers.length > 0) {
      console.log('Processing normal-priority users with streaming sync');
      const normalPriorityResult = await this.executeStreamingSync(investmentType, normalPriorityUsers, {
        ...options,
        chunkSize: Math.min(options.chunkSize || 200, 1000)
      });
      
      results.push(...normalPriorityResult.userResults);
      errors.push(...normalPriorityResult.userErrors);
      totalRecordsUpdated += normalPriorityResult.totalRecordsUpdated;
    }
    
    return {
      success: errors.length === 0,
      successfulUsers: results.filter(r => r.success).length,
      failedUsers: results.filter(r => !r.success).length + errors.length,
      totalRecordsUpdated,
      userResults: results,
      userErrors: errors,
      strategy: 'hybrid',
      highPriorityUsers: highPriorityUsers.length,
      normalPriorityUsers: normalPriorityUsers.length
    };
  }

  /**
   * Process a batch of users for a specific investment type
   * @param {string} investmentType - Investment type
   * @param {Array} userBatch - Batch of users to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing result
   */
  async processBatch(investmentType, userBatch, options = {}) {
    const results = [];
    const errors = [];
    let totalRecordsUpdated = 0;
    
    // Get sync service for this investment type
    const syncService = this.queueManager.getSyncService(investmentType);
    if (!syncService) {
      throw new Error(`No sync service found for ${investmentType}`);
    }
    
    // Process users concurrently within the batch
    const concurrency = Math.min(options.concurrency || 3, userBatch.length);
    const promises = [];
    
    for (let i = 0; i < userBatch.length; i += concurrency) {
      const concurrentBatch = userBatch.slice(i, i + concurrency);
      
      const batchPromises = concurrentBatch.map(async (user) => {
        try {
          const syncResult = await syncService.sync(user.id, {
            source: options.dataSource,
            force: options.force || false,
            timeout: options.timeout || 30000
          });
          
          return {
            userId: user.id,
            success: syncResult.success,
            recordsUpdated: syncResult.recordsUpdated,
            recordsProcessed: syncResult.recordsProcessed,
            errors: syncResult.errors,
            duration: syncResult.duration
          };
        } catch (error) {
          return {
            userId: user.id,
            success: false,
            error: error.message,
            recordsUpdated: 0,
            recordsProcessed: 0
          };
        }
      });
      
      promises.push(...batchPromises);
    }
    
    // Wait for all promises to complete
    const batchResults = await Promise.allSettled(promises);
    
    // Process results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const userResult = result.value;
        
        if (userResult.success) {
          results.push(userResult);
          totalRecordsUpdated += userResult.recordsUpdated || 0;
        } else {
          errors.push({
            userId: userResult.userId,
            error: userResult.error || 'Unknown error'
          });
        }
      } else {
        errors.push({
          userId: userBatch[index]?.id || 'unknown',
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });
    
    return {
      results,
      errors,
      totalRecordsUpdated
    };
  }

  /**
   * Determine optimal processing strategy based on user count and system resources
   * @param {number} userCount - Number of users to process
   * @param {Object} options - Processing options
   * @returns {Object} Processing strategy
   */
  determineProcessingStrategy(userCount, options = {}) {
    // Force specific strategy if requested
    if (options.strategy) {
      return { name: options.strategy };
    }
    
    // Get current memory usage
    const memUsage = process.memoryUsage();
    const memoryRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    // Determine strategy based on user count and available resources
    if (userCount > this.config.maxUsersPerBatch || memoryRatio > 0.6) {
      return {
        name: 'streaming',
        reason: `Large user base (${userCount} users) or high memory usage (${(memoryRatio * 100).toFixed(1)}%)`
      };
    } else if (userCount > 1000) {
      return {
        name: 'hybrid',
        reason: `Moderate user base (${userCount} users) - using hybrid approach`
      };
    } else {
      return {
        name: 'batch',
        reason: `Small user base (${userCount} users) - using batch processing`
      };
    }
  }

  /**
   * Get total number of users with sync enabled
   * @returns {Promise<number>} Total enabled users
   */
  async getTotalEnabledUsers() {
    try {
      const count = await this.prisma.user.count({
        where: {
          syncConfigurations: {
            some: {
              isEnabled: true
            }
          }
        }
      });
      
      return count;
    } catch (error) {
      console.error('Error getting total enabled users:', error);
      return 0;
    }
  }

  /**
   * Get users with sync enabled for a specific investment type
   * @param {string} investmentType - Investment type
   * @returns {Promise<Array>} Array of enabled users
   */
  async getEnabledUsersForInvestmentType(investmentType) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          syncConfigurations: {
            some: {
              investmentType,
              isEnabled: true
            }
          }
        },
        select: {
          id: true,
          email: true,
          preferences: true,
          syncConfigurations: {
            where: {
              investmentType,
              isEnabled: true
            }
          }
        }
      });
      
      return users;
    } catch (error) {
      console.error(`Error getting enabled users for ${investmentType}:`, error);
      return [];
    }
  }

  /**
   * Calculate comprehensive results from individual investment type results
   * @param {Object} results - Results from each investment type
   * @returns {Object} Comprehensive result summary
   */
  calculateComprehensiveResults(results) {
    const summary = {
      success: true,
      totalUsers: 0,
      successfulUsers: 0,
      failedUsers: 0,
      totalRecordsUpdated: 0,
      investmentTypeResults: {},
      errors: []
    };
    
    for (const [investmentType, result] of Object.entries(results)) {
      summary.investmentTypeResults[investmentType] = result;
      
      if (result.success === false) {
        summary.success = false;
      }
      
      if (result.successfulUsers) {
        summary.successfulUsers += result.successfulUsers;
      }
      
      if (result.failedUsers) {
        summary.failedUsers += result.failedUsers;
      }
      
      if (result.totalRecordsUpdated) {
        summary.totalRecordsUpdated += result.totalRecordsUpdated;
      }
      
      if (result.userErrors && result.userErrors.length > 0) {
        summary.errors.push(...result.userErrors.map(error => ({
          ...error,
          investmentType
        })));
      }
    }
    
    // Calculate unique users (avoid double counting)
    const uniqueUsers = new Set();
    for (const result of Object.values(results)) {
      if (result.userResults) {
        result.userResults.forEach(user => uniqueUsers.add(user.userId));
      }
    }
    
    summary.totalUsers = uniqueUsers.size;
    
    return summary;
  }

  /**
   * Update operation progress
   * @param {string} operationId - Operation ID
   * @param {Object} progress - Progress update
   */
  updateOperationProgress(operationId, progress) {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      Object.assign(operation.progress, progress);
      
      // Emit progress event for external monitoring
      if (this.progressCallback) {
        this.progressCallback(operationId, operation.progress);
      }
    }
  }

  /**
   * Start resource monitoring for an operation
   * @param {string} operationId - Operation ID
   */
  startResourceMonitoring(operationId) {
    this.resourceMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const operation = this.activeOperations.get(operationId);
      
      if (operation) {
        operation.resourceUsage = {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          memoryRatio: memUsage.heapUsed / memUsage.heapTotal,
          timestamp: new Date()
        };
        
        // Warn if memory usage is high
        if (operation.resourceUsage.memoryRatio > this.config.memoryThreshold) {
          console.warn(`High memory usage detected for operation ${operationId}: ${(operation.resourceUsage.memoryRatio * 100).toFixed(1)}%`);
        }
      }
    }, this.config.progressReportInterval);
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
  }

  /**
   * Check if memory threshold is exceeded
   * @returns {boolean} True if memory threshold exceeded
   */
  isMemoryThresholdExceeded() {
    const memUsage = process.memoryUsage();
    const memoryRatio = memUsage.heapUsed / memUsage.heapTotal;
    return memoryRatio > this.config.memoryThreshold;
  }

  /**
   * Wait for memory to be released
   * @returns {Promise<void>}
   */
  async waitForMemoryRelease() {
    return new Promise((resolve) => {
      const checkMemory = () => {
        if (!this.isMemoryThresholdExceeded()) {
          resolve();
        } else {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          setTimeout(checkMemory, 1000);
        }
      };
      
      setTimeout(checkMemory, 1000);
    });
  }

  /**
   * Get active operations status
   * @returns {Array} Array of active operations
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.values()).map(op => ({
      id: op.id,
      type: op.type,
      status: op.status,
      startTime: op.startTime,
      progress: op.progress,
      resourceUsage: op.resourceUsage
    }));
  }

  /**
   * Get operation history
   * @param {number} limit - Maximum number of operations to return
   * @returns {Array} Array of historical operations
   */
  getOperationHistory(limit = 10) {
    return this.operationHistory
      .slice(-limit)
      .map(op => ({
        id: op.id,
        type: op.type,
        status: op.status,
        startTime: op.startTime,
        endTime: op.endTime,
        duration: op.duration,
        finalResult: op.finalResult ? {
          success: op.finalResult.success,
          totalUsers: op.finalResult.totalUsers,
          successfulUsers: op.finalResult.successfulUsers,
          failedUsers: op.finalResult.failedUsers,
          totalRecordsUpdated: op.finalResult.totalRecordsUpdated
        } : null
      }));
  }

  /**
   * Set progress callback for external monitoring
   * @param {Function} callback - Progress callback function
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown() {
    console.log('Shutting down batch sync orchestrator...');
    
    this.stopResourceMonitoring();
    await this.queueManager.shutdown();
    await this.prisma.$disconnect();
    
    console.log('Batch sync orchestrator shutdown complete');
  }
}

module.exports = BatchSyncOrchestrator;