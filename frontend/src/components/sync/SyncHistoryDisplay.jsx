import React, { useState, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'

/**
 * SyncHistoryItem Component
 * Individual sync history entry with expandable details
 * Requirements: 7.4, 7.8, 12.4, 12.5
 */
export const SyncHistoryItem = observer(function SyncHistoryItem({
  syncRecord,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusConfig = () => {
    switch (syncRecord.status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'success'
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive'
        }
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'warning'
        }
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'outline'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const getTypeIcon = (type) => {
    switch (type) {
      case 'mutual_funds': return '📈'
      case 'epf': return '🏦'
      case 'stocks': return '📊'
      default: return '🔄'
    }
  }

  const getTroubleshootingSteps = (error) => {
    if (!error) return []

    const errorType = error.type || 'unknown'
    const errorMessage = error.message || ''

    switch (errorType) {
      case 'network_timeout':
        return [
          'Check your internet connection',
          'Try again in a few minutes',
          'Contact support if the issue persists'
        ]
      case 'authentication_failed':
        return [
          'Verify your credentials in Settings',
          'Check if your account is locked',
          'Update your password if recently changed'
        ]
      case 'rate_limit_exceeded':
        return [
          'Wait for the rate limit to reset',
          'Reduce sync frequency in settings',
          'Try manual sync later'
        ]
      case 'data_validation_failed':
        return [
          'Check if your investment data is correct',
          'Verify ISIN codes and identifiers',
          'Contact support for data issues'
        ]
      case 'service_unavailable':
        return [
          'The external service is temporarily down',
          'Try again later',
          'Check service status pages'
        ]
      default:
        return [
          'Try syncing again',
          'Check your internet connection',
          'Contact support if the issue continues'
        ]
    }
  }

  const troubleshootingSteps = getTroubleshootingSteps(syncRecord.error)

  return (
    <div className={cn(
      'border rounded-lg p-4',
      statusConfig.borderColor,
      statusConfig.bgColor,
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center gap-2 mt-1">
            <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
            <span className="text-lg">{getTypeIcon(syncRecord.investmentType)}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm capitalize">
                {syncRecord.investmentType?.replace('_', ' ')} Sync
              </h4>
              <Badge variant={statusConfig.badgeVariant} className="text-xs">
                {syncRecord.status}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                {format(new Date(syncRecord.timestamp), 'MMM dd, yyyy HH:mm:ss')} 
                <span className="ml-2">
                  ({formatDistanceToNow(new Date(syncRecord.timestamp), { addSuffix: true })})
                </span>
              </div>
              
              {syncRecord.recordsProcessed !== undefined && (
                <div>
                  Processed: {syncRecord.recordsProcessed} records
                  {syncRecord.recordsUpdated !== undefined && (
                    <span>, Updated: {syncRecord.recordsUpdated}</span>
                  )}
                </div>
              )}
              
              {syncRecord.duration && (
                <div>Duration: {(syncRecord.duration / 1000).toFixed(1)}s</div>
              )}
              
              {syncRecord.source && (
                <div>Source: {syncRecord.source}</div>
              )}
            </div>
          </div>
        </div>

        {(syncRecord.error || syncRecord.details) && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </div>

      {(syncRecord.error || syncRecord.details) && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="mt-3">
            <Separator className="mb-3" />
            
            {syncRecord.error && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-red-700 mb-1">
                      Error Details
                    </div>
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                      {syncRecord.error.message || 'Unknown error occurred'}
                    </div>
                    
                    {syncRecord.error.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          Technical Details
                        </summary>
                        <pre className="text-xs text-muted-foreground mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                          {JSON.stringify(syncRecord.error.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {troubleshootingSteps.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-blue-700 mb-2">
                        Troubleshooting Steps
                      </div>
                      <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
                        {troubleshootingSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}

            {syncRecord.details && (
              <div className="space-y-2">
                <div className="font-medium text-sm">Sync Details</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {Object.entries(syncRecord.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace('_', ' ')}:</span>
                      <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
})

/**
 * SyncHistoryFilters Component
 * Filter and search controls for sync history
 * Requirements: 7.4, 7.8, 12.4, 12.5
 */
export const SyncHistoryFilters = observer(function SyncHistoryFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateRange,
  onDateRangeChange,
  className = ''
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sync history..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mutual_funds">Mutual Funds</SelectItem>
            <SelectItem value="epf">EPF</SelectItem>
            <SelectItem value="stocks">Stocks</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

/**
 * SyncHistoryDisplay Component
 * Complete sync history display with filtering and search
 * Requirements: 7.4, 7.8, 12.4, 12.5
 */
export const SyncHistoryDisplay = observer(function SyncHistoryDisplay({
  syncHistory = [],
  onRefresh,
  isLoading = false,
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  const filteredHistory = useMemo(() => {
    let filtered = [...syncHistory]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(record => 
        record.investmentType?.toLowerCase().includes(term) ||
        record.status?.toLowerCase().includes(term) ||
        record.source?.toLowerCase().includes(term) ||
        record.error?.message?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.investmentType === typeFilter)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000))
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.timestamp)
        switch (dateRange) {
          case 'today':
            return recordDate >= startOfDay
          case 'week':
            return recordDate >= startOfWeek
          case 'month':
            return recordDate >= startOfMonth
          default:
            return true
        }
      })
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [syncHistory, searchTerm, statusFilter, typeFilter, dateRange])

  const getStatusCounts = () => {
    return syncHistory.reduce((counts, record) => {
      counts[record.status] = (counts[record.status] || 0) + 1
      return counts
    }, {})
  }

  const statusCounts = getStatusCounts()

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sync History</CardTitle>
          <div className="flex items-center gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Badge 
                key={status}
                variant={
                  status === 'success' ? 'success' :
                  status === 'failed' ? 'destructive' :
                  status === 'partial' ? 'warning' : 'outline'
                }
                className="text-xs"
              >
                {status}: {count}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <SyncHistoryFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading sync history...
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {syncHistory.length === 0 ? (
                <div>
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sync history available</p>
                  <p className="text-sm">Sync operations will appear here</p>
                </div>
              ) : (
                <div>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              )}
            </div>
          ) : (
            filteredHistory.map((record, index) => (
              <SyncHistoryItem
                key={`${record.timestamp}-${record.investmentType}-${index}`}
                syncRecord={record}
              />
            ))
          )}
        </div>

        {filteredHistory.length > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            Showing {filteredHistory.length} of {syncHistory.length} sync records
          </div>
        )}
      </CardContent>
    </Card>
  )
})