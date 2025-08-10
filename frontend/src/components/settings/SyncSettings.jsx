import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  RefreshCw, 
  TrendingUp, 
  PiggyBank, 
  Building2,
  Settings,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Key,
  Bell,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/apiClient'
import { CredentialManagement } from './CredentialManagement'
import { NotificationSettings } from './NotificationSettings'

const INVESTMENT_TYPES = [
  {
    key: 'mutual_funds',
    label: 'Mutual Funds',
    icon: TrendingUp,
    description: 'Daily NAV updates from AMFI',
    defaultFrequency: 'daily',
    availableFrequencies: ['daily'],
    dataSources: [
      { key: 'amfi', label: 'AMFI (Official)', primary: true },
      { key: 'mf_central', label: 'MF Central', primary: false }
    ]
  },
  {
    key: 'epf',
    label: 'EPF Accounts',
    icon: PiggyBank,
    description: 'Monthly balance updates from EPFO',
    defaultFrequency: 'monthly',
    availableFrequencies: ['monthly'],
    dataSources: [
      { key: 'epfo', label: 'EPFO Portal', primary: true },
      { key: 'account_aggregator', label: 'Account Aggregator', primary: false }
    ],
    requiresCredentials: true
  },
  {
    key: 'stocks',
    label: 'Stocks & ETFs',
    icon: Building2,
    description: 'Hourly price updates during market hours',
    defaultFrequency: 'hourly',
    availableFrequencies: ['hourly', 'daily'],
    dataSources: [
      { key: 'yahoo_finance', label: 'Yahoo Finance', primary: true },
      { key: 'nse_api', label: 'NSE API', primary: false },
      { key: 'alpha_vantage', label: 'Alpha Vantage', primary: false }
    ]
  }
]

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'Hourly', description: 'During market hours only' },
  { value: 'daily', label: 'Daily', description: 'Once per day after market close' },
  { value: 'monthly', label: 'Monthly', description: 'First day of each month' },
  { value: 'custom', label: 'Custom', description: 'Set your own schedule' }
]

