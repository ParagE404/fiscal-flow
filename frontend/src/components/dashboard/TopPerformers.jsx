import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { TrendingUp, TrendingDown, Minus, Award, Star } from 'lucide-react'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'

// Animated Progress Bar Component
const AnimatedProgressBar = ({ percentage, color, delay = 0 }) => {
  const [width, setWidth] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.min(Math.abs(percentage), 100))
    }, delay)
    return () => clearTimeout(timer)
  }, [percentage, delay])
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ 
          width: `${width}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}40`
        }}
      />
    </div>
  )
}

// Performance Badge Component
const PerformanceBadge = ({ rank, type }) => {
  const getBadgeStyle = (rank) => {
    switch(rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg'
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white shadow-md'
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-md'
      default:
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
    }
  }
  
  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Award className="w-3 h-3" />
      case 2:
      case 3:
        return <Star className="w-3 h-3" />
      default:
        return null
    }
  }
  
  return (
    <div className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getBadgeStyle(rank)}`}>
      {getRankIcon(rank)}
      #{rank}
    </div>
  )
}

export const TopPerformers = observer(({ topPerformers, loading }) => {
  const [animationComplete, setAnimationComplete] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 300)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="financial-data-card p-4">
            <div className="flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full shimmer"></div>
                <div>
                  <div className="h-4 bg-muted rounded w-24 mb-2 shimmer"></div>
                  <div className="h-3 bg-muted rounded w-16 shimmer"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-muted rounded w-16 mb-2 shimmer"></div>
                <div className="h-3 bg-muted rounded w-12 shimmer"></div>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-muted rounded-full shimmer"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!topPerformers || topPerformers.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <div className="text-6xl mb-4 opacity-50">🏆</div>
        <div className="text-lg font-medium mb-2">No top performers yet</div>
        <p className="text-center text-sm">
          Add some investments to see your best performers
        </p>
      </div>
    )
  }

  const getPerformanceIcon = (returnsPercentage) => {
    if (returnsPercentage > 0) {
      return <TrendingUp className="w-5 h-5 text-primary-green-600" />
    } else if (returnsPercentage < 0) {
      return <TrendingDown className="w-5 h-5 text-error-600" />
    } else {
      return <Minus className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getAssetTypeColor = (type) => {
    const colors = {
      'Mutual Fund': '#2563eb',
      'Stock': '#10b981',
      'Fixed Deposit': '#f59e0b',
      'EPF': '#8b5cf6',
    }
    return colors[type] || '#6b7280'
  }

  const getAssetTypeIcon = (type) => {
    const icons = {
      'Mutual Fund': '📈',
      'Stock': '📊',
      'Fixed Deposit': '🏦',
      'EPF': '🏛️',
    }
    return icons[type] || '💼'
  }

  const getPerformanceGradient = (returnsPercentage) => {
    if (returnsPercentage > 0) {
      return 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
    } else if (returnsPercentage < 0) {
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    } else {
      return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
    }
  }

  return (
    <div className="space-y-4">
      {topPerformers.map((performer, index) => (
        <div 
          key={index} 
          className="financial-data-card p-4 hover:shadow-lg transition-all duration-300 group"
          style={{
            borderLeft: `4px solid ${getAssetTypeColor(performer.type)}`,
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-transform duration-200 group-hover:scale-110"
                style={{ 
                  background: getPerformanceGradient(performer.returnsPercentage),
                  boxShadow: `0 4px 12px ${getAssetTypeColor(performer.type)}40`
                }}
              >
                {getPerformanceIcon(performer.returnsPercentage)}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary-blue-700 transition-colors">
                    {performer.name}
                  </span>
                  <PerformanceBadge rank={index + 1} type={performer.type} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getAssetTypeIcon(performer.type)}</span>
                  <span>{performer.type}</span>
                  {performer.category && (
                    <>
                      <span>•</span>
                      <span>{performer.category}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${getValueColor(performer.returns)} transition-colors duration-200`}>
                {formatCurrency(performer.returns)}
              </div>
              <div className={`text-sm font-semibold ${getValueColor(performer.returns)} flex items-center gap-1`}>
                {performer.returnsPercentage > 0 ? '↗' : performer.returnsPercentage < 0 ? '↘' : '→'}
                {formatPercentage(performer.returnsPercentage, true)}
              </div>
            </div>
          </div>
          
          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Performance</span>
              <span className={`font-medium ${getValueColor(performer.returns)}`}>
                {Math.abs(performer.returnsPercentage).toFixed(1)}%
              </span>
            </div>
            <AnimatedProgressBar 
              percentage={performer.returnsPercentage} 
              color={getAssetTypeColor(performer.type)}
              delay={index * 200}
            />
          </div>
          
          {/* Performance Indicator */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getAssetTypeColor(performer.type) }}
              />
              <span className="text-muted-foreground">
                {performer.returnsPercentage > 0 ? 'Gaining' : performer.returnsPercentage < 0 ? 'Losing' : 'Stable'}
              </span>
            </div>
            <div className={`font-medium ${getValueColor(performer.returns)}`}>
              Rank #{index + 1}
            </div>
          </div>
        </div>
      ))}
      
      {topPerformers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-4">📊</div>
          <p className="font-medium">No performance data available yet</p>
          <p className="text-xs mt-1">Add investments to see top performers</p>
        </div>
      )}
    </div>
  )
})