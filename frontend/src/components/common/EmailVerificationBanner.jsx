import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { toast } from 'sonner'
import { Mail, X, AlertTriangle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/StoreContext'

export const EmailVerificationBanner = observer(() => {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const authStore = useAuthStore()

  // Don't show if user is not authenticated, email is verified, or banner is dismissed
  if (!authStore.needsEmailVerification || isDismissed) {
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

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Please verify your email address
            </p>
            <p className="text-sm text-orange-700">
              We sent a verification link to <span className="font-medium">{authStore.user?.email}</span>. 
              Check your inbox and click the link to access all features.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isResending}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Resend email
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-orange-600 hover:bg-orange-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})