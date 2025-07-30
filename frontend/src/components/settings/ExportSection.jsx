import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Building2, 
  Briefcase, 
  BarChart3,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/apiClient'

export function ExportSection() {
  const [exportStates, setExportStates] = useState({
    all: 'idle',
    mutualFunds: 'idle',
    fixedDeposits: 'idle',
    epf: 'idle',
    stocks: 'idle'
  })

  const updateExportState = (type, state) => {
    setExportStates(prev => ({ ...prev, [type]: state }))
  }

  const downloadCSV = (csvData, filename) => {
    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      throw new Error('Failed to download file')
    }
  }

  const handleExportAll = async () => {
    updateExportState('all', 'loading')
    
    try {
      const csvData = await apiClient.exportAll()
      const filename = `portfolio_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      updateExportState('all', 'success')
      toast.success('Complete portfolio exported successfully')
      
      // Reset success state after 2 seconds
      setTimeout(() => updateExportState('all', 'idle'), 2000)
    } catch (error) {
      console.error('Error exporting complete portfolio:', error)
      updateExportState('all', 'idle')
      toast.error('Failed to export complete portfolio')
    }
  }

  const handleExportMutualFunds = async () => {
    updateExportState('mutualFunds', 'loading')
    
    try {
      const csvData = await apiClient.exportMutualFunds()
      const filename = `mutual_funds_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      updateExportState('mutualFunds', 'success')
      toast.success('Mutual funds data exported successfully')
      
      setTimeout(() => updateExportState('mutualFunds', 'idle'), 2000)
    } catch (error) {
      console.error('Error exporting mutual funds:', error)
      updateExportState('mutualFunds', 'idle')
      toast.error('Failed to export mutual funds data')
    }
  }

  const handleExportFixedDeposits = async () => {
    updateExportState('fixedDeposits', 'loading')
    
    try {
      const csvData = await apiClient.exportFixedDeposits()
      const filename = `fixed_deposits_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      updateExportState('fixedDeposits', 'success')
      toast.success('Fixed deposits data exported successfully')
      
      setTimeout(() => updateExportState('fixedDeposits', 'idle'), 2000)
    } catch (error) {
      console.error('Error exporting fixed deposits:', error)
      updateExportState('fixedDeposits', 'idle')
      toast.error('Failed to export fixed deposits data')
    }
  }

  const handleExportEPF = async () => {
    updateExportState('epf', 'loading')
    
    try {
      const csvData = await apiClient.exportEPF()
      const filename = `epf_accounts_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      updateExportState('epf', 'success')
      toast.success('EPF accounts data exported successfully')
      
      setTimeout(() => updateExportState('epf', 'idle'), 2000)
    } catch (error) {
      console.error('Error exporting EPF accounts:', error)
      updateExportState('epf', 'idle')
      toast.error('Failed to export EPF accounts data')
    }
  }

  const handleExportStocks = async () => {
    updateExportState('stocks', 'loading')
    
    try {
      const csvData = await apiClient.exportStocks()
      const filename = `stocks_export_${new Date().toISOString().split('T')[0]}.csv`
      
      downloadCSV(csvData, filename)
      updateExportState('stocks', 'success')
      toast.success('Stocks data exported successfully')
      
      setTimeout(() => updateExportState('stocks', 'idle'), 2000)
    } catch (error) {
      console.error('Error exporting stocks:', error)
      updateExportState('stocks', 'idle')
      toast.error('Failed to export stocks data')
    }
  }

  const getButtonContent = (state, defaultIcon, defaultText) => {
    switch (state) {
      case 'loading':
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Exported!
          </>
        )
      default:
        return (
          <>
            {defaultIcon}
            {defaultText}
          </>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Download your investment data in CSV format for backup or analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Complete Portfolio Export */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Complete Portfolio</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Export all your investment data in a single comprehensive CSV file
            </p>
            <Button 
              onClick={handleExportAll}
              disabled={exportStates.all === 'loading'}
              className="w-full"
              variant={exportStates.all === 'success' ? 'default' : 'outline'}
            >
              {getButtonContent(
                exportStates.all,
                <FileText className="w-4 h-4 mr-2" />,
                'Export Complete Portfolio'
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Category-wise Exports */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Category-wise Export</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Export specific investment categories individually
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Mutual Funds Export */}
            <Button 
              onClick={handleExportMutualFunds}
              disabled={exportStates.mutualFunds === 'loading'}
              variant={exportStates.mutualFunds === 'success' ? 'default' : 'outline'}
              className="justify-start"
            >
              {getButtonContent(
                exportStates.mutualFunds,
                <TrendingUp className="w-4 h-4 mr-2" />,
                'Export Mutual Funds'
              )}
            </Button>

            {/* Fixed Deposits Export */}
            <Button 
              onClick={handleExportFixedDeposits}
              disabled={exportStates.fixedDeposits === 'loading'}
              variant={exportStates.fixedDeposits === 'success' ? 'default' : 'outline'}
              className="justify-start"
            >
              {getButtonContent(
                exportStates.fixedDeposits,
                <Building2 className="w-4 h-4 mr-2" />,
                'Export Fixed Deposits'
              )}
            </Button>

            {/* EPF Export */}
            <Button 
              onClick={handleExportEPF}
              disabled={exportStates.epf === 'loading'}
              variant={exportStates.epf === 'success' ? 'default' : 'outline'}
              className="justify-start"
            >
              {getButtonContent(
                exportStates.epf,
                <Briefcase className="w-4 h-4 mr-2" />,
                'Export EPF Accounts'
              )}
            </Button>

            {/* Stocks Export */}
            <Button 
              onClick={handleExportStocks}
              disabled={exportStates.stocks === 'loading'}
              variant={exportStates.stocks === 'success' ? 'default' : 'outline'}
              className="justify-start"
            >
              {getButtonContent(
                exportStates.stocks,
                <BarChart3 className="w-4 h-4 mr-2" />,
                'Export Stocks'
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Export Information */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Export Information</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• All exports are in CSV format with Indian currency formatting</p>
            <p>• Files include comprehensive data with calculations and dates</p>
            <p>• Export files are named with current date for easy organization</p>
            <p>• Data is exported in real-time from your current portfolio</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}