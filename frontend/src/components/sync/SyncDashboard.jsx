import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  SyncStatusIndicator, 
  SyncStatusBadge, 
  InvestmentTypeSyncStatus,
  ManualSyncPanel,
  SyncHistoryDisplay
} from './index'

/**
 * SyncDashboard Component
 * Complete sync management dashboard combining all sync UI components
 * This serves as an example of how to use the sync components together
 */
export const SyncDashboard = observer(function SyncDashboard({
  className = ''
}) {
  // Mock data for demonstration
  const [syncStates, setSyncStates] = useState({
    mutual_funds: {
      status: 'synced',
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      progress: 100
    },
    epf: {
      status: 'failed',
      lastSyncAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      progress: 0
    },
    stocks: {
      status: 'in_progress',
      lastSyncAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      progress: 65,
      currentStep: 'Fetching prices',
      currentStepIndex: 2,
      totalSteps: 4
    }
  })

  const mockSyncHistory = [
    {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      investmentType: 'mutual_funds',
      status: 'success',
      recordsProcessed: 15,
      recordsUpdated: 12,
      duration: 45000,
      source: 'AMFI'
    },
    {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      investmentType: 'epf',
      status: 'failed',
      recordsProcessed: 0,
      recordsUpdated: 0,
      duration: 5000,
      source: 'EPFO',
      error: {
        type: 'authentication_failed',
        message: 'Invalid credentials provided',
        details: {
          errorCode: 'AUTH_001',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    },
    {
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      investmentType: 'stocks',
      status: 'partial',
      recordsProcessed: 25,
      recordsUpdated: 20,
      duration: 30000,
      source: 'Yahoo Finance',
      error: {
        type: 'rate_limit_exceeded',
        message: 'API rate limit exceeded for 5 stocks',
        details: {
          failedSymbols: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFC.NS', 'ICICIBANK.NS']
        }
      }
    }
  ]

  const handleManualSync = async (investmentType) => {
    console.log(`Starting manual sync for ${investmentType}`)
    
    // Update state to show sync in progress
    setSyncStates(prev => ({
      ...prev,
      [investmentType]: {
        ...prev[investmentType],
        status: 'running',
        progress: 0,
        currentStep: 'Initializing',
        currentStepIndex: 0
      }
    }))

    // Simulate sync progress
    const steps = ['Connecting', 'Fetching data', 'Processing', 'Updating']
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSyncStates(prev => ({
        ...prev,
        [investmentType]: {
          ...prev[investmentType],
          progress: ((i + 1) / steps.length) * 100,
          currentStep: steps[i],
          currentStepIndex: i,
          totalSteps: steps.length
        }
      }))
    }

    // Complete sync
    setSyncStates(prev => ({
      ...prev,
      [investmentType]: {
        ...prev[investmentType],
        status: 'completed',
        lastSyncAt: new Date(),
        progress: 100
      }
    }))

    // Reset to synced after a moment
    setTimeout(() => {
      setSyncStates(prev => ({
        ...prev,
        [investmentType]: {
          ...prev[investmentType],
          status: 'synced'
        }
      }))
    }, 2000)
  }

  const handleRefreshHistory = () => {
    console.log('Refreshing sync history')
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mutual Funds</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncStatusIndicator
                syncStatus={syncStates.mutual_funds.status}
                syncType="mutual_funds"
                lastSyncAt={syncStates.mutual_funds.lastSyncAt}
                onManualSync={() => handleManualSync('mutual_funds')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">EPF Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncStatusIndicator
                syncStatus={syncStates.epf.status}
                syncType="epf"
                lastSyncAt={syncStates.epf.lastSyncAt}
                onManualSync={() => handleManualSync('epf')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              <SyncStatusIndicator
                syncStatus={syncStates.stocks.status}
                syncType="stocks"
                lastSyncAt={syncStates.stocks.lastSyncAt}
                onManualSync={() => handleManualSync('stocks')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Status Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <SyncStatusBadge
                syncStatus={syncStates.mutual_funds.status}
                syncType="mutual_funds"
                lastSyncAt={syncStates.mutual_funds.lastSyncAt}
              />
              <SyncStatusBadge
                syncStatus={syncStates.epf.status}
                syncType="epf"
                lastSyncAt={syncStates.epf.lastSyncAt}
              />
              <SyncStatusBadge
                syncStatus={syncStates.stocks.status}
                syncType="stocks"
                lastSyncAt={syncStates.stocks.lastSyncAt}
              />
            </div>
          </CardContent>
        </Card>

        {/* Investment Type Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Investment Sync Status</h3>
          <InvestmentTypeSyncStatus
            investmentType="mutual_funds"
            syncStatus={syncStates.mutual_funds.status}
            lastSyncAt={syncStates.mutual_funds.lastSyncAt}
            onManualSync={() => handleManualSync('mutual_funds')}
          />
          <InvestmentTypeSyncStatus
            investmentType="epf"
            syncStatus={syncStates.epf.status}
            lastSyncAt={syncStates.epf.lastSyncAt}
            onManualSync={() => handleManualSync('epf')}
          />
          <InvestmentTypeSyncStatus
            investmentType="stocks"
            syncStatus={syncStates.stocks.status}
            lastSyncAt={syncStates.stocks.lastSyncAt}
            onManualSync={() => handleManualSync('stocks')}
          />
        </div>

        {/* Tabs for Manual Sync and History */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Sync</TabsTrigger>
            <TabsTrigger value="history">Sync History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <ManualSyncPanel
              onSync={handleManualSync}
              syncStates={syncStates}
            />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <SyncHistoryDisplay
              syncHistory={mockSyncHistory}
              onRefresh={handleRefreshHistory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
})