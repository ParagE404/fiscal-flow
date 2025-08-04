import React from 'react'
import { FinancialDataCard } from '@/components/common/FinancialDataCard'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'
import { Calendar, TrendingUp, Building2 } from 'lucide-react'

export const FDCard = ({ 
  fixedDeposit, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  if (loading) {
    return (
      <FinancialDataCard
        assetType="fixed-deposit"
        loading={true}
      />
    )
  }

  const {
    bankName,
    investedAmount,
    currentValue,
    maturityAmount,
    interestRate,
    type,
    payoutType = 'Maturity',
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

  const getStatus = () => {
    if (isMatured) return { text: 'Matured', variant: 'secondary' }
    if (isMaturingSoon) return { text: 'Maturing Soon', variant: 'destructive' }
    return { text: 'Active', variant: 'default' }
  }

  const getBankIcon = (bankName) => {
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

  const status = getStatus()
  const changePercentage = ((currentValue - investedAmount) / investedAmount) * 100

  return (
    <FinancialDataCard
      assetType="fixed-deposit"
      title={bankName}
      subtitle={`${type} Interest • ${formatPercentage(interestRate)} p.a. • ${payoutType} Payout`}
      primaryValue={currentValue}
      secondaryValue={maturityAmount}
      change={changePercentage}
      changeLabel="return on investment"
      status={status.text}
      statusVariant={status.variant}
      icon={getBankIcon(bankName)}
      onEdit={() => onEdit(fixedDeposit)}
      onDelete={() => onDelete(fixedDeposit)}
      animateNumbers={true}
    >
      {/* Investment Details */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Invested Amount</p>
          <p className="text-sm font-semibold text-gray-700">
            {formatCurrency(investedAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Value</p>
          <p className="text-sm font-semibold text-blue-600">
            {formatCurrency(currentValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Maturity Amount</p>
          <p className="text-sm font-semibold text-green-600">
            {formatCurrency(maturityAmount)}
          </p>
        </div>
      </div>

      {/* Interest Details */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {payoutType === 'Maturity' ? 'Interest Earned' : 'Interest (Periodic)'}
          </p>
          <p className={`text-sm font-semibold ${getValueColor(interestEarned)}`}>
            {formatCurrency(interestEarned)}
          </p>
        </div>
        {payoutType !== 'Maturity' && (
          <p className="text-xs text-muted-foreground mt-1">
            Paid {payoutType.toLowerCase()}
          </p>
        )}
      </div>

      {/* Maturity Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Maturity Progress</p>
          <p className="text-sm font-medium">
            {getDaysRemainingText()}
          </p>
        </div>
        <div className="fd-progress-bar">
          <div 
            className={`fd-progress-fill ${
              isMatured ? 'matured' : 
              isMaturingSoon ? 'maturing-soon' : 
              'active'
            }`}
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
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
    </FinancialDataCard>
  )
}