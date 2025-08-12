/**
 * Animation Performance Monitoring and Optimization Utilities
 * Ensures smooth 60fps animations on mobile devices
 */

class AnimationPerformanceMonitor {
  constructor() {
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 60
    this.isMonitoring = false
    this.performanceCallbacks = []
    this.lowPerformanceThreshold = 45 // FPS threshold for low performance
    this.isLowPerformance = false
    
    // Enhanced metrics
    this.frameHistory = []
    this.maxHistorySize = 100
    this.memoryUsage = { used: 0, total: 0 }
    this.animationCount = 0
    this.droppedFrames = 0
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      frameDropRate: 0,
      memoryPressure: false
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.measureFPS()
  }

  stopMonitoring() {
    this.isMonitoring = false
  }

  measureFPS() {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    this.frameCount++

    // Calculate frame time
    const frameTime = currentTime - this.lastFrameTime || 0
    this.lastFrameTime = currentTime

    // Track frame history
    this.frameHistory.push(frameTime)
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift()
    }

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      
      // Update performance metrics
      this.updatePerformanceMetrics()
      
      // Check memory usage
      this.checkMemoryUsage()
      
      this.frameCount = 0
      this.lastTime = currentTime

      // Check for low performance
      const wasLowPerformance = this.isLowPerformance
      this.isLowPerformance = this.fps < this.lowPerformanceThreshold

      // Trigger callbacks if performance state changed
      if (wasLowPerformance !== this.isLowPerformance) {
        this.performanceCallbacks.forEach(callback => {
          callback(this.fps, this.isLowPerformance, this.performanceMetrics)
        })
      }
    }

    requestAnimationFrame(() => this.measureFPS())
  }

  updatePerformanceMetrics() {
    if (this.frameHistory.length === 0) return

    // Calculate average FPS from frame times
    const avgFrameTime = this.frameHistory.reduce((sum, time) => sum + time, 0) / this.frameHistory.length
    this.performanceMetrics.averageFPS = Math.round(1000 / avgFrameTime)

    // Calculate min/max FPS
    const frameTimes = this.frameHistory.slice()
    const minFrameTime = Math.min(...frameTimes)
    const maxFrameTime = Math.max(...frameTimes)
    
    this.performanceMetrics.maxFPS = Math.round(1000 / minFrameTime)
    this.performanceMetrics.minFPS = Math.round(1000 / maxFrameTime)

    // Calculate frame drop rate
    const droppedFrames = frameTimes.filter(time => time > 16.67).length // 60fps = 16.67ms per frame
    this.performanceMetrics.frameDropRate = (droppedFrames / frameTimes.length) * 100
  }

  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory
      this.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      }
      
      // Check for memory pressure (using more than 80% of available memory)
      this.performanceMetrics.memoryPressure = 
        (this.memoryUsage.used / this.memoryUsage.limit) > 0.8
    }
  }

  getDetailedMetrics() {
    return {
      ...this.performanceMetrics,
      currentFPS: this.fps,
      memoryUsage: this.memoryUsage,
      activeAnimations: this.animationCount,
      isLowPerformance: this.isLowPerformance
    }
  }

  registerAnimation() {
    this.animationCount++
  }

  unregisterAnimation() {
    this.animationCount = Math.max(0, this.animationCount - 1)
  }

  onPerformanceChange(callback) {
    this.performanceCallbacks.push(callback)
    return () => {
      const index = this.performanceCallbacks.indexOf(callback)
      if (index > -1) {
        this.performanceCallbacks.splice(index, 1)
      }
    }
  }

  getCurrentFPS() {
    return this.fps
  }

  isLowPerformanceDevice() {
    return this.isLowPerformance
  }
}

// Global performance monitor instance
export const performanceMonitor = new AnimationPerformanceMonitor()

/**
 * Optimized animation utilities for mobile performance
 */
export const animationUtils = {
  // Check if device supports hardware acceleration
  supportsHardwareAcceleration() {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  },

  // Check if device prefers reduced motion
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },

  // Check if device is likely mobile
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768
  },

  // Get optimal animation duration based on device performance
  getOptimalDuration(baseDuration = 300) {
    if (this.prefersReducedMotion()) return 0
    if (performanceMonitor.isLowPerformanceDevice()) {
      return Math.max(baseDuration * 0.5, 150) // Reduce duration for low-performance devices
    }
    return baseDuration
  },

  // Get optimal easing function for device
  getOptimalEasing() {
    if (this.prefersReducedMotion()) return 'linear'
    if (performanceMonitor.isLowPerformanceDevice()) {
      return 'ease-out' // Simpler easing for low-performance devices
    }
    return 'cubic-bezier(0.4, 0, 0.2, 1)' // Default smooth easing
  },

  // Apply GPU acceleration to element
  enableGPUAcceleration(element) {
    if (!element) return
    
    element.style.transform = element.style.transform || 'translateZ(0)'
    element.style.willChange = 'transform, opacity'
    element.style.backfaceVisibility = 'hidden'
    element.style.webkitBackfaceVisibility = 'hidden'
  },

  // Remove GPU acceleration when animation is complete
  disableGPUAcceleration(element) {
    if (!element) return
    
    element.style.willChange = 'auto'
    // Keep translateZ(0) for consistency, but remove will-change
  },

  // Throttle animation frames for better performance
  throttleAnimationFrame(callback, fps = 60) {
    let lastTime = 0
    const interval = 1000 / fps

    return function(currentTime) {
      if (currentTime - lastTime >= interval) {
        lastTime = currentTime
        callback(currentTime)
      }
    }
  },

  // Debounce resize events for responsive animations
  debounceResize(callback, delay = 250) {
    let timeoutId
    return function(...args) {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => callback.apply(this, args), delay)
    }
  },

  // Optimize CSS animations for performance
  optimizeAnimation(element, properties = {}) {
    if (!element) return

    // Apply performance optimizations
    const optimizedStyles = {
      // GPU acceleration
      transform: 'translateZ(0)',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
      
      // Optimize for mobile
      '-webkit-backface-visibility': 'hidden',
      '-webkit-transform': 'translateZ(0)',
      
      // Reduce paint complexity
      isolation: 'isolate',
      
      // Override with custom properties
      ...properties
    }

    Object.assign(element.style, optimizedStyles)

    // Clean up after animation
    const cleanup = () => {
      element.style.willChange = 'auto'
      performanceMonitor.unregisterAnimation()
    }

    // Register animation
    performanceMonitor.registerAnimation()

    return cleanup
  },

  // Create performance-aware animation
  createOptimizedAnimation(element, keyframes, options = {}) {
    if (!element || this.prefersReducedMotion()) {
      return { finished: Promise.resolve() }
    }

    // Optimize options based on device performance
    const optimizedOptions = {
      duration: this.getOptimalDuration(options.duration),
      easing: this.getOptimalEasing(),
      fill: 'both',
      ...options
    }

    // Apply GPU acceleration
    this.optimizeAnimation(element)

    // Create animation with performance monitoring
    const animation = element.animate(keyframes, optimizedOptions)
    
    // Clean up after animation
    animation.addEventListener('finish', () => {
      this.disableGPUAcceleration(element)
    })

    return animation
  },

  // Batch DOM operations for better performance
  batchDOMOperations(operations) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        operations.forEach(operation => operation())
        resolve()
      })
    })
  },

  // Optimize scroll performance
  optimizeScrollPerformance() {
    // Use passive event listeners for better scroll performance
    const passiveSupported = this.supportsPassiveEvents()
    
    return {
      passive: passiveSupported,
      capture: false
    }
  },

  // Check if passive events are supported
  supportsPassiveEvents() {
    let passiveSupported = false
    try {
      const options = {
        get passive() {
          passiveSupported = true
          return false
        }
      }
      window.addEventListener('test', null, options)
      window.removeEventListener('test', null, options)
    } catch (err) {
      passiveSupported = false
    }
    return passiveSupported
  },

  // Create intersection observer for performance-aware animations
  createPerformanceObserver(callback, options = {}) {
    const defaultOptions = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    }

    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !performanceMonitor.isLowPerformanceDevice()) {
          callback(entry)
        }
      })
    }, defaultOptions)
  }
}



// Initialize performance monitoring on module load
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay to avoid affecting initial page load
  setTimeout(() => {
    performanceMonitor.startMonitoring()
  }, 1000)
}

export default {
  performanceMonitor,
  animationUtils
}