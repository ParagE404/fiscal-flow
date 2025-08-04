import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'
import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

// Animated number counter hook
const useAnimatedNumber = (value, duration = 1000) => {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value === displayValue) return

    setIsAnimating(true)
    const startValue = displayValue
    const difference = value - startValue
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (difference * easeOutCubic)
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, displayValue, duration])

  return { displayValue, isAnimating }
}

// Asset type configurations
const assetTypeConfig = {
  'fixed-deposit': {
    color: 'primary-blue',
    gradient: 'gradient-primary',
    borderClass: 'border-l-primary-blue-500',
    bgClass: 'bg-primary-blue-50',
    icon: '🏦',
    name: 'Fixed Deposit'
  },
  'epf': {
    color: 'primary-green',
    gradient: 'gradient-success',
    borderClass: 'border-l-primary-green-500',
    bgClass: 'bg-primary-green-50',
    icon: '🏢',
    name: 'EPF'
  },
  'mutual-fund': {
    color: 'primary-purple',
    gradient: 'gradient-purple',
    borderClass: 'border-l-primary-purple-500',
    bgClass: 'bg-primary-purple-50',
    icon: '📈',
    name: 'Mutual Fund'
  },
  'stock': {
    color: 'accent-orange',
    gradient: 'gradient-orange',
    borderClass: 'border-l-accent-orange-500',
    bgClass: 'bg-accent-orange-50',
    icon: '📊',
    name: 'Stock'
  },
  'sip': {
    color: 'accent-teal',
    gradient: 'gradient-accent',
    borderClass: 'border-l-accent-teal-500',
    bgClass: 'bg-accent-teal-50',
    icon: '🔄',
    name: 'SIP'
  }
}

export const FinancialDataCard = ({
  assetType = 'fixed-deposit',
  title,
  subtitle,
  primaryValue,
  secondaryValue,
  change,
  changeLabel = "from last month",
  status,
  statusVariant = "default",
  icon,
  onEdit,
  onDelete,
  loading = false,
  children,
  className = "",
  animateNumbers = true,
  ...props
}) => {
  const config = assetTypeConfig[assetType] || assetTypeConfig['fixed-deposit']
  const { displayValue: animatedPrimary, isAnimating: isPrimaryAnimating } = useAnimatedNumber(
    animateNumbers ? primaryValue : primaryValue, 
    800
  )
  const { displayValue: animatedSecondary, isAnimating: isSecondaryAnimating } = useAnimatedNumber(
    animateNumbers ? secondaryValue : secondaryValue, 
    1000
  )

  if (loading) {
    return (
      <Card className={`modern-card-loading ${config.borderClass} border-l-4 ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="shimmer h-8 w-8 rounded-lg"></div>
              <div>
                <div className="shimmer h-5 rounded w-32 mb-2"></div>
                <div className="shimmer h-4 rounded w-24"></div>
              </div>
            </div>
            <div className="shimmer h-6 rounded w-16"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="shimmer h-4 rounded w-20 mb-2"></div>
              <div className="shimmer h-8 rounded w-24"></div>
            </div>
            <div>
              <div className="shimmer h-4 rounded w-20 mb-2"></div>
              <div className="shimmer h-8 rounded w-24"></div>
            </div>
          </div>
          <div className="shimmer h-4 rounded w-full"></div>
        </CardContent>
      </Card>
    )
  }

  const formatAnimatedValue = (value, isAnimating) => {
    if (typeof value !== 'number') return value
    return isAnimating ? formatCurrency(Math.round(value)) : formatCurrency(value)
  }

  return (
    <Card className={`financial-data-card ${config.borderClass} border-l-4 group mobile-touch ${className}`} {...props}>
      <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 sm:p-2.5 ${config.bgClass} rounded-lg transition-all duration-300 group-hover:scale-110 touch-target flex-shrink-0`}>
              <span className="text-lg sm:text-xl">{icon || config.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {status && (
              <Badge 
                variant={statusVariant}
                className="transition-all duration-300 group-hover:scale-105 text-xs px-2 py-1"
              >
                {status}
              </Badge>
            )}
            {(onEdit || onDelete) && (
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onEdit}
                    className="h-9 w-9 p-0 hover:bg-primary/10 transition-all duration-200 touch-target"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDelete}
                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 touch-target"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Primary and Secondary Values */}
        {(primaryValue !== undefined || secondaryValue !== undefined) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {primaryValue !== undefined && (
              <div className="value-container">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Primary Value</p>
                <p className={`text-lg sm:text-xl font-bold font-mono transition-all duration-300 ${isPrimaryAnimating ? 'text-primary scale-105' : 'text-foreground'}`}>
                  {formatAnimatedValue(animatedPrimary, isPrimaryAnimating)}
                </p>
              </div>
            )}
            {secondaryValue !== undefined && (
              <div className="value-container">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Secondary Value</p>
                <p className={`text-lg sm:text-xl font-bold font-mono transition-all duration-300 ${isSecondaryAnimating ? 'text-primary scale-105' : 'text-foreground'}`}>
                  {formatAnimatedValue(animatedSecondary, isSecondaryAnimating)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Change Indicator */}
        {change !== undefined && (
          <div className="change-indicator flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 rounded-lg bg-muted/50 transition-all duration-300 group-hover:bg-muted/70">
            <div className="flex items-center gap-2">
              {parseFloat(change) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive flex-shrink-0" />
              )}
              <span className="text-xs sm:text-sm text-muted-foreground">{changeLabel}</span>
            </div>
            <span className={`font-semibold text-sm sm:text-base ${getValueColor(parseFloat(change))} transition-all duration-300`}>
              {typeof change === 'number' ? formatPercentage(change) : change}
            </span>
          </div>
        )}

        {/* Custom Content */}
        {children && (
          <div className="custom-content">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized variants for different asset types
export const FixedDepositCard = (props) => (
  <FinancialDataCard assetType="fixed-deposit" {...props} />
)

export const EPFCard = (props) => (
  <FinancialDataCard assetType="epf" {...props} />
)

export const MutualFundCard = (props) => (
  <FinancialDataCard assetType="mutual-fund" {...props} />
)

export const StockCard = (props) => (
  <FinancialDataCard assetType="stock" {...props} />
)

export const SIPCard = (props) => (
  <FinancialDataCard assetType="sip" {...props} />
)