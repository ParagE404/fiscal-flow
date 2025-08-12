/**
 * Queue Manager for sync operations
 * Handles priority queuing, load balancing, and concurrent processing
 */

const BatchProcessor = require('./BatchProcessor');
const StreamProcessor = require('./StreamProcessor');
const { InvestmentTypes, DataSources } = require('../types/SyncTypes');

class QueueManager {
  constructor(options = {}) {
    this.batchProcessor = new BatchProcessor({
      maxConcurrentBatches: options.maxConcurrentBatches || 3,
      batchSize: options.batchSize || 50,
      workerPoolSize: options.workerPoolSize || 2,
      ...options
    });

    this.streamProcessor = new StreamProcessor({
      chunkSize: options.streamChunkSize || 1000,
      maxMemoryUsage: options.maxMemoryUsage || 0.8,
      concurrency: options.streamConcurrency || 5,
      ...options
    });

    this.queueConfigs = {
      [InvestmentTypes.MUTUAL_FUNDS]: {
        priority: 'normal',
        batchSize: 100,
        processor: 'mutualFundNAVUpdate',
        maxConcurrent: 2
      },
      [InvestmentTypes.STOCKS]: {
        priority: 'high',
        batchSize: 50,
        processor: 'stockPriceUpdate',
        maxConcurrent: 3
      },
      [InvestmentTypes.EPF]: {
        priority: 'low',
        batchSize: 20,
        processor: 'epfBalanceUpdate',
        maxConcurrent: 1
      }
    };

    this.activeJobs = new Map();
    this.jobHistory = [];
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for batch processor
   */
  setupEventHandlers() {
    this.batchProcessor.on('batchStarted', (event) => {
      console.log(`Batch started: ${event.batchId} (${event.itemCount} items)`);
    });

    this.batchProcessor.on('batchCompleted', (event) => {
      console.log(`Batch completed: ${event.batchId} in ${event.duration}ms`);
      this.recordJobHistory(event);
    });

    this.batchProcessor.on('batchFailed', (event) => {
      console.error(`Batch failed: ${event.batchId} - ${event.error}`);
      this.recordJobHistory(event, true);
    });

    this.batchProcessor.on('processingComplete', (stats) => {
      console.log('All queues processed:', stats);
    });
  }

  /**
   * Queue mutual fund sync operations
   */
  async queueMutualFundSync(userId, funds, navData) {
    const items = funds.map(fund => {
      const nav = navData.find(n => n.isin === fund.isin);
      return { fund, navData: nav };
    }).filter(item => item.navData); // Only include funds with NAV data

    if (items.length === 0) {
      return { queued: 0, message: 'No NAV data available for funds' };
    }

    const queueName = `mf_sync_${userId}`;
    const config = this.queueConfigs[InvestmentTypes.MUTUAL_FUNDS];

    const result = this.batchProcessor.addToQueue(queueName, items, {
      priority: config.priority,
      batchSize: config.batchSize,
      processor: config.processor,
      metadata: {
        userId,
        investmentType: InvestmentTypes.MUTUAL_FUNDS,
        source: DataSources.AMFI
      }
    });

    this.trackActiveJob(queueName, {
      userId,
      type: InvestmentTypes.MUTUAL_FUNDS,
      itemCount: items.length,
      startTime: new Date()
    });

    return result;
  }

  /**
   * Queue stock price sync operations
   */
  async queueStockSync(userId, stocks, priceData) {
    const items = stocks.map(stock => {
      const price = priceData.find(p => p.symbol === stock.symbol);
      return { stock, priceData: price };
    }).filter(item => item.priceData);

    if (items.length === 0) {
      return { queued: 0, message: 'No price data available for stocks' };
    }

    const queueName = `stock_sync_${userId}`;
    const config = this.queueConfigs[InvestmentTypes.STOCKS];

    const result = this.batchProcessor.addToQueue(queueName, items, {
      priority: config.priority,
      batchSize: config.batchSize,
      processor: config.processor,
      metadata: {
        userId,
        investmentType: InvestmentTypes.STOCKS,
        source: DataSources.YAHOO_FINANCE
      }
    });

    this.trackActiveJob(queueName, {
      userId,
      type: InvestmentTypes.STOCKS,
      itemCount: items.length,
      startTime: new Date()
    });

    return result;
  }

  /**
   * Queue EPF sync operations
   */
  async queueEPFSync(userId, accounts, epfData) {
    const items = accounts.map(account => {
      const data = epfData.find(e => e.uan === account.uan);
      return { account, epfData: data };
    }).filter(item => item.epfData);

    if (items.length === 0) {
      return { queued: 0, message: 'No EPF data available for accounts' };
    }

    const queueName = `epf_sync_${userId}`;
    const config = this.queueConfigs[InvestmentTypes.EPF];

    const result = this.batchProcessor.addToQueue(queueName, items, {
      priority: config.priority,
      batchSize: config.batchSize,
      processor: config.processor,
      metadata: {
        userId,
        investmentType: InvestmentTypes.EPF,
        source: DataSources.EPFO
      }
    });

    this.trackActiveJob(queueName, {
      userId,
      type: InvestmentTypes.EPF,
      itemCount: items.length,
      startTime: new Date()
    });

    return result;
  }

  /**
   * Queue data validation operations
   */
  async queueDataValidation(data, validationRules, options = {}) {
    const items = data.map(item => ({
      data: item,
      rules: validationRules
    }));

    const queueName = `validation_${Date.now()}`;

    return this.batchProcessor.addToQueue(queueName, items, {
      priority: options.priority || 'normal',
      batchSize: options.batchSize || 100,
      processor: 'dataValidation',
      metadata: {
        validationType: options.type || 'general',
        timestamp: new Date()
      }
    });
  }

  /**
   * Queue bulk data processing operations
   */
  async queueBulkProcessing(data, processingType, options = {}) {
    const queueName = `bulk_${processingType}_${Date.now()}`;

    const items = data.map(item => ({
      data: item,
      processingType,
      options: options.itemOptions || {}
    }));

    return this.batchProcessor.addToQueue(queueName, items, {
      priority: options.priority || 'normal',
      batchSize: options.batchSize || 200,
      processor: options.processor || 'dataTransformation',
      metadata: {
        processingType,
        timestamp: new Date(),
        ...options.metadata
      }
    });
  }

  /**
   * Queue aggregation calculations
   */
  async queueAggregationCalculation(datasets, aggregationType, options = {}) {
    const items = datasets.map(dataset => ({
      dataset,
      aggregationType
    }));

    const queueName = `aggregation_${aggregationType}_${Date.now()}`;

    return this.batchProcessor.addToQueue(queueName, items, {
      priority: options.priority || 'low',
      batchSize: options.batchSize || 10,
      processor: 'aggregationCalculation',
      metadata: {
        aggregationType,
        timestamp: new Date(),
        ...options.metadata
      }
    });
  }

  /**
   * Get queue status for all active queues
   */
  getQueueStatus() {
    const stats = this.batchProcessor.getStats();
    
    return {
      ...stats,
      activeJobs: Array.from(this.activeJobs.entries()).map(([queueName, job]) => ({
        queueName,
        ...job,
        duration: Date.now() - job.startTime.getTime()
      })),
      queueConfigs: this.queueConfigs,
      recentHistory: this.jobHistory.slice(-10)
    };
  }

  /**
   * Get status for specific user's sync operations
   */
  getUserSyncStatus(userId) {
    const userJobs = Array.from(this.activeJobs.entries())
      .filter(([queueName, job]) => job.userId === userId)
      .map(([queueName, job]) => ({
        queueName,
        ...job,
        duration: Date.now() - job.startTime.getTime()
      }));

    const userHistory = this.jobHistory
      .filter(job => job.metadata && job.metadata.userId === userId)
      .slice(-5);

    return {
      activeJobs: userJobs,
      recentHistory: userHistory,
      totalActive: userJobs.length
    };
  }

  /**
   * Cancel sync operations for a specific user
   */
  cancelUserSync(userId) {
    const cancelledQueues = [];
    
    for (const [queueName, job] of this.activeJobs.entries()) {
      if (job.userId === userId) {
        this.batchProcessor.clearQueue(queueName);
        this.activeJobs.delete(queueName);
        cancelledQueues.push(queueName);
      }
    }

    return {
      cancelled: cancelledQueues.length,
      queues: cancelledQueues
    };
  }

  /**
   * Pause processing for specific investment type
   */
  pauseInvestmentTypeSync(investmentType) {
    // This would require extending BatchProcessor to support selective pausing
    console.log(`Pausing sync for investment type: ${investmentType}`);
    
    // For now, we'll clear queues for this investment type
    const clearedQueues = [];
    
    for (const [queueName, job] of this.activeJobs.entries()) {
      if (job.type === investmentType) {
        this.batchProcessor.clearQueue(queueName);
        this.activeJobs.delete(queueName);
        clearedQueues.push(queueName);
      }
    }

    return {
      paused: investmentType,
      clearedQueues: clearedQueues.length
    };
  }

  /**
   * Update queue configuration
   */
  updateQueueConfig(investmentType, config) {
    if (this.queueConfigs[investmentType]) {
      this.queueConfigs[investmentType] = {
        ...this.queueConfigs[investmentType],
        ...config
      };
      
      console.log(`Updated queue config for ${investmentType}:`, this.queueConfigs[investmentType]);
      return true;
    }
    
    return false;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const stats = this.batchProcessor.getStats();
    const now = Date.now();
    
    // Calculate metrics from job history
    const recentJobs = this.jobHistory.filter(job => 
      now - job.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const successfulJobs = recentJobs.filter(job => !job.failed);
    const failedJobs = recentJobs.filter(job => job.failed);

    const avgProcessingTime = successfulJobs.length > 0 ? 
      successfulJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / successfulJobs.length : 0;

    return {
      ...stats,
      hourlyMetrics: {
        totalJobs: recentJobs.length,
        successfulJobs: successfulJobs.length,
        failedJobs: failedJobs.length,
        successRate: recentJobs.length > 0 ? (successfulJobs.length / recentJobs.length) * 100 : 0,
        avgProcessingTime
      },
      queueEfficiency: this.calculateQueueEfficiency()
    };
  }

  /**
   * Calculate queue efficiency metrics
   */
  calculateQueueEfficiency() {
    const efficiency = {};
    
    for (const [investmentType, config] of Object.entries(this.queueConfigs)) {
      const typeJobs = this.jobHistory.filter(job => 
        job.metadata && job.metadata.investmentType === investmentType
      );

      if (typeJobs.length > 0) {
        const avgDuration = typeJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / typeJobs.length;
        const successRate = typeJobs.filter(job => !job.failed).length / typeJobs.length * 100;
        
        efficiency[investmentType] = {
          avgDuration,
          successRate,
          totalJobs: typeJobs.length,
          optimalBatchSize: this.calculateOptimalBatchSize(typeJobs)
        };
      }
    }
    
    return efficiency;
  }

  /**
   * Calculate optimal batch size based on historical performance
   */
  calculateOptimalBatchSize(jobs) {
    // Simple heuristic: find batch size with best duration/item ratio
    const batchPerformance = {};
    
    jobs.forEach(job => {
      const batchSize = job.itemCount || 1;
      const duration = job.duration || 0;
      const efficiency = duration / batchSize;
      
      if (!batchPerformance[batchSize]) {
        batchPerformance[batchSize] = [];
      }
      batchPerformance[batchSize].push(efficiency);
    });

    let optimalSize = 50; // default
    let bestEfficiency = Infinity;

    for (const [size, efficiencies] of Object.entries(batchPerformance)) {
      const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
      if (avgEfficiency < bestEfficiency) {
        bestEfficiency = avgEfficiency;
        optimalSize = parseInt(size);
      }
    }

    return optimalSize;
  }

  /**
   * Track active job
   */
  trackActiveJob(queueName, jobInfo) {
    this.activeJobs.set(queueName, jobInfo);
  }

  /**
   * Record job history
   */
  recordJobHistory(event, failed = false) {
    this.jobHistory.push({
      batchId: event.batchId,
      queueName: event.queueName,
      itemCount: event.itemCount,
      duration: event.duration,
      failed,
      error: event.error,
      timestamp: new Date(),
      metadata: event.metadata
    });

    // Keep only last 1000 entries
    if (this.jobHistory.length > 1000) {
      this.jobHistory = this.jobHistory.slice(-1000);
    }

    // Remove from active jobs
    if (this.activeJobs.has(event.queueName)) {
      this.activeJobs.delete(event.queueName);
    }
  }

  /**
   * Process large user base sync using streaming
   */
  async processLargeUserBaseSync(investmentType, options = {}) {
    const startTime = Date.now();
    console.log(`Starting large user base sync for ${investmentType}`);

    // Create user data source function
    const userDataSource = async ({ offset, limit }) => {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const users = await prisma.user.findMany({
          skip: offset,
          take: limit,
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
            preferences: true
          }
        });

        await prisma.$disconnect();
        return users;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return [];
      }
    };

    // Create sync processor function
    const syncProcessor = async (user, processingOptions) => {
      try {
        const syncService = this.getSyncService(investmentType);
        if (!syncService) {
          throw new Error(`No sync service found for ${investmentType}`);
        }

        return await syncService.sync(user.id, {
          ...processingOptions,
          source: options.dataSource,
          force: options.force || false
        });
      } catch (error) {
        console.error(`Sync failed for user ${user.id}:`, error);
        return {
          success: false,
          recordsProcessed: 0,
          recordsUpdated: 0,
          errors: [{ message: error.message }]
        };
      }
    };

    // Set up event listeners
    this.streamProcessor.on('progress', (progress) => {
      console.log(`Sync progress: ${progress.totalProcessed} users processed, ${progress.totalErrors} errors`);
    });

    this.streamProcessor.on('backpressure', (data) => {
      console.warn(`Memory backpressure activated: ${(data.memoryUsage * 100).toFixed(1)}% usage`);
    });

    this.streamProcessor.on('memory-warning', (data) => {
      console.warn(`Memory usage warning: ${(data.currentUsage * 100).toFixed(1)}% (threshold: ${(data.threshold * 100).toFixed(1)}%)`);
    });

    try {
      // Start memory monitoring
      const memoryMonitor = this.streamProcessor.startMemoryMonitoring();

      // Process users with streaming
      const result = await this.streamProcessor.processUserSync(
        userDataSource,
        syncProcessor,
        {
          chunkSize: options.chunkSize || 100,
          concurrency: options.concurrency || 3,
          ...options
        }
      );

      const duration = Date.now() - startTime;
      
      console.log(`Large user base sync completed for ${investmentType}:`, {
        totalUsers: result.userResults.length,
        successfulUsers: result.successfulUsers,
        failedUsers: result.failedUsers,
        duration: `${duration}ms`,
        processingRate: `${result.processingRate.toFixed(2)} users/sec`,
        peakMemoryUsage: `${(result.peakMemoryUsage * 100).toFixed(1)}%`
      });

      // Record in job history
      this.recordJobHistory({
        batchId: `large_sync_${investmentType}_${Date.now()}`,
        queueName: `large_sync_${investmentType}`,
        itemCount: result.userResults.length,
        duration,
        metadata: {
          investmentType,
          successfulUsers: result.successfulUsers,
          failedUsers: result.failedUsers,
          processingRate: result.processingRate
        }
      });

      return result;
    } catch (error) {
      console.error(`Large user base sync failed for ${investmentType}:`, error);
      throw error;
    }
  }

