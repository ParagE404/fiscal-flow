import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SummaryCard } from '@/components/common/SummaryCard'
import { FDCard } from '@/components/fixed-deposits/FDCard'
import { AddFDModal } from '@/components/fixed-deposits/AddFDModal'
import { portfolioStore } from '@/stores/PortfolioStore'
import { formatPercentage } from '@/lib/utils'
import { Plus, Download, AlertCircle } from 'lucide-react'

export const FixedDeposits = observer(() => {
  const [fdSummary, setFdSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    avgInterestRate: 0,
    totalInterestEarned: 0
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingFD, setEditingFD] = useState(null)

  useEffect(() => {
    portfolioStore.fetchFixedDeposits()
  }, [])

  useEffect(() => {
    // Calculate summary from fixed deposits data
    const fixedDeposits = portfolioStore.fixedDeposits
    if (fixedDeposits.length > 0) {
      const totalInvested = fixedDeposits.reduce((sum, fd) => sum + (fd.investedAmount || 0), 0)
      const totalCurrentValue = fixedDeposits.reduce((sum, fd) => sum + (fd.currentValue || 0), 0)
      const avgInterestRate = fixedDeposits.reduce((sum, fd) => sum + (fd.interestRate || 0), 0) / fixedDeposits.length
      const totalInterestEarned = totalCurrentValue - totalInvested

      setFdSummary({
        totalInvested,
        totalCurrentValue,
        avgInterestRate,
        totalInterestEarned
      })
    }
  }, [portfolioStore.fixedDeposits])

  const handleAddFD = () => {
    setEditingFD(null)
    setShowAddModal(true)
  }

  const handleEditFD = (fd) => {
    setEditingFD(fd)
    setShowAddModal(true)
  }

  const handleDeleteFD = async (fd) => {
    if (window.confirm(`Are you sure you want to delete the ${fd.bankName} FD?\n\nThis action cannot be undone.`)) {
      try {
        await portfolioStore.deleteFixedDeposit(fd.id)
      } catch (error) {
        console.error('Failed to delete FD:', error)
        alert('Failed to delete fixed deposit. Please try again.')
      }
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingFD(null)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export FDs clicked')
  }

  const { fixedDeposits, loading, error } = portfolioStore
  const isLoading = loading.fixedDeposits
  const hasError = error.fixedDeposits

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fixed Deposits</h1>
          <p className="text-muted-foreground mt-1">
            Track your fixed deposit investments and maturity progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleAddFD} className="gap-2">
            <Plus className="h-4 w-4" />
            Add FD
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Invested"
          value={fdSummary.totalInvested}
          loading={isLoading}
          error={hasError}
        />
        <SummaryCard
          title="Current Value"
          value={fdSummary.totalCurrentValue}
          loading={isLoading}
          error={hasError}
        />
        <SummaryCard
          title="Avg Interest Rate"
          value={formatPercentage(fdSummary.avgInterestRate)}
          loading={isLoading}
          error={hasError}
        />
        <SummaryCard
          title="Interest Earned"
          value={fdSummary.totalInterestEarned}
          loading={isLoading}
          error={hasError}
        />
      </div>

      {/* Fixed Deposits Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Your Fixed Deposits</h2>
          {fixedDeposits.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {fixedDeposits.length} FD{fixedDeposits.length !== 1 ? 's' : ''} • 
              {fixedDeposits.filter(fd => fd.isMaturingSoon).length} maturing soon
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <FDCard key={index} loading={true} />
            ))}
          </div>
        ) : hasError ? (
          <Card className="border-destructive">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Failed to load Fixed Deposits
                </h3>
                <p className="text-muted-foreground mb-4">
                  {hasError}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => portfolioStore.fetchFixedDeposits()}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : fixedDeposits.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-6xl mb-4">🏦</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Fixed Deposits Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your FD investments to monitor maturity progress and returns
                </p>
                <Button onClick={handleAddFD} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First FD
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixedDeposits.map((fd) => (
              <FDCard
                key={fd.id}
                fixedDeposit={fd}
                onEdit={handleEditFD}
                onDelete={handleDeleteFD}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit FD Modal */}
      <AddFDModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        editingFD={editingFD}
        onClose={handleCloseModal}
      />
    </div>
  )
})