import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Palette, 
  DollarSign, 
  Hash, 
  RefreshCw, 
  Bell, 
  Layout, 
  RotateCcw,
  Loader2,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { usePreferencesStore } from '@/stores/StoreContext'

export const PreferencesSection = observer(() => {
  const preferencesStore = usePreferencesStore()
  const [isResetting, setIsResetting] = useState(false)

  const handleThemeChange = async (theme) => {
    try {
      await preferencesStore.setTheme(theme)
      toast.success('Theme updated successfully')
    } catch (error) {
      toast.error('Failed to update theme')
    }
  }

  const handleCurrencyFormatChange = async (format) => {
    try {
      await preferencesStore.updatePreferences({
        currency: {
          ...preferencesStore.preferences.currency,
          format
        }
      })
      toast.success('Currency format updated')
    } catch (error) {
      toast.error('Failed to update currency format')
    }
  }

  const handleNumberFormatChange = async (style) => {
    try {
      await preferencesStore.updatePreferences({
        numberFormat: {
          ...preferencesStore.preferences.numberFormat,
          style
        }
      })
      toast.success('Number format updated')
    } catch (error) {
      toast.error('Failed to update number format')
    }
  }

  const handleAutoRefreshChange = async (enabled) => {
    try {
      await preferencesStore.updatePreferences({
        autoRefreshPrices: enabled
      })
      toast.success(`Auto-refresh ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to update auto-refresh setting')
    }
  }

  const handleNotificationChange = async (key, enabled) => {
    try {
      await preferencesStore.updateNotificationPreferences({
        [key]: enabled
      })
      toast.success(`${key === 'enabled' ? 'Push notifications' : 'Notification'} ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to update notification settings')
    }
  }

  const handleDashboardChange = async (key, value) => {
    try {
      await preferencesStore.updateDashboardPreferences({
        [key]: value
      })
      toast.success('Dashboard preference updated')
    } catch (error) {
      toast.error('Failed to update dashboard preference')
    }
  }

  const handleResetPreferences = async () => {
    setIsResetting(true)
    try {
      await preferencesStore.resetPreferences()
      toast.success('Preferences reset to defaults')
    } catch (error) {
      toast.error('Failed to reset preferences')
    } finally {
      setIsResetting(false)
    }
  }

  const { preferences, loading } = preferencesStore

  if (!preferencesStore.initialized) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading preferences...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select 
              value={preferences.theme} 
              onValueChange={handleThemeChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose your preferred theme or use system setting
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Currency & Number Formatting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency & Numbers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency Format</Label>
            <Select 
              value={preferences.currency.format} 
              onValueChange={handleCurrencyFormatChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indian">Indian (₹1,23,456)</SelectItem>
                <SelectItem value="international">International ($123,456)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number Format</Label>
            <Select 
              value={preferences.numberFormat.style} 
              onValueChange={handleNumberFormatChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indian">Indian (1,23,456)</SelectItem>
                <SelectItem value="international">International (123,456)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Preview</p>
            <p className="text-sm text-muted-foreground">
              Currency: {preferencesStore.formatCurrency(123456.78)}
            </p>
            <p className="text-sm text-muted-foreground">
              Number: {preferencesStore.formatNumber(123456.78)}
            </p>
            <p className="text-sm text-muted-foreground">
              Percentage: {preferencesStore.formatPercentage(12.34)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data & Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data & Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-refresh Prices</Label>
              <p className="text-xs text-muted-foreground">
                Automatically update investment prices
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.autoRefreshPrices}
                onCheckedChange={handleAutoRefreshChange}
                disabled={loading}
              />
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Enable browser notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={preferences.pushNotifications.enabled}
                onCheckedChange={(enabled) => handleNotificationChange('enabled', enabled)}
                disabled={loading}
              />
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">SIP Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Remind me about upcoming SIP payments
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.sipReminders}
                onCheckedChange={(enabled) => handleNotificationChange('sipReminders', enabled)}
                disabled={loading || !preferences.pushNotifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">FD Maturity Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Alert me when fixed deposits are about to mature
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.fdMaturityAlerts}
                onCheckedChange={(enabled) => handleNotificationChange('fdMaturityAlerts', enabled)}
                disabled={loading || !preferences.pushNotifications.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Portfolio Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Notify me about significant portfolio changes
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications.portfolioUpdates}
                onCheckedChange={(enabled) => handleNotificationChange('portfolioUpdates', enabled)}
                disabled={loading || !preferences.pushNotifications.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default View</Label>
            <Select 
              value={preferences.dashboard.defaultView} 
              onValueChange={(value) => handleDashboardChange('defaultView', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Welcome Message</Label>
              <p className="text-xs text-muted-foreground">
                Display welcome message on dashboard
              </p>
            </div>
            <Switch
              checked={preferences.dashboard.showWelcomeMessage}
              onCheckedChange={(enabled) => handleDashboardChange('showWelcomeMessage', enabled)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use compact layout for more information
              </p>
            </div>
            <Switch
              checked={preferences.dashboard.compactMode}
              onCheckedChange={(enabled) => handleDashboardChange('compactMode', enabled)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            Reset Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reset all preferences to their default values. This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              onClick={handleResetPreferences}
              disabled={loading || isResetting}
              className="w-full"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})