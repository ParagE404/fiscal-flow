/**
 * Intelligent caching system for sync operations
 * Provides TTL-based caching with market hours awareness and cache warming
 */

const { DataSources } = require('../types/SyncTypes');

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {Date} createdAt - When the entry was created
 * @property {Date} expiresAt - When the entry expires
 * @property {string} source - Data source that provided the value
 * @property {Object} metadata - Additional metadata about the cached entry
 */

/**
 * Cache configuration for different data types
 */
const CACHE_CONFIGS = {
  [DataSources.AMFI]: {
    defaultTTL: 6 * 60 * 60 * 1000, // 6 hours for NAV data
    marketHoursTTL: 30 * 60 * 1000, // 30 minutes during market hours
    maxSize: 10000 // Maximum number of entries
  },
  [DataSources.YAHOO_FINANCE]: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes for stock prices
    marketHoursTTL: 1 * 60 * 1000, // 1 minute during market hours
    maxSize: 5000
  },
  [DataSources.NSE]: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes for stock prices
    marketHoursTTL: 1 * 60 * 1000, // 1 minute during market hours
    maxSize: 5000
  },
  [DataSources.EPFO]: {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours for EPF data
    marketHoursTTL: 24 * 60 * 60 * 1000, // Same during market hours
    maxSize: 1000
  }
};

