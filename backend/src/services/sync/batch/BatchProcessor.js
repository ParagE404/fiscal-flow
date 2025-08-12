/**
 * Batch processing service for handling large datasets and concurrent sync operations
 * Provides memory-efficient streaming and queue management with priority handling
 */

const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const path = require('path');

class BatchProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxConcurrentBatches: options.maxConcurrentBatches || 5,
      batchSize: options.batchSize || 100,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      memoryThreshold: options.memoryThreshold || 0.8, // 80% of available memory
      workerPoolSize: options.workerPoolSize || 3,
      queueTimeout: options.queueTimeout || 30000, // 30 seconds
      ...options
    };

    this.queues = new Map(); // Priority queues for different operations
    this.activeBatches = new Map(); // Currently processing batches
    this.workerPool = [];
    this.isProcessing = false;
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      queueSizes: {}
    };

    this.initializeWorkerPool();
  }

  /**
   * Initialize worker pool for concurrent processing
   */
  initializeWorkerPool() {
    const workerScript = path.join(__dirname, 'BatchWorker.js');
    
    for (let i = 0; i < this.config.workerPoolSize; i++) {
      try {
        const worker = new Worker(workerScript);
        worker.on('message', (result) => this.handleWorkerMessage(result));
        worker.on('error', (error) => this.handleWorkerError(error));
        worker.on('exit', (code) => this.handleWorkerExit(code, i));
        
        this.workerPool.push({
          worker,
          id: i,
          busy: false,
          currentTask: null
        });
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error.message);
      }
    }

    console.log(`Batch processor initialized with ${this.workerPool.length} workers`);
  }

  /**
   * Add items to processing queue with priority
   * @param {string} queueName - Queue identifier
   * @param {Array} items - Items to process
   * @param {Object} options - Processing options
   */
  addToQueue(queueName, items, options = {}) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, {
        items: [],
        priority: options.priority || 'normal',
        processor: options.processor,
        batchSize: options.batchSize || this.config.batchSize,
        retries: 0,
        createdAt: new Date(),
        metadata: options.metadata || {}
      });
    }

    const queue = this.queues.get(queueName);
    queue.items.push(...items);
    
    this.emit('queueUpdated', {
      queueName,
      size: queue.items.length,
      priority: queue.priority
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return {
      queueName,
      itemsAdded: items.length,
      totalInQueue: queue.items.length
    };
  }

  /**
   * Start batch processing
   */
  async startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log('Batch processing started');

    try {
      while (this.hasItemsToProcess()) {
        await this.processNextBatch();
        
        // Check memory usage and pause if necessary
        if (this.isMemoryThresholdExceeded()) {
          console.warn('Memory threshold exceeded, pausing processing');
          await this.waitForMemoryRelease();
        }
      }
    } catch (error) {
      console.error('Batch processing error:', error);
      this.emit('processingError', error);
    } finally {
      this.isProcessing = false;
      console.log('Batch processing completed');
      this.emit('processingComplete', this.getStats());
    }
  }

  /**
   * Process next batch from highest priority queue
   */
  async processNextBatch() {
    const nextQueue = this.getNextQueueToProcess();
    if (!nextQueue) {
      return;
    }

    const { queueName, queue } = nextQueue;
    const batchSize = Math.min(queue.batchSize, queue.items.length);
    const batch = queue.items.splice(0, batchSize);

    if (batch.length === 0) {
      return;
    }

    const batchId = this.generateBatchId(queueName);
    const batchInfo = {
      id: batchId,
      queueName,
      items: batch,
      processor: queue.processor,
      startTime: Date.now(),
      retries: 0,
      metadata: queue.metadata
    };

    this.activeBatches.set(batchId, batchInfo);

    try {
      await this.processBatch(batchInfo);
    } catch (error) {
      await this.handleBatchError(batchInfo, error);
    }
  }

  /**
   * Process a single batch
   */
  async processBatch(batchInfo) {
    const { id, items, processor, metadata } = batchInfo;
    
    this.emit('batchStarted', {
      batchId: id,
      itemCount: items.length,
      queueName: batchInfo.queueName
    });

    let result;
    
    if (this.workerPool.length > 0) {
      // Use worker thread for processing
      result = await this.processWithWorker(batchInfo);
    } else {
      // Process in main thread
      result = await this.processInMainThread(batchInfo);
    }

    const duration = Date.now() - batchInfo.startTime;
    this.updateStats(result, duration);

    this.activeBatches.delete(id);
    
    this.emit('batchCompleted', {
      batchId: id,
      result,
      duration,
      itemCount: items.length
    });

    return result;
  }

  /**
   * Process batch using worker thread
   */
  async processWithWorker(batchInfo) {
    const availableWorker = this.getAvailableWorker();
    
    if (!availableWorker) {
      // Fallback to main thread if no workers available
      return await this.processInMainThread(batchInfo);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        availableWorker.busy = false;
        availableWorker.currentTask = null;
        reject(new Error('Worker timeout'));
      }, this.config.queueTimeout);

      availableWorker.busy = true;
      availableWorker.currentTask = batchInfo.id;

      const messageHandler = (result) => {
        if (result.batchId === batchInfo.id) {
          clearTimeout(timeout);
          availableWorker.busy = false;
          availableWorker.currentTask = null;
          availableWorker.worker.off('message', messageHandler);
          
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        }
      };

      availableWorker.worker.on('message', messageHandler);
      availableWorker.worker.postMessage({
        batchId: batchInfo.id,
        items: batchInfo.items,
        processor: batchInfo.processor,
        metadata: batchInfo.metadata
      });
    });
  }

  /**
   * Process batch in main thread
   */
  async processInMainThread(batchInfo) {
    const { items, processor, metadata } = batchInfo;
    
    if (typeof processor !== 'function') {
      throw new Error('Processor must be a function');
    }

    const results = [];
    const errors = [];

    // Process items in chunks to avoid blocking
    for (let i = 0; i < items.length; i += 10) {
      const chunk = items.slice(i, i + 10);
      
      for (const item of chunk) {
        try {
          const result = await processor(item, metadata);
          results.push(result);
        } catch (error) {
          errors.push({ item, error: error.message });
        }
      }

      // Yield control to event loop
      await new Promise(resolve => setImmediate(resolve));
    }

    return {
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Handle batch processing error
   */
  async handleBatchError(batchInfo, error) {
    const { id, queueName, items, retries } = batchInfo;
    
    console.error(`Batch ${id} failed:`, error.message);
    
    if (retries < this.config.maxRetries) {
      // Retry the batch
      batchInfo.retries++;
      
      await new Promise(resolve => 
        setTimeout(resolve, this.config.retryDelay * Math.pow(2, retries))
      );
      
      console.log(`Retrying batch ${id} (attempt ${retries + 1})`);
      
      try {
        await this.processBatch(batchInfo);
      } catch (retryError) {
        await this.handleBatchError(batchInfo, retryError);
      }
    } else {
      // Max retries exceeded, move to failed queue
      this.stats.totalFailed += items.length;
      this.activeBatches.delete(id);
      
      this.emit('batchFailed', {
        batchId: id,
        queueName,
        itemCount: items.length,
        error: error.message,
        retries
      });
    }
  }

  /**
   * Get next queue to process based on priority
   */
  getNextQueueToProcess() {
    const priorities = ['high', 'normal', 'low'];
    
    for (const priority of priorities) {
      for (const [queueName, queue] of this.queues.entries()) {
        if (queue.priority === priority && queue.items.length > 0) {
          return { queueName, queue };
        }
      }
    }
    
    return null;
  }

  /**
   * Get available worker from pool
   */
  getAvailableWorker() {
    return this.workerPool.find(worker => !worker.busy);
  }

  /**
   * Check if there are items to process
   */
  hasItemsToProcess() {
    for (const queue of this.queues.values()) {
      if (queue.items.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if memory threshold is exceeded
   */
  isMemoryThresholdExceeded() {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;
    const memoryRatio = usedMemory / totalMemory;
    
    this.stats.memoryUsage = memoryRatio;
    
    return memoryRatio > this.config.memoryThreshold;
  }

  /**
   * Wait for memory to be released
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
   * Generate unique batch ID
   */
  generateBatchId(queueName) {
    return `${queueName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update processing statistics
   */
  updateStats(result, duration) {
    this.stats.totalProcessed += result.processed || 0;
    this.stats.totalFailed += result.failed || 0;
    
    // Update average processing time
    const totalOperations = this.stats.totalProcessed + this.stats.totalFailed;
    if (totalOperations > 0) {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (totalOperations - (result.processed || 0)) + duration) / totalOperations;
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    // Update queue sizes
    for (const [queueName, queue] of this.queues.entries()) {
      this.stats.queueSizes[queueName] = queue.items.length;
    }

    return {
      ...this.stats,
      activeQueues: this.queues.size,
      activeBatches: this.activeBatches.size,
      availableWorkers: this.workerPool.filter(w => !w.busy).length,
      totalWorkers: this.workerPool.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(result) {
    // Worker messages are handled in processWithWorker
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(error) {
    console.error('Worker error:', error);
    this.emit('workerError', error);
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(code, workerId) {
    if (code !== 0) {
      console.warn(`Worker ${workerId} exited with code ${code}`);
      
      // Restart worker if it crashed
      this.restartWorker(workerId);
    }
  }

  /**
   * Restart a crashed worker
   */
  restartWorker(workerId) {
    try {
      const workerScript = path.join(__dirname, 'BatchWorker.js');
      const worker = new Worker(workerScript);
      
      worker.on('message', (result) => this.handleWorkerMessage(result));
      worker.on('error', (error) => this.handleWorkerError(error));
      worker.on('exit', (code) => this.handleWorkerExit(code, workerId));
      
      this.workerPool[workerId] = {
        worker,
        id: workerId,
        busy: false,
        currentTask: null
      };
      
      console.log(`Worker ${workerId} restarted`);
    } catch (error) {
      console.error(`Failed to restart worker ${workerId}:`, error);
    }
  }

  /**
   * Pause processing
   */
  pause() {
    this.isProcessing = false;
    this.emit('processingPaused');
  }

  /**
   * Resume processing
   */
  resume() {
    if (!this.isProcessing && this.hasItemsToProcess()) {
      this.startProcessing();
    }
  }

  /**
   * Clear specific queue
   */
  clearQueue(queueName) {
    if (this.queues.has(queueName)) {
      const queue = this.queues.get(queueName);
      const clearedCount = queue.items.length;
      queue.items = [];
      
      this.emit('queueCleared', { queueName, clearedCount });
      return clearedCount;
    }
    return 0;
  }

  /**
   * Clear all queues
   */
  clearAllQueues() {
    let totalCleared = 0;
    
    for (const [queueName, queue] of this.queues.entries()) {
      totalCleared += queue.items.length;
      queue.items = [];
    }
    
    this.emit('allQueuesCleared', { totalCleared });
    return totalCleared;
  }

  /**
   * Shutdown batch processor
   */
  async shutdown() {
    console.log('Shutting down batch processor...');
    
    // Stop processing new batches
    this.isProcessing = false;
    
    // Wait for active batches to complete
    while (this.activeBatches.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Terminate all workers
    for (const workerInfo of this.workerPool) {
      try {
        await workerInfo.worker.terminate();
      } catch (error) {
        console.warn(`Error terminating worker ${workerInfo.id}:`, error);
      }
    }
    
    this.workerPool = [];
    this.queues.clear();
    this.activeBatches.clear();
    
    this.emit('shutdown');
    console.log('Batch processor shutdown complete');
  }
}

module.exports = BatchProcessor;