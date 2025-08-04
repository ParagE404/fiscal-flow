import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function PageTransition({ children }) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('fadeIn')

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut')
    }
  }, [location, displayLocation])

  return (
    <div
      className={`page-transition ${transitionStage}`}
      onAnimationEnd={() => {
        if (transitionStage === 'fadeOut') {
          setDisplayLocation(location)
          setTransitionStage('fadeIn')
        }
      }}
    >
      {children}
    </div>
  )
}

// Alternative implementation with more control
export function AnimatedPageTransition({ children, className = '' }) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 150)

    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
      } ${className}`}
    >
      {children}
    </div>
  )
}

// Slide transition variant
export function SlidePageTransition({ children, direction = 'right' }) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [location.pathname])

  const slideClass = direction === 'right' 
    ? (isVisible ? 'translate-x-0' : 'translate-x-4')
    : (isVisible ? 'translate-x-0' : '-translate-x-4')

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? `opacity-100 ${slideClass}` 
          : `opacity-0 ${slideClass}`
      }`}
    >
      {children}
    </div>
  )
}