class SyncCache {
  constructor() {
    this.cache = new Map();
    this.accessLog = new Map(); // Track access patterns for cache warming
    this.warmingQueue = new Set(); // Queue for cache warming operations
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {string} source - Data source
   * @param {number} [customTTL] - Custom TTL in milliseconds
   * @param {Object} [metadata] - Additional metadata
   */
  set(key, value, source, customTTL = null, metadata = {}) {
    const config = CACHE_CONFIGS[source] || CACHE_CONFIGS[DataSources.AMFI];
    const ttl = customTTL || this.getTTLForSource(source);
    
    const entry = {
      value,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      source,
      metadata: {
        ...metadata,
        hitCount: 0,
        lastAccessed: new Date()
      }
    };

    // Enforce cache size limits
    if (this.cache.size >= config.maxSize) {
      this.evictLeastRecentlyUsed(source);
    }

    this.cache.set(key, entry);
    this.logAccess(key, 'set');
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      return null;
    }

    // Update access metadata
    entry.metadata.hitCount++;
    entry.metadata.lastAccessed = new Date();
    this.logAccess(key, 'get');

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   * @param {string} [source] - Optional source filter
   */
  invalidate(pattern, source = null) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const keysToDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key) && (!source || entry.source === source)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.logAccess(key, 'invalidate');
    });

    return keysToDelete.length;
  }

  /**
   * Warm the cache with frequently accessed data
   * @param {Array<string>} keys - Keys to warm
   * @param {Function} dataFetcher - Function to fetch data for warming
   * @param {string} source - Data source
   */
  async warmCache(keys, dataFetcher, source) {
    const warmingPromises = keys
      .filter(key => !this.has(key) && !this.warmingQueue.has(key))
      .map(async (key) => {
        this.warmingQueue.add(key);
        
        try {
          const data = await dataFetcher(key);
          if (data !== null && data !== undefined) {
            this.set(key, data, source, null, { warmed: true });
          }
        } catch (error) {
          console.warn(`Cache warming failed for key ${key}:`, error.message);
        } finally {
          this.warmingQueue.delete(key);
        }
      });

    await Promise.allSettled(warmingPromises);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.cache.size,
      bySource: {},
      hitRates: {},
      oldestEntry: null,
      newestEntry: null
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const [key, entry] of this.cache.entries()) {
      const source = entry.source;
      
      if (!stats.bySource[source]) {
        stats.bySource[source] = {
          count: 0,
          totalHits: 0,
          avgAge: 0
        };
      }

      stats.bySource[source].count++;
      stats.bySource[source].totalHits += entry.metadata.hitCount;

      const entryAge = Date.now() - entry.createdAt.getTime();
      if (entry.createdAt.getTime() < oldestTime) {
        oldestTime = entry.createdAt.getTime();
        stats.oldestEntry = { key, age: entryAge };
      }
      if (entry.createdAt.getTime() > newestTime) {
        newestTime = entry.createdAt.getTime();
        stats.newestEntry = { key, age: entryAge };
      }
    }

    // Calculate hit rates and average ages
    for (const source in stats.bySource) {
      const sourceStats = stats.bySource[source];
      stats.hitRates[source] = sourceStats.count > 0 ? 
        sourceStats.totalHits / sourceStats.count : 0;
    }

    return stats;
  }

  /**
   * Clear all cache entries
   * @param {string} [source] - Optional source filter
   */
  clear(source = null) {
    if (source) {
      const keysToDelete = [];
      for (const [key, entry] of this.cache.entries()) {
        if (entry.source === source) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      return keysToDelete.length;
    } else {
      const count = this.cache.size;
      this.cache.clear();
      this.accessLog.clear();
      return count;
    }
  }

  /**
   * Get TTL for a specific data source based on market hours
   * @param {string} source - Data source
   * @returns {number} TTL in milliseconds
   */
  getTTLForSource(source) {
    const config = CACHE_CONFIGS[source] || CACHE_CONFIGS[DataSources.AMFI];
    
    // Use shorter TTL during market hours for real-time data
    if (this.isMarketHours() && (source === DataSources.YAHOO_FINANCE || source === DataSources.NSE)) {
      return config.marketHoursTTL;
    }
    
    return config.defaultTTL;
  }

  /**
   * Check if current time is during Indian market hours
   * @returns {boolean} True if during market hours
   */
  isMarketHours() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours: 9:15 AM to 3:30 PM IST (Monday to Friday)
    const dayOfWeek = istTime.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMarketTime = timeInMinutes >= 555 && timeInMinutes <= 930; // 9:15 to 15:30
    
    return isWeekday && isMarketTime;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt.getTime()) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.logAccess(key, 'expired');
    });

    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Evict least recently used entries for a specific source
   * @param {string} source - Data source
   */
  evictLeastRecentlyUsed(source) {
    const sourceEntries = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.source === source) {
        sourceEntries.push({ key, entry });
      }
    }

    // Sort by last accessed time (oldest first)
    sourceEntries.sort((a, b) => 
      a.entry.metadata.lastAccessed.getTime() - b.entry.metadata.lastAccessed.getTime()
    );

    // Remove oldest 10% of entries for this source
    const toRemove = Math.max(1, Math.floor(sourceEntries.length * 0.1));
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(sourceEntries[i].key);
      this.logAccess(sourceEntries[i].key, 'evicted');
    }
  }

  /**
   * Log cache access for analytics
   * @param {string} key - Cache key
   * @param {string} action - Action performed
   */
  logAccess(key, action) {
    if (!this.accessLog.has(key)) {
      this.accessLog.set(key, []);
    }
    
    this.accessLog.get(key).push({
      action,
      timestamp: new Date()
    });

    // Keep only last 100 access logs per key
    const logs = this.accessLog.get(key);
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
  }

  /**
   * Get frequently accessed keys for cache warming
   * @param {number} [limit=50] - Maximum number of keys to return
   * @returns {Array<string>} Most frequently accessed keys
   */
  getFrequentlyAccessedKeys(limit = 50) {
    const keyStats = [];

    for (const [key, entry] of this.cache.entries()) {
      keyStats.push({
        key,
        hitCount: entry.metadata.hitCount,
        lastAccessed: entry.metadata.lastAccessed
      });
    }

    return keyStats
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit)
      .map(stat => stat.key);
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    this.accessLog.clear();
    this.warmingQueue.clear();
  }
}

module.exports = SyncCache;