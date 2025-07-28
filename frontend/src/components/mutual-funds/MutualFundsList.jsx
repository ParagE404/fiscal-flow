import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Edit, Trash2, Star, ArrowUpDown } from 'lucide-react'
import { portfolioStore } from '@/stores/PortfolioStore'
import { formatCurrency, formatPercentage, getValueColor } from '@/lib/utils'
import { AddFundModal } from './AddFundModal'

export const MutualFundsList = observer(() => {
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [editingFund, setEditingFund] = useState(null)
  const [deletingFund, setDeletingFund] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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
      try {
        await portfolioStore.deleteMutualFund(deletingFund.id)
        setShowDeleteDialog(false)
        setDeletingFund(null)
      } catch (error) {
        console.error('Failed to delete fund:', error)
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading mutual funds...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error.mutualFunds) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-destructive">Error loading mutual funds: {error.mutualFunds}</div>
          </div>
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
          <CardTitle>My Mutual Funds ({mutualFunds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
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
            </TableHeader>
            <TableBody>
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
            </TableBody>
          </Table>
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
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mutual Fund</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingFund?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})