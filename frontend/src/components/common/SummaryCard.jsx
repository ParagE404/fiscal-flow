import React from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getValueColor } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/StoreContext'

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
      <Card>
        <CardHeader className="pb-2">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">Error</div>
          <p className="text-xs mt-1 text-destructive">
            Failed to load data
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="text-lg sm:text-2xl font-bold font-mono text-foreground break-all">
          {typeof value === 'number' ? preferencesStore.formatCurrency(value) : value}
        </div>
        {change !== undefined && (
          <p className={`text-xs mt-1 ${getValueColor(parseFloat(change))} truncate`}>
            {typeof change === 'number' ? preferencesStore.formatPercentage(change) : change} 
            <span className="hidden sm:inline"> {changeLabel}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
})