export function SyncSettings() {
  const [configurations, setConfigurations] = useState({})
  const [credentials, setCredentials] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncStatus, setSyncStatus] = useState({})
  const [showCredentials, setShowCredentials] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    loadSyncConfigurations()
    loadCredentialStatus()
    loadSyncStatus()
  }, [])

  const loadSyncConfigurations = async () => {
    try {
      const response = await apiClient.get('/api/sync/config')
      const configMap = {}
      response.data.forEach(config => {
        configMap[config.investmentType] = config
      })
      setConfigurations(configMap)
    } catch (error) {
      console.error('Failed to load sync configurations:', error)
      toast.error('Failed to load sync settings')
    }
  }

  const loadCredentialStatus = async () => {
    try {
      const response = await apiClient.get('/api/sync/credentials/status')
      setCredentials(response.data)
    } catch (error) {
      console.error('Failed to load credential status:', error)
    }
  }

  const loadSyncStatus = async () => {
    try {
      const response = await apiClient.get('/api/sync/status')
      const statusMap = {}
      response.data.forEach(status => {
        statusMap[status.investmentType] = status
      })
      setSyncStatus(statusMap)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load sync status:', error)
      setLoading(false)
    }
  }

  const updateSyncConfiguration = async (investmentType, updates) => {
    setSaving(true)
    try {
      const currentConfig = configurations[investmentType] || {
        investmentType,
        isEnabled: false,
        syncFrequency: INVESTMENT_TYPES.find(t => t.key === investmentType)?.defaultFrequency || 'daily',
        preferredSource: INVESTMENT_TYPES.find(t => t.key === investmentType)?.dataSources[0]?.key,
        notifyOnSuccess: false,
        notifyOnFailure: true
      }

      const updatedConfig = { ...currentConfig, ...updates }
      
      const response = await apiClient.put('/api/sync/config', updatedConfig)
      
      setConfigurations(prev => ({
        ...prev,
        [investmentType]: response.data
      }))
      
      toast.success('Sync settings updated successfully')
    } catch (error) {
      console.error('Failed to update sync configuration:', error)
      toast.error('Failed to update sync settings')
    } finally {
      setSaving(false)
    }
  }

  const triggerManualSync = async (investmentType) => {
    try {
      toast.info(`Starting ${INVESTMENT_TYPES.find(t => t.key === investmentType)?.label} sync...`)
      
      const response = await apiClient.post(`/api/sync/${investmentType}`)
      
      if (response.data.success) {
        toast.success(`${INVESTMENT_TYPES.find(t => t.key === investmentType)?.label} sync completed successfully`)
        loadSyncStatus() // Refresh status
      } else {
        toast.error(`Sync failed: ${response.data.errors?.[0]?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Manual sync failed:', error)
      toast.error('Failed to start sync')
    }
  }

  const getSyncStatusBadge = (investmentType) => {
    const status = syncStatus[investmentType]
    if (!status) {
      return <Badge variant="secondary">Not configured</Badge>
    }

    switch (status.syncStatus) {
      case 'synced':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )
      default:
        return <Badge variant="outline">Manual</Badge>
    }
  }

  const getLastSyncText = (investmentType) => {
    const status = syncStatus[investmentType]
    if (!status?.lastSyncAt) return 'Never synced'
    
    const lastSync = new Date(status.lastSyncAt)
    const now = new Date()
    const diffMs = now - lastSync
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Recently'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading sync settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Auto-Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure automatic data synchronization for your investments. 
            Enable sync to keep your portfolio values up-to-date automatically.
          </p>
        </CardContent>
      </Card>

      {/* Investment Type Settings */}
      {INVESTMENT_TYPES.map(type => {
        const config = configurations[type.key] || {}
        const IconComponent = type.icon
        const hasCredentials = credentials[type.key] || false
        const needsCredentials = type.requiresCredentials && !hasCredentials

        return (
          <Card key={type.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getSyncStatusBadge(type.key)}
                  <Switch
                    checked={config.isEnabled || false}
                    onCheckedChange={(enabled) => updateSyncConfiguration(type.key, { isEnabled: enabled })}
                    disabled={saving || needsCredentials}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Sync Status and Manual Trigger */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Last synced: {getLastSyncText(type.key)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerManualSync(type.key)}
                  disabled={syncStatus[type.key]?.syncStatus === 'in_progress'}
                >
                  {syncStatus[type.key]?.syncStatus === 'in_progress' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>

              {/* Credentials Warning */}
              {needsCredentials && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Credentials Required
                    </p>
                    <p className="text-xs text-yellow-700">
                      Configure your {type.label.toLowerCase()} credentials to enable auto-sync
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-yellow-300"
                    onClick={() => setShowCredentials(true)}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              )}

              {/* Configuration Options */}
              {config.isEnabled && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Sync Frequency */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sync Frequency</Label>
                    <Select
                      value={config.syncFrequency || type.defaultFrequency}
                      onValueChange={(frequency) => updateSyncConfiguration(type.key, { syncFrequency: frequency })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS
                          .filter(freq => type.availableFrequencies.includes(freq.value))
                          .map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              <div>
                                <div className="font-medium">{freq.label}</div>
                                <div className="text-xs text-muted-foreground">{freq.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Source Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Data Source</Label>
                    <Select
                      value={config.preferredSource || type.dataSources[0]?.key}
                      onValueChange={(source) => updateSyncConfiguration(type.key, { preferredSource: source })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {type.dataSources.map(source => (
                          <SelectItem key={source.key} value={source.key}>
                            <div className="flex items-center gap-2">
                              <span>{source.label}</span>
                              {source.primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fallback Source */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Fallback Source</Label>
                    <Select
                      value={config.fallbackSource || 'none'}
                      onValueChange={(source) => updateSyncConfiguration(type.key, { fallbackSource: source === 'none' ? null : source })}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fallback source (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {type.dataSources
                          .filter(source => source.key !== (config.preferredSource || type.dataSources[0]?.key))
                          .map(source => (
                            <SelectItem key={source.key} value={source.key}>
                              {source.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used when primary source is unavailable
                    </p>
                  </div>

                  {/* Custom Schedule (if frequency is custom) */}
                  {config.syncFrequency === 'custom' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Custom Schedule (Cron Expression)</Label>
                      <Input
                        placeholder="0 18 * * * (6 PM daily)"
                        value={config.customSchedule || ''}
                        onChange={(e) => updateSyncConfiguration(type.key, { customSchedule: e.target.value })}
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use cron expression format. Example: "0 18 * * *" for 6 PM daily
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Credential Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Credential Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Manage API keys and login credentials for external data sources.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowCredentials(true)}
              className="w-full sm:w-auto"
            >
              <Key className="w-4 h-4 mr-2" />
              Manage Credentials
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure alerts and notifications for sync events, data anomalies, and system status.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowNotifications(true)}
              className="w-full sm:w-auto"
            >
              <Bell className="w-4 h-4 mr-2" />
              Configure Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credential Management Dialog/Modal */}
      {showCredentials && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Credential Management</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCredentials(false)}
              >
                ×
              </Button>
            </div>
            <CredentialManagement />
          </div>
        </div>
      )}

      {/* Notification Settings Dialog/Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notification Settings</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotifications(false)}
              >
                ×
              </Button>
            </div>
            <NotificationSettings />
          </div>
        </div>
      )}
    </div>
  )
}