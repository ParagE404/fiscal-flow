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
import { Switch } from '@/components/ui/switch'
import { Calendar, Building2, Hash, DollarSign, CreditCard, RefreshCw, AlertCircle, Info, Key } from 'lucide-react'
import { validatePFNumber, validateUAN, EPF_CONSTANTS } from '@/lib/indianMarketContext'

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
    uan: '',
    status: 'Active',
    totalBalance: '',
    employeeContribution: '',
    employerContribution: '',
    pensionFund: '',
    monthlyContribution: '',
    contributionRate: '12',
    startDate: '',
    endDate: '',
    enableAutoSync: false,
    manualOverride: false,
    syncFrequency: 'monthly'
  })

  const [errors, setErrors] = useState({})

  // Reset form when modal opens/closes or when editing EPF changes
  useEffect(() => {
    if (isOpen) {
      if (editingEPF) {
        setFormData({
          employerName: editingEPF.employerName || '',
          pfNumber: editingEPF.pfNumber || '',
          uan: editingEPF.uan || '',
          status: editingEPF.status || 'Active',
          totalBalance: editingEPF.totalBalance?.toString() || '',
          employeeContribution: editingEPF.employeeContribution?.toString() || '',
          employerContribution: editingEPF.employerContribution?.toString() || '',
          pensionFund: editingEPF.pensionFund?.toString() || '',
          monthlyContribution: editingEPF.monthlyContribution?.toString() || '',
          contributionRate: editingEPF.contributionRate?.toString() || '12',
          startDate: editingEPF.startDate ? new Date(editingEPF.startDate).toISOString().split('T')[0] : '',
          endDate: editingEPF.endDate ? new Date(editingEPF.endDate).toISOString().split('T')[0] : '',
          enableAutoSync: editingEPF.enableAutoSync || false,
          manualOverride: editingEPF.manualOverride || false,
          syncFrequency: editingEPF.syncFrequency || 'monthly'
        })
      } else {
        setFormData({
          employerName: '',
          pfNumber: '',
          uan: '',
          status: 'Active',
          totalBalance: '',
          employeeContribution: '',
          employerContribution: '',
          pensionFund: '',
          monthlyContribution: '',
          contributionRate: '12',
          startDate: '',
          endDate: '',
          enableAutoSync: false,
          manualOverride: false,
          syncFrequency: 'monthly'
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
    } else if (!validatePFNumber(formData.pfNumber.trim())) {
      newErrors.pfNumber = 'Invalid PF number format. Expected format: XX/XXX/0000000/000/0000000'
    }

    // UAN validation (optional but if provided should be valid, required if auto-sync enabled)
    if (formData.enableAutoSync && (!formData.uan || !formData.uan.trim())) {
      newErrors.uan = 'UAN is required when auto-sync is enabled'
    } else if (formData.uan && formData.uan.trim() && !validateUAN(formData.uan.trim())) {
      newErrors.uan = 'UAN must be a 12-digit number'
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
      pfNumber: formData.pfNumber.trim().toUpperCase(),
      uan: formData.uan ? formData.uan.trim() : null,
      status: formData.status,
      totalBalance: parseFloat(formData.totalBalance),
      employeeContribution: parseFloat(formData.employeeContribution),
      employerContribution: parseFloat(formData.employerContribution),
      pensionFund: parseFloat(formData.pensionFund),
      monthlyContribution: parseFloat(formData.monthlyContribution),
      contributionRate: parseFloat(formData.contributionRate),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate && formData.status === 'Transferred' 
        ? new Date(formData.endDate).toISOString() 
        : null,
      enableAutoSync: formData.enableAutoSync,
      manualOverride: formData.manualOverride,
      syncFrequency: formData.syncFrequency
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
      uan: '',
      status: 'Active',
      totalBalance: '',
      employeeContribution: '',
      employerContribution: '',
      pensionFund: '',
      monthlyContribution: '',
      contributionRate: '12',
      startDate: '',
      endDate: '',
      enableAutoSync: false,
      manualOverride: false,
      syncFrequency: 'monthly'
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
          <div className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pfNumber">PF Number *</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pfNumber"
                    placeholder="e.g., KN/BNG/1234567/000/1234567"
                    value={formData.pfNumber}
                    onChange={(e) => handleInputChange('pfNumber', e.target.value.toUpperCase())}
                    className={`pl-10 ${errors.pfNumber ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.pfNumber && (
                  <p className="text-sm text-destructive">{errors.pfNumber}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Format: XX/XXX/0000000/000/0000000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uan">UAN (Universal Account Number)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="uan"
                    placeholder="e.g., 123456789012"
                    maxLength="12"
                    value={formData.uan}
                    onChange={(e) => handleInputChange('uan', e.target.value.replace(/\D/g, ''))}
                    className={`pl-10 ${errors.uan ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.uan && (
                  <p className="text-sm text-destructive">{errors.uan}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  12-digit number (optional)
                </p>
              </div>
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
                  <SelectItem value="Active">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="Transferred">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Transferred
                    </div>
                  </SelectItem>
                  <SelectItem value="Settled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      Settled
                    </div>
                  </SelectItem>
                  <SelectItem value="Inoperative">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Inoperative
                    </div>
                  </SelectItem>
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
            
            <div className="grid grid-cols-3 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="contributionRate">Contribution Rate (%)</Label>
                <Input
                  id="contributionRate"
                  type="number"
                  step="0.1"
                  min="8"
                  max="15"
                  placeholder="12"
                  value={formData.contributionRate}
                  onChange={(e) => handleInputChange('contributionRate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Standard rate: {EPF_CONSTANTS.EMPLOYEE_CONTRIBUTION_RATE}%
                </p>
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

          {/* Auto-Sync Configuration Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-medium">Auto-Sync Configuration</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Auto-Sync</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically update EPF balance from EPFO portal
                  </div>
                </div>
                <Switch
                  checked={formData.enableAutoSync}
                  onCheckedChange={(checked) => handleInputChange('enableAutoSync', checked)}
                  disabled={loading}
                />
              </div>

              {formData.enableAutoSync && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="syncFrequency">Sync Frequency</Label>
                    <Select 
                      value={formData.syncFrequency} 
                      onValueChange={(value) => handleInputChange('syncFrequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Monthly (Recommended)
                          </div>
                        </SelectItem>
                        <SelectItem value="quarterly">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Quarterly
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Monthly sync runs on the 1st of each month
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 border-amber-200">
                    <div className="space-y-0.5">
                      <Label className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        Manual Override
                      </Label>
                      <div className="text-sm text-muted-foreground">
                        Prevent automatic updates and keep manual values
                      </div>
                    </div>
                    <Switch
                      checked={formData.manualOverride}
                      onCheckedChange={(checked) => handleInputChange('manualOverride', checked)}
                      disabled={loading}
                    />
                  </div>

                  {!formData.uan && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">UAN Required for Auto-Sync</p>
                        <p>Please provide your UAN (Universal Account Number) to enable automatic balance updates from EPFO portal.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Key className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="text-sm text-orange-700">
                      <p className="font-medium">EPFO Credentials Required</p>
                      <p>You'll need to configure your EPFO portal credentials in Settings → Sync Settings to enable automatic updates.</p>
                    </div>
                  </div>
                </>
              )}
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