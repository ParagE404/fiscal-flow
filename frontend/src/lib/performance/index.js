// Performance utilities index
export { performanceMonitor, animationUtils } from '../animationPerformance'
export { usePerformanceAwareAnimation } from '../../hooks/usePerformanceAwareAnimation'
export { PerformanceOptimizedAnimation } from '../../components/common/PerformanceOptimizedAnimation'
export { criticalCSSManager, cssAnalyzer } from './criticalCSS'
export { cssOptimizer, cssMetrics } from './cssOptimizer'

// Performance optimization initialization
export const initializePerformanceOptimizations = () => {
  if (typeof window === 'undefined') return

  // Initialize all performance modules
  import('../animationPerformance').then(({ performanceMonitor }) => {
    performanceMonitor.startMonitoring()
  })

  import('./criticalCSS').then(({ criticalCSSManager }) => {
    criticalCSSManager.init()
  })

  import('./cssOptimizer').then(({ cssOptimizer }) => {
    cssOptimizer.init()
  })
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializePerformanceOptimizations)
}