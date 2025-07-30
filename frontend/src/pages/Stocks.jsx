import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Plus, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { portfolioStore } from '@/stores/PortfolioStore'
import StocksList from '@/components/stocks/StocksList'
import AddStockModal from '@/components/stocks/AddStockModal'
import { toast } from '@/lib/toast'

export const Stocks = observer(() => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [stockToDelete, setStockToDelete] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { stocks, loading, error } = portfolioStore

  // Fetch stocks data on component mount
  useEffect(() => {
    portfolioStore.fetchStocks()
  }, [])

  // Format currency in Indian format
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (percentage) => {
    if (percentage === null || percentage === undefined) return '0.00%'
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  // Calculate summary data
  const summaryData = React.useMemo(() => {
    const totalInvestment = stocks.reduce((sum, stock) => sum + (stock.investedAmount || 0), 0)
    const totalCurrentValue = stocks.reduce((sum, stock) => sum + (stock.currentValue || 0), 0)
    const totalPnL = totalCurrentValue - totalInvestment
    const sipInvestment = 0 // Placeholder for future SIP stock feature

    return {
      totalInvestment,
      totalCurrentValue,
      totalPnL,
      sipInvestment,
    }
  }, [stocks])

  // Get P&L color classes
  const getPnLColor = (pnl) => {
    if (pnl > 0) return 'text-green-600'
    if (pnl < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Handle edit stock
  const handleEditStock = (stock) => {
    setEditingStock(stock)
    setShowAddModal(true)
  }

  // Handle delete stock
  const handleDeleteStock = (stock) => {
    setStockToDelete(stock)
    setShowDeleteDialog(true)
  }

  const confirmDeleteStock = async () => {
    if (stockToDelete) {
      setIsDeleting(true)
      try {
        await portfolioStore.deleteStock(stockToDelete.id)
        toast.crud.deleted('Stock')
        setShowDeleteDialog(false)
        setStockToDelete(null)
      } catch (error) {
        console.error('Error deleting stock:', error)
        toast.crud.deleteError('Stock')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  // Handle modal close
  const handleModalClose = () => {
    setShowAddModal(false)
    setEditingStock(null)
  }

  // Handle export
  const handleExport = async () => {
    try {
      // This would typically call an export API
      toast.success('Export functionality will be implemented in the next phase')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const summaryCards = [
    {
      title: 'Total Investment',
      value: formatCurrency(summaryData.totalInvestment),
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Current Value',
      value: formatCurrency(summaryData.totalCurrentValue),
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Total P&L',
      value: formatCurrency(summaryData.totalPnL),
      icon: summaryData.totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: getPnLColor(summaryData.totalPnL),
      subtitle: formatPercentage(
        summaryData.totalInvestment > 0 
          ? (summaryData.totalPnL / summaryData.totalInvestment) * 100 
          : 0
      ),
    },
    {
      title: 'SIP Investment',
      value: formatCurrency(summaryData.sipInvestment),
      icon: TrendingUp,
      color: 'text-purple-600',
      subtitle: 'Coming soon',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stock Portfolio</h1>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-muted-foreground">Live prices</span>
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <Button variant="outline" onClick={handleExport} size="sm" className="sm:size-default">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="sm:size-default">
            <Plus className="mr-2 h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {summaryCards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <Card key={index}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <IconComponent className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </div>
                {card.subtitle && (
                  <p className={`text-sm mt-1 ${card.color}`}>
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Stocks List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>My Stocks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track your equity investments with real-time P&L calculations
              </p>
            </div>
            <Badge variant="secondary">
              {stocks.length} {stocks.length === 1 ? 'Stock' : 'Stocks'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <StocksList 
            onEdit={handleEditStock}
            onDelete={handleDeleteStock}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Stock Modal */}
      <AddStockModal
        open={showAddModal}
        onClose={handleModalClose}
        editStock={editingStock}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Stock"
        itemName={`${stockToDelete?.companyName} (${stockToDelete?.symbol})`}
        itemType="stock"
        onConfirm={confirmDeleteStock}
        loading={isDeleting}
        additionalWarning="All transaction history and P&L data will be permanently removed."
      />
    </div>
  )
})