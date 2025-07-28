import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getValueColor } from '@/lib/utils'

export const SummaryCard = ({ 
  title, 
  value, 
  change, 
  changeLabel = "from last month",
  loading = false,
  error = null 
}) => {
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono text-foreground">
          {typeof value === 'number' ? formatCurrency(value) : value}
        </div>
        {change !== undefined && (
          <p className={`text-xs mt-1 ${getValueColor(parseFloat(change))}`}>
            {change} {changeLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}