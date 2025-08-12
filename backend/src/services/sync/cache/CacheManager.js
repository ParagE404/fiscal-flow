/**
 * Cache Manager for coordinating caching across sync services
 * Provides centralized cache management with intelligent warming and invalidation
 */

const SyncCache = require('./SyncCache');
const { DataSources, InvestmentTypes } = require('../types/SyncTypes');

class CacheManager {
  constructor() {
    this.cache = new SyncCache();
    this.warmingSchedule = new Map(); // Track warming schedules
    this.isInitialized = false;
  }

  /**
   * Initialize the cache manager
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Start predictive cache warming
    this.startPredictiveCaching();
    this.isInitialized = true;
    
    console.log('Cache Manager initialized');
  }

  /**
   * Generate cache key for API responses
   * @param {string} source - Data source
   * @param {string} operation - Operation type
   * @param {Array|string} identifiers - Data identifiers
   * @param {Object} [params] - Additional parameters
   * @returns {string} Cache key
   */
  generateKey(source, operation, identifiers, params = {}) {
    const idString = Array.isArray(identifiers) ? identifiers.sort().join(',') : identifiers;
    const paramString = Object.keys(params).length > 0 ? 
      JSON.stringify(params, Object.keys(params).sort()) : '';
    
    return `${source}:${operation}:${idString}${paramString ? ':' + Buffer.from(paramString).toString('base64') : ''}`;
  }

  /**
   * Cache API response data
   * @param {string} source - Data source
   * @param {string} operation - Operation type
   * @param {Array|string} identifiers - Data identifiers
   * @param {*} data - Data to cache
   * @param {Object} [options] - Caching options
   */
  cacheApiResponse(source, operation, identifiers, data, options = {}) {
    const key = this.generateKey(source, operation, identifiers, options.params);
    const metadata = {
      operation,
      identifiers: Array.isArray(identifiers) ? identifiers : [identifiers],
      cachedAt: new Date(),
      ...options.metadata
    };

    this.cache.set(key, data, source, options.ttl, metadata);
  }

  /**
   * Get cached API response
   * @param {string} source - Data source
   * @param {string} operation - Operation type
   * @param {Array|string} identifiers - Data identifiers
   * @param {Object} [params] - Additional parameters
   * @returns {*|null} Cached data or null
   */
  getCachedApiResponse(source, operation, identifiers, params = {}) {
    const key = this.generateKey(source, operation, identifiers, params);
    return this.cache.get(key);
  }

  /**
   * Check if API response is cached
   * @param {string} source - Data source
   * @param {string} operation - Operation type
   * @param {Array|string} identifiers - Data identifiers
   * @param {Object} [params] - Additional parameters
   * @returns {boolean} True if cached
   */
  hasApiResponse(source, operation, identifiers, params = {}) {
    const key = this.generateKey(source, operation, identifiers, params);
    return this.cache.has(key);
  }

  /**
   * Invalidate cache for specific investment type
   * @param {string} investmentType - Investment type
   * @param {string} [userId] - Optional user ID filter
   */
  invalidateInvestmentType(investmentType, userId = null) {
    const patterns = this.getInvalidationPatterns(investmentType, userId);
    let totalInvalidated = 0;

    patterns.forEach(pattern => {
      totalInvalidated += this.cache.invalidate(pattern.regex, pattern.source);
    });

    console.log(`Invalidated ${totalInvalidated} cache entries for ${investmentType}${userId ? ` (user: ${userId})` : ''}`);
    return totalInvalidated;
  }

