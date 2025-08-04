import React from 'react'
import { SkeletonLoader, DashboardSkeleton, TableSkeleton, FormSkeleton } from './SkeletonLoader'

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizes[size]} ${className}`} />
  )
}

export function LoadingOverlay({ children, isLoading, skeleton = null }) {
  if (isLoading) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        {skeleton || children}
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      {children}
    </div>
  )
}

export function PageLoadingState({ type = 'dashboard' }) {
  const skeletonComponents = {
    dashboard: DashboardSkeleton,
    table: () => <TableSkeleton rows={8} />,
    form: FormSkeleton,
    card: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="modern-card p-6 space-y-4">
            <SkeletonLoader variant="title" />
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="number" />
          </div>
        ))}
      </div>
    )
  }

  const SkeletonComponent = skeletonComponents[type] || skeletonComponents.dashboard

  return (
    <div className="animate-pulse">
      <SkeletonComponent />
    </div>
  )
}

export function InlineLoadingState({ text = 'Loading...', className = '' }) {
  return (
    <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
      <LoadingSpinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

export function ButtonLoadingState({ children, isLoading, loadingText = 'Loading...' }) {
  return (
    <>
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {isLoading ? loadingText : children}
    </>
  )
}

// Enhanced loading state with staggered animations
export function StaggeredLoadingCards({ count = 4, delay = 100 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="modern-card p-6 space-y-4 animate-pulse"
          style={{
            animationDelay: `${i * delay}ms`,
            animationDuration: '1s'
          }}
        >
          <div className="flex items-center justify-between">
            <SkeletonLoader variant="title" />
            <SkeletonLoader variant="avatar" />
          </div>
          <div className="space-y-2">
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="text" className="w-2/3" />
          </div>
          <div className="pt-4">
            <SkeletonLoader variant="number" />
          </div>
        </div>
      ))}
    </div>
  )
}