import React from 'react'

export function SkeletonLoader({ className = '', variant = 'default' }) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'
  
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    card: 'h-32 w-full',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24',
    number: 'h-8 w-20'
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  )
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`modern-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <SkeletonLoader variant="title" />
        <SkeletonLoader variant="avatar" />
      </div>
      <div className="space-y-2">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" className="w-1/2" />
      </div>
      <div className="flex items-center justify-between pt-4">
        <SkeletonLoader variant="number" />
        <SkeletonLoader variant="button" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonLoader variant="title" className="w-1/3" />
        <SkeletonLoader variant="text" className="w-1/2" />
      </div>
      
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Chart skeleton */}
      <div className="modern-card p-6">
        <SkeletonLoader variant="title" className="mb-4" />
        <SkeletonLoader variant="card" className="h-64" />
      </div>
      
      {/* Table skeleton */}
      <div className="modern-card p-6">
        <SkeletonLoader variant="title" className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SkeletonLoader variant="avatar" />
                <div className="space-y-1">
                  <SkeletonLoader variant="text" className="w-32" />
                  <SkeletonLoader variant="text" className="w-20" />
                </div>
              </div>
              <SkeletonLoader variant="number" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <SkeletonLoader variant="avatar" />
            <div className="space-y-2">
              <SkeletonLoader variant="text" className="w-32" />
              <SkeletonLoader variant="text" className="w-20" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <SkeletonLoader variant="number" />
            <SkeletonLoader variant="text" className="w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SkeletonLoader variant="text" className="w-24" />
        <SkeletonLoader className="h-10" />
      </div>
      <div className="space-y-4">
        <SkeletonLoader variant="text" className="w-32" />
        <SkeletonLoader className="h-10" />
      </div>
      <div className="space-y-4">
        <SkeletonLoader variant="text" className="w-28" />
        <SkeletonLoader className="h-24" />
      </div>
      <div className="flex space-x-3">
        <SkeletonLoader variant="button" />
        <SkeletonLoader variant="button" />
      </div>
    </div>
  )
}