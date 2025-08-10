import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  ConfirmationDialog 
} from '@/components/ui/confirmation-dialog'
import { 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  PiggyBank,
  TrendingUp,
  Building2
} from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/apiClient'

const CREDENTIAL_SERVICES = [
  {
    key: 'epfo',
    label: 'EPFO Portal',
    description: 'Employee Provident Fund Organization portal credentials',
    icon: PiggyBank,
    fields: [
      { key: 'uan', label: 'UAN (Universal Account Number)', type: 'text', required: true, placeholder: '123456789012' },
      { key: 'password', label: 'EPFO Portal Password', type: 'password', required: true, placeholder: 'Your EPFO password' },
      { key: 'mobile', label: 'Registered Mobile Number', type: 'tel', required: false, placeholder: '+91XXXXXXXXXX' }
    ],
    securityNote: 'Your EPFO credentials are encrypted and stored securely. We only use them to fetch your EPF balance and never store them in plain text.'
  },
  {
    key: 'yahoo_finance',
    label: 'Yahoo Finance API',
    description: 'API key for Yahoo Finance stock price data',
    icon: TrendingUp,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your Yahoo Finance API key' }
    ],
    securityNote: 'API keys are encrypted and used only for fetching stock price data.',
    optional: true
  },
  {
    key: 'nse_api',
    label: 'NSE API',
    description: 'National Stock Exchange API credentials',
    icon: Building2,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your NSE API key' },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: false, placeholder: 'Your NSE secret key (if required)' }
    ],
    securityNote: 'NSE API credentials are encrypted and used only for fetching stock price data.',
    optional: true
  },
  {
    key: 'alpha_vantage',
    label: 'Alpha Vantage',
    description: 'Alpha Vantage API for stock market data',
    icon: TrendingUp,
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your Alpha Vantage API key' }
    ],
    securityNote: 'Alpha Vantage API key is encrypted and used only for fetching market data.',
    optional: true
  }
]

export function CredentialManagement() {
  const [credentials, setCredentials] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState({})
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadCredentialStatus()
  }, [])

  const loadCredentialStatus = async () => {
    try {
      const response = await apiClient.get('/api/sync/credentials/status')
      setCredentials(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load credential status:', error)
      toast.error('Failed to load credential status')
      setLoading(false)
    }
  }

  const handleEditCredentials = (serviceKey) => {
    const service = CREDENTIAL_SERVICES.find(s => s.key === serviceKey)
    if (!service) return

    // Initialize form data with empty values
    const initialData = {}
    service.fields.forEach(field => {
      initialData[field.key] = ''
    })

    setFormData(initialData)
    setEditingService(serviceKey)
  }

  const handleSaveCredentials = async () => {
    if (!editingService) return

    const service = CREDENTIAL_SERVICES.find(s => s.key === editingService)
    if (!service) return

    // Validate required fields
    const missingFields = service.fields
      .filter(field => field.required && !formData[field.key]?.trim())
      .map(field => field.label)

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`)
      return
    }

    setSaving(true)
    try {
      await apiClient.post(`/api/sync/credentials/${editingService}`, formData)
      
      setCredentials(prev => ({
        ...prev,
        [editingService]: true
      }))
      
      setEditingService(null)
      setFormData({})
      toast.success(`${service.label} credentials saved successfully`)
    } catch (error) {
      console.error('Failed to save credentials:', error)
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCredentials = async (serviceKey) => {
    const service = CREDENTIAL_SERVICES.find(s => s.key === serviceKey)
    if (!service) return

    try {
      await apiClient.delete(`/api/sync/credentials/${serviceKey}`)
      
      setCredentials(prev => ({
        ...prev,
        [serviceKey]: false
      }))
      
      setDeleteConfirm(null)
      toast.success(`${service.label} credentials removed successfully`)
    } catch (error) {
      console.error('Failed to delete credentials:', error)
      toast.error('Failed to remove credentials')
    }
  }

  const togglePasswordVisibility = (fieldKey) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }))
  }

  const getCredentialStatus = (serviceKey) => {
    const hasCredentials = credentials[serviceKey]
    if (hasCredentials) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Configured
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline">
          <XCircle className="w-3 h-3 mr-1" />
          Not configured
        </Badge>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading credentials...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              Securely store credentials for external services to enable automatic data synchronization.
            </p>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-blue-800">
                <strong>Security:</strong> All credentials are encrypted using AES-256-GCM encryption before storage. 
                We never store passwords in plain text and only use them for authorized API calls.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credential Services */}
      {CREDENTIAL_SERVICES.map(service => {
        const IconComponent = service.icon
        const hasCredentials = credentials[service.key]

        return (
          <Card key={service.key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {service.label}
                      {service.optional && (
                        <Badge variant="secondary" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getCredentialStatus(service.key)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Security Note */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Key className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {service.securityNote}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={hasCredentials ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleEditCredentials(service.key)}
                >
                  {hasCredentials ? (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Update Credentials
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Credentials
                    </>
                  )}
                </Button>

                {hasCredentials && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm(service.key)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              {/* Warning for required credentials */}
              {!hasCredentials && !service.optional && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    <strong>Required:</strong> These credentials are needed to enable auto-sync for related investments.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Edit Credentials Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService && CREDENTIAL_SERVICES.find(s => s.key === editingService)?.label} Credentials
            </DialogTitle>
            <DialogDescription>
              Enter your credentials securely. They will be encrypted before storage.
            </DialogDescription>
          </DialogHeader>
          
          {editingService && (
            <div className="space-y-4">
              {CREDENTIAL_SERVICES.find(s => s.key === editingService)?.fields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [field.key]: e.target.value
                      }))}
                      className="pr-10"
                    />
                    {field.type === 'password' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility(field.key)}
                      >
                        {showPasswords[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Credentials'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Remove Credentials"
        description={`Are you sure you want to remove ${deleteConfirm && CREDENTIAL_SERVICES.find(s => s.key === deleteConfirm)?.label} credentials? This will disable auto-sync for related investments.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => handleDeleteCredentials(deleteConfirm)}
      />
    </div>
  )
}