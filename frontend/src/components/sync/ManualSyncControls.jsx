import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Play
} from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

/**
 * SyncNowButton Component
 * Individual sync button with loading states
 * Requirements: 7.5, 7.2, 7.3
 */
export const SyncNowButton = observer(function SyncNowButton({
  investmentType,
  onSync,
  isLoading = false,
  disabled = false,
  className = '',
  size = 'default',
  variant = 'outline'
}) {
  const getTypeConfig = () => {
    switch (investmentType) {
      case 'mutual_funds':
        return {
          label: 'Sync MF',
          fullLabel: 'Sync Mutual Funds',
          icon: '📈',
          estimatedTime: '30-60 seconds'
        }
      case 'epf':
        return {
          label: 'Sync EPF',
          fullLabel: 'Sync EPF Accounts',
          icon: '🏦',
          estimatedTime: '1-2 minutes'
        }
      case 'stocks':
        return {
          label: 'Sync Stocks',
          fullLabel: 'Sync Stock Prices',
          icon: '📊',
          estimatedTime: '15-30 seconds'
        }
      default:
        return {
          label: 'Sync',
          fullLabel: 'Sync Data',
          icon: '🔄',
          estimatedTime: '30-60 seconds'
        }
    }
  }

  const typeConfig = getTypeConfig()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => onSync(investmentType)}
      disabled={disabled || isLoading}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{typeConfig.fullLabel}</span>
      <span className="sm:hidden">{typeConfig.label}</span>
    </Button>
  )
})

/**
 * SyncConfirmationDialog Component
 * Confirmation dialog with estimated completion time
 * Requirements: 7.5, 7.2, 7.3
 */
