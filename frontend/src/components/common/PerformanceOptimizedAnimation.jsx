import React, { useRef, useEffect } from 'react'
import { animationUtils } from '@/lib/animationPerformance'
import { usePerformanceAwareAnimation } from '@/hooks/usePerformanceAwareAnimation'

/**
 * Performance-optimized animation component
 */
export const PerformanceOptimizedAnimation = ({ 
  children, 
  duration = 300, 
  easing, 
  onAnimationStart,
  onAnimationEnd,
  className = "",
  ...props 
}) => {
  const elementRef = useRef(null)
  const { 
    duration: optimizedDuration, 
    easing: optimizedEasing, 
    shouldAnimate 
  } = usePerformanceAwareAnimation({ baseDuration: duration })

  useEffect(() => {
    const element = elementRef.current
    if (!element || !shouldAnimate) return

    // Enable GPU acceleration at start
    animationUtils.enableGPUAcceleration(element)
    onAnimationStart?.()

    // Set up animation end cleanup
    const handleAnimationEnd = () => {
      animationUtils.disableGPUAcceleration(element)
      onAnimationEnd?.()
    }

    element.addEventListener('animationend', handleAnimationEnd)
    element.addEventListener('transitionend', handleAnimationEnd)

    return () => {
      element.removeEventListener('animationend', handleAnimationEnd)
      element.removeEventListener('transitionend', handleAnimationEnd)
    }
  }, [shouldAnimate, onAnimationStart, onAnimationEnd])

  const animationStyle = shouldAnimate ? {
    animationDuration: `${optimizedDuration}ms`,
    animationTimingFunction: easing || optimizedEasing,
    transitionDuration: `${optimizedDuration}ms`,
    transitionTimingFunction: easing || optimizedEasing
  } : {}

  return (
    <div
      ref={elementRef}
      className={className}
      style={animationStyle}
      {...props}
    >
      {children}
    </div>
  )
}

export default PerformanceOptimizedAnimation