import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, variant = "default", ...props }) {
  const variants = {
    default: "animate-pulse rounded-md bg-muted",
    shimmer: "shimmer rounded-md bg-muted",
    pulse: "pulse-slow rounded-md bg-muted",
    text: "animate-pulse rounded bg-muted h-4",
    title: "animate-pulse rounded bg-muted h-6",
    avatar: "animate-pulse rounded-full bg-muted",
    card: "animate-pulse rounded-xl bg-muted",
    button: "animate-pulse rounded-xl bg-muted h-10"
  }

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  )
}

// Enhanced Skeleton Components
export const SkeletonText = ({ lines = 1, className, ...props }) => {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export const SkeletonCard = ({ className, ...props }) => {
  return (
    <div className={cn("modern-card p-6 space-y-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <Skeleton variant="title" className="w-1/3" />
        <Skeleton variant="avatar" className="h-8 w-8" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between pt-2">
        <Skeleton variant="text" className="w-20 h-6" />
        <Skeleton variant="button" className="w-24" />
      </div>
    </div>
  )
}

export const SkeletonTable = ({ rows = 5, columns = 4, className, ...props }) => {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Table Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              variant="text" 
              className={cn(
                "h-4 flex-1",
                colIndex === 0 ? "w-1/4" : colIndex === columns - 1 ? "w-1/6" : ""
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export const SkeletonChart = ({ className, ...props }) => {
  return (
    <div className={cn("modern-card p-6", className)} {...props}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="title" className="w-1/3" />
          <Skeleton variant="text" className="w-20" />
        </div>
        <Skeleton variant="card" className="h-64 w-full" />
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton variant="text" className="w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const SkeletonDashboard = ({ className, ...props }) => {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="title" className="w-1/3 h-8" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      {/* Chart */}
      <SkeletonChart />
      
      {/* Table */}
      <div className="modern-card p-6">
        <Skeleton variant="title" className="w-1/4 mb-4" />
        <SkeletonTable rows={6} columns={5} />
      </div>
    </div>
  )
}

export { Skeleton }