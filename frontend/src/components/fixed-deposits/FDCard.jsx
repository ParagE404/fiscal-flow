import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'
import { Calendar, TrendingUp, Edit, Trash2, Building2 } from 'lucide-react'

export const FDCard = ({ 
  fixedDeposit, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </CardContent>
      </Card>
    )
  }

  const {
    bankName,
    investedAmount,
    currentValue,
    maturityAmount,
    interestRate,
    type,
    startDate,
    maturityDate,
    daysRemaining,
    progressPercentage,
    interestEarned,
    isMatured,
    isMaturingSoon
  } = fixedDeposit

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysRemainingText = () => {
    if (isMatured) return 'Matured'
    if (daysRemaining === 0) return 'Matures today'
    if (daysRemaining === 1) return '1 day left'
    return `${daysRemaining} days left`
  }

  const getStatusBadge = () => {
    if (isMatured) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Matured</Badge>
    }
    if (isMaturingSoon) {
      return <Badge variant="destructive" className="bg-orange-100 text-orange-700">Maturing Soon</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
  }

  const getBankIcon = (bankName) => {
    // Simple bank icon mapping - in a real app, you'd have actual bank logos
    const bankIcons = {
      'SBI': '🏦',
      'HDFC': '🏛️',
      'ICICI': '🏢',
      'Axis': '🏪',
      'Kotak': '🏬',
      'PNB': '🏦',
      'BOI': '🏛️',
      'Canara': '🏢',
      'Union': '🏪',
      'IDBI': '🏬'
    }
    
    const icon = Object.keys(bankIcons).find(bank => 
      bankName.toUpperCase().includes(bank)
    )
    
    return icon ? bankIcons[icon] : '🏦'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getBankIcon(bankName)}</div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                {bankName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {type} Interest
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(interestRate)} p.a.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(fixedDeposit)}
                className="h-9 w-9 p-0 sm:h-8 sm:w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(fixedDeposit)}
                className="h-9 w-9 p-0 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Invested Amount</p>
            <p className="text-lg font-semibold font-mono">
              {formatCurrency(investedAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-lg font-semibold font-mono">
              {formatCurrency(currentValue)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Maturity Amount</p>
            <p className="text-lg font-semibold font-mono text-green-600">
              {formatCurrency(maturityAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interest Earned</p>
            <p className={`text-lg font-semibold font-mono ${getValueColor(interestEarned)}`}>
              {formatCurrency(interestEarned)}
            </p>
          </div>
        </div>

        {/* Maturity Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Maturity Progress</p>
            <p className="text-sm font-medium">
              {getDaysRemainingText()}
            </p>
          </div>
          <Progress 
            value={Math.min(progressPercentage, 100)} 
            className={`h-2 ${isMatured ? 'bg-green-100' : isMaturingSoon ? 'bg-orange-100' : 'bg-blue-100'}`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(startDate)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatDate(maturityDate)}
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {Math.min(progressPercentage, 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}