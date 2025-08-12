/**
 * CSS Bundle Optimization Utilities
 * Minimizes CSS bundle size and eliminates unused styles
 */

class CSSOptimizer {
  constructor() {
    this.unusedSelectors = new Set()
    this.criticalSelectors = new Set()
    this.deferredSelectors = new Set()
    this.optimizationRules = new Map()
  }

  /**
   * Initialize CSS optimization
   */
  init() {
    this.setupOptimizationRules()
    this.analyzeCSSUsage()
    
    if (import.meta.env.DEV) {
      this.setupDevelopmentTools()
    }
  }

  /**
   * Setup optimization rules for different CSS categories
   */
  setupOptimizationRules() {
    // Critical CSS that should always be loaded first
    this.optimizationRules.set('critical', {
      selectors: [
        // Base styles
        'html', 'body', '*',
        ':root', '.dark',
        
        // Typography
        '.font-display', '.font-body', '.font-mono',
        '.text-display', '.text-h1', '.text-h2', '.text-body',
        
        // Layout
        '.container', '.grid', '.flex',
        '.w-full', '.h-full', '.min-h-screen',
        
        // Core interactions
        '.btn-primary', '.interactive', '.mobile-touch',
        
        // Loading states
        '.skeleton', '.shimmer', '.loading-spinner'
      ],
      priority: 1,
      inline: true
    })

    // Deferred CSS that can be loaded after initial render
    this.optimizationRules.set('deferred', {
      selectors: [
        // Complex animations
        '.hover-lift', '.hover-scale', '.hover-glow',
        '.card-hover', '.btn-animate', '.btn-modern',
        
        // Advanced visual effects
        '.gradient-primary', '.gradient-success', '.gradient-card',
        '.shadow-primary', '.shadow-success', '.shadow-warning',
        
        // Complex interactions
        '.ripple', '.ghost-fill', '.icon-btn-ripple',
        '.fab-pulse', '.fab-bounce'
      ],
      priority: 2,
      inline: false
    })

    // Conditional CSS that's only loaded when needed
    this.optimizationRules.set('conditional', {
      selectors: [
        // Mobile-specific styles
        '.swipeable', '.swipe-indicator',
        '.touch-target', '.touch-target-large',
        
        // Dark mode specific
        '.dark\\:',
        
        // Print styles
        '@media print'
      ],
      priority: 3,
      inline: false,
      condition: 'onDemand'
    })
  }

  /**
   * Analyze CSS usage patterns
   */
  analyzeCSSUsage() {
    if (typeof window === 'undefined') return

    // Track which selectors are actually used
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.trackElementUsage(node)
            }
          })
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Analyze existing elements
    this.trackElementUsage(document.body)
  }

  /**
   * Track CSS usage for an element
   */
  trackElementUsage(element) {
    if (!element.classList) return

    element.classList.forEach(className => {
      const selector = `.${className}`
      
      // Categorize selector
      this.categorizeSelector(selector)
    })

    // Analyze children
    element.querySelectorAll('*').forEach(child => {
      if (child.classList) {
        child.classList.forEach(className => {
          const selector = `.${className}`
          this.categorizeSelector(selector)
        })
      }
    })
  }

  /**
   * Categorize a selector based on optimization rules
   */
  categorizeSelector(selector) {
    let categorized = false

    for (const [category, rules] of this.optimizationRules) {
      if (rules.selectors.some(pattern => {
        if (pattern.includes('\\:')) {
          // Handle escaped selectors like dark\:
          return selector.includes(pattern.replace('\\:', ':'))
        }
        return selector === pattern || selector.startsWith(pattern)
      })) {
        if (category === 'critical') {
          this.criticalSelectors.add(selector)
        } else if (category === 'deferred') {
          this.deferredSelectors.add(selector)
        }
        categorized = true
        break
      }
    }

    // If not categorized, consider it potentially unused
    if (!categorized) {
      this.unusedSelectors.add(selector)
    }
  }

  /**
   * Generate optimized CSS bundles
   */
  generateOptimizedBundles() {
    return {
      critical: {
        selectors: Array.from(this.criticalSelectors),
        size: this.criticalSelectors.size,
        shouldInline: true
      },
      deferred: {
        selectors: Array.from(this.deferredSelectors),
        size: this.deferredSelectors.size,
        shouldInline: false
      },
      unused: {
        selectors: Array.from(this.unusedSelectors),
        size: this.unusedSelectors.size,
        canRemove: true
      }
    }
  }

  /**
   * Setup development tools for CSS optimization
   */
  setupDevelopmentTools() {
    // Add CSS optimization panel to dev tools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__CSS_OPTIMIZER__ = this
    }

    // Log optimization report
    setTimeout(() => {
      const report = this.generateOptimizationReport()
      console.group('🎨 CSS Optimization Report')
      console.log('Critical CSS selectors:', report.critical.count)
      console.log('Deferred CSS selectors:', report.deferred.count)
      console.log('Potentially unused selectors:', report.unused.count)
      console.log('Optimization potential:', report.optimizationPotential)
      console.groupEnd()
    }, 3000)
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport() {
    const total = this.criticalSelectors.size + this.deferredSelectors.size + this.unusedSelectors.size
    
    return {
      critical: {
        count: this.criticalSelectors.size,
        percentage: Math.round((this.criticalSelectors.size / total) * 100)
      },
      deferred: {
        count: this.deferredSelectors.size,
        percentage: Math.round((this.deferredSelectors.size / total) * 100)
      },
      unused: {
        count: this.unusedSelectors.size,
        percentage: Math.round((this.unusedSelectors.size / total) * 100)
      },
      optimizationPotential: `${Math.round(((this.deferredSelectors.size + this.unusedSelectors.size) / total) * 100)}% of CSS can be optimized`,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get CSS loading strategy for a selector
   */
  getLoadingStrategy(selector) {
    if (this.criticalSelectors.has(selector)) {
      return { strategy: 'critical', priority: 1, inline: true }
    }
    
    if (this.deferredSelectors.has(selector)) {
      return { strategy: 'deferred', priority: 2, inline: false }
    }
    
    return { strategy: 'conditional', priority: 3, inline: false }
  }

  /**
   * Preload critical CSS
   */
  preloadCriticalCSS() {
    // This would be implemented at build time
    // For now, we ensure critical styles are prioritized
    const criticalStyles = Array.from(this.criticalSelectors).join(',')
    
    if (criticalStyles && typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.setAttribute('data-critical', 'true')
      style.textContent = `/* Critical CSS selectors: ${criticalStyles} */`
      document.head.insertBefore(style, document.head.firstChild)
    }
  }

  /**
   * Load deferred CSS asynchronously
   */
  loadDeferredCSS() {
    if (typeof window === 'undefined') return

    const loadDeferred = () => {
      // Create link element for deferred styles
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/assets/css/deferred.css'
      link.media = 'print'
      link.onload = function() {
        this.media = 'all'
      }
      document.head.appendChild(link)
    }

    // Load after critical rendering path
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadDeferred, { timeout: 2000 })
    } else {
      setTimeout(loadDeferred, 100)
    }
  }
}

/**
 * CSS Performance Metrics
 */
export class CSSPerformanceMetrics {
  constructor() {
    this.metrics = {
      bundleSize: 0,
      criticalSize: 0,
      deferredSize: 0,
      unusedSize: 0,
      loadTime: 0,
      renderTime: 0
    }
  }

  /**
   * Measure CSS performance metrics
   */
  measurePerformance() {
    if (typeof window === 'undefined') return

    // Measure CSS load time
    const perfEntries = performance.getEntriesByType('resource')
    const cssEntries = perfEntries.filter(entry => 
      entry.name.includes('.css') || entry.initiatorType === 'css'
    )

    this.metrics.loadTime = cssEntries.reduce((total, entry) => 
      total + entry.duration, 0
    )

    // Measure render time
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    
    if (fcp) {
      this.metrics.renderTime = fcp.startTime
    }

    return this.metrics
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const recommendations = []

    if (this.metrics.loadTime > 100) {
      recommendations.push({
        type: 'warning',
        message: 'CSS load time is high. Consider splitting critical and non-critical styles.',
        impact: 'high'
      })
    }

    if (this.metrics.unusedSize > this.metrics.bundleSize * 0.3) {
      recommendations.push({
        type: 'error',
        message: 'High amount of unused CSS detected. Consider purging unused styles.',
        impact: 'high'
      })
    }

    if (this.metrics.criticalSize > 14000) { // 14KB threshold
      recommendations.push({
        type: 'warning',
        message: 'Critical CSS size is large. Consider reducing above-the-fold styles.',
        impact: 'medium'
      })
    }

    return recommendations
  }
}

// Global instances
export const cssOptimizer = new CSSOptimizer()
export const cssMetrics = new CSSPerformanceMetrics()

// Auto-initialize
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    cssOptimizer.init()
    cssOptimizer.preloadCriticalCSS()
    cssOptimizer.loadDeferredCSS()
    
    // Measure performance after load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = cssMetrics.measurePerformance()
        const recommendations = cssMetrics.getRecommendations()
        
        if (import.meta.env.DEV && recommendations.length > 0) {
          console.group('🚀 CSS Performance Recommendations')
          recommendations.forEach(rec => {
            console.log(`${rec.type.toUpperCase()}: ${rec.message}`)
          })
          console.groupEnd()
        }
      }, 1000)
    })
  })
}

export default {
  cssOptimizer,
  cssMetrics
}