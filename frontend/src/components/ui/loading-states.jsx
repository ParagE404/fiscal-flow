import React from 'react'
import { cn } from '@/lib/utils'
import { LoadingSpinner, ProgressIndicator, LoadingSteps } from './loading-spinner'
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart, SkeletonDashboard } from './skeleton'

// Page-level loading component
export const PageLoading = ({ 
  title = "Loading...",
  description,
  progress,
  steps,
  currentStep,
  className,
  ...props 
}) => {
  return (
    <div className={cn("min-h-[400px] flex items-center justify-center p-8", className)} {...props}>
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-4">
          <LoadingSpinner size="xl" variant="gradient" />
          <div className="space-y-2">
            <h2 className="text-h3 font-semibold">{title}</h2>
            {description && (
              <p className="text-body text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {progress !== undefined && (
          <ProgressIndicator progress={progress} />
        )}

        {steps && steps.length > 0 && (
          <LoadingSteps steps={steps} currentStep={currentStep || 0} />
        )}
      </div>
    </div>
  )
}

// Content loading with skeleton matching final layout
export const ContentLoading = ({ 
  type = "cards",
  count = 4,
  className,
  ...props 
}) => {
  const renderSkeletons = () => {
    switch (type) {
      case "dashboard":
        return <SkeletonDashboard />
      
      case "cards":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )
      
      case "table":
        return <SkeletonTable rows={count} />
      
      case "chart":
        return <SkeletonChart />
      
      case "list":
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-xl">
                <Skeleton variant="avatar" className="h-12 w-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="title" className="w-1/3" />
                  <Skeleton variant="text" className="w-2/3" />
                </div>
                <Skeleton variant="button" className="w-20" />
              </div>
            ))}
          </div>
        )
      
      default:
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )
    }
  }

  return (
    <div className={cn("animate-fade-in", className)} {...props}>
      {renderSkeletons()}
    </div>
  )
}

// Inline loading for smaller components
export const InlineLoading = ({ 
  text = "Loading...",
  size = "sm",
  variant = "default",
  className,
  ...props 
}) => {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)} {...props}>
      <LoadingSpinner size={size} variant={variant} />
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}

// Loading state for data fetching
export const DataLoading = ({ 
  title = "Fetching data...",
  description = "This may take a few moments",
  className,
  ...props 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)} {...props}>
      <div className="space-y-4">
        <div className="relative">
          <LoadingSpinner size="lg" variant="gradient" />
          <div className="absolute inset-0 animate-ping">
            <LoadingSpinner size="lg" variant="gradient" className="opacity-20" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-h4 font-semibold">{title}</h3>
          <p className="text-body text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Loading state for forms
export const FormLoading = ({ 
  fields = 4,
  hasSubmitButton = true,
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      
      {hasSubmitButton && (
        <div className="flex gap-3 pt-4">
          <Skeleton variant="button" className="w-24" />
          <Skeleton variant="button" className="w-20" />
        </div>
      )}
    </div>
  )
}

// Loading state for financial data
export const FinancialDataLoading = ({ 
  showChart = true,
  showSummary = true,
  showTable = true,
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="modern-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-20" />
                <Skeleton variant="avatar" className="h-8 w-8" />
              </div>
              <Skeleton variant="title" className="w-24 h-8" />
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="w-16" />
                <Skeleton className="w-12 h-4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {showChart && <SkeletonChart />}

      {showTable && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="title" className="w-32" />
            <Skeleton variant="button" className="w-24" />
          </div>
          <SkeletonTable rows={6} columns={5} />
        </div>
      )}
    </div>
  )
}

// Loading state with retry functionality
export const LoadingWithRetry = ({ 
  onRetry,
  retryText = "Retry",
  title = "Loading...",
  description,
  className,
  ...props 
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)} {...props}>
      <div className="space-y-4">
        <LoadingSpinner size="lg" />
        <div className="space-y-2">
          <h3 className="text-h4 font-semibold">{title}</h3>
          {description && (
            <p className="text-body text-muted-foreground">{description}</p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {retryText}
          </button>
        )}
      </div>
    </div>
  )
}

// Staggered loading animation for lists
export const StaggeredLoading = ({ 
  items = 6,
  delay = 100,
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in-up"
          style={{
            animationDelay: `${i * delay}ms`,
            animationFillMode: 'both'
          }}
        >
          <div className="flex items-center gap-4 p-4 border border-border rounded-xl">
            <Skeleton variant="avatar" className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="title" className="w-1/3" />
              <Skeleton variant="text" className="w-2/3" />
            </div>
            <Skeleton variant="text" className="w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading state for mobile-optimized content
export const MobileLoading = ({ 
  type = "cards",
  className,
  ...props 
}) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {type === "cards" && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="modern-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton variant="title" className="w-1/2" />
                <Skeleton variant="avatar" className="h-6 w-6" />
              </div>
              <Skeleton variant="text" className="w-full" />
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="w-1/3" />
                <Skeleton variant="button" className="w-16 h-8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === "list" && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <Skeleton variant="avatar" className="h-10 w-10" />
              <div className="flex-1 space-y-1">
                <Skeleton variant="text" className="w-2/3 h-3" />
                <Skeleton variant="text" className="w-1/2 h-3" />
              </div>
              <Skeleton variant="text" className="w-12 h-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}