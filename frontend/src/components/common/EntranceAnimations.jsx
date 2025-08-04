import React, { useState, useEffect, useRef } from 'react'

// Hook for intersection observer animations
export function useIntersectionAnimation(options = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

// Fade in animation component
export function FadeInAnimation({ 
  children, 
  delay = 0, 
  duration = 300, 
  className = '',
  triggerOnMount = true 
}) {
  const [isVisible, setIsVisible] = useState(!triggerOnMount)

  useEffect(() => {
    if (triggerOnMount) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, triggerOnMount])

  return (
    <div
      className={`transition-all ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// Slide in from direction
export function SlideInAnimation({ 
  children, 
  direction = 'up', 
  delay = 0, 
  duration = 400,
  className = '',
  triggerOnMount = true 
}) {
  const [isVisible, setIsVisible] = useState(!triggerOnMount)

  useEffect(() => {
    if (triggerOnMount) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, triggerOnMount])

  const getTransform = () => {
    if (isVisible) return 'translate-x-0 translate-y-0'
    
    switch (direction) {
      case 'up': return 'translate-y-8'
      case 'down': return '-translate-y-8'
      case 'left': return 'translate-x-8'
      case 'right': return '-translate-x-8'
      default: return 'translate-y-8'
    }
  }

  return (
    <div
      className={`transition-all ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${getTransform()} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// Scale in animation
export function ScaleInAnimation({ 
  children, 
  delay = 0, 
  duration = 300,
  className = '',
  triggerOnMount = true 
}) {
  const [isVisible, setIsVisible] = useState(!triggerOnMount)

  useEffect(() => {
    if (triggerOnMount) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, triggerOnMount])

  return (
    <div
      className={`transition-all ease-out ${
        isVisible 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
      } ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// Staggered children animation
export function StaggeredAnimation({ 
  children, 
  staggerDelay = 100, 
  initialDelay = 0,
  className = '' 
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeInAnimation 
          key={index}
          delay={initialDelay + (index * staggerDelay)}
        >
          {child}
        </FadeInAnimation>
      ))}
    </div>
  )
}

// Intersection observer based animation
export function ScrollRevealAnimation({ 
  children, 
  animation = 'fadeUp',
  threshold = 0.1,
  className = '' 
}) {
  const [ref, isVisible] = useIntersectionAnimation({ threshold })

  const getAnimationClasses = () => {
    const base = 'transition-all duration-700 ease-out'
    
    switch (animation) {
      case 'fadeUp':
        return `${base} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
      case 'fadeDown':
        return `${base} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`
      case 'fadeLeft':
        return `${base} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`
      case 'fadeRight':
        return `${base} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`
      case 'scale':
        return `${base} ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
      case 'fade':
        return `${base} ${isVisible ? 'opacity-100' : 'opacity-0'}`
      default:
        return `${base} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`
    }
  }

  return (
    <div ref={ref} className={`${getAnimationClasses()} ${className}`}>
      {children}
    </div>
  )
}

// Number counter animation
export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  formatFn = (n) => n.toLocaleString(),
  className = '' 
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value === displayValue) return

    setIsAnimating(true)
    const startValue = displayValue
    const endValue = value
    const startTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOut

      setDisplayValue(Math.round(currentValue))

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, displayValue])

  return (
    <span className={`${isAnimating ? 'text-primary-blue' : ''} transition-colors duration-300 ${className}`}>
      {formatFn(displayValue)}
    </span>
  )
}

// Card entrance animation with hover effects
export function AnimatedCard({ 
  children, 
  delay = 0, 
  className = '',
  hoverScale = true 
}) {
  return (
    <FadeInAnimation delay={delay}>
      <div 
        className={`modern-card transition-all duration-300 ease-out ${
          hoverScale ? 'hover:scale-105' : ''
        } ${className}`}
      >
        {children}
      </div>
    </FadeInAnimation>
  )
}