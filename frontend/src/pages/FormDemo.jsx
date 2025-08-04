import React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Mail, Lock, Phone, MessageSquare } from 'lucide-react'

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

// Demo form schema
const demoFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'Must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  bio: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export function FormDemo() {
  const methods = useForm({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      bio: '',
      company: '',
      website: '',
    },
    mode: 'onChange', // Enable real-time validation
  })

  const onSubmit = (data) => {
    console.log('Form submitted:', data)
    toast.success('Form submitted successfully!')
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Enhanced Form Components Demo</h1>
          <p className="text-muted-foreground">
            Showcasing modern form inputs with floating labels, smooth animations, and real-time validation
          </p>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Personal Information Section */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Basic information about yourself
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedFormSection
                  title="Basic Details"
                  subtitle="Your personal information"
                  icon={User}
                >
                  <EnhancedFormLayout columns={2}>
                    <EnhancedFormField
                      name="firstName"
                      label="First Name"
                      placeholder="Enter your first name"
                      required
                      validate={validationHelpers.required}
                    />
                    
                    <EnhancedFormField
                      name="lastName"
                      label="Last Name"
                      placeholder="Enter your last name"
                      required
                      validate={validationHelpers.required}
                    />
                  </EnhancedFormLayout>

                  <EnhancedFormLayout columns={2}>
                    <div className="flex items-center gap-2">
                      <EnhancedFormField
                        name="email"
                        type="email"
                        label="Email Address"
                        placeholder="Enter your email"
                        required
                        validate={validationHelpers.email}
                        className="flex-1"
                      />
                      <HelpTooltip 
                        content="We'll use this email for account notifications and password recovery"
                        side="top"
                      />
                    </div>
                    
                    <EnhancedFormField
                      name="phone"
                      type="tel"
                      label="Phone Number"
                      placeholder="Enter your phone number"
                      required
                      validate={validationHelpers.phone}
                    />
                  </EnhancedFormLayout>
                </EnhancedFormSection>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Security
                </CardTitle>
                <CardDescription>
                  Set up your account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedFormGroup
                  title="Password Setup"
                  description="Choose a strong password to protect your account"
                >
                  <EnhancedFormLayout columns={2}>
                    <div className="flex items-center gap-2">
                      <EnhancedFormField
                        name="password"
                        component="password"
                        label="Password"
                        placeholder="Enter your password"
                        required
                        validate={validationHelpers.password}
                        className="flex-1"
                      />
                      <HelpTooltip 
                        content="Password must be at least 8 characters with uppercase, lowercase, and numbers"
                        side="top"
                      />
                    </div>
                    
                    <EnhancedFormField
                      name="confirmPassword"
                      component="password"
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      required
                    />
                  </EnhancedFormLayout>
                </EnhancedFormGroup>
              </CardContent>
            </Card>

            {/* Additional Information Section */}
            <Card className="modern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Optional details about yourself
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedFormSection
                  title="Professional Details"
                  subtitle="Tell us more about your work"
                  icon={MessageSquare}
                >
                  <EnhancedFormField
                    name="bio"
                    component="textarea"
                    label="Bio"
                    placeholder="Tell us about yourself..."
                    helperText="A brief description about yourself (optional)"
                  />

                  <EnhancedFormLayout columns={2}>
                    <EnhancedFormField
                      name="company"
                      label="Company"
                      placeholder="Your company name"
                      helperText="Where do you work?"
                    />
                    
                    <EnhancedFormField
                      name="website"
                      type="url"
                      label="Website"
                      placeholder="https://example.com"
                      helperText="Your personal or company website"
                    />
                  </EnhancedFormLayout>
                </EnhancedFormSection>
              </CardContent>
            </Card>

            {/* Submit Section */}
            <Card className="modern-card">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => methods.reset()}
                    className="btn-modern"
                  >
                    Reset Form
                  </Button>
                  <Button
                    type="submit"
                    className="btn-modern gradient-primary"
                    disabled={!methods.formState.isValid}
                  >
                    Submit Form
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debug Info (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <Card className="modern-card border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm">Debug Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify({
                      values: methods.watch(),
                      errors: methods.formState.errors,
                      isValid: methods.formState.isValid,
                      touchedFields: methods.formState.touchedFields,
                    }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </form>
        </FormProvider>
      </div>
    </div>
  )
}