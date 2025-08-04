import React, { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

const SwipeGesture = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  threshold = 50,
  className = "",
  disabled = false,
  showIndicator = true,
  ...props 
}) => {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isSwipeActive, setIsSwipeActive] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState(null)
  const elementRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (disabled) return
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
    setIsSwipeActive(true)
  }, [disabled])

  const handleTouchMove = useCallback((e) => {
    if (disabled || !touchStart) return
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
    
    const deltaX = touchStart.x - currentTouch.x
    const deltaY = touchStart.y - currentTouch.y
    
    // Determine swipe direction based on larger delta
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? 'left' : 'right')
    } else {
      setSwipeDirection(deltaY > 0 ? 'up' : 'down')
    }
    
    setTouchEnd(currentTouch)
  }, [disabled, touchStart])

  const handleTouchEnd = useCallback(() => {
    if (disabled || !touchStart || !touchEnd) {
      setIsSwipeActive(false)
      setSwipeDirection(null)
      return
    }

    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const isLeftSwipe = deltaX > threshold
    const isRightSwipe = deltaX < -threshold
    const isUpSwipe = deltaY > threshold
    const isDownSwipe = deltaY < -threshold

    // Execute swipe callbacks
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    } else if (isUpSwipe && onSwipeUp) {
      onSwipeUp()
    } else if (isDownSwipe && onSwipeDown) {
      onSwipeDown()
    }

    // Reset state
    setTouchStart(null)
    setTouchEnd(null)
    setIsSwipeActive(false)
    setSwipeDirection(null)
  }, [disabled, touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  return (
    <div
      ref={elementRef}
      className={cn(
        "swipeable relative",
        showIndicator && isSwipeActive && "swipe-indicator",
        showIndicator && isSwipeActive && swipeDirection && "swiping",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      {...props}
    >
      {children}
      
      {/* Swipe direction indicator */}
      {showIndicator && isSwipeActive && swipeDirection && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-primary/20 backdrop-blur-sm rounded-full p-3 animate-pulse">
            <div className="text-primary text-lg">
              {swipeDirection === 'left' && '←'}
              {swipeDirection === 'right' && '→'}
              {swipeDirection === 'up' && '↑'}
              {swipeDirection === 'down' && '↓'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Higher-order component for easy swipe integration
export const withSwipeGesture = (Component, swipeConfig = {}) => {
  return React.forwardRef((props, ref) => (
    <SwipeGesture {...swipeConfig}>
      <Component ref={ref} {...props} />
    </SwipeGesture>
  ))
}

// Specialized swipe components
export const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight, className, ...props }) => (
  <SwipeGesture
    onSwipeLeft={onSwipeLeft}
    onSwipeRight={onSwipeRight}
    className={cn("card-hover", className)}
    {...props}
  >
    {children}
  </SwipeGesture>
)

export const SwipeableList = ({ children, onSwipeLeft, onSwipeRight, className, ...props }) => (
  <SwipeGesture
    onSwipeLeft={onSwipeLeft}
    onSwipeRight={onSwipeRight}
    className={cn("list-item", className)}
    threshold={75}
    {...props}
  >
    {children}
  </SwipeGesture>
)

export default SwipeGesture