  /**
   * Process investment data aggregation using streaming
   */
  async processInvestmentAggregation(investmentType, aggregationType, options = {}) {
    console.log(`Starting investment aggregation: ${aggregationType} for ${investmentType}`);

    // Create investment data source function
    const investmentDataSource = async ({ offset, limit }) => {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        let investments = [];
        
        switch (investmentType) {
          case InvestmentTypes.MUTUAL_FUNDS:
            investments = await prisma.mutualFund.findMany({
              skip: offset,
              take: limit,
              select: {
                id: true,
                userId: true,
                name: true,
                totalInvestment: true,
                currentValue: true,
                cagr: true,
                category: true,
                createdAt: true
              }
            });
            break;
            
          case InvestmentTypes.STOCKS:
            investments = await prisma.stock.findMany({
              skip: offset,
              take: limit,
              select: {
                id: true,
                userId: true,
                symbol: true,
                quantity: true,
                averagePrice: true,
                currentPrice: true,
                currentValue: true,
                pnl: true,
                pnlPercentage: true,
                createdAt: true
              }
            });
            break;
            
          case InvestmentTypes.EPF:
            investments = await prisma.ePFAccount.findMany({
              skip: offset,
              take: limit,
              select: {
                id: true,
                userId: true,
                employerName: true,
                totalBalance: true,
                employeeContribution: true,
                employerContribution: true,
                createdAt: true
              }
            });
            break;
        }

        await prisma.$disconnect();
        return investments;
      } catch (error) {
        console.error('Error fetching investment data:', error);
        return [];
      }
    };

