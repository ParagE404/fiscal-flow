import React from 'react'
import { observer } from 'mobx-react-lite'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { useDataSync } from '../../hooks/useDataSync'
import { formatDistanceToNow } from 'date-fns'

/**
 * Sync Status Component
 * Displays real-time synchronization status and provides sync controls
 */
export const SyncStatus = observer(function SyncStatus({ 
  showDetails = false, 
  showControls = true,
  className = "" 
}) {
  const {
    syncStats,
    lastError,
    isOnline,
    isSyncing,
    isDataStale,
    forceSync,
    clearSyncQueue,
    getSyncStatus
  } = useDataSync()

  const status = getSyncStatus()

  // Determine status color and icon
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        color: 'destructive',
        icon: WifiOff,
        text: 'Offline',
        description: 'No internet connection'
      }
    }

    if (lastError) {
      return {
        color: 'destructive',
        icon: AlertCircle,
        text: 'Sync Error',
        description: lastError
      }
    }

    if (isSyncing) {
      return {
        color: 'secondary',
        icon: RefreshCw,
        text: 'Syncing',
        description: 'Synchronizing data...',
        animate: true
      }
    }

    if (isDataStale) {
      return {
        color: 'warning',
        icon: Clock,
        text: 'Stale Data',
        description: 'Data may be outdated'
      }
    }

    return {
      color: 'success',
      icon: CheckCircle,
      text: 'Synced',
      description: status.lastSync 
        ? `Last synced ${formatDistanceToNow(new Date(status.lastSync), { addSuffix: true })}`
        : 'Data is up to date'
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const handleForceSync = async () => {
    try {
      await forceSync()
    } catch (error) {
      console.error('Force sync failed:', error)
    }
  }

  const handleClearQueue = () => {
    clearSyncQueue()
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <StatusIcon 
                className={`h-4 w-4 ${
                  statusInfo.animate ? 'animate-spin' : ''
                } ${
                  statusInfo.color === 'destructive' ? 'text-destructive' :
                  statusInfo.color === 'warning' ? 'text-orange-500' :
                  statusInfo.color === 'success' ? 'text-green-500' :
                  'text-muted-foreground'
                }`}
              />
              {!isOnline && <Wifi className="h-4 w-4 text-muted-foreground opacity-30" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{statusInfo.text}</div>
              <div className="text-muted-foreground">{statusInfo.description}</div>
              {showDetails && (
                <div className="mt-2 space-y-1 text-xs">
                  <div>Data Version: {status.dataVersion}</div>
                  <div>Queue: {syncStats.queueLength} items</div>
                  {status.lastSync && (
                    <div>Last Sync: {new Date(status.lastSync).toLocaleTimeString()}</div>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showDetails && (
        <div className="flex items-center gap-2">
          <Badge variant={
            statusInfo.color === 'destructive' ? 'destructive' :
            statusInfo.color === 'warning' ? 'secondary' :
            statusInfo.color === 'success' ? 'default' :
            'secondary'
          }>
            {statusInfo.text}
          </Badge>

          {syncStats.queueLength > 0 && (
            <Badge variant="outline" className="text-xs">
              {syncStats.queueLength} queued
            </Badge>
          )}
        </div>
      )}

      {showControls && (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleForceSync}
                  disabled={isSyncing || !isOnline}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Force sync</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {syncStats.queueLength > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearQueue}
                    className="h-8 w-8 p-0"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Clear sync queue</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * Compact Sync Status Indicator
 * Minimal version for use in headers or toolbars
 */
export const SyncStatusIndicator = observer(function SyncStatusIndicator({ className = "" }) {
  const { isOnline, isSyncing, lastError } = useDataSync()

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (lastError) return 'bg-red-500'
    if (isSyncing) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${getIndicatorColor()}`} />
      <span className="text-xs text-muted-foreground">
        {!isOnline ? 'Offline' :
         lastError ? 'Error' :
         isSyncing ? 'Syncing' :
         'Online'}
      </span>
    </div>
  )
})

/**
 * Detailed Sync Status Panel
 * Comprehensive view for debugging and monitoring
 */
export const SyncStatusPanel = observer(function SyncStatusPanel() {
  const {
    syncStats,
    lastError,
    isOnline,
    isSyncing,
    isDataStale,
    getSyncStatus,
    validateData,
    cleanupOptimisticUpdates
  } = useDataSync()

  const status = getSyncStatus()
  const validation = validateData()

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sync Status</h3>
        <SyncStatus showControls={true} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium">Connection</div>
          <div className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div>
          <div className="font-medium">Sync Status</div>
          <div className={isSyncing ? 'text-yellow-600' : 'text-green-600'}>
            {isSyncing ? 'In Progress' : 'Idle'}
          </div>
        </div>

        <div>
          <div className="font-medium">Data Version</div>
          <div>{status.dataVersion}</div>
        </div>

        <div>
          <div className="font-medium">Queue Length</div>
          <div>{syncStats.queueLength}</div>
        </div>

        <div>
          <div className="font-medium">Last Sync</div>
          <div>
            {status.lastSync 
              ? formatDistanceToNow(new Date(status.lastSync), { addSuffix: true })
              : 'Never'
            }
          </div>
        </div>

        <div>
          <div className="font-medium">Data Status</div>
          <div className={isDataStale ? 'text-orange-600' : 'text-green-600'}>
            {isDataStale ? 'Stale' : 'Fresh'}
          </div>
        </div>
      </div>

      {lastError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <div className="font-medium text-red-800">Last Error</div>
          <div className="text-red-600 text-sm">{lastError}</div>
        </div>
      )}

      {!validation.valid && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-medium text-yellow-800">Data Consistency Issues</div>
          <ul className="text-yellow-600 text-sm mt-1">
            {validation.issues.map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupOptimisticUpdates}
            className="mt-2"
          >
            Cleanup Issues
          </Button>
        </div>
      )}
    </div>
  )
})