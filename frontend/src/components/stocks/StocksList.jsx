import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ArrowUpDown,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { portfolioStore } from '@/stores/PortfolioStore'

const StocksList = observer(({ onEdit, onDelete }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  
  const { stocks, loading, error } = portfolioStore

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

  // Get market cap badge variant
  const getMarketCapVariant = (marketCap) => {
    switch (marketCap) {
      case 'Large Cap':
        return 'default'
      case 'Mid Cap':
        return 'secondary'
      case 'Small Cap':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Get P&L color classes
  const getPnLColor = (pnl) => {
    if (pnl > 0) return 'text-green-600'
    if (pnl < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Sort stocks
  const sortedStocks = React.useMemo(() => {
    if (!sortConfig.key) return stocks

    return [...stocks].sort((a, b) => {
      let aValue = a[sortConfig.key]
      let bValue = b[sortConfig.key]

      // Handle string comparisons
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [stocks, sortConfig])

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Render sort icon
  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? 
      <TrendingUp className="ml-2 h-4 w-4" /> : 
      <TrendingDown className="ml-2 h-4 w-4" />
  }

  if (loading.stocks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading stocks...</div>
      </div>
    )
  }

  if (error.stocks) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading stocks: {error.stocks}</div>
      </div>
    )
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground text-lg">No stocks found</div>
        <div className="text-sm text-muted-foreground">
          Add your first stock to start tracking your equity portfolio
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('companyName')}
            >
              <div className="flex items-center">
                Company
                {renderSortIcon('companyName')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('symbol')}
            >
              <div className="flex items-center">
                Symbol
                {renderSortIcon('symbol')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('sector')}
            >
              <div className="flex items-center">
                Sector
                {renderSortIcon('sector')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('marketCap')}
            >
              <div className="flex items-center">
                Market Cap
                {renderSortIcon('marketCap')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('quantity')}
            >
              <div className="flex items-center justify-end">
                Quantity
                {renderSortIcon('quantity')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('buyPrice')}
            >
              <div className="flex items-center justify-end">
                Buy Price
                {renderSortIcon('buyPrice')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('currentPrice')}
            >
              <div className="flex items-center justify-end">
                Current Price
                {renderSortIcon('currentPrice')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('investedAmount')}
            >
              <div className="flex items-center justify-end">
                Invested
                {renderSortIcon('investedAmount')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('currentValue')}
            >
              <div className="flex items-center justify-end">
                Current Value
                {renderSortIcon('currentValue')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('pnl')}
            >
              <div className="flex items-center justify-end">
                P&L
                {renderSortIcon('pnl')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 text-right"
              onClick={() => handleSort('pnlPercentage')}
            >
              <div className="flex items-center justify-end">
                P&L %
                {renderSortIcon('pnlPercentage')}
              </div>
            </TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStocks.map((stock) => (
            <TableRow key={stock.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold">{stock.companyName}</div>
                  <div className="text-sm text-muted-foreground">{stock.symbol}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {stock.symbol}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{stock.sector}</div>
              </TableCell>
              <TableCell>
                <Badge variant={getMarketCapVariant(stock.marketCap)}>
                  {stock.marketCap}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {stock.quantity?.toLocaleString('en-IN') || 0}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(stock.buyPrice)}
              </TableCell>
              <TableCell className="text-right font-mono">
                <div className="flex flex-col items-end">
                  <span>{formatCurrency(stock.currentPrice)}</span>
                  <span className="text-xs text-muted-foreground">Live prices</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(stock.investedAmount)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(stock.currentValue)}
              </TableCell>
              <TableCell className={`text-right font-mono ${getPnLColor(stock.pnl)}`}>
                <div className="flex flex-col items-end">
                  <span className="font-semibold">
                    {formatCurrency(stock.pnl)}
                  </span>
                </div>
              </TableCell>
              <TableCell className={`text-right font-mono ${getPnLColor(stock.pnl)}`}>
                <div className="flex flex-col items-end">
                  <span className="font-semibold">
                    {formatPercentage(stock.pnlPercentage)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(stock)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(stock)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})

export default StocksList