    // Create aggregation processor function
    const aggregationProcessor = async (investmentChunk, aggregatedData) => {
      const processedChunk = [];
      
      for (const investment of investmentChunk) {
        let processedItem = {
          id: investment.id,
          userId: investment.userId
        };

        switch (aggregationType) {
          case 'portfolio_summary':
            processedItem = {
              ...processedItem,
              totalValue: investment.currentValue || investment.totalBalance || 0,
              totalReturns: this.calculateReturns(investment),
              category: this.getInvestmentCategory(investment, investmentType)
            };
            break;
            
          case 'performance_metrics':
            processedItem = {
              ...processedItem,
              performance: this.calculatePerformanceMetrics(investment, investmentType),
              value: investment.currentValue || investment.totalBalance || 0
            };
            break;
            
          case 'risk_analysis':
            processedItem = {
              ...processedItem,
              riskMetrics: this.calculateRiskMetrics(investment, investmentType),
              value: investment.currentValue || investment.totalBalance || 0
            };
            break;
        }
        
        processedChunk.push(processedItem);
      }
      
      return processedChunk;
    };

    try {
      const result = await this.streamProcessor.processInvestmentAggregation(
        investmentDataSource,
        aggregationProcessor,
        {
          chunkSize: options.chunkSize || 500,
          concurrency: options.concurrency || 2,
          ...options
        }
      );

      console.log(`Investment aggregation completed:`, {
        aggregationType,
        investmentType,
        totalInvestments: result.aggregatedData.totalInvestments,
        uniqueUsers: result.aggregatedData.uniqueUsers,
        totalValue: result.aggregatedData.totalValue,
        processingRate: `${result.processingRate.toFixed(2)} items/sec`
      });

      return result;
    } catch (error) {
      console.error(`Investment aggregation failed:`, error);
      throw error;
    }
  }

  /**
   * Process bulk data validation using streaming
   */
  async processBulkDataValidation(dataType, validationRules, options = {}) {
    console.log(`Starting bulk data validation for ${dataType}`);

    // Create data source function based on data type
    const dataSource = async ({ offset, limit }) => {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        let data = [];
        
        switch (dataType) {
          case 'sync_metadata':
            data = await prisma.syncMetadata.findMany({
              skip: offset,
              take: limit,
              where: options.where || {}
            });
            break;
            
          case 'investment_data':
            // Combine all investment types
            const [mutualFunds, stocks, epfAccounts] = await Promise.all([
              prisma.mutualFund.findMany({ skip: offset, take: Math.floor(limit / 3) }),
              prisma.stock.findMany({ skip: offset, take: Math.floor(limit / 3) }),
              prisma.ePFAccount.findMany({ skip: offset, take: Math.floor(limit / 3) })
            ]);
            
            data = [
              ...mutualFunds.map(f => ({ ...f, type: 'mutual_fund' })),
              ...stocks.map(s => ({ ...s, type: 'stock' })),
              ...epfAccounts.map(e => ({ ...e, type: 'epf' }))
            ];
            break;
        }

        await prisma.$disconnect();
        return data;
      } catch (error) {
        console.error('Error fetching validation data:', error);
        return [];
      }
    };

    // Create validation processor
    const validationProcessor = async (dataChunk) => {
      const results = [];
      
      for (const item of dataChunk) {
        try {
          const validation = validationRules(item);
          results.push({
            id: item.id,
            isValid: validation.isValid,
            errors: validation.errors || [],
            warnings: validation.warnings || []
          });
        } catch (error) {
          results.push({
            id: item.id,
            isValid: false,
            errors: [error.message]
          });
        }
      }
      
      return results;
    };

    // Create result writer
    const resultWriter = async (validationResults) => {
      // Store validation results if needed
      if (options.storeResults) {
        try {
          const { PrismaClient } = require('@prisma/client');
          const prisma = new PrismaClient();
          
          // Store validation results in a validation_results table
          // This would require a separate table to be created
          
          await prisma.$disconnect();
        } catch (error) {
          console.error('Error storing validation results:', error);
        }
      }
    };

    try {
      const result = await this.streamProcessor.processStream(
        dataSource,
        validationProcessor,
        resultWriter,
        {
          chunkSize: options.chunkSize || 1000,
          concurrency: options.concurrency || 3,
          ...options
        }
      );

      console.log(`Bulk data validation completed for ${dataType}:`, {
        totalProcessed: result.totalProcessed,
        totalErrors: result.totalErrors,
        processingRate: `${result.processingRate.toFixed(2)} items/sec`
      });

      return result;
    } catch (error) {
      console.error(`Bulk data validation failed for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Get sync service for investment type
   */
  getSyncService(investmentType) {
    const services = {
      [InvestmentTypes.MUTUAL_FUNDS]: () => new (require('../MutualFundSyncService'))(),
      [InvestmentTypes.STOCKS]: () => new (require('../StockSyncService'))(),
      [InvestmentTypes.EPF]: () => new (require('../EPFSyncService'))()
    };

    const serviceFactory = services[investmentType];
    return serviceFactory ? serviceFactory() : null;
  }

  /**
   * Calculate returns for an investment
   */
  calculateReturns(investment) {
    if (investment.currentValue && investment.totalInvestment) {
      return investment.currentValue - investment.totalInvestment;
    } else if (investment.pnl !== undefined) {
      return investment.pnl;
    } else if (investment.totalBalance && investment.employeeContribution && investment.employerContribution) {
      const totalContributed = (investment.employeeContribution || 0) + (investment.employerContribution || 0);
      return investment.totalBalance - totalContributed;
    }
    return 0;
  }

  /**
   * Get investment category
   */
  getInvestmentCategory(investment, investmentType) {
    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        return investment.category || 'Mutual Funds';
      case InvestmentTypes.STOCKS:
        return 'Stocks';
      case InvestmentTypes.EPF:
        return 'EPF';
      default:
        return 'Other';
    }
  }

  /**
   * Calculate performance metrics for an investment
   */
  calculatePerformanceMetrics(investment, investmentType) {
    const metrics = {
      absoluteReturn: 0,
      percentageReturn: 0,
      annualizedReturn: 0
    };

    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        if (investment.currentValue && investment.totalInvestment) {
          metrics.absoluteReturn = investment.currentValue - investment.totalInvestment;
          metrics.percentageReturn = (metrics.absoluteReturn / investment.totalInvestment) * 100;
          metrics.annualizedReturn = investment.cagr || 0;
        }
        break;
        
      case InvestmentTypes.STOCKS:
        metrics.absoluteReturn = investment.pnl || 0;
        metrics.percentageReturn = investment.pnlPercentage || 0;
        // Calculate annualized return based on holding period
        if (investment.createdAt) {
          const holdingPeriodYears = (Date.now() - new Date(investment.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          if (holdingPeriodYears > 0 && investment.averagePrice > 0) {
            metrics.annualizedReturn = (Math.pow(investment.currentPrice / investment.averagePrice, 1 / holdingPeriodYears) - 1) * 100;
          }
        }
        break;
        
      case InvestmentTypes.EPF:
        // EPF returns are typically interest-based
        const totalContributed = (investment.employeeContribution || 0) + (investment.employerContribution || 0);
        if (totalContributed > 0) {
          metrics.absoluteReturn = investment.totalBalance - totalContributed;
          metrics.percentageReturn = (metrics.absoluteReturn / totalContributed) * 100;
        }
        break;
    }

    return metrics;
  }

  /**
   * Calculate risk metrics for an investment
   */
  calculateRiskMetrics(investment, investmentType) {
    const riskMetrics = {
      volatility: 0,
      riskScore: 'low',
      concentrationRisk: 0
    };

    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        // Mutual funds generally have lower risk
        riskMetrics.riskScore = investment.category?.toLowerCase().includes('equity') ? 'medium' : 'low';
        break;
        
      case InvestmentTypes.STOCKS:
        // Stocks have higher volatility
        riskMetrics.riskScore = 'high';
        if (investment.pnlPercentage) {
          riskMetrics.volatility = Math.abs(investment.pnlPercentage);
        }
        break;
        
      case InvestmentTypes.EPF:
        // EPF is low risk
        riskMetrics.riskScore = 'low';
        break;
    }

    return riskMetrics;
  }

  /**
   * Get streaming processor statistics
   */
  getStreamingStats() {
    return this.streamProcessor.getStats();
  }

  /**
   * Shutdown queue manager
   */
  async shutdown() {
    console.log('Shutting down queue manager...');
    
    await this.batchProcessor.shutdown();
    
    this.activeJobs.clear();
    this.jobHistory = [];
    
    console.log('Queue manager shutdown complete');
  }
}

module.exports = QueueManager;