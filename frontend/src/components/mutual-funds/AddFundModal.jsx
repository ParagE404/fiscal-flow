import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { portfolioStore } from '@/stores/PortfolioStore'

const CATEGORIES = [
  'Large Cap',
  'Mid Cap', 
  'Small Cap',
  'Multi Cap',
  'Flexi Cap',
  'Hybrid',
  'Debt',
  'ELSS',
  'Index',
  'Sectoral',
  'Thematic'
]

const RISK_LEVELS = [
  'Low',
  'Moderate', 
  'High'
]

export const AddFundModal = observer(({ open, onOpenChange, editingFund, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    riskLevel: '',
    rating: '',
    investedAmount: '',
    currentValue: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or when editing fund changes
  useEffect(() => {
    if (open) {
      if (editingFund) {
        setFormData({
          name: editingFund.name || '',
          category: editingFund.category || '',
          riskLevel: editingFund.riskLevel || '',
          rating: editingFund.rating?.toString() || '',
          investedAmount: editingFund.investedAmount?.toString() || '',
          currentValue: editingFund.currentValue?.toString() || ''
        })
      } else {
        setFormData({
          name: '',
          category: '',
          riskLevel: '',
          rating: '',
          investedAmount: '',
          currentValue: ''
        })
      }
      setErrors({})
    }
  }, [open, editingFund])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Fund name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.riskLevel) {
      newErrors.riskLevel = 'Risk level is required'
    }

    if (!formData.rating) {
      newErrors.rating = 'Rating is required'
    } else {
      const rating = parseInt(formData.rating)
      if (isNaN(rating) || rating < 1 || rating > 5) {
        newErrors.rating = 'Rating must be between 1 and 5'
      }
    }

    if (!formData.investedAmount) {
      newErrors.investedAmount = 'Invested amount is required'
    } else {
      const amount = parseFloat(formData.investedAmount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.investedAmount = 'Invested amount must be a positive number'
      }
    }

    if (!formData.currentValue) {
      newErrors.currentValue = 'Current value is required'
    } else {
      const amount = parseFloat(formData.currentValue)
      if (isNaN(amount) || amount < 0) {
        newErrors.currentValue = 'Current value must be a non-negative number'
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
      const fundData = {
        name: formData.name.trim(),
        category: formData.category,
        riskLevel: formData.riskLevel,
        rating: parseInt(formData.rating),
        investedAmount: parseFloat(formData.investedAmount),
        currentValue: parseFloat(formData.currentValue)
      }

      if (editingFund) {
        await portfolioStore.updateMutualFund(editingFund.id, fundData)
      } else {
        await portfolioStore.addMutualFund(fundData)
      }

      handleClose()
    } catch (error) {
      console.error('Failed to save fund:', error)
      setErrors({ submit: 'Failed to save fund. Please try again.' })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingFund ? 'Edit Mutual Fund' : 'Add Mutual Fund'}
          </DialogTitle>
          <DialogDescription>
            {editingFund 
              ? 'Update the details of your mutual fund investment.'
              : 'Add a new mutual fund to your portfolio.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Fund Name *</Label>
            <Input
              id="name"
              placeholder="e.g., SBI Blue Chip Fund"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level *</Label>
              <Select 
                value={formData.riskLevel} 
                onValueChange={(value) => handleInputChange('riskLevel', value)}
              >
                <SelectTrigger className={errors.riskLevel ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.riskLevel && (
                <p className="text-sm text-destructive">{errors.riskLevel}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">Rating (1-5 stars) *</Label>
            <Select 
              value={formData.rating} 
              onValueChange={(value) => handleInputChange('rating', value)}
            >
              <SelectTrigger className={errors.rating ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <SelectItem key={rating} value={rating.toString()}>
                    {rating} Star{rating > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investedAmount">Invested Amount (₹) *</Label>
              <Input
                id="investedAmount"
                type="number"
                placeholder="10000"
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
              <Label htmlFor="currentValue">Current Value (₹) *</Label>
              <Input
                id="currentValue"
                type="number"
                placeholder="12000"
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => handleInputChange('currentValue', e.target.value)}
                className={errors.currentValue ? 'border-destructive' : ''}
              />
              {errors.currentValue && (
                <p className="text-sm text-destructive">{errors.currentValue}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <p className="text-sm text-destructive">{errors.submit}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingFund ? 'Updating...' : 'Adding...') 
                : (editingFund ? 'Update Fund' : 'Add Fund')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})