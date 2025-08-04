import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ 
  className, 
  value = 0, 
  variant = "default",
  size = "default",
  showValue = false,
  animated = false,
  ...props 
}, ref) => {
  const variants = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning", 
    error: "bg-destructive",
    gradient: "bg-gradient-to-r from-primary to-primary-purple"
  }

  const sizes = {
    sm: "h-1",
    default: "h-2",
    lg: "h-3"
  }

  return (
    <div className="w-full space-y-2">
      {showValue && (
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">{Math.round(value)}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-full bg-muted",
          sizes[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all duration-500 ease-out",
            variants[variant],
            animated && "animate-pulse"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

// Circular Progress Component
const CircularProgress = React.forwardRef(({ 
  className,
  value = 0,
  size = 40,
  strokeWidth = 4,
  variant = "default",
  showValue = false,
  ...props 
}, ref) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (value / 100) * circumference

  const variants = {
    default: "stroke-primary",
    success: "stroke-success",
    warning: "stroke-warning",
    error: "stroke-destructive"
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} {...props}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-500 ease-out", variants[variant])}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold">{Math.round(value)}%</span>
        </div>
      )}
    </div>
  )
})
CircularProgress.displayName = "CircularProgress"

// Step Progress Component
const StepProgress = React.forwardRef(({ 
  className,
  steps = [],
  currentStep = 0,
  variant = "default",
  ...props 
}, ref) => {
  const variants = {
    default: {
      completed: "bg-primary text-primary-foreground",
      current: "bg-primary text-primary-foreground animate-pulse",
      pending: "bg-muted text-muted-foreground"
    },
    success: {
      completed: "bg-success text-white",
      current: "bg-success text-white animate-pulse", 
      pending: "bg-muted text-muted-foreground"
    }
  }

  const config = variants[variant] || variants.default

  return (
    <div ref={ref} className={cn("flex items-center", className)} {...props}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
              index < currentStep ? config.completed :
              index === currentStep ? config.current :
              config.pending
            )}>
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span className={cn(
              "mt-2 text-xs text-center max-w-[80px] transition-colors duration-300",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 mx-4 transition-colors duration-300",
              index < currentStep ? "bg-primary" : "bg-muted"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
})
StepProgress.displayName = "StepProgress"

// Multi-step Progress with descriptions
const MultiStepProgress = React.forwardRef(({ 
  className,
  steps = [],
  currentStep = 0,
  variant = "default",
  orientation = "horizontal",
  ...props 
}, ref) => {
  const variants = {
    default: {
      completed: "border-primary bg-primary text-primary-foreground",
      current: "border-primary bg-primary text-primary-foreground",
      pending: "border-muted-foreground/30 bg-background text-muted-foreground"
    }
  }

  const config = variants[variant] || variants.default

  if (orientation === "vertical") {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300 flex-shrink-0",
              index < currentStep ? config.completed :
              index === currentStep ? config.current :
              config.pending
            )}>
              {index < currentStep ? "✓" : index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium transition-colors duration-300",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              {step.description && (
                <p className={cn(
                  "text-sm mt-1 transition-colors duration-300",
                  index <= currentStep ? "text-muted-foreground" : "text-muted-foreground/60"
                )}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center text-center">
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-300",
                index < currentStep ? config.completed :
                index === currentStep ? config.current :
                config.pending
              )}>
                {index < currentStep ? "✓" : index + 1}
              </div>
              <div className="mt-2 max-w-[100px]">
                <h4 className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </h4>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 transition-colors duration-300",
                index < currentStep ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
      {steps[currentStep]?.description && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>
      )}
    </div>
  )
})
MultiStepProgress.displayName = "MultiStepProgress"

export { Progress, CircularProgress, StepProgress, MultiStepProgress }