const { PrismaClient } = require('@prisma/client');
const BaseSyncService = require('./base/BaseSyncService');
const YahooFinanceProvider = require('./providers/YahooFinanceProvider');
const NSEDataProvider = require('./providers/NSEDataProvider');
const PnLCalculator = require('./utils/PnLCalculator');
const {
  createSyncResult,
  createSyncError,
  SyncErrorTypes,
  SyncStatus,
  InvestmentTypes
} = require('./interfaces');

const prisma = new PrismaClient();

/**
 * Stock synchronization service with intelligent caching and market hours detection
 * Handles price updates for NSE and BSE listed stocks and ETFs
 */
class StockSyncService extends BaseSyncService {
  constructor() {
    super();
    this.yahooProvider = new YahooFinanceProvider();
    this.nseProvider = new NSEDataProvider();
    this.priceCache = new Map();
    this.cacheExpiryTimes = new Map();
    
    // Market hours configuration (IST)
    this.marketHours = {
      start: { hour: 9, minute: 15 }, // 9:15 AM
      end: { hour: 15, minute: 30 },  // 3:30 PM
      timezone: 'Asia/Kolkata'
    };
    
    // Cache configuration
    this.cacheConfig = {
      marketHours: 5 * 60 * 1000,    // 5 minutes during market hours
      afterHours: 60 * 60 * 1000,   // 1 hour after market hours
      weekends: 4 * 60 * 60 * 1000  // 4 hours on weekends
    };
  }

  get syncType() {
    return InvestmentTypes.STOCKS;
  }

  /**
   * Check if current time is within Indian market hours
   * @returns {boolean} True if market is open
   */
  isMarketHours() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: this.marketHours.timezone }));
    
    const currentDay = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Market is closed on weekends
    if (currentDay === 0 || currentDay === 6) {
      return false;
    }
    
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const marketStartMinutes = this.marketHours.start.hour * 60 + this.marketHours.start.minute;
    const marketEndMinutes = this.marketHours.end.hour * 60 + this.marketHours.end.minute;
    
    return currentTimeInMinutes >= marketStartMinutes && currentTimeInMinutes <= marketEndMinutes;
  }

  /**
   * Check if weekend
   * @returns {boolean} True if weekend
   */
  isWeekend() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: this.marketHours.timezone }));
    const currentDay = istTime.getDay();
    return currentDay === 0 || currentDay === 6;
  }

  /**
   * Get appropriate cache TTL based on current time
   * @returns {number} Cache TTL in milliseconds
   */
  getCacheTTL() {
    if (this.isWeekend()) {
      return this.cacheConfig.weekends;
    } else if (this.isMarketHours()) {
      return this.cacheConfig.marketHours;
    } else {
      return this.cacheConfig.afterHours;
    }
  }

  /**
   * Check if cached price is still valid
   * @param {string} cacheKey - Cache key for the stock
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(cacheKey) {
    const expiryTime = this.cacheExpiryTimes.get(cacheKey);
    if (!expiryTime) {
      return false;
    }
    
    return Date.now() < expiryTime;
  }

  /**
   * Get cached price data
   * @param {string} cacheKey - Cache key for the stock
   * @returns {Object|null} Cached price data or null
   */
  getCachedPrice(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      return this.priceCache.get(cacheKey);
    }
    
    // Remove expired cache entry
    this.priceCache.delete(cacheKey);
    this.cacheExpiryTimes.delete(cacheKey);
    return null;
  }

  /**
   * Cache price data
   * @param {string} cacheKey - Cache key for the stock
   * @param {Object} priceData - Price data to cache
   */
  setCachedPrice(cacheKey, priceData) {
    const ttl = this.getCacheTTL();
    const expiryTime = Date.now() + ttl;
    
    this.priceCache.set(cacheKey, {
      ...priceData,
      cachedAt: new Date(),
      ttl
    });
    this.cacheExpiryTimes.set(cacheKey, expiryTime);
  }

  /**
   * Generate cache key for a stock
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (NSE/BSE)
   * @returns {string} Cache key
   */
  generateCacheKey(symbol, exchange) {
    return `${symbol}:${exchange}`.toUpperCase();
  }

  /**
   * Get user's stocks that need syncing
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of stock records
   */
  async getUserStocks(userId) {
    try {
      return await prisma.stock.findMany({
        where: {
          userId,
          // Only sync stocks that are not manually overridden
          manualOverride: false
        },
        select: {
          id: true,
          symbol: true,
          exchange: true,
          quantity: true,
          averagePrice: true,
          investedAmount: true,
          currentPrice: true,
          currentValue: true,
          lastSyncAt: true,
          syncStatus: true
        }
      });
    } catch (error) {
      console.error(`Failed to get user stocks for ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Get data provider based on source preference
   * @param {string} source - Preferred data source
   * @returns {Object} Data provider instance
   */
  getDataProvider(source) {
    switch (source?.toLowerCase()) {
      case 'nse':
      case 'nse_india':
        return this.nseProvider;
      case 'yahoo':
      case 'yahoo_finance':
      default:
        return this.yahooProvider;
    }
  }

  /**
   * Get fallback data source
   * @param {string} currentSource - Current data source
   * @returns {string|null} Fallback source
   */
  getFallbackSource(currentSource) {
    switch (currentSource?.toLowerCase()) {
      case 'yahoo':
      case 'yahoo_finance':
        return 'nse_india';
      case 'nse':
      case 'nse_india':
        return 'yahoo_finance';
      default:
        return 'nse_india';
    }
  }

  /**
   * Synchronize all stocks for a user
   * @param {string} userId - User ID
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async sync(userId, options = {}) {
    const startTime = Date.now();
    const result = createSyncResult({
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      errors: [],
      warnings: [],
      duration: 0,
      source: options.source || 'yahoo_finance'
    });

    try {
      // Check if sync is enabled for this user
      if (!options.force && !(await this.isSyncEnabled(userId))) {
        result.success = true;
        result.warnings.push({
          type: 'sync_disabled',
          message: 'Stock sync is disabled for this user'
        });
        return result;
      }

      // Get user's stocks
      const userStocks = await this.getUserStocks(userId);
      
      if (userStocks.length === 0) {
        result.success = true;
        return result;
      }

      // Prepare identifiers for data fetching
      const identifiers = userStocks.map(stock => ({
        symbol: stock.symbol,
        exchange: stock.exchange,
        stockId: stock.id
      }));

      // Check cache first and separate cached vs uncached
      const cachedPrices = new Map();
      const uncachedIdentifiers = [];

      for (const identifier of identifiers) {
        const cacheKey = this.generateCacheKey(identifier.symbol, identifier.exchange);
        const cachedPrice = this.getCachedPrice(cacheKey);
        
        if (cachedPrice && !options.force) {
          cachedPrices.set(identifier.stockId, cachedPrice);
        } else {
          uncachedIdentifiers.push(identifier);
        }
      }

      // Fetch uncached prices
      let fetchedPrices = [];
      if (uncachedIdentifiers.length > 0) {
        try {
          const provider = this.getDataProvider(result.source);
          
          // Check if provider is available
          if (!(await provider.isAvailable())) {
            throw new Error(`${provider.name} is not available`);
          }

          const rawPrices = await provider.fetchData(uncachedIdentifiers, options);
          
          if (provider.validateData(rawPrices)) {
            fetchedPrices = provider.transformData(rawPrices);
            
            // Cache the fetched prices
            for (const priceData of fetchedPrices) {
              const cacheKey = this.generateCacheKey(priceData.symbol, priceData.exchange);
              this.setCachedPrice(cacheKey, priceData);
            }
          } else {
            throw new Error('Fetched price data failed validation');
          }
        } catch (error) {
          // Try fallback source if primary fails
          const fallbackSource = this.getFallbackSource(result.source);
          if (fallbackSource && !options.noFallback) {
            try {
              console.log(`Primary source failed, trying fallback: ${fallbackSource}`);
              const fallbackProvider = this.getDataProvider(fallbackSource);
              
              if (await fallbackProvider.isAvailable()) {
                const rawPrices = await fallbackProvider.fetchData(uncachedIdentifiers, options);
                
                if (fallbackProvider.validateData(rawPrices)) {
                  fetchedPrices = fallbackProvider.transformData(rawPrices);
                  result.source = fallbackSource;
                  
                  // Cache the fetched prices
                  for (const priceData of fetchedPrices) {
                    const cacheKey = this.generateCacheKey(priceData.symbol, priceData.exchange);
                    this.setCachedPrice(cacheKey, priceData);
                  }
                } else {
                  throw new Error('Fallback price data failed validation');
                }
              } else {
                throw new Error(`Fallback source ${fallbackSource} is not available`);
              }
            } catch (fallbackError) {
              result.errors.push(createSyncError({
                type: SyncErrorTypes.SERVICE_UNAVAILABLE,
                message: `Both primary and fallback sources failed: ${error.message}, ${fallbackError.message}`,
                details: { primaryError: error.message, fallbackError: fallbackError.message }
              }));
            }
          } else {
            result.errors.push(createSyncError({
              type: SyncErrorTypes.SERVICE_UNAVAILABLE,
              message: error.message,
              details: { source: result.source }
            }));
          }
        }
      }

      // Combine cached and fetched prices
      const allPrices = new Map();
      
      // Add cached prices
      for (const [stockId, priceData] of cachedPrices) {
        allPrices.set(stockId, priceData);
      }
      
      // Add fetched prices
      for (const priceData of fetchedPrices) {
        const stock = userStocks.find(s => 
          s.symbol === priceData.symbol && s.exchange === priceData.exchange
        );
        if (stock) {
          allPrices.set(stock.id, priceData);
        }
      }

      // Update stock prices and calculate P&L
      for (const stock of userStocks) {
        result.recordsProcessed++;
        
        const priceData = allPrices.get(stock.id);
        if (priceData) {
          try {
            await this.updateStockPrice(stock, priceData, options.dryRun);
            result.recordsUpdated++;
          } catch (error) {
            result.errors.push(createSyncError({
              type: SyncErrorTypes.DATABASE_ERROR,
              message: `Failed to update stock ${stock.symbol}: ${error.message}`,
              details: { stockId: stock.id, symbol: stock.symbol }
            }));
          }
        } else {
          result.warnings.push({
            type: 'price_not_found',
            message: `Price not found for ${stock.symbol} on ${stock.exchange}`,
            stockId: stock.id
          });
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(createSyncError({
        type: SyncErrorTypes.UNKNOWN_ERROR,
        message: error.message,
        details: { stack: error.stack }
      }));
    }

    result.duration = Date.now() - startTime;
    
    // Update sync metadata
    await this.updateSyncMetadata(userId, result);
    
    return result;
  }

  /**
   * Synchronize a single stock for a user
   * @param {string} userId - User ID
   * @param {string} stockId - Stock ID to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result
   */
  async syncSingle(userId, stockId, options = {}) {
    const startTime = Date.now();
    const result = createSyncResult({
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      errors: [],
      warnings: [],
      duration: 0,
      source: options.source || 'yahoo_finance'
    });

    try {
      // Get the specific stock
      const stock = await prisma.stock.findFirst({
        where: {
          id: stockId,
          userId
        }
      });

      if (!stock) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.NOT_FOUND,
          message: `Stock with ID ${stockId} not found for user ${userId}`
        }));
        return result;
      }

      if (stock.manualOverride) {
        result.success = true;
        result.warnings.push({
          type: 'manual_override',
          message: `Stock ${stock.symbol} has manual override enabled`
        });
        return result;
      }

      result.recordsProcessed = 1;

      // Check cache first
      const cacheKey = this.generateCacheKey(stock.symbol, stock.exchange);
      let priceData = this.getCachedPrice(cacheKey);

      if (!priceData || options.force) {
        // Fetch fresh price data
        const identifier = {
          symbol: stock.symbol,
          exchange: stock.exchange,
          stockId: stock.id
        };

        const provider = this.getDataProvider(result.source);
        
        if (!(await provider.isAvailable())) {
          throw new Error(`${provider.name} is not available`);
        }

        const rawPrices = await provider.fetchData([identifier], options);
        
        if (rawPrices.length > 0 && provider.validateData(rawPrices)) {
          const transformedPrices = provider.transformData(rawPrices);
          priceData = transformedPrices[0];
          
          // Cache the price
          this.setCachedPrice(cacheKey, priceData);
        } else {
          throw new Error('No valid price data received');
        }
      }

      if (priceData) {
        await this.updateStockPrice(stock, priceData, options.dryRun);
        result.recordsUpdated = 1;
        result.success = true;
      } else {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_NOT_FOUND,
          message: `Price data not found for ${stock.symbol} on ${stock.exchange}`
        }));
      }

    } catch (error) {
      result.errors.push(createSyncError({
        type: SyncErrorTypes.UNKNOWN_ERROR,
        message: error.message,
        details: { stockId, stack: error.stack }
      }));
    }

    result.duration = Date.now() - startTime;
    
    // Update sync metadata for this specific stock
    await this.updateSyncMetadata(userId, result, stockId);
    
    return result;
  }

  /**
   * Update stock price and related calculations
   * @param {Object} stock - Stock record from database
   * @param {Object} priceData - New price data
   * @param {boolean} dryRun - If true, don't actually update database
   * @returns {Promise<void>}
   */
  async updateStockPrice(stock, priceData, dryRun = false) {
    try {
      // Validate stock data before calculations
      const validationResult = PnLCalculator.validateStockData({
        quantity: stock.quantity,
        currentPrice: priceData.value,
        investedAmount: stock.investedAmount,
        averagePrice: stock.averagePrice
      });

      if (!validationResult.isValid) {
        throw new Error(`Invalid stock data: ${validationResult.errors.join(', ')}`);
      }

      // Calculate comprehensive metrics using PnLCalculator
      const stockDataForCalculation = {
        quantity: stock.quantity,
        averagePrice: stock.averagePrice,
        investedAmount: stock.investedAmount,
        currentPrice: priceData.value,
        previousClose: priceData.metadata?.previousClose || stock.currentPrice,
        investmentDate: stock.createdAt
      };

      const metrics = PnLCalculator.calculateComprehensiveMetrics(stockDataForCalculation);

      // Prepare update data
      const updateData = {
        currentPrice: metrics.currentPrice,
        currentValue: metrics.currentValue,
        pnl: metrics.pnl,
        pnlPercentage: metrics.pnlPercentage,
        lastSyncAt: new Date(),
        syncStatus: SyncStatus.SYNCED,
        updatedAt: new Date()
      };

      // Add day change data if available
      if (priceData.metadata) {
        updateData.dayChange = metrics.dayChangeAmount;
        updateData.dayChangePercentage = metrics.dayChangePercentage;
        updateData.previousClose = priceData.metadata.previousClose;
      }

      if (!dryRun) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: updateData
        });
      }

      // Log the update with formatted values
      const pnlFormatted = PnLCalculator.formatPnLAmount(metrics.pnl);
      const pnlPercentageFormatted = PnLCalculator.formatPnLPercentage(metrics.pnlPercentage);
      
      console.log(`Updated ${stock.symbol}: ₹${stock.currentPrice} → ₹${metrics.currentPrice} (${pnlFormatted}, ${pnlPercentageFormatted})`);
      
    } catch (error) {
      console.error(`Failed to update stock price for ${stock.symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate portfolio-level metrics for user's stocks
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Portfolio metrics
   */
  async calculatePortfolioMetrics(userId) {
    try {
      const userStocks = await prisma.stock.findMany({
        where: { userId },
        select: {
          quantity: true,
          averagePrice: true,
          investedAmount: true,
          currentPrice: true,
          currentValue: true,
          pnl: true,
          pnlPercentage: true,
          createdAt: true
        }
      });

      return PnLCalculator.calculatePortfolioMetrics(userStocks.map(stock => ({
        quantity: stock.quantity,
        averagePrice: stock.averagePrice,
        investedAmount: stock.investedAmount,
        currentPrice: stock.currentPrice,
        previousClose: stock.currentPrice, // Fallback if no previous close available
        investmentDate: stock.createdAt
      })));
    } catch (error) {
      console.error(`Failed to calculate portfolio metrics for user ${userId}:`, error.message);
      return PnLCalculator.calculatePortfolioMetrics([]);
    }
  }

  /**
   * Get detailed P&L breakdown for a specific stock
   * @param {string} stockId - Stock ID
   * @returns {Promise<Object>} Detailed P&L metrics
   */
  async getStockPnLBreakdown(stockId) {
    try {
      const stock = await prisma.stock.findUnique({
        where: { id: stockId }
      });

      if (!stock) {
        throw new Error(`Stock with ID ${stockId} not found`);
      }

      const stockData = {
        quantity: stock.quantity,
        averagePrice: stock.averagePrice,
        investedAmount: stock.investedAmount,
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose || stock.currentPrice,
        investmentDate: stock.createdAt
      };

      return PnLCalculator.calculateComprehensiveMetrics(stockData);
    } catch (error) {
      console.error(`Failed to get P&L breakdown for stock ${stockId}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate sync configuration for stocks
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if valid
   */
  validateConfiguration(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['isEnabled', 'syncFrequency'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        return false;
      }
    }

    // Validate sync frequency
    const validFrequencies = ['hourly', 'daily', 'manual'];
    if (!validFrequencies.includes(config.syncFrequency)) {
      return false;
    }

    // Validate data sources
    const validSources = ['yahoo_finance', 'nse_india'];
    if (config.preferredSource && !validSources.includes(config.preferredSource)) {
      return false;
    }
    
    if (config.fallbackSource && !validSources.includes(config.fallbackSource)) {
      return false;
    }

    return true;
  }

  /**
   * Get default configuration for stock sync
   * @returns {Object} Default configuration
   */
  getDefaultConfiguration() {
    return {
      ...super.getDefaultConfiguration(),
      syncFrequency: 'hourly',
      preferredSource: 'yahoo_finance',
      fallbackSource: 'nse_india',
      syncOnlyDuringMarketHours: true,
      cacheEnabled: true
    };
  }

  /**
   * Get fields that can be synced (not manually overridden)
   * @returns {string[]} Array of syncable field names
   */
  getSyncableFields() {
    return [
      'currentPrice',
      'currentValue',
      'pnl',
      'pnlPercentage',
      'lastSyncAt',
      'syncStatus'
    ];
  }

  /**
   * Apply validation rules specific to stock data
   * @param {Object} record - Stock price record to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   */
  applyValidationRules(record, rules = {}) {
    const errors = [];
    const warnings = [];

    // Validate price is positive
    if (!record.value || record.value <= 0) {
      errors.push('Stock price must be positive');
    }

    // Validate price is reasonable (not too high or too low)
    const maxPrice = rules.maxPrice || 100000; // ₹1 lakh per share
    const minPrice = rules.minPrice || 0.01;   // 1 paisa per share
    
    if (record.value > maxPrice) {
      warnings.push(`Price ${record.value} seems unusually high`);
    }
    
    if (record.value < minPrice) {
      warnings.push(`Price ${record.value} seems unusually low`);
    }

    // Validate timestamp is recent
    if (record.timestamp) {
      const ageInHours = (Date.now() - record.timestamp.getTime()) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        warnings.push(`Price data is ${ageInHours.toFixed(1)} hours old`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiryTime] of this.cacheExpiryTimes) {
      if (now >= expiryTime) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.priceCache.delete(key);
      this.cacheExpiryTimes.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`Cleared ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.priceCache.size,
      validEntries: Array.from(this.cacheExpiryTimes.values())
        .filter(expiry => Date.now() < expiry).length,
      expiredEntries: Array.from(this.cacheExpiryTimes.values())
        .filter(expiry => Date.now() >= expiry).length,
      isMarketHours: this.isMarketHours(),
      isWeekend: this.isWeekend(),
      currentCacheTTL: this.getCacheTTL()
    };
  }
}

module.exports = StockSyncService;