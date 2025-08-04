import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const fabVariants = cva(
  "fixed inline-flex items-center justify-center rounded-full font-semibold shadow-2xl transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 hover:shadow-3xl active:scale-95 z-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "gradient-primary text-white hover:shadow-primary/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        success: "gradient-success text-white hover:shadow-success/25",
        warning: "gradient-warning text-white hover:shadow-warning/25",
        error: "gradient-error text-white hover:shadow-error/25",
        purple: "gradient-purple text-white hover:shadow-purple/25",
        orange: "gradient-orange text-white hover:shadow-orange/25",
        teal: "gradient-accent text-white hover:shadow-teal/25",
        pink: "gradient-pink text-white hover:shadow-pink/25",
      },
      size: {
        default: "h-14 w-14 text-lg",
        sm: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-xl",
      },
      position: {
        "bottom-right": "bottom-6 right-6",
        "bottom-left": "bottom-6 left-6",
        "top-right": "top-6 right-6",
        "top-left": "top-6 left-6",
        "bottom-center": "bottom-6 left-1/2 transform -translate-x-1/2",
        "top-center": "top-6 left-1/2 transform -translate-x-1/2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      position: "bottom-right",
    },
  }
)

const FloatingActionButton = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  position,
  children,
  onClick,
  disabled,
  ...props 
}, ref) => {
  const [ripples, setRipples] = React.useState([])
  const buttonRef = React.useRef(null)

  // Combine refs
  React.useImperativeHandle(ref, () => buttonRef.current)

  const createRipple = React.useCallback((event) => {
    const button = buttonRef.current
    if (!button || disabled) return

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.5
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple = {
      x,
      y,
      size,
      id: Date.now() + Math.random()
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 800)
  }, [disabled])

  const handleClick = React.useCallback((event) => {
    createRipple(event)
    if (onClick) {
      onClick(event)
    }
  }, [createRipple, onClick])

  return (
    <button
      className={cn(fabVariants({ variant, size, position, className }))}
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
      {/* Circular ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/40 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animation: 'ripple 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}
        />
      ))}
    </button>
  )
})
FloatingActionButton.displayName = "FloatingActionButton"

export { FloatingActionButton, fabVariants }