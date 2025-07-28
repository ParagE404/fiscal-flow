import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Calendar, Percent, Edit, Trash2 } from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/utils'

export const EPFAccountCard = ({ 
  epfAccount, 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                {employerName}
              </CardTitle>
              <p className="text-sm text-muted-foreground font-mono">
                PF: {pfNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
            >
              {status}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(epfAccount)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(epfAccount.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interest Earned</p>
            <p className="text-lg font-semibold font-mono text-green-600">
              {formatCurrency(interestEarned)}
            </p>
          </div>
        </div>

        {/* Contribution Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Contribution Breakdown</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-muted-foreground">Employee</p>
              <p className="font-semibold font-mono text-blue-600">
                {formatCurrency(employeeContribution)}
              </p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-muted-foreground">Employer</p>
              <p className="font-semibold font-mono text-green-600">
                {formatCurrency(employerContribution)}
              </p>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <p className="text-muted-foreground">Pension</p>
              <p className="font-semibold font-mono text-purple-600">
                {formatCurrency(pensionFund)}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Contribution & Rate */}
        {isActive && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Monthly Contribution</span>
            </div>
            <div className="text-right">
              <p className="font-semibold font-mono">
                {formatCurrency(monthlyContribution)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(contributionRate)} of salary
              </p>
            </div>
          </div>
        )}

        {/* Service Duration */}
        <div className="flex items-center justify-between text-sm">
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
      </CardContent>
    </Card>
  )
}