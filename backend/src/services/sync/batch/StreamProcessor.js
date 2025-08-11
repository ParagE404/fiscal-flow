/**
 * Stream Processor for memory-efficient processing of large datasets
 * Provides streaming capabilities for batch operations to handle large user bases
 */

const { Transform, Readable, Writable } = require('stream');
const { pipeline } = require('stream/promises');
const EventEmitter = require('events');

class StreamProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      chunkSize: options.chunkSize || 1000,
      maxMemoryUsage: options.maxMemoryUsage || 0.8, // 80% of available memory
      backpressureThreshold: options.backpressureThreshold || 10000,
      concurrency: options.concurrency || 5,
      ...options
    };

    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      currentMemoryUsage: 0,
      peakMemoryUsage: 0,
      processingRate: 0,
      startTime: null
    };

    this.isProcessing = false;
    this.backpressureActive = false;
  }

  /**
   * Create a readable stream from a data source
   * @param {Function|Array|AsyncIterable} dataSource - Data source to stream from
   * @param {Object} options - Stream options
   * @returns {Readable} Readable stream
   */
  createReadableStream(dataSource, options = {}) {
    if (Array.isArray(dataSource)) {
      return this.createArrayStream(dataSource, options);
    } else if (typeof dataSource === 'function') {
      return this.createFunctionStream(dataSource, options);
    } else if (dataSource && typeof dataSource[Symbol.asyncIterator] === 'function') {
      return this.createAsyncIterableStream(dataSource, options);
    } else {
      throw new Error('Unsupported data source type');
    }
  }

  /**
   * Create a readable stream from an array
   * @param {Array} array - Array to stream
   * @param {Object} options - Stream options
   * @returns {Readable} Readable stream
   */
  createArrayStream(array, options = {}) {
    let index = 0;
    const chunkSize = options.chunkSize || this.config.chunkSize;

    return new Readable({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      read() {
        if (index >= array.length) {
          this.push(null); // End of stream
          return;
        }

        const chunk = array.slice(index, index + chunkSize);
        index += chunkSize;
        
        this.push(chunk);
      }
    });
  }

  /**
   * Create a readable stream from a function
   * @param {Function} fn - Function that returns data chunks
   * @param {Object} options - Stream options
   * @returns {Readable} Readable stream
   */
  createFunctionStream(fn, options = {}) {
    let offset = 0;
    const limit = options.limit || this.config.chunkSize;
    let hasMore = true;

    return new Readable({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      async read() {
        if (!hasMore) {
          this.push(null);
          return;
        }

        try {
          const chunk = await fn({ offset, limit });
          
          if (!chunk || chunk.length === 0) {
            hasMore = false;
            this.push(null);
          } else {
            offset += chunk.length;
            this.push(chunk);
          }
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Create a readable stream from an async iterable
   * @param {AsyncIterable} iterable - Async iterable to stream
   * @param {Object} options - Stream options
   * @returns {Readable} Readable stream
   */
  createAsyncIterableStream(iterable, options = {}) {
    const iterator = iterable[Symbol.asyncIterator]();
    const chunkSize = options.chunkSize || this.config.chunkSize;
    let buffer = [];

    return new Readable({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      async read() {
        try {
          while (buffer.length < chunkSize) {
            const { value, done } = await iterator.next();
            
            if (done) {
              if (buffer.length > 0) {
                this.push(buffer);
                buffer = [];
              }
              this.push(null);
              return;
            }
            
            buffer.push(value);
          }
          
          this.push(buffer);
          buffer = [];
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Create a transform stream for processing data chunks
   * @param {Function} processor - Processing function
   * @param {Object} options - Transform options
   * @returns {Transform} Transform stream
   */
  createTransformStream(processor, options = {}) {
    const concurrency = options.concurrency || this.config.concurrency;
    let activePromises = 0;
    let pendingCallbacks = [];

    return new Transform({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      transform(chunk, encoding, callback) {
        // Check memory usage before processing
        if (this.isMemoryThresholdExceeded()) {
          this.activateBackpressure();
          return callback();
        }

        // Limit concurrency
        if (activePromises >= concurrency) {
          pendingCallbacks.push({ chunk, callback });
          return;
        }

        this.processChunk(chunk, processor, callback);
      },

      flush(callback) {
        // Wait for all pending operations to complete
        const checkPending = () => {
          if (activePromises === 0 && pendingCallbacks.length === 0) {
            callback();
          } else {
            setTimeout(checkPending, 10);
          }
        };
        checkPending();
      }
    });

    // Add custom methods to the transform stream
    Object.assign(Transform.prototype, {
      async processChunk(chunk, processor, callback) {
        activePromises++;
        
        try {
          const startTime = Date.now();
          const result = await processor(chunk);
          const duration = Date.now() - startTime;
          
          this.updateStats(chunk.length, 0, duration);
          this.push(result);
          callback();
        } catch (error) {
          this.updateStats(0, chunk.length, 0);
          this.emit('error', error);
          callback(error);
        } finally {
          activePromises--;
          
          // Process pending callbacks
          if (pendingCallbacks.length > 0 && activePromises < concurrency) {
            const { chunk: pendingChunk, callback: pendingCallback } = pendingCallbacks.shift();
            this.processChunk(pendingChunk, processor, pendingCallback);
          }
        }
      },

      isMemoryThresholdExceeded() {
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapTotal + memUsage.external;
        const usedMemory = memUsage.heapUsed;
        const memoryRatio = usedMemory / totalMemory;
        
        this.stats.currentMemoryUsage = memoryRatio;
        this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, memoryRatio);
        
        return memoryRatio > this.config.maxMemoryUsage;
      },

      activateBackpressure() {
        if (!this.backpressureActive) {
          this.backpressureActive = true;
          this.emit('backpressure', { memoryUsage: this.stats.currentMemoryUsage });
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          // Deactivate backpressure after a delay
          setTimeout(() => {
            this.backpressureActive = false;
            this.emit('backpressure-released');
          }, 1000);
        }
      },

      updateStats(processed, errors, duration) {
        this.stats.totalProcessed += processed;
        this.stats.totalErrors += errors;
        
        if (this.stats.startTime) {
          const elapsed = Date.now() - this.stats.startTime;
          this.stats.processingRate = this.stats.totalProcessed / (elapsed / 1000);
        }
      }
    });

    return Transform.prototype;
  }

  /**
   * Create a writable stream for collecting results
   * @param {Function} writer - Function to handle processed data
   * @param {Object} options - Writable options
   * @returns {Writable} Writable stream
   */
  createWritableStream(writer, options = {}) {
    const batchSize = options.batchSize || this.config.chunkSize;
    let buffer = [];

    return new Writable({
      objectMode: true,
      highWaterMark: options.highWaterMark || 16,
      async write(chunk, encoding, callback) {
        try {
          if (Array.isArray(chunk)) {
            buffer.push(...chunk);
          } else {
            buffer.push(chunk);
          }

          // Flush buffer when it reaches batch size
          if (buffer.length >= batchSize) {
            await writer(buffer);
            buffer = [];
          }

          callback();
        } catch (error) {
          callback(error);
        }
      },

      async final(callback) {
        try {
          // Flush remaining buffer
          if (buffer.length > 0) {
            await writer(buffer);
          }
          callback();
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Process data using streaming pipeline
   * @param {Function|Array|AsyncIterable} dataSource - Data source
   * @param {Function} processor - Processing function
   * @param {Function} writer - Writer function
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processStream(dataSource, processor, writer, options = {}) {
    this.stats.startTime = Date.now();
    this.isProcessing = true;

    try {
      const readable = this.createReadableStream(dataSource, options);
      const transform = this.createTransformStream(processor, options);
      const writable = this.createWritableStream(writer, options);

      // Set up event listeners
      readable.on('error', (error) => this.emit('error', error));
      transform.on('error', (error) => this.emit('error', error));
      transform.on('backpressure', (data) => this.emit('backpressure', data));
      writable.on('error', (error) => this.emit('error', error));

      // Run the pipeline
      await pipeline(readable, transform, writable);

      const duration = Date.now() - this.stats.startTime;
      const result = {
        success: true,
        totalProcessed: this.stats.totalProcessed,
        totalErrors: this.stats.totalErrors,
        duration,
        processingRate: this.stats.processingRate,
        peakMemoryUsage: this.stats.peakMemoryUsage
      };

      this.emit('completed', result);
      return result;
    } catch (error) {
      const duration = Date.now() - this.stats.startTime;
      const result = {
        success: false,
        totalProcessed: this.stats.totalProcessed,
        totalErrors: this.stats.totalErrors,
        duration,
        error: error.message
      };

      this.emit('failed', result);
      throw error;
    } finally {
      this.isProcessing = false;
      this.resetStats();
    }
  }

  /**
   * Process large user dataset with streaming
   * @param {Function} userDataSource - Function that returns user data chunks
   * @param {Function} syncProcessor - Function to process sync for each user
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processUserSync(userDataSource, syncProcessor, options = {}) {
    const results = [];
    const errors = [];

    const processor = async (userChunk) => {
      const chunkResults = [];
      
      for (const user of userChunk) {
        try {
          const syncResult = await syncProcessor(user, options);
          chunkResults.push({
            userId: user.id,
            success: syncResult.success,
            recordsUpdated: syncResult.recordsUpdated,
            errors: syncResult.errors
          });
        } catch (error) {
          chunkResults.push({
            userId: user.id,
            success: false,
            error: error.message
          });
          errors.push({ userId: user.id, error: error.message });
        }
      }
      
      return chunkResults;
    };

    const writer = async (resultChunk) => {
      results.push(...resultChunk);
      
      // Emit progress updates
      this.emit('progress', {
        totalProcessed: results.length,
        totalErrors: errors.length,
        processingRate: this.stats.processingRate
      });
    };

    const result = await this.processStream(userDataSource, processor, writer, options);
    
    return {
      ...result,
      userResults: results,
      userErrors: errors,
      successfulUsers: results.filter(r => r.success).length,
      failedUsers: results.filter(r => !r.success).length
    };
  }

  /**
   * Process investment data with streaming and aggregation
   * @param {Function} investmentDataSource - Function that returns investment data chunks
   * @param {Function} aggregationProcessor - Function to process and aggregate data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Aggregated result
   */
  async processInvestmentAggregation(investmentDataSource, aggregationProcessor, options = {}) {
    let aggregatedData = {
      totalInvestments: 0,
      totalValue: 0,
      totalReturns: 0,
      categories: {},
      users: new Set()
    };

    const processor = async (investmentChunk) => {
      return await aggregationProcessor(investmentChunk, aggregatedData);
    };

    const writer = async (processedChunk) => {
      // Update aggregated data
      for (const item of processedChunk) {
        if (item.totalValue) {
          aggregatedData.totalValue += item.totalValue;
        }
        if (item.totalReturns) {
          aggregatedData.totalReturns += item.totalReturns;
        }
        if (item.userId) {
          aggregatedData.users.add(item.userId);
        }
        if (item.category) {
          aggregatedData.categories[item.category] = 
            (aggregatedData.categories[item.category] || 0) + (item.value || 0);
        }
      }
      
      aggregatedData.totalInvestments += processedChunk.length;
    };

    const result = await this.processStream(investmentDataSource, processor, writer, options);
    
    return {
      ...result,
      aggregatedData: {
        ...aggregatedData,
        uniqueUsers: aggregatedData.users.size,
        averageInvestmentPerUser: aggregatedData.users.size > 0 ? 
          aggregatedData.totalValue / aggregatedData.users.size : 0
      }
    };
  }

  /**
   * Create a memory-efficient data validator stream
   * @param {Function} validationRules - Validation function
   * @param {Object} options - Validation options
   * @returns {Transform} Validation transform stream
   */
  createValidationStream(validationRules, options = {}) {
    const validData = [];
    const invalidData = [];
    const maxInvalidItems = options.maxInvalidItems || 1000;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const validChunk = [];
        
        for (const item of chunk) {
          try {
            const validation = validationRules(item);
            
            if (validation.isValid) {
              validChunk.push(item);
            } else {
              if (invalidData.length < maxInvalidItems) {
                invalidData.push({
                  item,
                  errors: validation.errors,
                  warnings: validation.warnings
                });
              }
            }
          } catch (error) {
            if (invalidData.length < maxInvalidItems) {
              invalidData.push({
                item,
                errors: [error.message]
              });
            }
          }
        }
        
        if (validChunk.length > 0) {
          this.push(validChunk);
        }
        
        callback();
      },

      flush(callback) {
        this.emit('validation-complete', {
          validItems: validData.length,
          invalidItems: invalidData.length,
          invalidData: invalidData.slice(0, 100) // Return first 100 invalid items
        });
        callback();
      }
    });
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      currentMemoryUsage: 0,
      peakMemoryUsage: 0,
      processingRate: 0,
      startTime: null
    };
  }

  /**
   * Get current processing statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      isProcessing: this.isProcessing,
      backpressureActive: this.backpressureActive
    };
  }

  /**
   * Monitor memory usage and emit warnings
   */
  startMemoryMonitoring(interval = 5000) {
    const monitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      const memoryRatio = usedMemory / totalMemory;
      
      this.stats.currentMemoryUsage = memoryRatio;
      
      if (memoryRatio > this.config.maxMemoryUsage) {
        this.emit('memory-warning', {
          currentUsage: memoryRatio,
          threshold: this.config.maxMemoryUsage,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        });
      }
      
      if (!this.isProcessing) {
        clearInterval(monitor);
      }
    }, interval);
    
    return monitor;
  }
}

module.exports = StreamProcessor;