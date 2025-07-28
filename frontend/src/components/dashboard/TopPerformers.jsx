import React from 'react'
import { observer } from 'mobx-react-lite'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'

export const TopPerformers = observer(({ topPerformers, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div>
                <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!topPerformers || topPerformers.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-center">
          No investments found. Add some investments to see top performers.
        </p>
      </div>
    )
  }

  const getPerformanceIcon = (returnsPercentage) => {
    if (returnsPercentage > 0) {
      return <TrendingUp className="w-4 h-4 text-success-600" />
    } else if (returnsPercentage < 0) {
      return <TrendingDown className="w-4 h-4 text-destructive-600" />
    } else {
      return <Minus className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getPerformanceBadge = (type) => {
    const badges = {
      'Mutual Fund': 'bg-blue-100 text-blue-800',
      'Stock': 'bg-green-100 text-green-800',
      'Fixed Deposit': 'bg-orange-100 text-orange-800',
      'EPF': 'bg-purple-100 text-purple-800',
    }
    
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-4">
      {topPerformers.map((performer, index) => (
        <div 
          key={index} 
          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              {getPerformanceIcon(performer.returnsPercentage)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">
                  {performer.name}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPerformanceBadge(performer.type)}`}>
                  {performer.type}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {performer.category}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getValueColor(performer.returns)}`}>
              {formatCurrency(performer.returns)}
            </div>
            <div className={`text-xs font-medium ${getValueColor(performer.returns)}`}>
              {formatPercentage(performer.returnsPercentage, true)}
            </div>
          </div>
        </div>
      ))}
      
      {topPerformers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No performance data available yet.</p>
          <p className="text-xs mt-1">Add investments to see top performers.</p>
        </div>
      )}
    </div>
  )
})