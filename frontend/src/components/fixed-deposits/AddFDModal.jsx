import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnhancedSelect } from '@/components/ui/enhanced-select'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { portfolioStore } from '@/stores/PortfolioStore'
import { toast } from '@/lib/toast'

const BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank (PNB)',
  'Bank of India (BOI)',
  'Canara Bank',
  'Union Bank of India',
  'IDBI Bank',
  'Bank of Baroda',
  'Indian Bank',
  'Central Bank of India',
  'UCO Bank',
  'Punjab & Sind Bank',
  'Indian Overseas Bank',
  'Yes Bank',
  'IndusInd Bank',
  'Federal Bank',
  'South Indian Bank',
  'Karur Vysya Bank',
  'Tamilnad Mercantile Bank',
  'City Union Bank',
  'Dhanlaxmi Bank',
  'RBL Bank',
  'Bandhan Bank',
  'ESAF Small Finance Bank',
  'Equitas Small Finance Bank',
  'Jana Small Finance Bank',
  'Ujjivan Small Finance Bank',
  'Other'
]

const FD_TYPES = [
  'Simple',
  'Cumulative'
]

export const AddFDModal = observer(({ open, onOpenChange, editingFD, onClose }) => {
  const [formData, setFormData] = useState({
    bankName: '',
    investedAmount: '',
    interestRate: '',
    type: '',
    startDate: '',
    maturityDate: '',
    tenure: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or when editing FD changes
  useEffect(() => {
    if (open) {
      if (editingFD) {
        setFormData({
          bankName: editingFD.bankName || '',
          investedAmount: editingFD.investedAmount?.toString() || '',
          interestRate: editingFD.interestRate?.toString() || '',
          type: editingFD.type || '',
          startDate: editingFD.startDate ? new Date(editingFD.startDate).toISOString().split('T')[0] : '',
          maturityDate: editingFD.maturityDate ? new Date(editingFD.maturityDate).toISOString().split('T')[0] : '',
          tenure: editingFD.tenure?.toString() || ''
        })
      } else {
        setFormData({
          bankName: '',
          investedAmount: '',
          interestRate: '',
          type: '',
          startDate: '',
          maturityDate: '',
          tenure: ''
        })
      }
      setErrors({})
    }
  }, [open, editingFD])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-calculate tenure when dates change
    if (field === 'startDate' || field === 'maturityDate') {
      const startDate = field === 'startDate' ? value : formData.startDate
      const maturityDate = field === 'maturityDate' ? value : formData.maturityDate
      
      if (startDate && maturityDate) {
        const start = new Date(startDate)
        const maturity = new Date(maturityDate)
        
        if (maturity > start) {
          const diffTime = maturity - start
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const tenureMonths = Math.ceil(diffDays / 30)
          setFormData(prev => ({ ...prev, tenure: tenureMonths.toString() }))
        }
      }
    }
  }

  const calculateMaturityAmount = () => {
    const principal = parseFloat(formData.investedAmount)
    const rate = parseFloat(formData.interestRate)
    const tenureMonths = parseInt(formData.tenure)
    
    if (principal && rate && tenureMonths) {
      const years = tenureMonths / 12
      
      if (formData.type === 'Simple') {
        // Simple Interest: A = P + (P * R * T / 100)
        const interest = (principal * rate * years) / 100
        return principal + interest
      } else if (formData.type === 'Cumulative') {
        // Compound Interest (quarterly compounding): A = P(1 + R/400)^(4*T)
        const amount = principal * Math.pow(1 + rate / 400, 4 * years)
        return amount
      }
    }
    return 0
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required'
    }

    if (!formData.investedAmount) {
      newErrors.investedAmount = 'Invested amount is required'
    } else {
      const amount = parseFloat(formData.investedAmount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.investedAmount = 'Invested amount must be a positive number'
      }
    }

    if (!formData.interestRate) {
      newErrors.interestRate = 'Interest rate is required'
    } else {
      const rate = parseFloat(formData.interestRate)
      if (isNaN(rate) || rate <= 0 || rate > 20) {
        newErrors.interestRate = 'Interest rate must be between 0.1% and 20%'
      }
    }

    if (!formData.type) {
      newErrors.type = 'FD type is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.maturityDate) {
      newErrors.maturityDate = 'Maturity date is required'
    } else if (formData.startDate) {
      const startDate = new Date(formData.startDate)
      const maturityDate = new Date(formData.maturityDate)
      
      if (maturityDate <= startDate) {
        newErrors.maturityDate = 'Maturity date must be after start date'
      }
    }

    if (!formData.tenure) {
      newErrors.tenure = 'Tenure is required'
    } else {
      const tenure = parseInt(formData.tenure)
      if (isNaN(tenure) || tenure <= 0) {
        newErrors.tenure = 'Tenure must be a positive number'
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
      const maturityAmount = calculateMaturityAmount()
      
      const fdData = {
        bankName: formData.bankName.trim(),
        investedAmount: parseFloat(formData.investedAmount),
        interestRate: parseFloat(formData.interestRate),
        type: formData.type,
        startDate: new Date(formData.startDate).toISOString(),
        maturityDate: new Date(formData.maturityDate).toISOString(),
        tenure: parseInt(formData.tenure),
        maturityAmount: maturityAmount
      }

      if (editingFD) {
        await portfolioStore.updateFixedDeposit(editingFD.id, fdData)
        toast.crud.updated('Fixed deposit')
      } else {
        await portfolioStore.addFixedDeposit(fdData)
        toast.crud.created('Fixed deposit')
      }

      handleClose()
    } catch (error) {
      console.error('Failed to save FD:', error)
      if (editingFD) {
        toast.crud.updateError('Fixed deposit')
      } else {
        toast.crud.createError('Fixed deposit')
      }
      setErrors({ submit: 'Failed to save fixed deposit. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onOpenChange(false)
    }
  }

  const maturityAmount = calculateMaturityAmount()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFD ? 'Edit Fixed Deposit' : 'Add Fixed Deposit'}
          </DialogTitle>
          <DialogDescription>
            {editingFD 
              ? 'Update the details of your fixed deposit investment.'
              : 'Add a new fixed deposit to your portfolio.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name *</Label>
            <EnhancedSelect
              options={BANKS.filter(bank => bank !== 'Other')}
              value={formData.bankName}
              onValueChange={(value) => handleInputChange('bankName', value)}
              placeholder="Select or type bank name..."
              allowCustom={true}
              customPlaceholder="Enter bank name..."
              className={errors.bankName ? 'border-destructive' : ''}
            />
            {errors.bankName && (
              <p className="text-sm text-destructive">{errors.bankName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Select from popular banks or add your own custom bank name
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investedAmount">Invested Amount (₹) *</Label>
              <Input
                id="investedAmount"
                type="number"
                placeholder="100000"
                min="0"
                step="0.01"
                value={formData.investedAmount}
                onChange={(e) => handleInputChange('investedAmount', e.target.value)}
                className={errors.investedAmount ? 'border-destructive' : ''}
              />
              {errors.investedAmount && (
                <p className="text-sm text-destructive">{errors.investedAmount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (% p.a.) *</Label>
              <Input
                id="interestRate"
                type="number"
                placeholder="6.5"
                min="0.1"
                max="20"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                className={errors.interestRate ? 'border-destructive' : ''}
              />
              {errors.interestRate && (
                <p className="text-sm text-destructive">{errors.interestRate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">FD Type *</Label>
            <EnhancedSelect
              options={FD_TYPES.map(type => `${type} Interest`)}
              value={formData.type ? `${formData.type} Interest` : ''}
              onValueChange={(value) => handleInputChange('type', value.replace(' Interest', ''))}
              placeholder="Select FD type..."
              className={errors.type ? 'border-destructive' : ''}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Simple: Interest paid periodically. Cumulative: Interest compounded quarterly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={errors.startDate ? 'border-destructive' : ''}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date *</Label>
              <Input
                id="maturityDate"
                type="date"
                value={formData.maturityDate}
                onChange={(e) => handleInputChange('maturityDate', e.target.value)}
                className={errors.maturityDate ? 'border-destructive' : ''}
              />
              {errors.maturityDate && (
                <p className="text-sm text-destructive">{errors.maturityDate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenure">Tenure (months) *</Label>
            <Input
              id="tenure"
              type="number"
              placeholder="12"
              min="1"
              value={formData.tenure}
              onChange={(e) => handleInputChange('tenure', e.target.value)}
              className={errors.tenure ? 'border-destructive' : ''}
              readOnly={formData.startDate && formData.maturityDate}
            />
            {errors.tenure && (
              <p className="text-sm text-destructive">{errors.tenure}</p>
            )}
            {formData.startDate && formData.maturityDate && (
              <p className="text-xs text-muted-foreground">
                Auto-calculated based on start and maturity dates
              </p>
            )}
          </div>

          {/* Maturity Amount Preview */}
          {maturityAmount > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">
                  Expected Maturity Amount:
                </span>
                <span className="text-lg font-bold text-green-900 font-mono">
                  ₹{maturityAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-green-700">
                  Interest Earned:
                </span>
                <span className="text-sm font-semibold text-green-800 font-mono">
                  ₹{(maturityAmount - parseFloat(formData.investedAmount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {editingFD ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                editingFD ? 'Update FD' : 'Add FD'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})