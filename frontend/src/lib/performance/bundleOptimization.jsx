/**
 * Bundle optimization utilities for performance monitoring and optimization
 */
import React from 'react'

// Track component render times for performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.renderTimes = new Map()
    this.componentCounts = new Map()
    this.memoryUsage = []
    this.isEnabled = process.env.NODE_ENV === 'development'
  }

  // Start timing a component render
  startRender(componentName) {
    if (!this.isEnabled) return null
    
    const startTime = performance.now()
    return {
      componentName,
      startTime,
      end: () => this.endRender(componentName, startTime)
    }
  }

  // End timing a component render
  endRender(componentName, startTime) {
    if (!this.isEnabled) return
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }
    
    this.renderTimes.get(componentName).push(renderTime)
    
    // Keep only last 100 renders per component
    const times = this.renderTimes.get(componentName)
    if (times.length > 100) {
      times.shift()
    }
    
    // Update component render count
    const currentCount = this.componentCounts.get(componentName) || 0
    this.componentCounts.set(componentName, currentCount + 1)
    
    // Log slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
  }

  // Get performance statistics
  getStats() {
    if (!this.isEnabled) return null
    
    const stats = {}
    
    for (const [componentName, times] of this.renderTimes.entries()) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      const renderCount = this.componentCounts.get(componentName) || 0
      
      stats[componentName] = {
        averageRenderTime: avgTime.toFixed(2),
        maxRenderTime: maxTime.toFixed(2),
        minRenderTime: minTime.toFixed(2),
        totalRenders: renderCount,
        recentRenders: times.length
      }
    }
    
    return stats
  }

  // Log performance report
  logReport() {
    if (!this.isEnabled) return
    
    const stats = this.getStats()
    console.group('🚀 Performance Report')
    console.table(stats)
    console.groupEnd()
  }

  // Track memory usage
  trackMemoryUsage() {
    if (!this.isEnabled || !performance.memory) return
    
    const memInfo = {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    }
    
    this.memoryUsage.push(memInfo)
    
    // Keep only last 100 measurements
    if (this.memoryUsage.length > 100) {
      this.memoryUsage.shift()
    }
  }

  // Get memory usage stats
  getMemoryStats() {
    if (!this.isEnabled || this.memoryUsage.length === 0) return null
    
    const latest = this.memoryUsage[this.memoryUsage.length - 1]
    const earliest = this.memoryUsage[0]
    
    return {
      currentUsage: (latest.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      totalHeap: (latest.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      heapLimit: (latest.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
      memoryGrowth: this.memoryUsage.length > 1 
        ? ((latest.usedJSHeapSize - earliest.usedJSHeapSize) / 1024 / 1024).toFixed(2) + ' MB'
        : '0 MB'
    }
  }

  // Clear all performance data
  clear() {
    this.renderTimes.clear()
    this.componentCounts.clear()
    this.memoryUsage = []
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor(componentName) {
  if (process.env.NODE_ENV !== 'development') {
    return { startRender: () => null }
  }

  return {
    startRender: () => performanceMonitor.startRender(componentName)
  }
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring(WrappedComponent) {
  const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Anonymous'
  
  return function PerformanceMonitoredComponent(props) {
    const timer = performanceMonitor.startRender(componentName)
    
    React.useEffect(() => {
      return () => {
        if (timer) timer.end()
      }
    })
    
    return React.createElement(WrappedComponent, props)
  }
}

// Bundle size analysis utilities
export class BundleAnalyzer {
  constructor() {
    this.loadedChunks = new Set()
    this.chunkSizes = new Map()
    this.loadTimes = new Map()
  }

  // Track when a chunk is loaded
  trackChunkLoad(chunkName, size, loadTime) {
    this.loadedChunks.add(chunkName)
    this.chunkSizes.set(chunkName, size)
    this.loadTimes.set(chunkName, loadTime)
  }

  // Get bundle statistics
  getBundleStats() {
    const totalSize = Array.from(this.chunkSizes.values()).reduce((sum, size) => sum + size, 0)
    const totalLoadTime = Array.from(this.loadTimes.values()).reduce((sum, time) => sum + time, 0)
    
    return {
      totalChunks: this.loadedChunks.size,
      totalSize: (totalSize / 1024).toFixed(2) + ' KB',
      averageChunkSize: this.loadedChunks.size > 0 
        ? ((totalSize / this.loadedChunks.size) / 1024).toFixed(2) + ' KB'
        : '0 KB',
      totalLoadTime: totalLoadTime.toFixed(2) + ' ms',
      averageLoadTime: this.loadedChunks.size > 0
        ? (totalLoadTime / this.loadedChunks.size).toFixed(2) + ' ms'
        : '0 ms'
    }
  }

  // Log bundle report
  logBundleReport() {
    const stats = this.getBundleStats()
    console.group('📦 Bundle Analysis')
    console.table(stats)
    console.log('Loaded chunks:', Array.from(this.loadedChunks))
    console.groupEnd()
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer()

// Lazy loading with performance tracking
export function createLazyComponent(importFn, componentName) {
  return React.lazy(async () => {
    const startTime = performance.now()
    
    try {
      const module = await importFn()
      const loadTime = performance.now() - startTime
      
      // Estimate chunk size (rough approximation)
      const estimatedSize = JSON.stringify(module).length
      bundleAnalyzer.trackChunkLoad(componentName, estimatedSize, loadTime)
      
      return module
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error)
      throw error
    }
  })
}

// Performance-aware Suspense wrapper
export function PerformanceSuspense({ children, fallback, name = 'Unknown' }) {
  const [isLoading, setIsLoading] = React.useState(true)
  const startTime = React.useRef(performance.now())
  
  React.useEffect(() => {
    setIsLoading(false)
    const loadTime = performance.now() - startTime.current
    
    if (loadTime > 100) {
      console.warn(`Slow component load: ${name} took ${loadTime.toFixed(2)}ms`)
    }
  }, [name])
  
  return (
    <React.Suspense fallback={fallback}>
      {children}
    </React.Suspense>
  )
}

// Critical resource preloader
export class ResourcePreloader {
  constructor() {
    this.preloadedResources = new Set()
  }

  // Preload critical CSS
  preloadCSS(href) {
    if (this.preloadedResources.has(href)) return
    
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.onload = () => {
      link.rel = 'stylesheet'
    }
    
    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  // Preload JavaScript modules
  preloadJS(href) {
    if (this.preloadedResources.has(href)) return
    
    const link = document.createElement('link')
    link.rel = 'modulepreload'
    link.href = href
    
    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  // Preload images
  preloadImage(src) {
    if (this.preloadedResources.has(src)) return
    
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    
    document.head.appendChild(link)
    this.preloadedResources.add(src)
  }

  // Preload fonts
  preloadFont(href, type = 'font/woff2') {
    if (this.preloadedResources.has(href)) return
    
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = type
    link.href = href
    link.crossOrigin = 'anonymous'
    
    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }
}

// Global resource preloader instance
export const resourcePreloader = new ResourcePreloader()

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (process.env.NODE_ENV !== 'development') return
  
  // Track memory usage every 30 seconds
  setInterval(() => {
    performanceMonitor.trackMemoryUsage()
  }, 30000)
  
  // Log performance report every 5 minutes
  setInterval(() => {
    performanceMonitor.logReport()
    bundleAnalyzer.logBundleReport()
  }, 300000)
  
  // Log performance report when page is about to unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.logReport()
    bundleAnalyzer.logBundleReport()
  })
}