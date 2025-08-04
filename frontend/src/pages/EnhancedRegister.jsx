import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { observer } from 'mobx-react-lite'
import { UserPlus, Check, X, User, Mail, Lock, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  EnhancedFormField, 
  EnhancedFormGroup, 
  EnhancedFormSection, 
  EnhancedFormLayout,
  validationHelpers 
} from '@/components/ui/enhanced-form'
import { HelpTooltip } from '@/components/ui/tooltip'
import { apiClient } from '@/lib/apiClient'

const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const EnhancedRegister = observer(() => {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const methods = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onChange', // Enable real-time validation
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { confirmPassword, acceptTerms, ...registerData } = data
      const response = await apiClient.register(registerData)
      
      toast.success('Registration successful! Please check your email to verify your account.')
      
      // Redirect to verify email page with email parameter for better UX
      navigate(`/verify-email/pending?email=${encodeURIComponent(registerData.email)}`)
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const watchPassword = methods.watch('password')

  const passwordRequirements = [
    { text: 'At least 8 characters', met: watchPassword?.length >= 8 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(watchPassword || '') },
    { text: 'One lowercase letter', met: /[a-z]/.test(watchPassword || '') },
    { text: 'One number', met: /\d/.test(watchPassword || '') },
  ]

  const allRequirementsMet = passwordRequirements.every(req => req.met)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg modern-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Create your account</CardTitle>
          <CardDescription>
            Join FiscalFlow to start tracking your investments with modern tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Personal Information Section */}
              <EnhancedFormSection
                title="Personal Information"
                subtitle="Tell us about yourself"
                icon={User}
              >
                <div className="flex items-center gap-2">
                  <EnhancedFormField
                    name="name"
                    label="Full Name"
                    placeholder="Enter your full name (e.g., John Doe)"
                    required
                    disabled={isLoading}
                    validate={validationHelpers.required}
                    helperText="This will be displayed on your profile"
                    className="flex-1"
                  />
                  <HelpTooltip 
                    content="Your full name as you'd like it to appear in the application"
                    side="top"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <EnhancedFormField
                    name="email"
                    type="email"
                    label="Email Address"
                    placeholder="Enter your email (e.g., john@example.com)"
                    required
                    disabled={isLoading}
                    validate={validationHelpers.email}
                    helperText="We'll send account notifications to this email"
                    className="flex-1"
                  />
                  <HelpTooltip 
                    content="We'll use this email for account verification, notifications, and password recovery"
                    side="top"
                  />
                </div>
              </EnhancedFormSection>

              {/* Security Section */}
              <EnhancedFormSection
                title="Account Security"
                subtitle="Choose a strong password"
                icon={Shield}
              >
                <EnhancedFormGroup
                  title="Password Setup"
                  description="Your password should be strong and unique"
                >
                  <div className="flex items-center gap-2">
                    <EnhancedFormField
                      name="password"
                      component="password"
                      label="Password"
                      placeholder="Create a strong password"
                      required
                      disabled={isLoading}
                      validate={validationHelpers.password}
                      className="flex-1"
                    />
                    <HelpTooltip 
                      content="Use a mix of uppercase, lowercase, numbers, and symbols for better security"
                      side="top"
                    />
                  </div>

                  {/* Password Requirements Indicator */}
                  {watchPassword && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-2">
                      <div className="text-sm font-medium text-foreground mb-2">
                        Password Requirements:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className="flex items-center text-sm">
                            {req.met ? (
                              <Check className="w-4 h-4 mr-2 text-success" />
                            ) : (
                              <X className="w-4 h-4 mr-2 text-muted-foreground" />
                            )}
                            <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {allRequirementsMet && (
                        <div className="flex items-center text-sm text-success font-medium mt-2">
                          <Check className="w-4 h-4 mr-2" />
                          Password meets all requirements!
                        </div>
                      )}
                    </div>
                  )}

                  <EnhancedFormField
                    name="confirmPassword"
                    component="password"
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    required
                    disabled={isLoading}
                    helperText="Make sure both passwords match"
                  />
                </EnhancedFormGroup>
              </EnhancedFormSection>

              {/* Terms and Conditions */}
              <EnhancedFormGroup
                title="Terms & Conditions"
                description="Please review and accept our terms"
              >
                <div className="flex items-start space-x-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    {...methods.register('acceptTerms')}
                    disabled={isLoading}
                    className="w-4 h-4 mt-1 text-primary bg-background border-border rounded focus:ring-primary/20 focus:ring-2 transition-colors"
                  />
                  <div className="flex-1">
                    <label htmlFor="acceptTerms" className="text-sm text-foreground cursor-pointer">
                      I agree to the{' '}
                      <Link 
                        to="/terms" 
                        className="text-primary hover:text-primary/80 underline font-medium"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link 
                        to="/privacy" 
                        className="text-primary hover:text-primary/80 underline font-medium"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                    </label>
                    {methods.formState.errors.acceptTerms && (
                      <p className="text-sm text-destructive mt-1">
                        {methods.formState.errors.acceptTerms.message}
                      </p>
                    )}
                  </div>
                </div>
              </EnhancedFormGroup>

              {/* Submit Button */}
              <div className="space-y-4">
                <Button
                  type="submit"
                  className="w-full btn-modern gradient-primary"
                  disabled={isLoading || !methods.formState.isValid}
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    'Create account'
                  )}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
})