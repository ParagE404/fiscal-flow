import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { toast } from 'sonner'
import { CheckCircle, AlertTriangle, Mail, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/StoreContext'

export const EmailVerificationStatus = observer(() => {
  const [isResending, setIsResending] = useState(false)
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return null
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    try {
      await authStore.sendVerificationEmail()
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error) {
      console.error('Failed to resend verification email:', error)
      toast.error(error.message || 'Failed to send verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="w-5 h-5" />
          <span>Email Verification</span>
        </CardTitle>
        <CardDescription>
          Manage your email verification status and security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {authStore.isEmailVerified ? (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium text-sm">
                  {authStore.user?.email}
                </p>
                <Badge 
                  variant={authStore.isEmailVerified ? "default" : "secondary"}
                  className={authStore.isEmailVerified ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                >
                  {authStore.isEmailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {authStore.isEmailVerified 
                  ? 'Your email address has been verified and your account is fully activated.'
                  : 'Please verify your email address to access all features and ensure account security.'
                }
              </p>
            </div>
          </div>
          
          {!authStore.isEmailVerified && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend email
                </>
              )}
            </Button>
          )}
        </div>

        {!authStore.isEmailVerified && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-orange-800">
                  Limited Account Access
                </h4>
                <p className="text-sm text-orange-700">
                  Until you verify your email address, some features may be restricted:
                </p>
                <ul className="text-sm text-orange-700 space-y-1 ml-4">
                  <li>• Data export functionality</li>
                  <li>• Email notifications and alerts</li>
                  <li>• Password recovery options</li>
                  <li>• Account security features</li>
                </ul>
                <p className="text-sm text-orange-700">
                  <strong>Didn't receive the email?</strong> Check your spam folder or click "Resend email" above.
                </p>
              </div>
            </div>
          </div>
        )}

        {authStore.isEmailVerified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-green-800">
                  Account Fully Verified
                </h4>
                <p className="text-sm text-green-700">
                  Your email is verified and you have access to all FiscalFlow features including data export, 
                  notifications, and enhanced security options.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})