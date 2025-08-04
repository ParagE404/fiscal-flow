import React from 'react'
import { FinancialDataCard } from '@/components/common/FinancialDataCard'
import { Badge } from '@/components/ui/badge'
import { Building2, Calendar, Percent } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export const EPFAccountCard = ({ 
  epfAccount, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  if (loading) {
    return (
      <FinancialDataCard
        assetType="epf"
        loading={true}
      />
    )
  }

  const {
    employerName,
    pfNumber,
    status,
    totalBalance,
    employeeContribution,
    employerContribution,
    pensionFund,
    monthlyContribution,
    contributionRate,
    serviceDurationDisplay,
    startDate,
    endDate,
    interestEarned,
    isActive
  } = epfAccount

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const changePercentage = totalBalance > 0 ? ((interestEarned / (totalBalance - interestEarned)) * 100) : 0

  return (
    <FinancialDataCard
      assetType="epf"
      title={employerName}
      subtitle={`PF: ${pfNumber}`}
      primaryValue={totalBalance}
      secondaryValue={interestEarned}
      change={changePercentage}
      changeLabel="interest growth"
      status={status}
      statusVariant={isActive ? "default" : "secondary"}
      icon="🏢"
      onEdit={() => onEdit(epfAccount)}
      onDelete={() => onDelete(epfAccount.id)}
      animateNumbers={true}
    >
      {/* Contribution Breakdown */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-foreground">Contribution Breakdown</h4>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-2 bg-primary-blue-50 rounded-lg transition-all duration-300 hover:bg-primary-blue-100">
            <p className="text-muted-foreground">Employee</p>
            <p className="font-semibold text-financial text-primary-blue-600">
              {formatCurrency(employeeContribution)}
            </p>
          </div>
          <div className="text-center p-2 bg-primary-green-50 rounded-lg transition-all duration-300 hover:bg-primary-green-100">
            <p className="text-muted-foreground">Employer</p>
            <p className="font-semibold text-financial text-primary-green-600">
              {formatCurrency(employerContribution)}
            </p>
          </div>
          <div className="text-center p-2 bg-primary-purple-50 rounded-lg transition-all duration-300 hover:bg-primary-purple-100">
            <p className="text-muted-foreground">Pension</p>
            <p className="font-semibold text-financial text-primary-purple-600">
              {formatCurrency(pensionFund)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Contribution & Rate */}
      {isActive && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4 transition-all duration-300 hover:bg-muted/70">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Monthly Contribution</span>
          </div>
          <div className="text-right">
            <p className="font-semibold text-financial">
              {formatCurrency(monthlyContribution)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(contributionRate)} of salary
            </p>
          </div>
        </div>
      )}

      {/* Service Duration */}
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Service Duration</span>
        </div>
        <span className="font-medium">{serviceDurationDisplay}</span>
      </div>

      {/* Date Range */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {formatDate(startDate)} - {endDate ? formatDate(endDate) : 'Present'}
        </span>
      </div>
    </FinancialDataCard>
  )
}