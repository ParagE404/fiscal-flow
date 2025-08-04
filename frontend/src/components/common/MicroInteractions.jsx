import React, { useState, useRef, useEffect } from 'react'
import { animationUtils } from '@/lib/animationPerformance'
import { usePerformanceAwareAnimation } from '@/hooks/usePerformanceAwareAnimation'

// Performance-optimized ripple effect component
export function RippleEffect({ children, className = '', color = 'rgba(255, 255, 255, 0.3)' }) {
  const [ripples, setRipples] = useState([])
  const containerRef = useRef()
  const { shouldAnimate, duration } = usePerformanceAwareAnimation({ baseDuration: 600 })

  const createRipple = (event) => {
    if (!shouldAnimate) return
    
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation with performance-aware duration
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, duration)
  }

  useEffect(() => {
    const container = containerRef.current
    if (container && shouldAnimate) {
      animationUtils.enableGPUAcceleration(container)
      return () => animationUtils.disableGPUAcceleration(container)
    }
  }, [shouldAnimate])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseDown={createRipple}
      onTouchStart={createRipple}
    >
      {children}
      {shouldAnimate && ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full animate-ping pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
            transform: 'translateZ(0)',
            willChange: 'transform, opacity'
          }}
        />
      ))}
    </div>
  )
}

// Performance-optimized hover lift effect wrapper
export function HoverLift({ children, className = '', liftHeight = 2 }) {
  const elementRef = useRef()
  const { shouldAnimate, duration, easing } = usePerformanceAwareAnimation({ baseDuration: 200 })

  useEffect(() => {
    const element = elementRef.current
    if (element && shouldAnimate) {
      animationUtils.enableGPUAcceleration(element)
      return () => animationUtils.disableGPUAcceleration(element)
    }
  }, [shouldAnimate])

  const handleMouseEnter = (e) => {
    if (!shouldAnimate) return
    e.currentTarget.style.transform = `translateY(-${liftHeight}px) translateZ(0)`
  }

  const handleMouseLeave = (e) => {
    if (!shouldAnimate) return
    e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
  }

  return (
    <div 
      ref={elementRef}
      className={`transition-all hover:shadow-lg ${className}`}
      style={{
        transitionDuration: shouldAnimate ? `${duration}ms` : '0ms',
        transitionTimingFunction: easing,
        transform: 'translateZ(0)',
        willChange: shouldAnimate ? 'transform, box-shadow' : 'auto'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

// Scale on hover effect
export function HoverScale({ children, className = '', scale = 1.05 }) {
  return (
    <div 
      className={`transition-transform duration-200 ease-out ${className}`}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = `scale(${scale})`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {children}
    </div>
  )
}

// Click feedback effect
export function ClickFeedback({ children, className = '', feedbackScale = 0.95 }) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <div
      className={`transition-transform duration-150 ease-out ${className}`}
      style={{
        transform: isPressed ? `scale(${feedbackScale})` : 'scale(1)'
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </div>
  )
}

// Glow effect on hover
export function HoverGlow({ children, className = '', glowColor = 'rgba(59, 130, 246, 0.4)' }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`transition-all duration-300 ease-out ${className}`}
      style={{
        boxShadow: isHovered ? `0 0 20px ${glowColor}` : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}

// Wiggle animation trigger
export function WiggleOnHover({ children, className = '' }) {
  const [shouldWiggle, setShouldWiggle] = useState(false)

  const triggerWiggle = () => {
    setShouldWiggle(true)
    setTimeout(() => setShouldWiggle(false), 2000)
  }

  return (
    <div
      className={`${shouldWiggle ? 'wiggle' : ''} ${className}`}
      onMouseEnter={triggerWiggle}
    >
      {children}
    </div>
  )
}

// Bounce in animation
export function BounceIn({ children, className = '', delay = 0 }) {
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldAnimate(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div className={`${shouldAnimate ? 'bounce-in' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  )
}

// Heartbeat animation for important elements
export function Heartbeat({ children, className = '', active = false }) {
  return (
    <div className={`${active ? 'heartbeat' : ''} ${className}`}>
      {children}
    </div>
  )
}

// Performance-optimized number counter animation
export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  formatFn = (n) => n.toLocaleString(),
  className = '' 
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const { shouldAnimate, duration: optimizedDuration } = usePerformanceAwareAnimation({ baseDuration: duration })

  useEffect(() => {
    if (value === displayValue || !shouldAnimate) {
      setDisplayValue(value)
      return
    }

    setIsAnimating(true)
    const startValue = displayValue
    const endValue = value
    const startTime = Date.now()
    const animationDuration = optimizedDuration

    const animate = animationUtils.throttleAnimationFrame(() => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOut

      setDisplayValue(Math.round(currentValue))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    })

    requestAnimationFrame(animate)
  }, [value, optimizedDuration, displayValue, shouldAnimate])

  return (
    <span className={`${isAnimating ? 'text-primary-blue' : ''} transition-colors ${className}`}
          style={{ 
            transitionDuration: shouldAnimate ? '300ms' : '0ms',
            transform: 'translateZ(0)'
          }}>
      {formatFn(displayValue)}
    </span>
  )
}

// Combined interactive wrapper with multiple effects
export function InteractiveElement({ 
  children, 
  className = '',
  effects = ['hover', 'click', 'ripple'],
  rippleColor = 'rgba(255, 255, 255, 0.3)'
}) {
  const hasHover = effects.includes('hover')
  const hasClick = effects.includes('click')
  const hasRipple = effects.includes('ripple')
  const hasGlow = effects.includes('glow')

  let component = children

  if (hasClick) {
    component = (
      <ClickFeedback className={className}>
        {component}
      </ClickFeedback>
    )
  }

  if (hasHover) {
    component = (
      <HoverLift className={hasClick ? '' : className}>
        {component}
      </HoverLift>
    )
  }

  if (hasGlow) {
    component = (
      <HoverGlow className={hasHover || hasClick ? '' : className}>
        {component}
      </HoverGlow>
    )
  }

  if (hasRipple) {
    component = (
      <RippleEffect 
        className={hasHover || hasClick || hasGlow ? '' : className}
        color={rippleColor}
      >
        {component}
      </RippleEffect>
    )
  }

  return component
}