import React, { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Building2, Hash, DollarSign } from 'lucide-react'

export const AddEPFModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingEPF = null,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    employerName: '',
    pfNumber: '',
    status: 'Active',
    totalBalance: '',
    employeeContribution: '',
    employerContribution: '',
    pensionFund: '',
    monthlyContribution: '',
    startDate: '',
    endDate: ''
  })

  const [errors, setErrors] = useState({})

  // Reset form when modal opens/closes or when editing EPF changes
  useEffect(() => {
    if (isOpen) {
      if (editingEPF) {
        setFormData({
          employerName: editingEPF.employerName || '',
          pfNumber: editingEPF.pfNumber || '',
          status: editingEPF.status || 'Active',
          totalBalance: editingEPF.totalBalance?.toString() || '',
          employeeContribution: editingEPF.employeeContribution?.toString() || '',
          employerContribution: editingEPF.employerContribution?.toString() || '',
          pensionFund: editingEPF.pensionFund?.toString() || '',
          monthlyContribution: editingEPF.monthlyContribution?.toString() || '',
          startDate: editingEPF.startDate ? new Date(editingEPF.startDate).toISOString().split('T')[0] : '',
          endDate: editingEPF.endDate ? new Date(editingEPF.endDate).toISOString().split('T')[0] : ''
        })
      } else {
        setFormData({
          employerName: '',
          pfNumber: '',
          status: 'Active',
          totalBalance: '',
          employeeContribution: '',
          employerContribution: '',
          pensionFund: '',
          monthlyContribution: '',
          startDate: '',
          endDate: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, editingEPF])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Required fields
    if (!formData.employerName.trim()) {
      newErrors.employerName = 'Employer name is required'
    }

    if (!formData.pfNumber.trim()) {
      newErrors.pfNumber = 'PF number is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    // Numeric validations
    const numericFields = [
      'totalBalance', 'employeeContribution', 'employerContribution', 
      'pensionFund', 'monthlyContribution'
    ]

    numericFields.forEach(field => {
      const value = parseFloat(formData[field])
      if (!formData[field] || isNaN(value) || value < 0) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} must be a positive number`
      }
    })

    // Date validations
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    // Status-specific validations
    if (formData.status === 'Transferred' && !formData.endDate) {
      newErrors.endDate = 'End date is required for transferred accounts'
    }

    // Active accounts shouldn't have end date
    if (formData.status === 'Active' && formData.endDate) {
      newErrors.endDate = 'Active accounts should not have an end date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      employerName: formData.employerName.trim(),
      pfNumber: formData.pfNumber.trim(),
      status: formData.status,
      totalBalance: parseFloat(formData.totalBalance),
      employeeContribution: parseFloat(formData.employeeContribution),
      employerContribution: parseFloat(formData.employerContribution),
      pensionFund: parseFloat(formData.pensionFund),
      monthlyContribution: parseFloat(formData.monthlyContribution),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate && formData.status === 'Transferred' 
        ? new Date(formData.endDate).toISOString() 
        : null
    }

    try {
      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Error submitting EPF data:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      employerName: '',
      pfNumber: '',
      status: 'Active',
      totalBalance: '',
      employeeContribution: '',
      employerContribution: '',
      pensionFund: '',
      monthlyContribution: '',
      startDate: '',
      endDate: ''
    })
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {editingEPF ? 'Edit EPF Account' : 'Add EPF Account'}
          </DialogTitle>
          <DialogDescription>
            {editingEPF 
              ? 'Update your EPF account details below.'
              : 'Add a new EPF account to track your provident fund contributions.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name *</Label>
              <Input
                id="employerName"
                placeholder="e.g., ABC Technologies Ltd"
                value={formData.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
                className={errors.employerName ? 'border-destructive' : ''}
              />
              {errors.employerName && (
                <p className="text-sm text-destructive">{errors.employerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pfNumber">PF Number *</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pfNumber"
                  placeholder="e.g., KN/12345/67890"
                  value={formData.pfNumber}
                  onChange={(e) => handleInputChange('pfNumber', e.target.value)}
                  className={`pl-10 ${errors.pfNumber ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.pfNumber && (
                <p className="text-sm text-destructive">{errors.pfNumber}</p>
              )}
            </div>
          </div>

          {/* Status and Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Account Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`pl-10 ${errors.startDate ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date {formData.status === 'Transferred' ? '*' : ''}
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  disabled={formData.status === 'Active'}
                  className={`pl-10 ${errors.endDate ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Financial Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalBalance">Total Balance *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totalBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.totalBalance}
                    onChange={(e) => handleInputChange('totalBalance', e.target.value)}
                    className={`pl-10 ${errors.totalBalance ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.totalBalance && (
                  <p className="text-sm text-destructive">{errors.totalBalance}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyContribution">Monthly Contribution *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monthlyContribution"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.monthlyContribution}
                    onChange={(e) => handleInputChange('monthlyContribution', e.target.value)}
                    className={`pl-10 ${errors.monthlyContribution ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.monthlyContribution && (
                  <p className="text-sm text-destructive">{errors.monthlyContribution}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeContribution">Employee Contribution *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employeeContribution"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.employeeContribution}
                    onChange={(e) => handleInputChange('employeeContribution', e.target.value)}
                    className={`pl-10 ${errors.employeeContribution ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.employeeContribution && (
                  <p className="text-sm text-destructive">{errors.employeeContribution}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employerContribution">Employer Contribution *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employerContribution"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.employerContribution}
                    onChange={(e) => handleInputChange('employerContribution', e.target.value)}
                    className={`pl-10 ${errors.employerContribution ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.employerContribution && (
                  <p className="text-sm text-destructive">{errors.employerContribution}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionFund">Pension Fund *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pensionFund"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.pensionFund}
                    onChange={(e) => handleInputChange('pensionFund', e.target.value)}
                    className={`pl-10 ${errors.pensionFund ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.pensionFund && (
                  <p className="text-sm text-destructive">{errors.pensionFund}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingEPF ? 'Update Account' : 'Add Account')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}