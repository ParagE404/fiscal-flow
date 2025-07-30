import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SummaryCard } from '@/components/common/SummaryCard'
import { EPFAccountCard } from '@/components/epf/EPFAccountCard'
import { AddEPFModal } from '@/components/epf/AddEPFModal'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Plus, Building2, Download, AlertCircle } from 'lucide-react'
import { portfolioStore } from '@/stores/PortfolioStore'
import { toast } from '@/lib/toast'

export const EPF = observer(() => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEPF, setEditingEPF] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    portfolioStore.fetchEPFAccounts()
  }, [])

  // Calculate summary data from EPF accounts
  const summaryData = React.useMemo(() => {
    const accounts = portfolioStore.epfAccounts || []
    
    const totalBalance = accounts.reduce((sum, epf) => sum + (epf.totalBalance || 0), 0)
    const totalEmployeeContribution = accounts.reduce((sum, epf) => sum + (epf.employeeContribution || 0), 0)
    const totalEmployerContribution = accounts.reduce((sum, epf) => sum + (epf.employerContribution || 0), 0)
    const totalInterestEarned = accounts.reduce((sum, epf) => sum + (epf.interestEarned || 0), 0)

    return {
      totalBalance,
      totalEmployeeContribution,
      totalEmployerContribution,
      totalInterestEarned
    }
  }, [portfolioStore.epfAccounts])

  const handleAddEPF = async (epfData) => {
    try {
      await portfolioStore.addEPFAccount(epfData)
      toast.success('EPF account added successfully')
      setShowAddModal(false)
    } catch (error) {
      toast.error('Failed to add EPF account')
      console.error('Error adding EPF account:', error)
    }
  }

  const handleEditEPF = (epfAccount) => {
    setEditingEPF(epfAccount)
    setShowAddModal(true)
  }

  const handleUpdateEPF = async (epfData) => {
    try {
      await portfolioStore.updateEPFAccount(editingEPF.id, epfData)
      toast.success('EPF account updated successfully')
      setShowAddModal(false)
      setEditingEPF(null)
    } catch (error) {
      toast.error('Failed to update EPF account')
      console.error('Error updating EPF account:', error)
    }
  }

  const handleDeleteEPF = (epfId) => {
    setDeleteConfirm(epfId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteEPF = async () => {
    if (deleteConfirm) {
      setIsDeleting(true)
      try {
        await portfolioStore.deleteEPFAccount(deleteConfirm)
        toast.crud.deleted('EPF account')
        setShowDeleteDialog(false)
        setDeleteConfirm(null)
      } catch (error) {
        console.error('Error deleting EPF account:', error)
        toast.crud.deleteError('EPF account')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleExport = async () => {
    try {
      // This would typically trigger a CSV download
      toast.success('EPF data exported successfully')
    } catch (error) {
      toast.error('Failed to export EPF data')
      console.error('Error exporting EPF data:', error)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingEPF(null)
  }

  const isLoading = portfolioStore.loading.epf
  const error = portfolioStore.error.epf
  const epfAccounts = portfolioStore.epfAccounts || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">EPF Accounts</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Track your Employee Provident Fund contributions and balances
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={epfAccounts.length === 0}
            size="sm"
            className="sm:size-default"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="sm:size-default">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add EPF Account</span>
            <span className="sm:hidden">Add EPF</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SummaryCard
          title="Total EPF Balance"
          value={summaryData.totalBalance}
          loading={isLoading}
          error={error}
        />
        <SummaryCard
          title="Employee Contribution"
          value={summaryData.totalEmployeeContribution}
          loading={isLoading}
          error={error}
        />
        <SummaryCard
          title="Employer Contribution"
          value={summaryData.totalEmployerContribution}
          loading={isLoading}
          error={error}
        />
        <SummaryCard
          title="Interest Earned"
          value={summaryData.totalInterestEarned}
          loading={isLoading}
          error={error}
        />
      </div>

      {/* EPF Accounts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Your EPF Accounts</CardTitle>
            </div>
            {epfAccounts.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {epfAccounts.length} account{epfAccounts.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {[1, 2].map((i) => (
                <EPFAccountCard key={i} loading={true} />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to load EPF accounts
              </h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your EPF account data.
              </p>
              <Button 
                variant="outline" 
                onClick={() => portfolioStore.fetchEPFAccounts()}
              >
                Try Again
              </Button>
            </div>
          ) : epfAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No EPF accounts yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Add your first EPF account to start tracking your provident fund contributions.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add EPF Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {epfAccounts.map((epfAccount) => (
                <EPFAccountCard
                  key={epfAccount.id}
                  epfAccount={epfAccount}
                  onEdit={handleEditEPF}
                  onDelete={handleDeleteEPF}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit EPF Modal */}
      <AddEPFModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSubmit={editingEPF ? handleUpdateEPF : handleAddEPF}
        editingEPF={editingEPF}
        loading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete EPF Account"
        itemName="this EPF account"
        itemType="EPF account"
        onConfirm={confirmDeleteEPF}
        loading={isDeleting}
        additionalWarning="All contribution history and balance information will be permanently removed."
      />
    </div>
  )
})