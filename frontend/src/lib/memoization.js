/**
 * Memoization utilities for performance optimization
 */

// Simple memoization for functions with primitive arguments
export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  
  return function memoized(...args) {
    const key = keyGenerator(...args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn.apply(this, args)
    cache.set(key, result)
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    return result
  }
}

// Memoization with TTL (Time To Live)
export function memoizeWithTTL(fn, ttlMs = 5000, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  
  return function memoized(...args) {
    const key = keyGenerator(...args)
    const now = Date.now()
    
    if (cache.has(key)) {
      const { value, timestamp } = cache.get(key)
      if (now - timestamp < ttlMs) {
        return value
      }
      cache.delete(key)
    }
    
    const result = fn.apply(this, args)
    cache.set(key, { value: result, timestamp: now })
    
    // Cleanup expired entries
    for (const [cacheKey, { timestamp }] of cache.entries()) {
      if (now - timestamp >= ttlMs) {
        cache.delete(cacheKey)
      }
    }
    
    return result
  }
}

// Memoization for object-based computations with deep comparison
export function memoizeDeep(fn, maxCacheSize = 10) {
  const cache = new Map()
  
  return function memoized(...args) {
    // Create a deep hash of the arguments
    const key = createDeepHash(args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn.apply(this, args)
    cache.set(key, result)
    
    // Limit cache size
    if (cache.size > maxCacheSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }
    
    return result
  }
}

// Create a deep hash for complex objects
function createDeepHash(obj) {
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj)
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(createDeepHash).join(',')}]`
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort()
    return `{${keys.map(key => `${key}:${createDeepHash(obj[key])}`).join(',')}}`
  }
  return String(obj)
}

// Debounced memoization for frequently called functions
export function memoizeDebounced(fn, debounceMs = 100, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  const timeouts = new Map()
  
  return function memoized(...args) {
    const key = keyGenerator(...args)
    
    // Clear existing timeout for this key
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key))
    }
    
    // Return cached result if available
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    // Set timeout to compute result
    const timeout = setTimeout(() => {
      const result = fn.apply(this, args)
      cache.set(key, result)
      timeouts.delete(key)
    }, debounceMs)
    
    timeouts.set(key, timeout)
    
    // Return a placeholder or previous result while debouncing
    return cache.get(key) || null
  }
}

// React-specific memoization hook
export function useMemoizedCallback(callback, deps, ttl = 5000) {
  const cache = React.useRef(new Map())
  
  return React.useCallback((...args) => {
    const key = JSON.stringify(args)
    const now = Date.now()
    
    if (cache.current.has(key)) {
      const { value, timestamp } = cache.current.get(key)
      if (now - timestamp < ttl) {
        return value
      }
    }
    
    const result = callback(...args)
    cache.current.set(key, { value: result, timestamp: now })
    
    return result
  }, deps)
}

// Performance monitoring for memoized functions
export function memoizeWithMetrics(fn, name = 'anonymous') {
  let hits = 0
  let misses = 0
  const cache = new Map()
  
  const memoized = function(...args) {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      hits++
      return cache.get(key)
    }
    
    misses++
    const result = fn.apply(this, args)
    cache.set(key, result)
    
    return result
  }
  
  memoized.getMetrics = () => ({
    name,
    hits,
    misses,
    hitRate: hits / (hits + misses) || 0,
    cacheSize: cache.size
  })
  
  memoized.clearCache = () => {
    cache.clear()
    hits = 0
    misses = 0
  }
  
  return memoized
}

// Clear all memoization caches (useful for testing or memory management)
export function clearAllMemoizationCaches() {
  // This would need to be implemented based on how caches are stored globally
  console.log('Clearing all memoization caches')
}