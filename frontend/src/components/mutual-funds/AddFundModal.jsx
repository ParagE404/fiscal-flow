import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { portfolioStore } from '@/stores/PortfolioStore'
import { mutualFundSchema } from '@/lib/validationSchemas'
import { toast } from '@/lib/toast'
import { RefreshCw, AlertCircle, Info } from 'lucide-react'

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
  const form = useForm({
    resolver: zodResolver(mutualFundSchema),
    defaultValues: {
      name: '',
      category: '',
      riskLevel: '',
      rating: 1,
      investedAmount: 0,
      currentValue: 0,
      isin: '',
      schemeCode: '',
      enableAutoSync: false,
      manualOverride: false
    }
  })

  const { handleSubmit, reset, formState: { isSubmitting }, watch } = form

  // Reset form when modal opens/closes or when editing fund changes
  useEffect(() => {
    if (open) {
      if (editingFund) {
        reset({
          name: editingFund.name || '',
          category: editingFund.category || '',
          riskLevel: editingFund.riskLevel || '',
          rating: editingFund.rating || 1,
          investedAmount: editingFund.investedAmount || 0,
          currentValue: editingFund.currentValue || 0,
          isin: editingFund.isin || '',
          schemeCode: editingFund.schemeCode || '',
          enableAutoSync: editingFund.enableAutoSync || false,
          manualOverride: editingFund.manualOverride || false
        })
      } else {
        reset({
          name: '',
          category: '',
          riskLevel: '',
          rating: 1,
          investedAmount: 0,
          currentValue: 0,
          isin: '',
          schemeCode: '',
          enableAutoSync: false,
          manualOverride: false
        })
      }
    }
  }, [open, editingFund, reset])

  const onSubmit = async (data) => {
    try {
      const fundData = {
        name: data.name.trim(),
        category: data.category,
        riskLevel: data.riskLevel,
        rating: data.rating,
        investedAmount: data.investedAmount,
        currentValue: data.currentValue,
        isin: data.isin ? data.isin.trim().toUpperCase() : null,
        schemeCode: data.schemeCode ? data.schemeCode.trim() : null,
        enableAutoSync: data.enableAutoSync,
        manualOverride: data.manualOverride
      }

      if (editingFund) {
        await portfolioStore.updateMutualFund(editingFund.id, fundData)
        toast.crud.updated('Mutual fund')
      } else {
        await portfolioStore.addMutualFund(fundData)
        toast.crud.created('Mutual fund')
      }

      handleClose()
    } catch (error) {
      console.error('Failed to save fund:', error)
      if (editingFund) {
        toast.crud.updateError('Mutual fund')
      } else {
        toast.crud.createError('Mutual fund')
      }
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

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SBI Blue Chip Fund"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RISK_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (1-5 stars) *</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <SelectItem key={rating} value={rating.toString()}>
                          {rating} Star{rating > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="investedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invested Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12000"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-Sync Configuration Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-medium">Auto-Sync Configuration</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISIN Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., INF123456789"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={isSubmitting}
                          maxLength={12}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Required for automatic NAV updates
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schemeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheme Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 123456"
                          {...field}
                          disabled={isSubmitting}
                          maxLength={10}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Alternative identifier for NAV matching
                      </p>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="enableAutoSync"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Auto-Sync</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Automatically update NAV and current value daily
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watch('enableAutoSync') && (
                <FormField
                  control={form.control}
                  name="manualOverride"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-amber-50 border-amber-200">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          Manual Override
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Prevent automatic updates and keep manual values
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {!watch('isin') && !watch('schemeCode') && watch('enableAutoSync') && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">ISIN or Scheme Code Required</p>
                    <p>Please provide either ISIN code or scheme code to enable automatic NAV updates from AMFI data feed.</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {editingFund ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  editingFund ? 'Update Fund' : 'Add Fund'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
})