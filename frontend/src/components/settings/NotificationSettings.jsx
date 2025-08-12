import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  PiggyBank, 
  Building2,
  Settings,
  Loader2,
  Info,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/apiClient'

const NOTIFICATION_TYPES = [
  {
    key: 'sync_success',
    label: 'Sync Success',
    description: 'Notify when data sync completes successfully',
    icon: CheckCircle,
    defaultEnabled: false,
    channels: ['email', 'push']
  },
  {
    key: 'sync_failure',
    label: 'Sync Failures',
    description: 'Alert when data sync fails or encounters errors',
    icon: AlertTriangle,
    defaultEnabled: true,
    channels: ['email', 'push'],
    priority: 'high'
  },
  {
    key: 'credential_expiry',
    label: 'Credential Expiration',
    description: 'Warn when stored credentials are about to expire',
    icon: AlertCircle,
    defaultEnabled: true,
    channels: ['email', 'push'],
    priority: 'medium'
  },
  {
    key: 'data_anomaly',
    label: 'Data Anomalies',
    description: 'Alert when unusual price changes or data inconsistencies are detected',
    icon: TrendingUp,
    defaultEnabled: true,
    channels: ['email', 'push'],
    priority: 'medium'
  },
  {
    key: 'service_outage',
    label: 'Service Outages',
    description: 'Notify when external data sources are unavailable',
    icon: AlertTriangle,
    defaultEnabled: false,
    channels: ['email', 'push']
  }
]

const INVESTMENT_SPECIFIC_NOTIFICATIONS = [
  {
    key: 'mutual_funds',
    label: 'Mutual Funds',
    icon: TrendingUp,
    notifications: [
      {
        key: 'nav_anomaly',
        label: 'NAV Anomalies',
        description: 'Alert when NAV changes exceed threshold',
        defaultThreshold: 10,
        unit: '%'
      },
      {
        key: 'scheme_merger',
        label: 'Scheme Mergers',
        description: 'Notify about mutual fund scheme mergers or closures',
        defaultEnabled: true
      }
    ]
  },
  {
    key: 'epf',
    label: 'EPF Accounts',
    icon: PiggyBank,
    notifications: [
      {
        key: 'contribution_anomaly',
        label: 'Contribution Anomalies',
        description: 'Alert when EPF contributions differ significantly from expected amounts',
        defaultThreshold: 20,
        unit: '%'
      },
      {
        key: 'balance_update',
        label: 'Balance Updates',
        description: 'Notify when EPF balance is updated',
        defaultEnabled: false
      }
    ]
  },
  {
    key: 'stocks',
    label: 'Stocks & ETFs',
    icon: Building2,
    notifications: [
      {
        key: 'price_anomaly',
        label: 'Price Anomalies',
        description: 'Alert when stock prices change beyond threshold',
        defaultThreshold: 15,
        unit: '%'
      },
      {
        key: 'trading_halt',
        label: 'Trading Halts',
        description: 'Notify when stocks are halted or suspended from trading',
        defaultEnabled: true
      }
    ]
  }
]

const NOTIFICATION_CHANNELS = [
  { key: 'email', label: 'Email', icon: Mail, description: 'Send notifications to your email address' },
  { key: 'push', label: 'Browser Push', icon: Bell, description: 'Show browser notifications' }
]

