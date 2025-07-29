import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { observer } from 'mobx-react-lite'
import { 
  User, 
  Settings, 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Upload,
  X
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores/StoreContext'

// Validation schemas for each step
const personalInfoSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  avatar: z.string().optional()
})

const preferencesSchema = z.object({
  currencyFormat: z.string().default('INR'),
  numberFormat: z.string().default('indian'),
  theme: z.string().default('light'),
  autoRefresh: z.boolean().default(false),
  notifications: z.boolean().default(true)
})

const portfolioSetupSchema = z.object({
  primaryInvestmentType: z.string().optional(),
  investmentExperience: z.string().optional(),
  monthlyInvestment: z.string().optional(),
  riskTolerance: z.string().optional()
})

const steps = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    icon: User
  },
  {
    id: 'preferences',
    title: 'App Preferences',
    description: 'Customize your experience',
    icon: Settings
  },
  {
    id: 'portfolio',
    title: 'Portfolio Setup',
    description: 'Set up your investment profile',
    icon: TrendingUp
  }
]

export const ProfileSetupWizard = observer(({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const authStore = useAuthStore()

  // Forms for each step
  const personalForm = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: authStore.user?.name || '',
      avatar: ''
    }
  })

  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      currencyFormat: 'INR',
      numberFormat: 'indian',
      theme: 'light',
      autoRefresh: false,
      notifications: true
    }
  })

  const portfolioForm = useForm({
    resolver: zodResolver(portfolioSetupSchema),
    defaultValues: {
      primaryInvestmentType: '',
      investmentExperience: '',
      monthlyInvestment: '',
      riskTolerance: ''
    }
  })

  const forms = [personalForm, preferencesForm, portfolioForm]
  const currentForm = forms[currentStep]

  const handleNext = async () => {
    const isValid = await currentForm.trigger()
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        await handleComplete()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Collect all form data
      const personalData = personalForm.getValues()
      const preferencesData = preferencesForm.getValues()
      const portfolioData = portfolioForm.getValues()

      // Update user profile with personal information
      if (personalData.name !== authStore.user?.name || personalData.avatar) {
        await authStore.updateProfile({
          name: personalData.name,
          avatar: personalData.avatar
        })
      }

      // Store preferences in localStorage for now (can be moved to backend later)
      const userPreferences = {
        ...preferencesData,
        ...portfolioData,
        onboardingCompleted: true,
        completedAt: new Date().toISOString()
      }
      
      localStorage.setItem('userPreferences', JSON.stringify(userPreferences))

      toast.success('Profile setup completed successfully!')
      onComplete()
    } catch (error) {
      console.error('Profile setup error:', error)
      toast.error('Failed to complete setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target.result
        setAvatarPreview(dataUrl)
        personalForm.setValue('avatar', dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    personalForm.setValue('avatar', '')
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Let's set up your account to get the most out of FiscalFlow
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {React.createElement(steps[currentStep].icon, { className: "w-5 h-5" })}
              <span>{steps[currentStep].title}</span>
            </CardTitle>
            <CardDescription>
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Personal Information */}
            {currentStep === 0 && (
              <Form {...personalForm}>
                <form className="space-y-6">
                  <FormField
                    control={personalForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Profile Picture (Optional)</Label>
                    <div className="flex items-center space-x-4">
                      {avatarPreview ? (
                        <div className="relative">
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                            onClick={removeAvatar}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          id="avatar"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('avatar').click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          Max 5MB, JPG or PNG
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 2: Preferences */}
            {currentStep === 1 && (
              <Form {...preferencesForm}>
                <form className="space-y-6">
                  <FormField
                    control={preferencesForm.control}
                    name="currencyFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INR">Indian Rupees (₹)</SelectItem>
                            <SelectItem value="USD">US Dollars ($)</SelectItem>
                            <SelectItem value="EUR">Euros (€)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={preferencesForm.control}
                    name="numberFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select number format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="indian">Indian (₹1,23,456)</SelectItem>
                            <SelectItem value="international">International (₹123,456)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={preferencesForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={preferencesForm.control}
                      name="autoRefresh"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Auto-refresh prices</FormLabel>
                            <p className="text-sm text-gray-500">
                              Automatically update investment prices (coming soon)
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="notifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Push notifications</FormLabel>
                            <p className="text-sm text-gray-500">
                              Get notified about important updates
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Portfolio Setup */}
            {currentStep === 2 && (
              <Form {...portfolioForm}>
                <form className="space-y-6">
                  <FormField
                    control={portfolioForm.control}
                    name="primaryInvestmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Investment Type (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="What do you invest in most?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mutual-funds">Mutual Funds</SelectItem>
                            <SelectItem value="stocks">Stocks</SelectItem>
                            <SelectItem value="fixed-deposits">Fixed Deposits</SelectItem>
                            <SelectItem value="epf">EPF</SelectItem>
                            <SelectItem value="mixed">Mixed Portfolio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={portfolioForm.control}
                    name="investmentExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Experience (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How long have you been investing?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (Less than 1 year)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (1-5 years)</SelectItem>
                            <SelectItem value="experienced">Experienced (5+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={portfolioForm.control}
                    name="monthlyInvestment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Investment Range (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How much do you invest monthly?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0-5000">₹0 - ₹5,000</SelectItem>
                            <SelectItem value="5000-15000">₹5,000 - ₹15,000</SelectItem>
                            <SelectItem value="15000-50000">₹15,000 - ₹50,000</SelectItem>
                            <SelectItem value="50000+">₹50,000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={portfolioForm.control}
                    name="riskTolerance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Tolerance (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="What's your risk appetite?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative (Low risk, stable returns)</SelectItem>
                            <SelectItem value="moderate">Moderate (Balanced risk and returns)</SelectItem>
                            <SelectItem value="aggressive">Aggressive (High risk, high returns)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
            >
              Skip Setup
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                'Saving...'
              ) : currentStep === steps.length - 1 ? (
                'Complete Setup'
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})