import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  PieChart, 
  Shield, 
  Smartphone,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: 'Portfolio Tracking',
    description: 'Track mutual funds, stocks, fixed deposits, and EPF accounts in one place'
  },
  {
    icon: PieChart,
    title: 'Asset Allocation',
    description: 'Visualize your investment distribution with interactive charts'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your financial data is encrypted and stored securely on your device'
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Access your portfolio anywhere with our responsive design'
  }
]

const benefits = [
  'Track all your investments in one dashboard',
  'Monitor performance with real-time calculations',
  'Export your data anytime for backup',
  'Set up in less than 5 minutes'
]

export function WelcomeScreen({ onGetStarted, onSkip }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to FiscalFlow
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your personal finance dashboard for tracking investments across mutual funds, 
            stocks, fixed deposits, and EPF accounts - all in one place.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Why Choose FiscalFlow?</CardTitle>
            <CardDescription>
              Everything you need to manage your investments effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            onClick={onSkip}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto px-8 py-3"
          >
            Skip Setup
          </Button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Setup takes less than 5 minutes • You can always change these settings later
        </p>
      </div>
    </div>
  )
}