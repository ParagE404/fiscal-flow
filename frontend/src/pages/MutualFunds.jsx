import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import { portfolioStore } from '@/stores/PortfolioStore'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { MutualFundsList } from '@/components/mutual-funds/MutualFundsList'
import { SIPsList } from '@/components/mutual-funds/SIPsList'
import { AddFundModal } from '@/components/mutual-funds/AddFundModal'
import { AddSIPModal } from '@/components/mutual-funds/AddSIPModal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { apiClient } from '@/lib/apiClient'
import { toast } from '@/lib/toast'

export const MutualFunds = observer(() => {
  const [showAddFundModal, setShowAddFundModal] = useState(false)
  const [showAddSIPModal, setShowAddSIPModal] = useState(false)
  const [activeTab, setActiveTab] = useState('funds')

  useEffect(() => {
    portfolioStore.fetchMutualFunds()
    portfolioStore.fetchSIPs()
  }, [])

  // Calculate summary data
  const totalInvested = portfolioStore.mutualFunds.reduce((sum, fund) => sum + (fund.investedAmount || 0), 0)
  const totalCurrentValue = portfolioStore.mutualFunds.reduce((sum, fund) => sum + (fund.currentValue || 0), 0)
  const avgCAGR = portfolioStore.mutualFunds.length > 0 
    ? portfolioStore.mutualFunds.reduce((sum, fund) => sum + (fund.cagr || 0), 0) / portfolioStore.mutualFunds.length 
    : 0

  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await apiClient.exportMutualFunds()
      
      // Create and download CSV file
      const blob = new Blob([response], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mutual-funds-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Mutual funds data exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Mutual Funds</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track your mutual fund investments and SIPs</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleExport} disabled={isExporting} size="sm" className="sm:size-default">
            {isExporting ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
            <span className="sm:hidden">{isExporting ? '...' : 'Export'}</span>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CAGR Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(avgCAGR)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Mutual Funds and SIPs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="funds" className="flex-1 sm:flex-none">
              <span className="hidden sm:inline">My Mutual Funds</span>
              <span className="sm:hidden">Funds</span>
            </TabsTrigger>
            <TabsTrigger value="sips" className="flex-1 sm:flex-none">
              <span className="hidden sm:inline">Active SIPs</span>
              <span className="sm:hidden">SIPs</span>
            </TabsTrigger>
          </TabsList>
          
          <Button 
            data-tour="add-button"
            onClick={() => activeTab === 'funds' ? setShowAddFundModal(true) : setShowAddSIPModal(true)}
            size="sm"
            className="sm:size-default w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'funds' ? 'Add Fund' : 'Add SIP'}
          </Button>
        </div>

        <TabsContent value="funds" className="space-y-4">
          <MutualFundsList />
        </TabsContent>

        <TabsContent value="sips" className="space-y-4">
          <SIPsList />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddFundModal 
        open={showAddFundModal} 
        onOpenChange={setShowAddFundModal}
      />
      
      <AddSIPModal 
        open={showAddSIPModal} 
        onOpenChange={setShowAddSIPModal}
      />
    </div>
  )
})