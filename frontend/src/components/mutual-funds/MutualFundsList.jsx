import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { RefreshCw } from 'lucide-react'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { MobileCard, MobileField, ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody } from '@/components/ui/responsive-table'
import { Edit, Trash2, Star, ArrowUpDown } from 'lucide-react'
import { portfolioStore } from '@/stores/PortfolioStore'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { AddFundModal } from './AddFundModal'

export const MutualFundsList = observer(() => {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [editingFund, setEditingFund] = useState(null)
  const [deletingFund, setDeletingFund] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { mutualFunds, loading, error } = portfolioStore

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedFunds = [...mutualFunds].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // Handle numeric fields
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    // Handle string fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    return 0
  })

  const handleEdit = (fund) => {
    setEditingFund(fund)
    setShowEditModal(true)
  }

  const handleDelete = (fund) => {
    setDeletingFund(fund)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (deletingFund) {
      setIsDeleting(true)
      try {
        await portfolioStore.deleteMutualFund(deletingFund.id)
        toast.crud.deleted('Mutual fund')
        setShowDeleteDialog(false)
        setDeletingFund(null)
      } catch (error) {
        console.error('Failed to delete fund:', error)
        toast.crud.deleteError('Mutual fund')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const getRiskLevelVariant = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'success'
      case 'moderate': return 'warning'
      case 'high': return 'destructive'
      default: return 'secondary'
    }
  }

  const getCategoryVariant = (category) => {
    switch (category?.toLowerCase()) {
      case 'large cap': return 'default'
      case 'mid cap': return 'secondary'
      case 'small cap': return 'outline'
      default: return 'secondary'
    }
  }

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const SortableHeader = ({ field, children }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </TableHead>
  )

  if (loading.mutualFunds) {
    return (
      <Card className="modern-card">
        <CardHeader>
          <CardTitle>
            <Skeleton variant="title" className="w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable rows={5} columns={8} />
        </CardContent>
      </Card>
    )
  }

  if (error.mutualFunds) {
    return (
      <Card className="modern-card">
        <CardContent className="p-6">
          <ErrorState
            title="Failed to load mutual funds"
            message={error.mutualFunds}
            type="error"
            actions={[
              {
                label: "Retry",
                onClick: () => window.location.reload(),
                icon: RefreshCw,
                variant: "default"
              }
            ]}
          />
        </CardContent>
      </Card>
    )
  }

  if (mutualFunds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="text-muted-foreground">No mutual funds found</div>
            <div className="text-sm text-muted-foreground">Add your first mutual fund to get started</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">My Mutual Funds ({mutualFunds.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <ResponsiveTable>
            <ResponsiveTableHeader>
              <TableRow>
                <SortableHeader field="name">Fund Name</SortableHeader>
                <SortableHeader field="category">Category</SortableHeader>
                <SortableHeader field="riskLevel">Risk Level</SortableHeader>
                <SortableHeader field="rating">Rating</SortableHeader>
                <SortableHeader field="investedAmount">Invested</SortableHeader>
                <SortableHeader field="currentValue">Current Value</SortableHeader>
                <SortableHeader field="cagr">CAGR</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {sortedFunds.map((fund) => {
                const returns = (fund.currentValue || 0) - (fund.investedAmount || 0)
                const returnsPercentage = fund.investedAmount > 0 
                  ? (returns / fund.investedAmount) * 100 
                  : 0

                return (
                  <TableRow key={fund.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell>
                      <Badge variant={getCategoryVariant(fund.category)}>
                        {fund.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskLevelVariant(fund.riskLevel)}>
                        {fund.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderStars(fund.rating || 0)}</TableCell>
                    <TableCell>{formatCurrency(fund.investedAmount || 0)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{formatCurrency(fund.currentValue || 0)}</div>
                        <div className={`text-sm ${getValueColor(returns)}`}>
                          {returns >= 0 ? '+' : ''}{formatCurrency(returns)} ({formatPercentage(returnsPercentage)})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getValueColor(fund.cagr || 0)}>
                        {formatPercentage(fund.cagr || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fund)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fund)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </ResponsiveTableBody>
          </ResponsiveTable>
          
          {/* Mobile card view */}
          <div className="sm:hidden space-y-4 p-4">
            {sortedFunds.map((fund) => {
              const returns = (fund.currentValue || 0) - (fund.investedAmount || 0)
              const returnsPercentage = fund.investedAmount > 0 
                ? (returns / fund.investedAmount) * 100 
                : 0

              return (
                <MobileCard key={fund.id}>
                  <div className="space-y-3">
                    {/* Fund name and actions */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{fund.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={getCategoryVariant(fund.category)} className="text-xs">
                            {fund.category}
                          </Badge>
                          <Badge variant={getRiskLevelVariant(fund.riskLevel)} className="text-xs">
                            {fund.riskLevel}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fund)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fund)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Rating */}
                    <MobileField 
                      label="Rating" 
                      value={renderStars(fund.rating || 0)} 
                    />
                    
                    {/* Financial details */}
                    <div className="space-y-1">
                      <MobileField 
                        label="Invested" 
                        value={formatCurrency(fund.investedAmount || 0)} 
                      />
                      <MobileField 
                        label="Current Value" 
                        value={formatCurrency(fund.currentValue || 0)} 
                      />
                      <MobileField 
                        label="Returns" 
                        value={
                          <span className={getValueColor(returns)}>
                            {returns >= 0 ? '+' : ''}{formatCurrency(returns)} ({formatPercentage(returnsPercentage)})
                          </span>
                        } 
                      />
                      <MobileField 
                        label="CAGR" 
                        value={
                          <span className={getValueColor(fund.cagr || 0)}>
                            {formatPercentage(fund.cagr || 0)}
                          </span>
                        } 
                      />
                    </div>
                  </div>
                </MobileCard>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AddFundModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editingFund={editingFund}
        onClose={() => {
          setShowEditModal(false)
          setEditingFund(null)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Mutual Fund"
        itemName={`"${deletingFund?.name}"`}
        itemType="mutual fund"
        onConfirm={confirmDelete}
        loading={isDeleting}
        additionalWarning="All associated data including performance history will be permanently removed."
      />
    </>
  )
})