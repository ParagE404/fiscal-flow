/**
 * Database optimization service for sync operations
 * Provides connection pooling, query optimization, and batch processing
 */

const { PrismaClient } = require('@prisma/client');

class DatabaseOptimizer {
  constructor() {
    this.prisma = null;
    this.connectionPool = null;
    this.batchQueue = new Map(); // Queue for batch operations
    this.batchTimer = null;
    this.batchConfig = {
      maxBatchSize: 100,
      batchTimeout: 5000, // 5 seconds
      maxConcurrentBatches: 5
    };
    this.activeBatches = 0;
  }

  /**
   * Initialize optimized Prisma client with connection pooling
   */
  async initialize() {
    if (this.prisma) {
      return this.prisma;
    }

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      // Connection pool configuration
      __internal: {
        engine: {
          // Connection pool settings
          connection_limit: 20, // Maximum connections
          pool_timeout: 10, // Connection timeout in seconds
          socket_timeout: 10, // Socket timeout in seconds
        }
      }
    });

    // Test connection
    await this.prisma.$connect();
    console.log('Database optimizer initialized with connection pooling');

    // Start batch processing
    this.startBatchProcessor();

    return this.prisma;
  }

  /**
   * Get optimized queries for sync metadata operations
   */
  getSyncMetadataQueries() {
    return {
      /**
       * Get sync metadata for multiple investments efficiently
       */
      getBulkSyncMetadata: async (userId, investmentType, investmentIds) => {
        return await this.prisma.syncMetadata.findMany({
          where: {
            userId,
            investmentType,
            investmentId: {
              in: investmentIds
            }
          },
          select: {
            investmentId: true,
            lastSyncAt: true,
            syncStatus: true,
            syncSource: true,
            errorMessage: true,
            dataHash: true
          }
        });
      },

      /**
       * Update multiple sync metadata records in a single transaction
       */
      updateBulkSyncMetadata: async (updates) => {
        return await this.prisma.$transaction(
          updates.map(update => 
            this.prisma.syncMetadata.upsert({
              where: {
                userId_investmentType_investmentId: {
                  userId: update.userId,
                  investmentType: update.investmentType,
                  investmentId: update.investmentId
                }
              },
              update: {
                lastSyncAt: update.lastSyncAt,
                syncStatus: update.syncStatus,
                syncSource: update.syncSource,
                errorMessage: update.errorMessage,
                dataHash: update.dataHash,
                updatedAt: new Date()
              },
              create: {
                userId: update.userId,
                investmentType: update.investmentType,
                investmentId: update.investmentId,
                lastSyncAt: update.lastSyncAt,
                syncStatus: update.syncStatus,
                syncSource: update.syncSource,
                errorMessage: update.errorMessage,
                dataHash: update.dataHash
              }
            })
          )
        );
      },

      /**
       * Get users with enabled sync configurations efficiently
       */
      getUsersWithEnabledSync: async (investmentType) => {
        return await this.prisma.user.findMany({
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
            syncConfigurations: {
              where: {
                investmentType,
                isEnabled: true
              },
              select: {
                syncFrequency: true,
                preferredSource: true,
                fallbackSource: true,
                notifyOnSuccess: true,
                notifyOnFailure: true
              }
            }
          }
        });
      }
    };
  }

  /**
   * Get optimized queries for investment data operations
   */
  getInvestmentQueries() {
    return {
      /**
       * Get mutual funds with sync-related data efficiently
       */
      getMutualFundsForSync: async (userId, includeManualOverride = false) => {
        return await this.prisma.mutualFund.findMany({
          where: {
            userId,
            ...(includeManualOverride ? {} : { manualOverride: false }),
            isin: {
              not: null
            }
          },
          select: {
            id: true,
            name: true,
            isin: true,
            schemeCode: true,
            investedAmount: true,
            sipInvestment: true,
            totalInvestment: true,
            currentValue: true,
            cagr: true,
            lastSyncAt: true,
            syncStatus: true,
            manualOverride: true
          },
          orderBy: {
            lastSyncAt: 'asc' // Prioritize least recently synced
          }
        });
      },

      /**
       * Get stocks for sync with optimized query
       */
      getStocksForSync: async (userId, includeManualOverride = false) => {
        return await this.prisma.stock.findMany({
          where: {
            userId,
            ...(includeManualOverride ? {} : { manualOverride: false })
          },
          select: {
            id: true,
            symbol: true,
            companyName: true,
            exchange: true,
            isin: true,
            quantity: true,
            buyPrice: true,
            currentPrice: true,
            investedAmount: true,
            currentValue: true,
            pnl: true,
            pnlPercentage: true,
            lastSyncAt: true,
            syncStatus: true,
            manualOverride: true
          },
          orderBy: {
            lastSyncAt: 'asc'
          }
        });
      },

      /**
       * Get EPF accounts for sync
       */
      getEPFAccountsForSync: async (userId, includeManualOverride = false) => {
        return await this.prisma.ePFAccount.findMany({
          where: {
            userId,
            ...(includeManualOverride ? {} : { manualOverride: false }),
            uan: {
              not: null
            }
          },
          select: {
            id: true,
            employerName: true,
            pfNumber: true,
            uan: true,
            totalBalance: true,
            employeeContribution: true,
            employerContribution: true,
            pensionFund: true,
            monthlyContribution: true,
            lastSyncAt: true,
            syncStatus: true,
            manualOverride: true
          },
          orderBy: {
            lastSyncAt: 'asc'
          }
        });
      }
    };
  }

  /**
   * Batch update operations for better performance
   */
  getBatchOperations() {
    return {
      /**
       * Queue mutual fund updates for batch processing
       */
      queueMutualFundUpdate: (fundId, updateData) => {
        this.addToBatchQueue('mutualFund', fundId, updateData);
      },

      /**
       * Queue stock updates for batch processing
       */
      queueStockUpdate: (stockId, updateData) => {
        this.addToBatchQueue('stock', stockId, updateData);
      },

      /**
       * Queue EPF account updates for batch processing
       */
      queueEPFUpdate: (accountId, updateData) => {
        this.addToBatchQueue('epfAccount', accountId, updateData);
      },

      /**
       * Queue sync metadata updates for batch processing
       */
      queueSyncMetadataUpdate: (userId, investmentType, investmentId, updateData) => {
        const key = `${userId}:${investmentType}:${investmentId}`;
        this.addToBatchQueue('syncMetadata', key, {
          userId,
          investmentType,
          investmentId,
          ...updateData
        });
      },

      /**
       * Force process all queued batches
       */
      flushBatches: async () => {
        await this.processBatches(true);
      }
    };
  }

  /**
   * Add operation to batch queue
   */
  addToBatchQueue(operation, key, data) {
    if (!this.batchQueue.has(operation)) {
      this.batchQueue.set(operation, new Map());
    }

    this.batchQueue.get(operation).set(key, {
      data,
      timestamp: Date.now()
    });

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatches();
      }, this.batchConfig.batchTimeout);
    }

    // Process immediately if batch is full
    const operationQueue = this.batchQueue.get(operation);
    if (operationQueue.size >= this.batchConfig.maxBatchSize) {
      this.processBatches();
    }
  }

  /**
   * Process queued batch operations
   */
  async processBatches(force = false) {
    if (this.activeBatches >= this.batchConfig.maxConcurrentBatches && !force) {
      return;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batchPromises = [];

    for (const [operation, queue] of this.batchQueue.entries()) {
      if (queue.size === 0) continue;

      this.activeBatches++;
      const batchData = new Map(queue);
      queue.clear();

      batchPromises.push(
        this.processBatchOperation(operation, batchData)
          .finally(() => {
            this.activeBatches--;
          })
      );
    }

    if (batchPromises.length > 0) {
      await Promise.allSettled(batchPromises);
    }
  }

  /**
   * Process a specific batch operation
   */
  async processBatchOperation(operation, batchData) {
    try {
      switch (operation) {
        case 'mutualFund':
          await this.batchUpdateMutualFunds(batchData);
          break;
        case 'stock':
          await this.batchUpdateStocks(batchData);
          break;
        case 'epfAccount':
          await this.batchUpdateEPFAccounts(batchData);
          break;
        case 'syncMetadata':
          await this.batchUpdateSyncMetadata(batchData);
          break;
        default:
          console.warn(`Unknown batch operation: ${operation}`);
      }
    } catch (error) {
      console.error(`Batch operation failed for ${operation}:`, error);
    }
  }

  /**
   * Batch update mutual funds
   */
  async batchUpdateMutualFunds(batchData) {
    const updates = Array.from(batchData.entries()).map(([fundId, { data }]) => 
      this.prisma.mutualFund.update({
        where: { id: fundId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    );

    await this.prisma.$transaction(updates);
    console.log(`Batch updated ${updates.length} mutual funds`);
  }

  /**
   * Batch update stocks
   */
  async batchUpdateStocks(batchData) {
    const updates = Array.from(batchData.entries()).map(([stockId, { data }]) => 
      this.prisma.stock.update({
        where: { id: stockId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    );

    await this.prisma.$transaction(updates);
    console.log(`Batch updated ${updates.length} stocks`);
  }

  /**
   * Batch update EPF accounts
   */
  async batchUpdateEPFAccounts(batchData) {
    const updates = Array.from(batchData.entries()).map(([accountId, { data }]) => 
      this.prisma.ePFAccount.update({
        where: { id: accountId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })
    );

    await this.prisma.$transaction(updates);
    console.log(`Batch updated ${updates.length} EPF accounts`);
  }

  /**
   * Batch update sync metadata
   */
  async batchUpdateSyncMetadata(batchData) {
    const updates = Array.from(batchData.values()).map(({ data }) => 
      this.prisma.syncMetadata.upsert({
        where: {
          userId_investmentType_investmentId: {
            userId: data.userId,
            investmentType: data.investmentType,
            investmentId: data.investmentId
          }
        },
        update: {
          lastSyncAt: data.lastSyncAt,
          syncStatus: data.syncStatus,
          syncSource: data.syncSource,
          errorMessage: data.errorMessage,
          dataHash: data.dataHash,
          updatedAt: new Date()
        },
        create: data
      })
    );

    await this.prisma.$transaction(updates);
    console.log(`Batch updated ${updates.length} sync metadata records`);
  }

  /**
   * Start batch processor
   */
  startBatchProcessor() {
    // Process batches every 30 seconds
    setInterval(() => {
      this.processBatches();
    }, 30000);
  }

  /**
   * Get database performance statistics
   */
  async getPerformanceStats() {
    const stats = {
      connectionPool: {
        // These would be available in a real connection pool implementation
        activeConnections: 'N/A',
        idleConnections: 'N/A',
        totalConnections: 'N/A'
      },
      batchQueue: {
        totalQueued: 0,
        byOperation: {}
      },
      activeBatches: this.activeBatches
    };

    // Count queued operations
    for (const [operation, queue] of this.batchQueue.entries()) {
      stats.batchQueue.byOperation[operation] = queue.size;
      stats.batchQueue.totalQueued += queue.size;
    }

    return stats;
  }

  /**
   * Execute raw SQL for complex queries
   */
  async executeRawQuery(query, params = []) {
    return await this.prisma.$queryRaw`${query}`;
  }

  /**
   * Execute optimized aggregation queries
   */
  getAggregationQueries() {
    return {
      /**
       * Get sync statistics by investment type
       */
      getSyncStatsByType: async (userId) => {
        return await this.prisma.syncMetadata.groupBy({
          by: ['investmentType', 'syncStatus'],
          where: {
            userId
          },
          _count: {
            id: true
          },
          _max: {
            lastSyncAt: true
          },
          _min: {
            lastSyncAt: true
          }
        });
      },

      /**
       * Get portfolio summary with optimized aggregation
       */
      getPortfolioSummary: async (userId) => {
        const [mutualFunds, stocks, epfAccounts, fixedDeposits] = await Promise.all([
          this.prisma.mutualFund.aggregate({
            where: { userId },
            _sum: {
              totalInvestment: true,
              currentValue: true
            },
            _count: {
              id: true
            }
          }),
          this.prisma.stock.aggregate({
            where: { userId },
            _sum: {
              investedAmount: true,
              currentValue: true,
              pnl: true
            },
            _count: {
              id: true
            }
          }),
          this.prisma.ePFAccount.aggregate({
            where: { userId },
            _sum: {
              totalBalance: true,
              employeeContribution: true,
              employerContribution: true
            },
            _count: {
              id: true
            }
          }),
          this.prisma.fixedDeposit.aggregate({
            where: { userId },
            _sum: {
              investedAmount: true,
              currentValue: true
            },
            _count: {
              id: true
            }
          })
        ]);

        return {
          mutualFunds,
          stocks,
          epfAccounts,
          fixedDeposits,
          totalInvested: (mutualFunds._sum.totalInvestment || 0) + 
                        (stocks._sum.investedAmount || 0) + 
                        (fixedDeposits._sum.investedAmount || 0),
          totalCurrent: (mutualFunds._sum.currentValue || 0) + 
                       (stocks._sum.currentValue || 0) + 
                       (epfAccounts._sum.totalBalance || 0) + 
                       (fixedDeposits._sum.currentValue || 0)
        };
      }
    };
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    // Process any remaining batches
    await this.processBatches(true);

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Disconnect Prisma client
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }

    console.log('Database optimizer cleanup completed');
  }
}

// Create singleton instance
const databaseOptimizer = new DatabaseOptimizer();

module.exports = databaseOptimizer;