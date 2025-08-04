import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SummaryCard } from '@/components/common/SummaryCard'
import { FDCard } from '@/components/fixed-deposits/FDCard'
import { AddFDModal } from '@/components/fixed-deposits/AddFDModal'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { portfolioStore } from '@/stores/PortfolioStore'
import { formatPercentage } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Plus, Download, AlertCircle, Loader2, CheckCircle } from 'lucide-react'

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

  const [deletingFD, setDeletingFD] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteFD = (fd) => {
    setDeletingFD(fd)
    setShowDeleteDialog(true)
  }

  const confirmDeleteFD = async () => {
    if (deletingFD) {
      setIsDeleting(true)
      try {
        await portfolioStore.deleteFixedDeposit(deletingFD.id)
        toast.crud.deleted('Fixed deposit')
        setShowDeleteDialog(false)
        setDeletingFD(null)
      } catch (error) {
        console.error('Failed to delete FD:', error)
        toast.crud.deleteError('Fixed deposit')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingFD(null)
  }

  const [exportState, setExportState] = useState('idle')

  const downloadCSV = (csvData, filename) => {
    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      throw new Error('Failed to download file')
    }
  }

  const handleExport = async () => {
    setExportState('loading')
    
    try {
      const { apiClient } = await import('@/lib/apiClient')
      const csvData = await apiClient.exportFixedDeposits()
      const filename = `fixed_deposits_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      setExportState('success')
      toast.success('Fixed deposits data exported successfully')
      
      // Reset success state after 2 seconds
      setTimeout(() => setExportState('idle'), 2000)
    } catch (error) {
      console.error('Error exporting fixed deposits:', error)
      setExportState('idle')
      toast.error('Failed to export fixed deposits data')
    }
  }

  const { fixedDeposits, loading, error } = portfolioStore
  const isLoading = loading.fixedDeposits
  const hasError = error.fixedDeposits

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Fixed Deposits</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track your fixed deposit investments and maturity progress
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleExport} 
            size="sm" 
            className="sm:size-default gap-2"
            disabled={exportState === 'loading'}
          >
            {exportState === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : exportState === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Exported!</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </>
            )}
          </Button>
          <Button onClick={handleAddFD} size="sm" className="sm:size-default gap-2">
            <Plus className="h-4 w-4" />
            Add FD
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Your Fixed Deposits</h2>
          {fixedDeposits.length > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              {fixedDeposits.length} FD{fixedDeposits.length !== 1 ? 's' : ''} • 
              {fixedDeposits.filter(fd => fd.isMaturingSoon).length} maturing soon
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Fixed Deposit"
        itemName={`${deletingFD?.bankName} FD`}
        itemType="fixed deposit"
        onConfirm={confirmDeleteFD}
        loading={isDeleting}
        additionalWarning="All maturity calculations and interest data will be permanently removed."
      />
    </div>
  )
})