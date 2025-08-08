import React, { memo, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InteractiveElement, AnimatedNumber } from './MicroInteractions'
import { getValueColor } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/StoreContext'
import { ShimmerSkeleton } from '@/components/ui/engaging-loader'
import { InlineError } from '@/components/ui/error-state'
import { memoizeWithTTL } from '@/lib/memoization.js'

// Memoized helper functions for performance
const getCardAccent = memoizeWithTTL((title) => {
  if (title.toLowerCase().includes('portfolio')) return 'primary-blue'
  if (title.toLowerCase().includes('invested')) return 'primary-purple'
  if (title.toLowerCase().includes('growth')) return 'primary-green'
  if (title.toLowerCase().includes('returns')) return 'accent-orange'
  return 'primary-blue'
}, 10000)

const getAccentColorClasses = memoizeWithTTL((accentColor) => {
  const colorMap = {
    'primary-blue': 'bg-gradient-to-r from-primary-blue-500 to-primary-blue-600',
    'primary-purple': 'bg-gradient-to-r from-primary-purple-500 to-primary-purple-600',
    'primary-green': 'bg-gradient-to-r from-primary-green-500 to-primary-green-600',
    'accent-orange': 'bg-gradient-to-r from-accent-orange-500 to-accent-orange-600'
  }
  return colorMap[accentColor] || colorMap['primary-blue']
}, 10000)

const getDotColorClasses = memoizeWithTTL((accentColor) => {
  const colorMap = {
    'primary-blue': 'bg-primary-blue-500',
    'primary-purple': 'bg-primary-purple-500',
    'primary-green': 'bg-primary-green-500',
    'accent-orange': 'bg-accent-orange-500'
  }
  return colorMap[accentColor] || colorMap['primary-blue']
}, 10000)

// Memoized loading component
const LoadingCard = memo(() => (
  <Card className="modern-card overflow-hidden animate-fade-in">
    <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
      <ShimmerSkeleton variant="text" className="w-32 h-4" />
    </CardHeader>
    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
      <div className="space-y-3">
        <ShimmerSkeleton variant="title" className="w-24 h-8" />
        <ShimmerSkeleton variant="text" className="w-20 h-3" />
        <div className="mt-3">
          <ShimmerSkeleton className="w-full h-1.5 rounded-full" />
        </div>
      </div>
    </CardContent>
  </Card>
))

// Memoized error component
const ErrorCard = memo(({ title }) => (
  <Card className="modern-card border-error-200/50 bg-gradient-to-br from-error-50/50 to-error-100/50 dark:from-error-900/20 dark:to-error-800/20">
    <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
      <InlineError 
        message="Failed to load data" 
        variant="error"
        className="p-3"
      />
    </CardContent>
  </Card>
))

export const SummaryCard = memo(observer(({ 
  title, 
  value, 
  change, 
  changeLabel = "from last month",
  loading = false,
  error = null 
}) => {
  const preferencesStore = usePreferencesStore()
  
  // Memoize expensive computations
  const accentColor = useMemo(() => getCardAccent(title), [title])
  const accentColorClasses = useMemo(() => getAccentColorClasses(accentColor), [accentColor])
  const dotColorClasses = useMemo(() => getDotColorClasses(accentColor), [accentColor])
  
  const changeValue = useMemo(() => parseFloat(change), [change])
  const progressWidth = useMemo(() => 
    Math.min(Math.abs(changeValue || 0) * 10, 100), [changeValue]
  )
  
  const progressBarStyle = useMemo(() => ({
    width: `${progressWidth}%`,
    boxShadow: changeValue > 0 ? '0 0 4px #10b98140' : 
               changeValue < 0 ? '0 0 4px #ef444440' : 'none'
  }), [progressWidth, changeValue])
  
  if (loading) {
    return <LoadingCard title={title} />
  }

  if (error) {
    return <ErrorCard title={title} />
  }

  return (
    <InteractiveElement effects={['hover', 'click']} className="h-full">
      <Card className="modern-card group h-full relative overflow-hidden mobile-touch">
        {/* Accent border */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${accentColorClasses}`} />
        
        <CardHeader className="pb-2 px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate group-hover:text-primary-blue-600 transition-colors duration-300 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity ${dotColorClasses}`} />
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-5 md:pb-6">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground break-words group-hover:text-primary-blue-700 transition-colors duration-300 mb-2 ">
            {typeof value === 'number' ? (
              <AnimatedNumber 
                value={value} 
                formatFn={(n) => preferencesStore.formatCurrency(n)}
                className="inline-block"
              />
            ) : value}
          </div>
          {change !== undefined && (
            <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
              <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${getValueColor(changeValue)} transition-all duration-300`}>
                {changeValue > 0 && <span className="text-primary-green-600 text-sm">↗</span>}
                {changeValue < 0 && <span className="text-error-600 text-sm">↘</span>}
                {changeValue === 0 && <span className="text-muted-foreground text-sm">→</span>}
                {typeof change === 'number' ? preferencesStore.formatPercentage(change) : change}
              </div>
              <span className="text-xs text-muted-foreground xs:hidden sm:inline">
                {changeLabel}
              </span>
            </div>
          )}
          
          {/* Performance indicator bar */}
          {change !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    changeValue > 0 ? 'bg-primary-green-500' : 
                    changeValue < 0 ? 'bg-error-500' : 'bg-gray-400'
                  }`}
                  style={progressBarStyle}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </InteractiveElement>
  )
}))

// Set display name for debugging
SummaryCard.displayName = 'SummaryCard'