  /**
   * Get invalidation patterns for investment types
   * @param {string} investmentType - Investment type
   * @param {string} [userId] - Optional user ID
   * @returns {Array} Invalidation patterns
   */
  getInvalidationPatterns(investmentType, userId = null) {
    const userPattern = userId ? `.*${userId}.*` : '.*';
    
    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        return [
          { regex: new RegExp(`${DataSources.AMFI}:nav:${userPattern}`), source: DataSources.AMFI },
          { regex: new RegExp(`${DataSources.MF_CENTRAL}:nav:${userPattern}`), source: DataSources.MF_CENTRAL }
        ];
      
      case InvestmentTypes.STOCKS:
        return [
          { regex: new RegExp(`${DataSources.YAHOO_FINANCE}:price:${userPattern}`), source: DataSources.YAHOO_FINANCE },
          { regex: new RegExp(`${DataSources.NSE}:price:${userPattern}`), source: DataSources.NSE }
        ];
      
      case InvestmentTypes.EPF:
        return [
          { regex: new RegExp(`${DataSources.EPFO}:balance:${userPattern}`), source: DataSources.EPFO }
        ];
      
      default:
        return [{ regex: new RegExp(userPattern), source: null }];
    }
  }

  /**
   * Warm cache for frequently accessed data
   * @param {string} investmentType - Investment type
   * @param {Array} identifiers - Data identifiers to warm
   * @param {Function} dataFetcher - Function to fetch data
   */
  async warmCacheForInvestmentType(investmentType, identifiers, dataFetcher) {
    if (!identifiers || identifiers.length === 0) {
      return;
    }

    const source = this.getPreferredSourceForInvestmentType(investmentType);
    const operation = this.getOperationForInvestmentType(investmentType);
    
    // Create cache keys for warming
    const keys = identifiers.map(id => 
      this.generateKey(source, operation, id)
    );

    await this.cache.warmCache(keys, async (key) => {
      // Extract identifier from key for data fetching
      const parts = key.split(':');
      const identifier = parts[2];
      return await dataFetcher(identifier);
    }, source);

    console.log(`Cache warming completed for ${investmentType}: ${keys.length} keys`);
  }

  /**
   * Start predictive caching based on usage patterns
   */
  startPredictiveCaching() {
    // Schedule cache warming during off-peak hours
    const warmingInterval = setInterval(() => {
      this.performPredictiveCaching();
    }, 30 * 60 * 1000); // Every 30 minutes

    this.warmingSchedule.set('predictive', warmingInterval);
  }

  /**
   * Perform predictive caching based on access patterns
   */
  async performPredictiveCaching() {
    try {
      const frequentKeys = this.cache.getFrequentlyAccessedKeys(100);
      
      if (frequentKeys.length === 0) {
        return;
      }

      // Group keys by source and operation
      const keyGroups = this.groupKeysBySourceAndOperation(frequentKeys);
      
      for (const [groupKey, keys] of keyGroups.entries()) {
        const [source, operation] = groupKey.split(':');
        
        // Only warm cache during off-peak hours or for stale data
        if (this.shouldWarmCache(source)) {
          await this.warmCacheGroup(source, operation, keys);
        }
      }
    } catch (error) {
      console.error('Predictive caching failed:', error);
    }
  }

  /**
   * Group cache keys by source and operation
   * @param {Array<string>} keys - Cache keys
   * @returns {Map} Grouped keys
   */
  groupKeysBySourceAndOperation(keys) {
    const groups = new Map();
    
    keys.forEach(key => {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const groupKey = `${parts[0]}:${parts[1]}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey).push(key);
      }
    });
    
    return groups;
  }

  /**
   * Determine if cache should be warmed for a source
   * @param {string} source - Data source
   * @returns {boolean} True if should warm
   */
  shouldWarmCache(source) {
    // Don't warm real-time data during market hours
    if ((source === DataSources.YAHOO_FINANCE || source === DataSources.NSE) && 
        this.cache.isMarketHours()) {
      return false;
    }
    
    // Always warm EPF and AMFI data (less frequent updates)
    if (source === DataSources.EPFO || source === DataSources.AMFI) {
      return true;
    }
    
    return true;
  }

  /**
   * Warm cache for a group of keys
   * @param {string} source - Data source
   * @param {string} operation - Operation type
   * @param {Array<string>} keys - Keys to warm
   */
  async warmCacheGroup(source, operation, keys) {
    // This would integrate with actual data providers
    // For now, we'll just log the warming attempt
    console.log(`Warming cache for ${source}:${operation} - ${keys.length} keys`);
  }

  /**
   * Get preferred data source for investment type
   * @param {string} investmentType - Investment type
   * @returns {string} Data source
   */
  getPreferredSourceForInvestmentType(investmentType) {
    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        return DataSources.AMFI;
      case InvestmentTypes.STOCKS:
        return DataSources.YAHOO_FINANCE;
      case InvestmentTypes.EPF:
        return DataSources.EPFO;
      default:
        return DataSources.AMFI;
    }
  }

  /**
   * Get operation type for investment type
   * @param {string} investmentType - Investment type
   * @returns {string} Operation type
   */
  getOperationForInvestmentType(investmentType) {
    switch (investmentType) {
      case InvestmentTypes.MUTUAL_FUNDS:
        return 'nav';
      case InvestmentTypes.STOCKS:
        return 'price';
      case InvestmentTypes.EPF:
        return 'balance';
      default:
        return 'data';
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      warmingSchedules: this.warmingSchedule.size,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clear cache with optional filters
   * @param {Object} [filters] - Filters for clearing
   */
  clearCache(filters = {}) {
    if (filters.source) {
      return this.cache.clear(filters.source);
    }
    
    if (filters.investmentType) {
      return this.invalidateInvestmentType(filters.investmentType, filters.userId);
    }
    
    return this.cache.clear();
  }

  /**
   * Shutdown cache manager and cleanup resources
   */
  shutdown() {
    // Clear all warming schedules
    for (const [name, interval] of this.warmingSchedule.entries()) {
      clearInterval(interval);
    }
    this.warmingSchedule.clear();
    
    // Destroy cache
    this.cache.destroy();
    this.isInitialized = false;
    
    console.log('Cache Manager shutdown complete');
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;