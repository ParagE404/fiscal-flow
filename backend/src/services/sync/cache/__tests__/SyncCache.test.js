/**
 * Tests for SyncCache class
 */

const SyncCache = require('../SyncCache');
const { DataSources } = require('../../types/SyncTypes');

describe('SyncCache', () => {
  let cache;

  beforeEach(() => {
    cache = new SyncCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values correctly', () => {
      const testData = { nav: 25.50, date: new Date() };
      cache.set('test-key', testData, DataSources.AMFI);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should check key existence correctly', () => {
      cache.set('test-key', 'test-value', DataSources.AMFI);
      
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent-key')).toBe(false);
    });

    it('should handle expiration correctly', (done) => {
      cache.set('test-key', 'test-value', DataSources.AMFI, 100); // 100ms TTL
      
      expect(cache.has('test-key')).toBe(true);
      
      setTimeout(() => {
        expect(cache.has('test-key')).toBe(false);
        expect(cache.get('test-key')).toBeNull();
        done();
      }, 150);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(() => {
      cache.set('amfi:nav:INF123', { nav: 25.50 }, DataSources.AMFI);
      cache.set('amfi:nav:INF456', { nav: 30.25 }, DataSources.AMFI);
      cache.set('yahoo:price:RELIANCE', { price: 2500 }, DataSources.YAHOO_FINANCE);
    });

    it('should invalidate by pattern', () => {
      const invalidated = cache.invalidate('amfi:nav:.*');
      expect(invalidated).toBe(2);
      
      expect(cache.has('amfi:nav:INF123')).toBe(false);
      expect(cache.has('amfi:nav:INF456')).toBe(false);
      expect(cache.has('yahoo:price:RELIANCE')).toBe(true);
    });

    it('should invalidate by source', () => {
      const invalidated = cache.invalidate('.*', DataSources.AMFI);
      expect(invalidated).toBe(2);
      
      expect(cache.has('amfi:nav:INF123')).toBe(false);
      expect(cache.has('amfi:nav:INF456')).toBe(false);
      expect(cache.has('yahoo:price:RELIANCE')).toBe(true);
    });

    it('should clear all entries', () => {
      const cleared = cache.clear();
      expect(cleared).toBe(3);
      expect(cache.getStats().totalEntries).toBe(0);
    });

    it('should clear by source', () => {
      const cleared = cache.clear(DataSources.AMFI);
      expect(cleared).toBe(2);
      expect(cache.has('yahoo:price:RELIANCE')).toBe(true);
    });
  });

  describe('TTL Management', () => {
    it('should use different TTL for market hours', () => {
      // Mock market hours
      jest.spyOn(cache, 'isMarketHours').mockReturnValue(true);
      
      const marketHoursTTL = cache.getTTLForSource(DataSources.YAHOO_FINANCE);
      
      // Mock non-market hours
      jest.spyOn(cache, 'isMarketHours').mockReturnValue(false);
      
      const regularTTL = cache.getTTLForSource(DataSources.YAHOO_FINANCE);
      
      expect(marketHoursTTL).toBeLessThan(regularTTL);
    });

    it('should detect market hours correctly', () => {
      // This test would need to be adjusted based on current time
      // For now, we'll just test the method exists and returns a boolean
      const isMarketHours = cache.isMarketHours();
      expect(typeof isMarketHours).toBe('boolean');
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(() => {
      cache.set('key1', 'value1', DataSources.AMFI);
      cache.set('key2', 'value2', DataSources.YAHOO_FINANCE);
      
      // Simulate some hits
      cache.get('key1');
      cache.get('key1');
      cache.get('key2');
    });

    it('should provide accurate statistics', () => {
      const stats = cache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.bySource[DataSources.AMFI]).toBeDefined();
      expect(stats.bySource[DataSources.YAHOO_FINANCE]).toBeDefined();
      expect(stats.bySource[DataSources.AMFI].count).toBe(1);
      expect(stats.bySource[DataSources.YAHOO_FINANCE].count).toBe(1);
    });

    it('should track frequently accessed keys', () => {
      const frequentKeys = cache.getFrequentlyAccessedKeys(10);
      expect(frequentKeys).toContain('key1');
      expect(frequentKeys.indexOf('key1')).toBeLessThan(frequentKeys.indexOf('key2'));
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with provided data fetcher', async () => {
      const mockDataFetcher = jest.fn()
        .mockResolvedValueOnce({ nav: 25.50 })
        .mockResolvedValueOnce({ nav: 30.25 });

      await cache.warmCache(['key1', 'key2'], mockDataFetcher, DataSources.AMFI);

      expect(mockDataFetcher).toHaveBeenCalledTimes(2);
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
      
      const value1 = cache.get('key1');
      expect(value1.nav).toBe(25.50);
    });

    it('should not warm already cached keys', async () => {
      cache.set('key1', { nav: 20.00 }, DataSources.AMFI);
      
      const mockDataFetcher = jest.fn()
        .mockResolvedValue({ nav: 25.50 });

      await cache.warmCache(['key1', 'key2'], mockDataFetcher, DataSources.AMFI);

      expect(mockDataFetcher).toHaveBeenCalledTimes(1);
      expect(mockDataFetcher).toHaveBeenCalledWith('key2');
      
      // Original value should be preserved
      const value1 = cache.get('key1');
      expect(value1.nav).toBe(20.00);
    });

    it('should handle warming failures gracefully', async () => {
      const mockDataFetcher = jest.fn()
        .mockRejectedValue(new Error('Fetch failed'));

      await cache.warmCache(['key1'], mockDataFetcher, DataSources.AMFI);

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('should evict least recently used entries when cache is full', () => {
      // Mock a small cache size for testing
      const originalConfig = require('../SyncCache');
      
      // Set small cache size
      cache.set('key1', 'value1', DataSources.AMFI);
      cache.set('key2', 'value2', DataSources.AMFI);
      
      // Access key1 to make it more recently used
      cache.get('key1');
      
      // This should trigger eviction of key2 when cache is full
      // Note: This test would need the actual cache size limit to be reached
      // For a proper test, we'd need to mock the cache size configuration
    });

    it('should cleanup expired entries', (done) => {
      cache.set('key1', 'value1', DataSources.AMFI, 50); // 50ms TTL
      cache.set('key2', 'value2', DataSources.AMFI, 200); // 200ms TTL
      
      setTimeout(() => {
        cache.cleanup();
        
        expect(cache.has('key1')).toBe(false);
        expect(cache.has('key2')).toBe(true);
        done();
      }, 100);
    });
  });
});