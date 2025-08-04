import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 mobile-touch relative overflow-hidden transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        default:
          "gradient-primary text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        destructive:
          "gradient-error text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        outline:
          "border-2 border-primary bg-transparent text-primary rounded-xl shadow-sm hover:bg-primary hover:text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200 ease-out ripple",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm ripple",
        ghost: "text-primary rounded-xl hover:bg-primary hover:text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:bg-primary/90 transition-all duration-300 ease-out ripple",
        "ghost-secondary": "text-secondary-foreground rounded-xl hover:bg-secondary hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:bg-secondary/90 transition-all duration-300 ease-out ripple",
        tertiary: "text-muted-foreground border border-border rounded-xl hover:text-foreground hover:border-primary hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out ripple",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
        success:
          "gradient-success text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        warning:
          "gradient-warning text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        purple:
          "gradient-purple text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        orange:
          "gradient-orange text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        teal:
          "gradient-accent text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
        pink:
          "gradient-pink text-white shadow-lg rounded-xl hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ripple",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm touch-target",
        sm: "h-10 px-4 py-2 text-xs rounded-lg touch-target",
        lg: "h-14 px-8 py-4 text-base rounded-2xl touch-target-large",
        icon: "h-12 w-12 rounded-xl touch-target",
        "icon-sm": "h-10 w-10 rounded-lg touch-target",
        "icon-lg": "h-14 w-14 rounded-2xl touch-target-large",
        mobile: "h-12 px-4 py-3 text-sm touch-target sm:h-11 sm:px-6",
        "mobile-lg": "h-14 px-6 py-4 text-base touch-target-large sm:h-13 sm:px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  asChild = false, 
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
    const size = Math.max(rect.width, rect.height)
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
    }, 600)
  }, [disabled])

  const handleClick = React.useCallback((event) => {
    createRipple(event)
    if (onClick) {
      onClick(event)
    }
  }, [createRipple, onClick])

  const Comp = asChild ? Slot : "button"
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '600ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            animationFillMode: 'forwards'
          }}
        />
      ))}
    </Comp>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }