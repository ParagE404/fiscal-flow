import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TrendingUp, Building2, DollarSign, Hash, Target } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  EnhancedFormField, 
  EnhancedFormGroup, 
  EnhancedFormSection, 
  EnhancedFormLayout,
  validationHelpers 
} from '@/components/ui/enhanced-form'
import { HelpTooltip } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { portfolioStore } from '@/stores/PortfolioStore'
import { smartDefaults, placeholderPatterns } from '@/lib/formHelpers'
import { toast } from 'sonner'

const SECTORS = [
  'Banking', 'IT Services', 'Energy', 'Pharmaceuticals', 'Automobiles',
  'FMCG', 'Metals', 'Telecommunications', 'Real Estate', 'Infrastructure',
  'Chemicals', 'Textiles', 'Media & Entertainment', 'Healthcare',
  'Consumer Durables', 'Capital Goods', 'Utilities', 'Other'
]

const MARKET_CAPS = ['Large Cap', 'Mid Cap', 'Small Cap']

const stockSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Stock symbol is required')
    .regex(/^[A-Z0-9]+$/, 'Symbol should contain only uppercase letters and numbers')
    .max(20, 'Symbol should be less than 20 characters'),
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  sector: z
    .string()
    .min(1, 'Please select a sector'),
  marketCap: z
    .string()
    .min(1, 'Please select market cap category'),
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine((val) => {
      const num = parseInt(val)
      return !isNaN(num) && num > 0
    }, 'Quantity must be a positive number'),
  buyPrice: z
    .string()
    .min(1, 'Buy price is required')
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }, 'Buy price must be a positive number'),
  currentPrice: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }, 'Current price must be a positive number'),
})

const EnhancedAddStockModal = observer(({ open, onClose, editStock = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const methods = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      symbol: '',
      companyName: '',
      sector: '',
      marketCap: '',
      quantity: '',
      buyPrice: '',
      currentPrice: '',
    },
    mode: 'onChange',
  })

  // Initialize form data when editing
  React.useEffect(() => {
    if (editStock && open) {
      methods.reset({
        symbol: editStock.symbol || '',
        companyName: editStock.companyName || '',
        sector: editStock.sector || '',
        marketCap: editStock.marketCap || '',
        quantity: editStock.quantity?.toString() || '',
        buyPrice: editStock.buyPrice?.toString() || '',
        currentPrice: editStock.currentPrice?.toString() || '',
      })
    } else if (open && !editStock) {
      methods.reset({
        symbol: '',
        companyName: '',
        sector: '',
        marketCap: '',
        quantity: '',
        buyPrice: '',
        currentPrice: '',
      })
    }
  }, [editStock, open, methods])

  const onSubmit = async (data) => {
    setIsSubmitting(true)

    try {
      const stockData = {
        symbol: data.symbol.trim().toUpperCase(),
        companyName: data.companyName.trim(),
        sector: data.sector,
        marketCap: data.marketCap,
        quantity: parseInt(data.quantity),
        buyPrice: parseFloat(data.buyPrice),
        currentPrice: data.currentPrice ? parseFloat(data.currentPrice) : parseFloat(data.buyPrice),
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

  // Watch values for smart defaults and calculations
  const watchedValues = methods.watch()
  const quantity = parseInt(watchedValues.quantity) || 0
  const buyPrice = parseFloat(watchedValues.buyPrice) || 0
  const currentPrice = parseFloat(watchedValues.currentPrice) || buyPrice
  const totalInvestment = quantity * buyPrice
  const currentValue = quantity * currentPrice
  const gainLoss = currentValue - totalInvestment
  const gainLossPercentage = totalInvestment > 0 ? ((gainLoss / totalInvestment) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {editStock ? 'Edit Stock' : 'Add New Stock'}
          </DialogTitle>
          <DialogDescription>
            {editStock 
              ? 'Update your stock holding details below.'
              : 'Add a new stock to your portfolio with enhanced tracking features.'
            }
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Stock Information Section */}
            <EnhancedFormSection
              title="Stock Information"
              subtitle="Basic details about the stock"
              icon={Building2}
            >
              <EnhancedFormLayout columns={2}>
                <div className="flex items-center gap-2">
                  <EnhancedFormField
                    name="symbol"
                    label="Stock Symbol"
                    placeholder={placeholderPatterns.financial.stockPrice}
                    required
                    disabled={isSubmitting}
                    helperText="NSE/BSE ticker symbol (e.g., RELIANCE, TCS)"
                    className="flex-1"
                    validate={(value) => {
                      if (!value) return "Stock symbol is required"
                      if (!/^[A-Z0-9]+$/.test(value)) return "Use only uppercase letters and numbers"
                      return true
                    }}
                  />
                  <HelpTooltip 
                    content="Enter the official stock symbol as listed on NSE or BSE exchanges"
                    side="top"
                  />
                </div>

                <EnhancedFormField
                  name="companyName"
                  label="Company Name"
                  placeholder={smartDefaults.getFieldDefaults('company').placeholder}
                  required
                  disabled={isSubmitting}
                  helperText="Full company name for better identification"
                  validate={validationHelpers.required}
                />
              </EnhancedFormLayout>

              <EnhancedFormLayout columns={2}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Sector <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={watchedValues.sector}
                    onValueChange={(value) => methods.setValue('sector', value, { shouldValidate: true })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {methods.formState.errors.sector && (
                    <p className="text-sm text-destructive">
                      {methods.formState.errors.sector.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Market Cap <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={watchedValues.marketCap}
                    onValueChange={(value) => methods.setValue('marketCap', value, { shouldValidate: true })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Select market cap" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKET_CAPS.map((cap) => (
                        <SelectItem key={cap} value={cap}>
                          {cap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {methods.formState.errors.marketCap && (
                    <p className="text-sm text-destructive">
                      {methods.formState.errors.marketCap.message}
                    </p>
                  )}
                </div>
              </EnhancedFormLayout>
            </EnhancedFormSection>

            {/* Investment Details Section */}
            <EnhancedFormSection
              title="Investment Details"
              subtitle="Quantity and pricing information"
              icon={DollarSign}
            >
              <EnhancedFormGroup
                title="Purchase Information"
                description="Details about your stock purchase"
              >
                <EnhancedFormLayout columns={3}>
                  <div className="flex items-center gap-2">
                    <EnhancedFormField
                      name="quantity"
                      type="number"
                      label="Quantity"
                      placeholder={placeholderPatterns.financial.quantity}
                      required
                      disabled={isSubmitting}
                      helperText="Number of shares purchased"
                      className="flex-1"
                      validate={(value) => {
                        const num = parseInt(value)
                        if (!value) return "Quantity is required"
                        if (isNaN(num) || num <= 0) return "Enter a valid positive number"
                        return true
                      }}
                    />
                    <HelpTooltip 
                      content="Enter the total number of shares you own"
                      side="top"
                    />
                  </div>

                  <EnhancedFormField
                    name="buyPrice"
                    type="number"
                    label="Buy Price (₹)"
                    placeholder={placeholderPatterns.financial.stockPrice}
                    required
                    disabled={isSubmitting}
                    helperText="Price per share when purchased"
                    validate={(value) => {
                      const num = parseFloat(value)
                      if (!value) return "Buy price is required"
                      if (isNaN(num) || num <= 0) return "Enter a valid positive price"
                      return true
                    }}
                  />

                  <EnhancedFormField
                    name="currentPrice"
                    type="number"
                    label="Current Price (₹)"
                    placeholder="Enter current market price"
                    disabled={isSubmitting}
                    helperText="Leave empty to use buy price"
                    validate={(value) => {
                      if (!value) return true
                      const num = parseFloat(value)
                      if (isNaN(num) || num <= 0) return "Enter a valid positive price"
                      return true
                    }}
                  />
                </EnhancedFormLayout>
              </EnhancedFormGroup>

              {/* Investment Summary */}
              {(quantity > 0 && buyPrice > 0) && (
                <EnhancedFormGroup
                  title="Investment Summary"
                  description="Calculated values based on your input"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Total Investment</div>
                      <div className="text-lg font-semibold text-foreground">
                        ₹{totalInvestment.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Current Value</div>
                      <div className="text-lg font-semibold text-foreground">
                        ₹{currentValue.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Gain/Loss</div>
                      <div className={`text-lg font-semibold ${gainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {gainLoss >= 0 ? '+' : ''}₹{gainLoss.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Return %</div>
                      <div className={`text-lg font-semibold ${gainLossPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {gainLossPercentage >= 0 ? '+' : ''}{gainLossPercentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </EnhancedFormGroup>
              )}
            </EnhancedFormSection>

            {/* Live Price Notice */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-primary font-medium">
                  Live Price Integration Coming Soon
                </span>
              </div>
              <p className="text-xs text-primary/80">
                Currently using manual price entry. Automatic price updates and real-time tracking will be available in future versions.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn-modern"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !methods.formState.isValid}
                className="btn-modern gradient-primary"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  editStock ? 'Update Stock' : 'Add Stock'
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
})

export default EnhancedAddStockModal