import React from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InteractiveElement, AnimatedNumber } from './MicroInteractions'
import { getValueColor } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/StoreContext'
import { ShimmerSkeleton } from '@/components/ui/engaging-loader'
import { InlineError } from '@/components/ui/error-state'

export const SummaryCard = observer(({ 
  title, 
  value, 
  change, 
  changeLabel = "from last month",
  loading = false,
  error = null 
}) => {
  const preferencesStore = usePreferencesStore()
  
  if (loading) {
    return (
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
    )
  }

  if (error) {
    return (
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
    )
  }

  // Get card accent color based on title
  const getCardAccent = (title) => {
    if (title.toLowerCase().includes('portfolio')) return 'primary-blue'
    if (title.toLowerCase().includes('invested')) return 'primary-purple'
    if (title.toLowerCase().includes('growth')) return 'primary-green'
    if (title.toLowerCase().includes('returns')) return 'accent-orange'
    return 'primary-blue'
  }

  const accentColor = getCardAccent(title)

  return (
    <InteractiveElement effects={['hover', 'click']} className="h-full">
      <Card className="modern-card group h-full relative overflow-hidden mobile-touch">
        {/* Accent border */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1 ${
            accentColor === 'primary-blue' ? 'bg-gradient-to-r from-primary-blue-500 to-primary-blue-600' :
            accentColor === 'primary-purple' ? 'bg-gradient-to-r from-primary-purple-500 to-primary-purple-600' :
            accentColor === 'primary-green' ? 'bg-gradient-to-r from-primary-green-500 to-primary-green-600' :
            accentColor === 'accent-orange' ? 'bg-gradient-to-r from-accent-orange-500 to-accent-orange-600' :
            'bg-gradient-to-r from-primary-blue-500 to-primary-blue-600'
          }`}
        />
        
        <CardHeader className="pb-2 px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate group-hover:text-primary-blue-600 transition-colors duration-300 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity ${
              accentColor === 'primary-blue' ? 'bg-primary-blue-500' :
              accentColor === 'primary-purple' ? 'bg-primary-purple-500' :
              accentColor === 'primary-green' ? 'bg-primary-green-500' :
              accentColor === 'accent-orange' ? 'bg-accent-orange-500' :
              'bg-primary-blue-500'
            }`} />
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
              <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${getValueColor(parseFloat(change))} transition-all duration-300`}>
                {parseFloat(change) > 0 && <span className="text-primary-green-600 text-sm">↗</span>}
                {parseFloat(change) < 0 && <span className="text-error-600 text-sm">↘</span>}
                {parseFloat(change) === 0 && <span className="text-muted-foreground text-sm">→</span>}
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
                    parseFloat(change) > 0 ? 'bg-primary-green-500' : 
                    parseFloat(change) < 0 ? 'bg-error-500' : 'bg-gray-400'
                  }`}
                  style={{ 
                    width: `${Math.min(Math.abs(parseFloat(change) || 0) * 10, 100)}%`,
                    boxShadow: parseFloat(change) > 0 ? '0 0 4px #10b98140' : 
                               parseFloat(change) < 0 ? '0 0 4px #ef444440' : 'none'
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </InteractiveElement>
  )
})