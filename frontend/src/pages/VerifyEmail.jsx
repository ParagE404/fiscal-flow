import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { observer } from 'mobx-react-lite'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/StoreContext'

export const VerifyEmail = observer(() => {
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const authStore = useAuthStore()

  // Get email from URL params if available (from registration flow)
  const emailFromParams = searchParams.get('email')

  useEffect(() => {
    if (token && token !== 'pending') {
      verifyEmail(token)
    } else if (token === 'pending') {
      // User was redirected after registration, show pending verification screen
      setIsLoading(false)
    } else {
      setIsLoading(false)
      setError('Invalid verification link')
    }
    
    // Pre-fill email if available from params
    if (emailFromParams) {
      setResendEmail(emailFromParams)
    }
  }, [token, emailFromParams])

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await apiClient.verifyEmail(verificationToken)
      setIsVerified(true)
      
      // Update auth store with new token if provided
      if (response.token) {
        authStore.token = response.token
        authStore.user = response.user
        authStore.isAuthenticated = true
        localStorage.setItem('authToken', response.token)
      }
      
      toast.success('Email verified successfully!')
    } catch (error) {
      console.error('Email verification error:', error)
      const errorMessage = error.message || 'Email verification failed'
      setError(errorMessage)
      
      // Show different error messages based on the error type
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setError('The verification link has expired or is invalid. Please request a new verification email.')
      } else {
        setError(errorMessage)
      }
      
      toast.error('Email verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async (e) => {
    e.preventDefault()
    
    if (!resendEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsResending(true)
    try {
      await apiClient.sendVerificationEmail(resendEmail)
      setResendSuccess(true)
      setShowResendForm(false)
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error) {
      console.error('Resend verification error:', error)
      toast.error(error.message || 'Failed to send verification email')
    } finally {
      setIsResending(false)
    }
  }

  const handleShowResendForm = () => {
    setShowResendForm(true)
    setResendSuccess(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show pending verification screen for users redirected after registration
  if (token === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-base">
              We've sent a verification link to {emailFromParams && (
                <span className="font-medium">{emailFromParams}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Verification email sent
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Click the verification link in your email to activate your account. 
                Don't forget to check your spam folder if you don't see it in your inbox.
              </p>
            </div>

            <div className="space-y-3">
              {!showResendForm && !resendSuccess ? (
                <Button
                  onClick={handleShowResendForm}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Didn't receive the email?
                </Button>
              ) : showResendForm ? (
                <form onSubmit={handleResendVerification} className="space-y-3">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      disabled={isResending}
                      className="mt-1"
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isResending || !resendEmail.trim()}
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send email
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResendForm(false)}
                      disabled={isResending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  onClick={() => {
                    setResendSuccess(false)
                    setShowResendForm(true)
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Send another email
                </Button>
              )}

              <div className="text-center space-y-2">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-500 hover:underline block"
                >
                  Back to sign in
                </Link>
              </div>
            </div>

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Verification email sent!
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Please check your inbox and click the verification link.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">Email verified!</CardTitle>
            <CardDescription className="text-base">
              Your email has been successfully verified. You now have full access to your FiscalFlow account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Account fully activated
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You can now access all features including portfolio tracking, data export, and more.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate(authStore.isAuthenticated ? '/' : '/login')}
                className="w-full"
              >
                {authStore.isAuthenticated ? 'Go to Dashboard' : 'Continue to sign in'}
              </Button>
              
              {!authStore.isAuthenticated && (
                <div className="text-center">
                  <Link
                    to="/register"
                    className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                  >
                    Need to create an account?
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              {error.includes('expired') || error.includes('invalid') ? (
                <AlertCircle className="w-8 h-8 text-white" />
              ) : (
                <XCircle className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">
            {error.includes('expired') || error.includes('invalid') ? 'Link expired' : 'Verification failed'}
          </CardTitle>
          <CardDescription className="text-base">
            {error || 'We couldn\'t verify your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resendSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Verification email sent!
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Please check your inbox and click the verification link. Don't forget to check your spam folder.
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Need a new verification link?
                </span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Verification links expire after 24 hours for security. Request a new one below.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {!showResendForm && !resendSuccess ? (
              <Button
                onClick={handleShowResendForm}
                variant="outline"
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Request new verification email
              </Button>
            ) : showResendForm ? (
              <form onSubmit={handleResendVerification} className="space-y-3">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={isResending}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isResending || !resendEmail.trim()}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send email
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResendForm(false)}
                    disabled={isResending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                onClick={() => {
                  setResendSuccess(false)
                  setShowResendForm(true)
                }}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Send another email
              </Button>
            )}

            <div className="text-center space-y-2">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-500 hover:underline block"
              >
                Back to sign in
              </Link>
              <Link
                to="/register"
                className="text-sm text-slate-600 hover:text-slate-500 hover:underline block"
              >
                Create a new account
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})