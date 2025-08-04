import React from 'react'
import { cn } from '@/lib/utils'

export const LoadingSpinner = ({ 
  size = "default", 
  variant = "default",
  className,
  ...props 
}) => {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  const variants = {
    default: "animate-spin rounded-full border-2 border-current border-t-transparent",
    dots: "flex items-center gap-1",
    pulse: "animate-pulse rounded-full bg-current",
    gradient: "animate-spin rounded-full border-2 border-transparent bg-gradient-to-r from-primary to-primary-purple bg-clip-border"
  }

  if (variant === "dots") {
    return (
      <div className={cn(variants.dots, className)} {...props}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-current animate-bounce",
              sizeClasses[size]
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          variants.pulse,
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div
      className={cn(
        variants[variant] || variants.default,
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export const LoadingOverlay = ({ 
  children, 
  loading = false, 
  text = "Loading...",
  spinner = {},
  className 
}) => {
  if (!loading) {
    return children
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" {...spinner} />
          <p className="text-sm text-muted-foreground font-medium">{text}</p>
        </div>
      </div>
    </div>
  )
}

export const LoadingButton = ({ 
  children, 
  loading = false, 
  loadingText = "Loading...",
  spinner = {},
  className,
  disabled,
  ...props 
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" {...spinner} />}
      {loading ? loadingText : children}
    </button>
  )
}

export const LoadingCard = ({ 
  title = "Loading...",
  description,
  className,
  ...props 
}) => {
  return (
    <div className={cn("modern-card p-8 text-center", className)} {...props}>
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" variant="gradient" />
        <div className="space-y-2">
          <h3 className="text-h4 font-semibold">{title}</h3>
          {description && (
            <p className="text-body text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const ProgressIndicator = ({ 
  progress = 0, 
  text,
  showPercentage = true,
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="flex items-center justify-between">
        {text && <span className="text-sm font-medium">{text}</span>}
        {showPercentage && (
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-purple transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

export const LoadingSteps = ({ 
  steps = [], 
  currentStep = 0,
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
            index < currentStep 
              ? "bg-success text-white" 
              : index === currentStep 
                ? "bg-primary text-white animate-pulse" 
                : "bg-muted text-muted-foreground"
          )}>
            {index < currentStep ? "✓" : index + 1}
          </div>
          <span className={cn(
            "text-sm transition-colors duration-300",
            index <= currentStep ? "text-foreground" : "text-muted-foreground"
          )}>
            {step}
          </span>
          {index === currentStep && (
            <LoadingSpinner size="xs" className="ml-auto" />
          )}
        </div>
      ))}
    </div>
  )
}