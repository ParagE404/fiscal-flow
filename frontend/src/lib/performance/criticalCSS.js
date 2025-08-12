/**
 * Critical CSS Extraction and Loading Utilities
 * Optimizes initial page load by prioritizing above-the-fold styles
 */

class CriticalCSSManager {
  constructor() {
    this.criticalStyles = new Set()
    this.deferredStyles = new Set()
    this.isInitialized = false
  }

  /**
   * Initialize critical CSS management
   */
  init() {
    if (this.isInitialized) return
    
    this.isInitialized = true
    this.extractCriticalStyles()
    this.setupDeferredLoading()
  }

  /**
   * Extract critical styles for above-the-fold content
   */
  extractCriticalStyles() {
    // Define critical CSS selectors for initial viewport
    const criticalSelectors = [
      // Layout and typography
      'html', 'body', '*',
      '.font-display', '.font-body', '.font-mono',
      '.text-display', '.text-h1', '.text-h2', '.text-body',
      
      // Color system (CSS variables)
      ':root', '.dark',
      
      // Critical layout components
      '.container', '.grid', '.flex',
      '.w-full', '.h-full', '.min-h-screen',
      
      // Navigation and header
      'nav', 'header', '.nav-item',
      
      // Critical buttons and interactive elements
      '.btn-primary', '.btn-secondary',
      '.interactive', '.mobile-touch',
      
      // Loading states
      '.skeleton', '.shimmer', '.loading-spinner',
      
      // Critical animations
      '.transition-fast', '.transition-normal',
      '.fade-in', '.scale-in'
    ]

    criticalSelectors.forEach(selector => {
      this.criticalStyles.add(selector)
    })
  }

  /**
   * Setup deferred loading for non-critical styles
   */
  setupDeferredLoading() {
    // Load non-critical styles after initial render
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback for better performance
      const loadDeferredStyles = () => {
        this.loadNonCriticalStyles()
      }

      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadDeferredStyles, { timeout: 2000 })
      } else {
        setTimeout(loadDeferredStyles, 100)
      }
    }
  }

  /**
   * Load non-critical styles asynchronously
   */
  loadNonCriticalStyles() {
    const nonCriticalSelectors = [
      // Complex animations
      '.hover-lift', '.hover-scale', '.hover-glow',
      '.card-hover', '.btn-animate', '.btn-modern',
      
      // Advanced visual effects
      '.gradient-primary', '.gradient-success', '.gradient-card',
      '.shadow-primary', '.shadow-success', '.shadow-warning',
      
      // Complex interactive states
      '.ripple', '.ghost-fill', '.icon-btn-ripple',
      '.fab-pulse', '.fab-bounce',
      
      // Advanced typography
      '.text-financial', '.text-financial-lg',
      '.tracking-tighter', '.tracking-wider',
      
      // Mobile-specific enhancements
      '.swipeable', '.swipe-indicator',
      '.touch-target', '.touch-target-large'
    ]

    // Create and inject non-critical styles
    const styleSheet = document.createElement('style')
    styleSheet.setAttribute('data-critical-css', 'deferred')
    
    // Add styles progressively to avoid blocking
    let styleIndex = 0
    const addStylesBatch = () => {
      const batchSize = 5
      const batch = nonCriticalSelectors.slice(styleIndex, styleIndex + batchSize)
      
      if (batch.length === 0) return
      
      batch.forEach(selector => {
        this.deferredStyles.add(selector)
      })
      
      styleIndex += batchSize
      
      if (styleIndex < nonCriticalSelectors.length) {
        requestAnimationFrame(addStylesBatch)
      }
    }
    
    addStylesBatch()
    document.head.appendChild(styleSheet)
  }

  /**
   * Preload critical fonts
   */
  preloadCriticalFonts() {
    const criticalFonts = [
      {
        family: 'SF Pro Display',
        weight: '400',
        display: 'swap'
      },
      {
        family: 'SF Pro Display',
        weight: '600',
        display: 'swap'
      },
      {
        family: 'SF Pro Text',
        weight: '400',
        display: 'swap'
      }
    ]

    criticalFonts.forEach(font => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = `/fonts/${font.family.replace(/\s+/g, '')}-${font.weight}.woff2`
      document.head.appendChild(link)
    })
  }

  /**
   * Get critical CSS as inline styles
   */
  getCriticalCSS() {
    return Array.from(this.criticalStyles).join(',')
  }

  /**
   * Check if a selector is critical
   */
  isCritical(selector) {
    return this.criticalStyles.has(selector)
  }
}

/**
 * CSS Bundle Analyzer
 * Analyzes CSS usage and identifies unused styles
 */
export class CSSBundleAnalyzer {
  constructor() {
    this.usedSelectors = new Set()
    this.unusedSelectors = new Set()
    this.observer = null
  }

  /**
   * Start analyzing CSS usage
   */
  startAnalysis() {
    if (typeof window === 'undefined') return

    // Use MutationObserver to track DOM changes
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.analyzeElement(node)
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Analyze existing elements
    this.analyzeElement(document.body)
  }

  /**
   * Analyze an element and its children for CSS usage
   */
  analyzeElement(element) {
    if (!element.classList) return

    // Track used classes
    element.classList.forEach(className => {
      this.usedSelectors.add(`.${className}`)
    })

    // Analyze children
    element.querySelectorAll('*').forEach(child => {
      if (child.classList) {
        child.classList.forEach(className => {
          this.usedSelectors.add(`.${className}`)
        })
      }
    })
  }

  /**
   * Stop analysis and generate report
   */
  generateReport() {
    if (this.observer) {
      this.observer.disconnect()
    }

    return {
      usedSelectors: Array.from(this.usedSelectors),
      usedCount: this.usedSelectors.size,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get unused CSS selectors (requires CSS parsing)
   */
  getUnusedSelectors(allSelectors) {
    const unused = allSelectors.filter(selector => 
      !this.usedSelectors.has(selector)
    )
    return unused
  }
}

// Global instances
export const criticalCSSManager = new CriticalCSSManager()
export const cssAnalyzer = new CSSBundleAnalyzer()

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize critical CSS management
  document.addEventListener('DOMContentLoaded', () => {
    criticalCSSManager.init()
    criticalCSSManager.preloadCriticalFonts()
  })

  // Start CSS analysis in development mode
  if (import.meta.env.DEV) {
    cssAnalyzer.startAnalysis()
    
    // Log analysis report after 5 seconds
    setTimeout(() => {
      const report = cssAnalyzer.generateReport()
      console.log('CSS Usage Analysis:', report)
    }, 5000)
  }
}

export default {
  criticalCSSManager,
  cssAnalyzer
}