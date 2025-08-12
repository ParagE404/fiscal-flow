import React from 'react'
import { observer } from 'mobx-react-lite'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

/**
 * SyncStatusIndicator Component
 * Displays sync status with color-coded indicators and timestamps
 * Requirements: 7.1, 7.2, 7.9
 */
export const SyncStatusIndicator = observer(function SyncStatusIndicator({
  lastSyncAt,
  syncStatus = 'manual',
  syncType,
  onManualSync,
  className = '',
  showTimestamp = true,
  showManualSyncButton = true,
  size = 'default'
}) {
  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle,
          text: 'Synced',
          badgeVariant: 'success'
        }
      case 'failed':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: XCircle,
          text: 'Failed',
          badgeVariant: 'destructive'
        }
      case 'in_progress':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: Loader2,
          text: 'Syncing',
          badgeVariant: 'secondary',
          animate: true
        }
      case 'stale':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          icon: AlertTriangle,
          text: 'Stale',
          badgeVariant: 'warning'
        }
      case 'disabled':
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          icon: WifiOff,
          text: 'Disabled',
          badgeVariant: 'outline'
        }
      default: // manual
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: Clock,
          text: 'Manual',
          badgeVariant: 'outline'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const getTimestampText = () => {
    if (!lastSyncAt) return null
    
    try {
      const date = new Date(lastSyncAt)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const timestampText = getTimestampText()
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <StatusIcon 
                className={cn(
                  iconSize,
                  statusConfig.color,
                  statusConfig.animate && 'animate-spin'
                )}
              />
              <span className={cn(textSize, statusConfig.color, 'font-medium')}>
                {statusConfig.text}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">
                {syncType ? `${syncType} Sync Status` : 'Sync Status'}
              </div>
              <div className="text-muted-foreground">
                {syncStatus === 'synced' && timestampText && `Last synced ${timestampText}`}
                {syncStatus === 'failed' && 'Sync operation failed'}
                {syncStatus === 'in_progress' && 'Synchronization in progress'}
                {syncStatus === 'stale' && 'Data may be outdated'}
                {syncStatus === 'disabled' && 'Auto-sync is disabled'}
                {syncStatus === 'manual' && 'Manual sync only'}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showTimestamp && timestampText && syncStatus === 'synced' && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {timestampText}
        </span>
      )}

      {showManualSyncButton && onManualSync && syncStatus !== 'in_progress' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={size === 'sm' ? 'icon-sm' : 'icon'}
                onClick={onManualSync}
                className={cn(
                  'hover:bg-primary/10',
                  size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
                )}
              >
                <RefreshCw className={cn(
                  size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Sync now</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
})

/**
 * SyncStatusBadge Component
 * Compact badge version for different investment types
 * Requirements: 7.1, 7.2, 7.9
 */
export const SyncStatusBadge = observer(function SyncStatusBadge({
  syncStatus = 'manual',
  syncType,
  lastSyncAt,
  className = '',
  showIcon = true
}) {
  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'synced':
        return {
          variant: 'success',
          icon: CheckCircle,
          text: 'Synced'
        }
      case 'failed':
        return {
          variant: 'destructive',
          icon: XCircle,
          text: 'Failed'
        }
      case 'in_progress':
        return {
          variant: 'secondary',
          icon: Loader2,
          text: 'Syncing',
          animate: true
        }
      case 'stale':
        return {
          variant: 'warning',
          icon: AlertTriangle,
          text: 'Stale'
        }
      case 'disabled':
        return {
          variant: 'outline',
          icon: WifiOff,
          text: 'Disabled'
        }
      default: // manual
        return {
          variant: 'outline',
          icon: Clock,
          text: 'Manual'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const getTypeIcon = () => {
    switch (syncType) {
      case 'mutual_funds':
        return '📈'
      case 'epf':
        return '🏦'
      case 'stocks':
        return '📊'
      default:
        return null
    }
  }

  const typeIcon = getTypeIcon()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={statusConfig.variant} className={cn('gap-1', className)}>
            {typeIcon && <span className="text-xs">{typeIcon}</span>}
            {showIcon && (
              <StatusIcon 
                className={cn(
                  'w-3 h-3',
                  statusConfig.animate && 'animate-spin'
                )}
              />
            )}
            <span>{statusConfig.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">
              {syncType ? `${syncType.replace('_', ' ').toUpperCase()} Sync` : 'Sync Status'}
            </div>
            {lastSyncAt && syncStatus === 'synced' && (
              <div className="text-muted-foreground">
                Last synced {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

/**
 * InvestmentTypeSyncStatus Component
 * Shows sync status for specific investment types with appropriate icons
 * Requirements: 7.1, 7.2, 7.9
 */
export const InvestmentTypeSyncStatus = observer(function InvestmentTypeSyncStatus({
  investmentType,
  syncStatus = 'manual',
  lastSyncAt,
  onManualSync,
  className = ''
}) {
  const getTypeConfig = () => {
    switch (investmentType) {
      case 'mutual_funds':
        return {
          label: 'Mutual Funds',
          icon: '📈',
          description: 'NAV updates from AMFI'
        }
      case 'epf':
        return {
          label: 'EPF',
          icon: '🏦',
          description: 'Balance updates from EPFO'
        }
      case 'stocks':
        return {
          label: 'Stocks',
          icon: '📊',
          description: 'Price updates during market hours'
        }
      default:
        return {
          label: 'Investment',
          icon: '💰',
          description: 'Investment data sync'
        }
    }
  }

  const typeConfig = getTypeConfig()

  return (
    <div className={cn('flex items-center justify-between p-3 border rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{typeConfig.icon}</div>
        <div>
          <div className="font-medium text-sm">{typeConfig.label}</div>
          <div className="text-xs text-muted-foreground">{typeConfig.description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <SyncStatusIndicator
          syncStatus={syncStatus}
          syncType={investmentType}
          lastSyncAt={lastSyncAt}
          onManualSync={onManualSync}
          size="sm"
          showTimestamp={false}
        />
      </div>
    </div>
  )
})