export function NotificationSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushPermission, setPushPermission] = useState('default')

  useEffect(() => {
    loadNotificationSettings()
    checkPushPermission()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      const response = await apiClient.get('/sync/notifications/settings')
      setSettings(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load notification settings:', error)
      // Initialize with defaults if API fails
      const defaultSettings = {
        channels: { email: true, push: false },
        notifications: {},
        thresholds: {}
      }
      
      NOTIFICATION_TYPES.forEach(type => {
        defaultSettings.notifications[type.key] = {
          enabled: type.defaultEnabled,
          channels: type.channels.reduce((acc, channel) => {
            acc[channel] = type.defaultEnabled
            return acc
          }, {})
        }
      })

      INVESTMENT_SPECIFIC_NOTIFICATIONS.forEach(investment => {
        investment.notifications.forEach(notif => {
          const key = `${investment.key}_${notif.key}`
          defaultSettings.notifications[key] = {
            enabled: notif.defaultEnabled || false,
            channels: { email: true, push: false }
          }
          if (notif.defaultThreshold) {
            defaultSettings.thresholds[key] = notif.defaultThreshold
          }
        })
      })

      setSettings(defaultSettings)
      setLoading(false)
    }
  }

  const checkPushPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission)
    }
  }

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)
      if (permission === 'granted') {
        toast.success('Push notifications enabled')
      } else {
        toast.error('Push notifications denied')
      }
    }
  }

  const updateNotificationSettings = async (updates) => {
    setSaving(true)
    try {
      const updatedSettings = { ...settings, ...updates }
      const response = await apiClient.put('/sync/notifications/settings', updatedSettings)
      setSettings(response.data)
      toast.success('Notification settings updated')
    } catch (error) {
      console.error('Failed to update notification settings:', error)
      toast.error('Failed to update notification settings')
    } finally {
      setSaving(false)
    }
  }

  const updateChannelSetting = (channel, enabled) => {
    updateNotificationSettings({
      channels: {
        ...settings.channels,
        [channel]: enabled
      }
    })
  }

  const updateNotificationSetting = (notificationKey, field, value) => {
    updateNotificationSettings({
      notifications: {
        ...settings.notifications,
        [notificationKey]: {
          ...settings.notifications[notificationKey],
          [field]: value
        }
      }
    })
  }

  const updateThreshold = (key, value) => {
    updateNotificationSettings({
      thresholds: {
        ...settings.thresholds,
        [key]: parseFloat(value) || 0
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading notification settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification & Alert Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure how and when you want to be notified about sync events, data anomalies, and system alerts.
          </p>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CHANNELS.map(channel => {
            const IconComponent = channel.icon
            const isEnabled = settings.channels?.[channel.key] || false
            const needsPermission = channel.key === 'push' && pushPermission !== 'granted'

            return (
              <div key={channel.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <Label className="text-sm font-medium">{channel.label}</Label>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {needsPermission && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestPushPermission}
                    >
                      Enable
                    </Button>
                  )}
                  <Switch
                    checked={isEnabled && !needsPermission}
                    onCheckedChange={(enabled) => updateChannelSetting(channel.key, enabled)}
                    disabled={saving || needsPermission}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* General Sync Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sync Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TYPES.map(type => {
            const IconComponent = type.icon
            const notificationSettings = settings.notifications?.[type.key] || {}
            const isEnabled = notificationSettings.enabled || false

            return (
              <div key={type.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`h-5 w-5 ${type.priority === 'high' ? 'text-red-500' : type.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        {type.label}
                        {type.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">High Priority</Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(enabled) => updateNotificationSetting(type.key, 'enabled', enabled)}
                    disabled={saving}
                  />
                </div>

                {/* Channel Selection */}
                {isEnabled && (
                  <div className="ml-8 space-y-2">
                    <Label className="text-xs text-muted-foreground">Notify via:</Label>
                    <div className="flex items-center gap-4">
                      {type.channels.map(channel => (
                        <div key={channel} className="flex items-center gap-2">
                          <Switch
                            checked={notificationSettings.channels?.[channel] || false}
                            onCheckedChange={(enabled) => updateNotificationSetting(type.key, 'channels', {
                              ...notificationSettings.channels,
                              [channel]: enabled
                            })}
                            disabled={saving || !settings.channels?.[channel]}
                            size="sm"
                          />
                          <Label className="text-xs capitalize">{channel}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Investment-Specific Notifications */}
      {INVESTMENT_SPECIFIC_NOTIFICATIONS.map(investment => {
        const IconComponent = investment.icon

        return (
          <Card key={investment.key}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconComponent className="h-5 w-5" />
                {investment.label} Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {investment.notifications.map(notification => {
                const notificationKey = `${investment.key}_${notification.key}`
                const notificationSettings = settings.notifications?.[notificationKey] || {}
                const isEnabled = notificationSettings.enabled || false
                const threshold = settings.thresholds?.[notificationKey] || notification.defaultThreshold

                return (
                  <div key={notification.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">{notification.label}</Label>
                        <p className="text-xs text-muted-foreground">{notification.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(enabled) => updateNotificationSetting(notificationKey, 'enabled', enabled)}
                        disabled={saving}
                      />
                    </div>

                    {/* Threshold Setting */}
                    {isEnabled && notification.defaultThreshold && (
                      <div className="ml-4 space-y-2">
                        <Label className="text-xs text-muted-foreground">Alert Threshold:</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={threshold || ''}
                            onChange={(e) => updateThreshold(notificationKey, e.target.value)}
                            className="w-20 h-8"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-sm text-muted-foreground">{notification.unit}</span>
                        </div>
                      </div>
                    )}

                    {/* Channel Selection */}
                    {isEnabled && (
                      <div className="ml-4 space-y-2">
                        <Label className="text-xs text-muted-foreground">Notify via:</Label>
                        <div className="flex items-center gap-4">
                          {['email', 'push'].map(channel => (
                            <div key={channel} className="flex items-center gap-2">
                              <Switch
                                checked={notificationSettings.channels?.[channel] || false}
                                onCheckedChange={(enabled) => updateNotificationSetting(notificationKey, 'channels', {
                                  ...notificationSettings.channels,
                                  [channel]: enabled
                                })}
                                disabled={saving || !settings.channels?.[channel]}
                                size="sm"
                              />
                              <Label className="text-xs capitalize">{channel}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send test notifications to verify your settings are working correctly.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success('Test notification sent!')
                if (settings.channels?.push && pushPermission === 'granted') {
                  new Notification('FiscalFlow Test', {
                    body: 'This is a test notification from FiscalFlow',
                    icon: '/favicon.ico'
                  })
                }
              }}
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}