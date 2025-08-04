import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, DollarSign, PieChart, BarChart3, Wallet, Target } from 'lucide-react'

// Animated financial icons loader
export const FinancialLoader = ({ 
  className,
  size = "default",
  ...props 
}) => {
  const [currentIcon, setCurrentIcon] = useState(0)
  
  const icons = [
    { Icon: TrendingUp, color: "text-primary-green-500" },
    { Icon: DollarSign, color: "text-primary-blue-500" },
    { Icon: PieChart, color: "text-primary-purple-500" },
    { Icon: BarChart3, color: "text-accent-orange-500" },
    { Icon: Wallet, color: "text-accent-teal-500" },
    { Icon: Target, color: "text-accent-pink-500" }
  ]

  const sizes = {
    sm: "w-6 h-6",
    default: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length)
    }, 800)

    return () => clearInterval(interval)
  }, [icons.length])

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <div className="relative">
        {icons.map((item, index) => {
          const { Icon, color } = item
          const isActive = index === currentIcon
          
          return (
            <div
              key={index}
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-all duration-500",
                isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
              )}
            >
              <Icon className={cn(sizes[size], color, isActive && "animate-bounce")} />
            </div>
          )
        })}
        <div className={cn("opacity-0", sizes[size])} />
      </div>
    </div>
  )
}

// Pulsing dots loader
export const PulsingDots = ({ 
  className,
  count = 3,
  size = "default",
  color = "primary",
  ...props 
}) => {
  const sizes = {
    sm: "w-2 h-2",
    default: "w-3 h-3",
    lg: "w-4 h-4"
  }

  const colors = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive"
  }

  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full animate-pulse",
            sizes[size],
            colors[color]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )
}

// Wave loader
export const WaveLoader = ({ 
  className,
  bars = 5,
  color = "primary",
  ...props 
}) => {
  const colors = {
    primary: "bg-primary",
    success: "bg-success", 
    warning: "bg-warning",
    error: "bg-destructive"
  }

  return (
    <div className={cn("flex items-end gap-1", className)} {...props}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full animate-pulse",
            colors[color]
          )}
          style={{
            height: `${Math.random() * 20 + 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  )
}

// Rotating segments loader
export const SegmentLoader = ({ 
  className,
  size = "default",
  segments = 8,
  ...props 
}) => {
  const sizes = {
    sm: "w-6 h-6",
    default: "w-8 h-8",
    lg: "w-12 h-12"
  }

  return (
    <div className={cn("relative", sizes[size], className)} {...props}>
      <div className="absolute inset-0 animate-spin">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 bg-primary rounded-full"
            style={{
              height: '30%',
              left: '50%',
              top: '10%',
              transformOrigin: '50% 250%',
              transform: `translateX(-50%) rotate(${i * (360 / segments)}deg)`,
              opacity: 1 - (i / segments) * 0.8
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Morphing shapes loader
export const MorphingLoader = ({ 
  className,
  size = "default",
  ...props 
}) => {
  const sizes = {
    sm: "w-6 h-6",
    default: "w-8 h-8",
    lg: "w-12 h-12"
  }

  return (
    <div className={cn("relative", sizes[size], className)} {...props}>
      <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
      <div className="absolute inset-0 bg-primary rounded-full animate-pulse" />
      <div 
        className="absolute inset-2 bg-primary-foreground rounded-full animate-bounce"
        style={{ animationDelay: '0.5s' }}
      />
    </div>
  )
}

// Text typing loader
export const TypingLoader = ({ 
  texts = ["Loading...", "Please wait...", "Almost there..."],
  className,
  speed = 100,
  ...props 
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const text = texts[currentTextIndex]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < text.length) {
          setCurrentText(text.slice(0, currentText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 1000)
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setCurrentTextIndex((prev) => (prev + 1) % texts.length)
        }
      }
    }, isDeleting ? speed / 2 : speed)

    return () => clearTimeout(timeout)
  }, [currentText, currentTextIndex, isDeleting, texts, speed])

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <span className="text-sm font-medium">{currentText}</span>
      <div className="w-0.5 h-4 bg-primary animate-pulse" />
    </div>
  )
}

// Progress circle with percentage
export const ProgressCircle = ({ 
  progress = 0,
  size = 60,
  strokeWidth = 4,
  className,
  showPercentage = true,
  color = "primary",
  ...props 
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const colors = {
    primary: "stroke-primary",
    success: "stroke-success",
    warning: "stroke-warning",
    error: "stroke-destructive"
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} {...props}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted opacity-20"
        />
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
          className={cn("transition-all duration-1000 ease-out", colors[color])}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

// Skeleton with shimmer effect
export const ShimmerSkeleton = ({ 
  className,
  variant = "default",
  ...props 
}) => {
  const variants = {
    default: "h-4 w-full",
    text: "h-4 w-3/4",
    title: "h-6 w-1/2",
    avatar: "h-10 w-10 rounded-full",
    card: "h-32 w-full",
    button: "h-10 w-24"
  }

  return (
    <div 
      className={cn(
        "shimmer rounded-md",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

// Loading card with animated content
export const AnimatedLoadingCard = ({ 
  title = "Loading...",
  description,
  icon: IconComponent,
  progress,
  className,
  ...props 
}) => {
  return (
    <div className={cn("modern-card p-8 text-center space-y-6", className)} {...props}>
      <div className="space-y-4">
        {IconComponent ? (
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <IconComponent className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
        ) : (
          <FinancialLoader size="lg" />
        )}
        
        <div className="space-y-2">
          <h3 className="text-h4 font-semibold">{title}</h3>
          {description && (
            <p className="text-body text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {progress !== undefined && (
        <div className="space-y-2">
          <ProgressCircle progress={progress} size={80} />
        </div>
      )}

      <div className="flex justify-center">
        <PulsingDots count={3} />
      </div>
    </div>
  )
}

// Full screen engaging loader
export const FullScreenLoader = ({ 
  title = "Loading your financial data...",
  subtitle = "This may take a few moments",
  progress,
  steps,
  currentStep,
  className,
  ...props 
}) => {
  return (
    <div className={cn(
      "fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )} {...props}>
      <div className="max-w-md w-full mx-4 text-center space-y-8">
        <div className="space-y-6">
          <FinancialLoader size="xl" />
          
          <div className="space-y-3">
            <h2 className="text-h2 font-semibold">{title}</h2>
            <p className="text-body text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {progress !== undefined && (
          <div className="space-y-3">
            <ProgressCircle progress={progress} size={100} />
          </div>
        )}

        {steps && steps.length > 0 && (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 text-left">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                  index < (currentStep || 0) 
                    ? "bg-success text-white" 
                    : index === (currentStep || 0)
                      ? "bg-primary text-white animate-pulse"
                      : "bg-muted text-muted-foreground"
                )}>
                  {index < (currentStep || 0) ? "✓" : index + 1}
                </div>
                <span className={cn(
                  "text-sm transition-colors duration-300",
                  index <= (currentStep || 0) ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step}
                </span>
                {index === (currentStep || 0) && (
                  <PulsingDots size="sm" count={3} className="ml-auto" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <TypingLoader 
            texts={[
              "Fetching your portfolio...",
              "Calculating returns...",
              "Preparing dashboard...",
              "Almost ready..."
            ]}
          />
        </div>
      </div>
    </div>
  )
}