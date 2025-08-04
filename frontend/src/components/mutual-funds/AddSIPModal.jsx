import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { portfolioStore } from '@/stores/PortfolioStore'

const FREQUENCIES = [
  'Monthly',
  'Quarterly',
  'Half-yearly',
  'Yearly'
]

const STATUSES = [
  'Active',
  'Paused',
  'Completed'
]

export const AddSIPModal = observer(({ open, onOpenChange, editingSIP, onClose }) => {
  const [formData, setFormData] = useState({
    mutualFundId: '',
    fundName: '',
    amount: '',
    frequency: '',
    nextDueDate: '',
    totalInstallments: '',
    completedInstallments: '',
    status: 'Active'
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or when editing SIP changes
  useEffect(() => {
    if (open) {
      if (editingSIP) {
        const nextDueDate = editingSIP.nextDueDate 
          ? new Date(editingSIP.nextDueDate).toISOString().split('T')[0]
          : ''
        
        setFormData({
          mutualFundId: editingSIP.mutualFundId || '',
          fundName: editingSIP.fundName || '',
          amount: editingSIP.amount?.toString() || '',
          frequency: editingSIP.frequency || '',
          nextDueDate,
          totalInstallments: editingSIP.totalInstallments?.toString() || '',
          completedInstallments: editingSIP.completedInstallments?.toString() || '0',
          status: editingSIP.status || 'Active'
        })
      } else {
        // Set default next due date to next month
        const nextMonth = new Date()
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        nextMonth.setDate(1) // Set to 1st of next month
        
        setFormData({
          mutualFundId: '',
          fundName: '',
          amount: '',
          frequency: 'Monthly',
          nextDueDate: nextMonth.toISOString().split('T')[0],
          totalInstallments: '',
          completedInstallments: '0',
          status: 'Active'
        })
      }
      setErrors({})
    }
  }, [open, editingSIP])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const calculateNextDueDate = (frequency, currentDate = new Date()) => {
    const date = new Date(currentDate)
    
    switch (frequency) {
      case 'Monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'Quarterly':
        date.setMonth(date.getMonth() + 3)
        break
      case 'Half-yearly':
        date.setMonth(date.getMonth() + 6)
        break
      case 'Yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      default:
        date.setMonth(date.getMonth() + 1)
    }
    
    return date.toISOString().split('T')[0]
  }

  const handleFrequencyChange = (frequency) => {
    handleInputChange('frequency', frequency)
    
    // Auto-calculate next due date if not editing
    if (!editingSIP) {
      const nextDue = calculateNextDueDate(frequency)
      handleInputChange('nextDueDate', nextDue)
    }
  }

  const handleMutualFundChange = (mutualFundId) => {
    // Convert "none" to empty string for storage
    const actualMutualFundId = mutualFundId === 'none' ? '' : mutualFundId
    handleInputChange('mutualFundId', actualMutualFundId)
    
    // Auto-fill fund name if mutual fund is selected
    if (actualMutualFundId) {
      const selectedFund = portfolioStore.mutualFunds.find(fund => fund.id === actualMutualFundId)
      if (selectedFund) {
        handleInputChange('fundName', selectedFund.name)
      }
    } else {
      // Clear fund name if no mutual fund selected
      handleInputChange('fundName', '')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fundName.trim()) {
      newErrors.fundName = 'Fund name is required'
    }

    if (!formData.amount) {
      newErrors.amount = 'SIP amount is required'
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'SIP amount must be a positive number'
      }
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required'
    }

    if (!formData.nextDueDate) {
      newErrors.nextDueDate = 'Next due date is required'
    } else {
      const dueDate = new Date(formData.nextDueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        newErrors.nextDueDate = 'Next due date cannot be in the past'
      }
    }

    if (!formData.totalInstallments) {
      newErrors.totalInstallments = 'Total installments is required'
    } else {
      const total = parseInt(formData.totalInstallments)
      if (isNaN(total) || total <= 0) {
        newErrors.totalInstallments = 'Total installments must be a positive number'
      }
    }

    if (formData.completedInstallments) {
      const completed = parseInt(formData.completedInstallments)
      const total = parseInt(formData.totalInstallments)
      
      if (isNaN(completed) || completed < 0) {
        newErrors.completedInstallments = 'Completed installments must be a non-negative number'
      } else if (!isNaN(total) && completed > total) {
        newErrors.completedInstallments = 'Completed installments cannot exceed total installments'
      }
    }

    if (!formData.status) {
      newErrors.status = 'Status is required'
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
      const sipData = {
        mutualFundId: formData.mutualFundId || null,
        fundName: formData.fundName.trim(),
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        nextDueDate: new Date(formData.nextDueDate).toISOString(),
        totalInstallments: parseInt(formData.totalInstallments),
        completedInstallments: parseInt(formData.completedInstallments) || 0,
        status: formData.status
      }

      if (editingSIP) {
        await portfolioStore.updateSIP(editingSIP.id, sipData)
      } else {
        const newSIP = await portfolioStore.addSIP(sipData)
        
        // Show additional message if a new mutual fund was likely created
        if (!formData.mutualFundId && formData.fundName) {
          // Check if this fund name is new by looking at existing funds
          const existingFund = portfolioStore.mutualFunds.find(fund => 
            fund.name.toLowerCase() === formData.fundName.toLowerCase()
          )
          if (!existingFund) {
            console.log('New mutual fund entry may have been created for:', formData.fundName)
          }
        }
      }

      handleClose()
    } catch (error) {
      console.error('Failed to save SIP:', error)
      setErrors({ submit: 'Failed to save SIP. Please try again.' })
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
            {editingSIP ? 'Edit SIP' : 'Add SIP'}
          </DialogTitle>
          <DialogDescription>
            {editingSIP 
              ? 'Update the details of your SIP investment.'
              : 'Add a new SIP to your portfolio.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mutualFund">Link to Existing Mutual Fund (Optional)</Label>
            <Select 
              value={formData.mutualFundId || 'none'} 
              onValueChange={handleMutualFundChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select existing mutual fund or leave blank for new" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Create new fund entry)</SelectItem>
                {portfolioStore.mutualFunds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.name} ({fund.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this SIP to an existing mutual fund to track combined investments
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundName">Fund Name *</Label>
            <Input
              id="fundName"
              placeholder="e.g., SBI Blue Chip Fund"
              value={formData.fundName}
              onChange={(e) => handleInputChange('fundName', e.target.value)}
              className={errors.fundName ? 'border-destructive' : ''}
              disabled={!!formData.mutualFundId}
            />
            {errors.fundName && (
              <p className="text-sm text-destructive">{errors.fundName}</p>
            )}
            {formData.mutualFundId && (
              <p className="text-xs text-muted-foreground">
                Fund name is auto-filled from selected mutual fund
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">SIP Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="5000"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className={errors.frequency ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.frequency && (
                <p className="text-sm text-destructive">{errors.frequency}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextDueDate">Next Due Date *</Label>
            <Input
              id="nextDueDate"
              type="date"
              value={formData.nextDueDate}
              onChange={(e) => handleInputChange('nextDueDate', e.target.value)}
              className={errors.nextDueDate ? 'border-destructive' : ''}
            />
            {errors.nextDueDate && (
              <p className="text-sm text-destructive">{errors.nextDueDate}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalInstallments">Total Installments *</Label>
              <Input
                id="totalInstallments"
                type="number"
                placeholder="12"
                min="1"
                value={formData.totalInstallments}
                onChange={(e) => handleInputChange('totalInstallments', e.target.value)}
                className={errors.totalInstallments ? 'border-destructive' : ''}
              />
              {errors.totalInstallments && (
                <p className="text-sm text-destructive">{errors.totalInstallments}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="completedInstallments">Completed Installments</Label>
              <Input
                id="completedInstallments"
                type="number"
                placeholder="0"
                min="0"
                value={formData.completedInstallments}
                onChange={(e) => handleInputChange('completedInstallments', e.target.value)}
                className={errors.completedInstallments ? 'border-destructive' : ''}
              />
              {errors.completedInstallments && (
                <p className="text-sm text-destructive">{errors.completedInstallments}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
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
                ? (editingSIP ? 'Updating...' : 'Adding...') 
                : (editingSIP ? 'Update SIP' : 'Add SIP')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})