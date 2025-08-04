import { useEffect } from 'react'
import { animationUtils, performanceMonitor } from '@/lib/animationPerformance'

/**
 * React hook for performance-aware animations
 */
export const usePerformanceAwareAnimation = (options = {}) => {
  const {
    baseDuration = 300,
    enableMonitoring = true,
    onPerformanceChange
  } = options

  useEffect(() => {
    if (enableMonitoring) {
      performanceMonitor.startMonitoring()
      
      if (onPerformanceChange) {
        const unsubscribe = performanceMonitor.onPerformanceChange(onPerformanceChange)
        return unsubscribe
      }
    }

    return () => {
      if (enableMonitoring) {
        performanceMonitor.stopMonitoring()
      }
    }
  }, [enableMonitoring, onPerformanceChange])

  return {
    duration: animationUtils.getOptimalDuration(baseDuration),
    easing: animationUtils.getOptimalEasing(),
    shouldAnimate: !animationUtils.prefersReducedMotion(),
    isLowPerformance: performanceMonitor.isLowPerformanceDevice(),
    fps: performanceMonitor.getCurrentFPS()
  }
}

export default usePerformanceAwareAnimation