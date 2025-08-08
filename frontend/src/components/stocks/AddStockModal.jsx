import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { portfolioStore } from '@/stores/PortfolioStore'
import { toast } from 'sonner'
import { INDIAN_SECTORS, MARKET_CAP_CATEGORIES, INDIAN_EXCHANGES, validateStockSymbol } from '@/lib/indianMarketContext'

const MARKET_CAPS = [
  'Large Cap',
  'Mid Cap',
  'Small Cap'
]

const EXCHANGES = [
  { value: 'NSE', label: 'NSE (National Stock Exchange)' },
  { value: 'BSE', label: 'BSE (Bombay Stock Exchange)' }
]

const AddStockModal = observer(({ open, onClose, editStock = null }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    companyName: '',
    sector: '',
    exchange: 'NSE',
    marketCap: '',
    quantity: '',
    buyPrice: '',
    currentPrice: '',
  })
  
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when editing
  React.useEffect(() => {
    if (editStock) {
      setFormData({
        symbol: editStock.symbol || '',
        companyName: editStock.companyName || '',
        sector: editStock.sector || '',
        exchange: editStock.exchange || 'NSE',
        marketCap: editStock.marketCap || '',
        quantity: editStock.quantity?.toString() || '',
        buyPrice: editStock.buyPrice?.toString() || '',
        currentPrice: editStock.currentPrice?.toString() || '',
      })
    } else {
      setFormData({
        symbol: '',
        companyName: '',
        sector: '',
        exchange: 'NSE',
        marketCap: '',
        quantity: '',
        buyPrice: '',
        currentPrice: '',
      })
    }
    setErrors({})
  }, [editStock, open])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Required field validations
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Stock symbol is required'
    } else if (!validateStockSymbol(formData.symbol.trim())) {
      newErrors.symbol = 'Invalid stock symbol format. Should contain only letters and numbers (1-20 characters)'
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }

    if (!formData.sector) {
      newErrors.sector = 'Sector is required'
    }

    if (!formData.marketCap) {
      newErrors.marketCap = 'Market cap category is required'
    }

    // Numeric validations
    const quantity = parseInt(formData.quantity)
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Valid quantity is required (positive integer)'
    }

    const buyPrice = parseFloat(formData.buyPrice)
    if (!formData.buyPrice || isNaN(buyPrice) || buyPrice <= 0) {
      newErrors.buyPrice = 'Valid buy price is required (positive number)'
    }

    // Current price is optional, but if provided should be valid
    if (formData.currentPrice) {
      const currentPrice = parseFloat(formData.currentPrice)
      if (isNaN(currentPrice) || currentPrice <= 0) {
        newErrors.currentPrice = 'Current price must be a positive number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const stockData = {
        symbol: formData.symbol.trim().toUpperCase(),
        companyName: formData.companyName.trim(),
        sector: formData.sector,
        exchange: formData.exchange,
        marketCap: formData.marketCap,
        quantity: parseInt(formData.quantity),
        buyPrice: parseFloat(formData.buyPrice),
        // If current price is not provided, use buy price
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : parseFloat(formData.buyPrice),
      }

      if (editStock) {
        await portfolioStore.updateStock(editStock.id, stockData)
        toast.success('Stock updated successfully')
      } else {
        await portfolioStore.addStock(stockData)
        toast.success('Stock added successfully')
      }

      onClose()
    } catch (error) {
      console.error('Error saving stock:', error)
      toast.error(error.message || 'Failed to save stock')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editStock ? 'Edit Stock' : 'Add New Stock'}
          </DialogTitle>
          <DialogDescription>
            {editStock 
              ? 'Update your stock holding details below.'
              : 'Add a new stock to your portfolio. Enter the stock details below.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Stock Symbol */}
            <div className="space-y-2">
              <Label htmlFor="symbol">
                Stock Symbol <span className="text-red-500">*</span>
              </Label>
              <Input
                id="symbol"
                placeholder="e.g., RELIANCE"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                className={errors.symbol ? 'border-red-500' : ''}
              />
              {errors.symbol && (
                <p className="text-sm text-red-500">{errors.symbol}</p>
              )}
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                placeholder="e.g., Reliance Industries"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className={errors.companyName ? 'border-red-500' : ''}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Sector */}
            <div className="space-y-2">
              <Label htmlFor="sector">
                Sector <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sector}
                onValueChange={(value) => handleInputChange('sector', value)}
              >
                <SelectTrigger className={errors.sector ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {INDIAN_SECTORS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sector && (
                <p className="text-sm text-red-500">{errors.sector}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Exchange */}
              <div className="space-y-2">
                <Label htmlFor="exchange">
                  Exchange <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.exchange}
                  onValueChange={(value) => handleInputChange('exchange', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCHANGES.map((exchange) => (
                      <SelectItem key={exchange.value} value={exchange.value}>
                        {exchange.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Market Cap */}
              <div className="space-y-2">
                <Label htmlFor="marketCap">
                  Market Cap <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.marketCap}
                  onValueChange={(value) => handleInputChange('marketCap', value)}
                >
                  <SelectTrigger className={errors.marketCap ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select market cap" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKET_CAPS.map((cap) => (
                      <SelectItem key={cap} value={cap}>
                        <div className="flex items-center justify-between w-full">
                          <span>{cap}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {cap === 'Large Cap' && '(Top 100)'}
                            {cap === 'Mid Cap' && '(101-250)'}
                            {cap === 'Small Cap' && '(251+)'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.marketCap && (
                  <p className="text-sm text-red-500">{errors.marketCap}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                placeholder="100"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            {/* Buy Price */}
            <div className="space-y-2">
              <Label htmlFor="buyPrice">
                Buy Price (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyPrice"
                type="number"
                placeholder="2500.00"
                min="0.01"
                step="0.01"
                value={formData.buyPrice}
                onChange={(e) => handleInputChange('buyPrice', e.target.value)}
                className={errors.buyPrice ? 'border-red-500' : ''}
              />
              {errors.buyPrice && (
                <p className="text-sm text-red-500">{errors.buyPrice}</p>
              )}
            </div>

            {/* Current Price */}
            <div className="space-y-2">
              <Label htmlFor="currentPrice">
                Current Price (₹)
              </Label>
              <Input
                id="currentPrice"
                type="number"
                placeholder="2650.00"
                min="0.01"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => handleInputChange('currentPrice', e.target.value)}
                className={errors.currentPrice ? 'border-red-500' : ''}
              />
              {errors.currentPrice && (
                <p className="text-sm text-red-500">{errors.currentPrice}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to use buy price
              </p>
            </div>
          </div>

          {/* Live Price Indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 font-medium">
                Live prices integration coming soon
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Currently using manual price entry. Live price updates will be available in future versions.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (editStock ? 'Update Stock' : 'Add Stock')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})

export default AddStockModal