import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Lock, Shield, AlertTriangle, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { authStore } from '@/stores/AuthStore'
import { apiClient } from '@/lib/apiClient'

export const AccountSettings = observer(() => {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [securityInfo, setSecurityInfo] = useState(null)
  const [isLoadingSecurityInfo, setIsLoadingSecurityInfo] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const deleteForm = useForm({
    defaultValues: {
      password: '',
      confirmDelete: ''
    }
  })

  useEffect(() => {
    fetchSecurityInfo()
  }, [])

  const fetchSecurityInfo = async () => {
    try {
      const response = await apiClient.getSecurityInfo()
      setSecurityInfo(response.security)
    } catch (error) {
      console.error('Failed to fetch security info:', error)
    } finally {
      setIsLoadingSecurityInfo(false)
    }
  }

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await apiClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      
      passwordForm.reset()
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Failed to change password:', error)
      passwordForm.setError('currentPassword', {
        type: 'manual',
        message: error.message || 'Failed to change password'
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const response = await apiClient.exportUserData()
      
      // Create and download JSON file
      const dataStr = JSON.stringify(response.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `fiscal-flow-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Failed to export data:', error)
      toast.error(error.message || 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const onDeleteSubmit = async (data) => {
    if (data.confirmDelete !== 'DELETE') {
      deleteForm.setError('confirmDelete', {
        type: 'manual',
        message: 'Please type "DELETE" to confirm'
      })
      return
    }

    setIsDeleting(true)
    try {
      await apiClient.deleteAccount({
        password: data.password,
        confirmDelete: data.confirmDelete
      })
      
      // Logout and redirect
      await authStore.logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Failed to delete account:', error)
      deleteForm.setError('password', {
        type: 'manual',
        message: error.message || 'Failed to delete account'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSecurityInfo ? (
            <div className="text-center py-4">Loading security information...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email Status</Label>
                  <div className="mt-1">
                    <Badge variant={securityInfo?.isEmailVerified ? "default" : "secondary"}>
                      {securityInfo?.isEmailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Status</Label>
                  <div className="mt-1">
                    <Badge variant={securityInfo?.accountStatus?.isLocked ? "destructive" : "default"}>
                      {securityInfo?.accountStatus?.isLocked ? 'Locked' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {securityInfo?.accountStatus?.failedLoginAttempts > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      {securityInfo.accountStatus.failedLoginAttempts} failed login attempt(s) detected
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                rules={{ required: 'Current password is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password"
                        placeholder="Enter your current password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                rules={{
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password"
                        placeholder="Enter your new password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                rules={{ required: 'Please confirm your new password' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password"
                        placeholder="Confirm your new password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isChangingPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Data Export and Account Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-destructive/20 rounded-md">
            <h4 className="font-medium mb-2">Export Your Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download a copy of all your financial data before deleting your account.
            </p>
            <Button 
              variant="outline" 
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>

          <div className="p-4 border border-destructive/20 rounded-md">
            <h4 className="font-medium mb-2 text-destructive">Delete Account</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    <br /><br />
                    <strong>What will be deleted:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Your profile and account information</li>
                      <li>All mutual fund investments</li>
                      <li>All fixed deposit records</li>
                      <li>All EPF account data</li>
                      <li>All stock portfolio information</li>
                      <li>All SIP records</li>
                    </ul>
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...deleteForm}>
                  <form onSubmit={deleteForm.handleSubmit(onDeleteSubmit)} className="space-y-4">
                    <FormField
                      control={deleteForm.control}
                      name="password"
                      rules={{ required: 'Password is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm your password</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password"
                              placeholder="Enter your password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deleteForm.control}
                      name="confirmDelete"
                      rules={{ required: 'Please type DELETE to confirm' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type "DELETE" to confirm</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="DELETE"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowDeleteDialog(false)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="destructive"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})