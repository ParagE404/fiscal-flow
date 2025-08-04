import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-md hover:shadow-lg hover:bg-secondary/90",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-md",
        outline: "border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-primary",
        destructive: "bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:bg-destructive/90",
        success: "bg-success text-success-foreground shadow-md hover:shadow-lg hover:bg-success/90",
        warning: "bg-warning text-warning-foreground shadow-md hover:shadow-lg hover:bg-warning/90",
        info: "bg-info text-info-foreground shadow-md hover:shadow-lg hover:bg-info/90",
      },
      size: {
        sm: "h-8 w-8 text-sm",
        default: "h-10 w-10 text-base",
        lg: "h-12 w-12 text-lg",
        xl: "h-14 w-14 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const IconButton = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  children,
  onClick,
  disabled,
  ...props 
}, ref) => {
  const [ripples, setRipples] = React.useState([])
  const buttonRef = React.useRef(null)

  // Combine refs
  React.useImperativeHandle(ref, () => buttonRef.current)

  const createCircularRipple = React.useCallback((event) => {
    const button = buttonRef.current
    if (!button || disabled) return

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.2
    const x = rect.width / 2 - size / 2
    const y = rect.height / 2 - size / 2

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
    }, 600)
  }, [disabled])

  const handleClick = React.useCallback((event) => {
    createCircularRipple(event)
    if (onClick) {
      onClick(event)
    }
  }, [createCircularRipple, onClick])

  return (
    <button
      className={cn(iconButtonVariants({ variant, size, className }))}
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
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animation: 'ripple 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}
        />
      ))}
    </button>
  )
})
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }