import React from 'react'
import { cn } from '@/lib/utils'

export const LoadingSpinner = ({ 
  size = "default", 
  className,
  ...props 
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
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
  className 
}) => {
  if (!loading) {
    return children
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  )
}