export const SyncConfirmationDialog = observer(function SyncConfirmationDialog({
  open,
  onOpenChange,
  investmentType,
  onConfirm,
  isLoading = false
}) {
  const getTypeConfig = () => {
    switch (investmentType) {
      case 'mutual_funds':
        return {
          title: 'Sync Mutual Funds',
          description: 'This will fetch the latest NAV data from AMFI and update your mutual fund values.',
          estimatedTime: '30-60 seconds',
          icon: '📈',
          dataSource: 'AMFI NAV Feed'
        }
      case 'epf':
        return {
          title: 'Sync EPF Accounts',
          description: 'This will connect to EPFO portal and update your EPF balance and contribution data.',
          estimatedTime: '1-2 minutes',
          icon: '🏦',
          dataSource: 'EPFO Member Portal'
        }
      case 'stocks':
        return {
          title: 'Sync Stock Prices',
          description: 'This will fetch current stock prices and update your portfolio values.',
          estimatedTime: '15-30 seconds',
          icon: '📊',
          dataSource: 'Yahoo Finance / NSE'
        }
      default:
        return {
          title: 'Sync Data',
          description: 'This will update your investment data from external sources.',
          estimatedTime: '30-60 seconds',
          icon: '🔄',
          dataSource: 'External APIs'
        }
    }
  }

  const typeConfig = getTypeConfig()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{typeConfig.icon}</span>
            {typeConfig.title}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{typeConfig.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Estimated time: {typeConfig.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Data source:</span>
              <Badge variant="outline">{typeConfig.dataSource}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

/**
 * SyncProgressIndicator Component
 * Real-time progress indicator during sync operations
 * Requirements: 7.5, 7.2, 7.3
 */
export const SyncProgressIndicator = observer(function SyncProgressIndicator({
  investmentType,
  progress = 0,
  status = 'idle',
  currentStep = '',
  totalSteps = 0,
  currentStepIndex = 0,
  className = ''
}) {
  const getTypeConfig = () => {
    switch (investmentType) {
      case 'mutual_funds':
        return {
          label: 'Mutual Funds Sync',
          icon: '📈',
          steps: [
            'Connecting to AMFI',
            'Fetching NAV data',
            'Matching funds',
            'Updating values',
            'Calculating returns'
          ]
        }
      case 'epf':
        return {
          label: 'EPF Sync',
          icon: '🏦',
          steps: [
            'Connecting to EPFO',
            'Authenticating',
            'Fetching balance',
            'Processing contributions',
            'Updating accounts'
          ]
        }
      case 'stocks':
        return {
          label: 'Stock Sync',
          icon: '📊',
          steps: [
            'Connecting to price feed',
            'Fetching prices',
            'Updating portfolio',
            'Calculating P&L'
          ]
        }
      default:
        return {
          label: 'Data Sync',
          icon: '🔄',
          steps: ['Initializing', 'Processing', 'Completing']
        }
    }
  }

  const typeConfig = getTypeConfig()
  const steps = totalSteps > 0 ? Array(totalSteps).fill('').map((_, i) => `Step ${i + 1}`) : typeConfig.steps

  const getStatusConfig = () => {
    switch (status) {
      case 'running':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'completed':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'failed':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const statusConfig = getStatusConfig()

  if (status === 'idle') {
    return null
  }

  return (
    <div className={cn(
      'p-4 rounded-lg border',
      statusConfig.bgColor,
      statusConfig.borderColor,
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl">{typeConfig.icon}</div>
        <div className="flex-1">
          <div className={cn('font-medium', statusConfig.color)}>
            {typeConfig.label}
          </div>
          <div className="text-sm text-muted-foreground">
            {status === 'running' && currentStep && `${currentStep}...`}
            {status === 'completed' && 'Sync completed successfully'}
            {status === 'failed' && 'Sync failed'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
          {status === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
        </div>
      </div>

      {status === 'running' && (
        <>
          <Progress value={progress} className="mb-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            {totalSteps > 0 && (
              <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            )}
          </div>
        </>
      )}

      {status === 'running' && steps.length > 0 && (
        <div className="mt-3 space-y-1">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {index < currentStepIndex ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : index === currentStepIndex ? (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-gray-300" />
              )}
              <span className={cn(
                index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * ManualSyncPanel Component
 * Complete manual sync control panel with all investment types
 * Requirements: 7.5, 7.2, 7.3
 */
export const ManualSyncPanel = observer(function ManualSyncPanel({
  onSync,
  syncStates = {},
  className = ''
}) {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null })

  const investmentTypes = [
    {
      key: 'mutual_funds',
      label: 'Mutual Funds',
      description: 'Update NAV values from AMFI',
      icon: '📈'
    },
    {
      key: 'epf',
      label: 'EPF Accounts',
      description: 'Fetch balance from EPFO portal',
      icon: '🏦'
    },
    {
      key: 'stocks',
      label: 'Stocks & ETFs',
      description: 'Get latest prices during market hours',
      icon: '📊'
    }
  ]

  const handleSyncClick = (type) => {
    setConfirmDialog({ open: true, type })
  }

  const handleConfirmSync = async () => {
    if (confirmDialog.type && onSync) {
      await onSync(confirmDialog.type)
      setConfirmDialog({ open: false, type: null })
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manual Sync</h3>
        <Badge variant="outline" className="text-xs">
          Sync individual investment types
        </Badge>
      </div>

      <div className="grid gap-3">
        {investmentTypes.map((type) => {
          const syncState = syncStates[type.key] || {}
          const isLoading = syncState.status === 'running'
          
          return (
            <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{type.icon}</div>
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </div>
              
              <SyncNowButton
                investmentType={type.key}
                onSync={handleSyncClick}
                isLoading={isLoading}
                size="sm"
              />
            </div>
          )
        })}
      </div>

      {/* Show progress indicators for active syncs */}
      {Object.entries(syncStates).map(([type, state]) => (
        state.status && state.status !== 'idle' && (
          <SyncProgressIndicator
            key={type}
            investmentType={type}
            progress={state.progress || 0}
            status={state.status}
            currentStep={state.currentStep}
            currentStepIndex={state.currentStepIndex || 0}
            totalSteps={state.totalSteps}
          />
        )
      ))}

      <SyncConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, type: confirmDialog.type })}
        investmentType={confirmDialog.type}
        onConfirm={handleConfirmSync}
        isLoading={syncStates[confirmDialog.type]?.status === 'running'}
      />
    </div>
  )
})