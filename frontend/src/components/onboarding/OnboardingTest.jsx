import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WelcomeScreen } from './WelcomeScreen'
import { ProfileSetupWizard } from './ProfileSetupWizard'
import { GuidedTour } from './GuidedTour'

export function OnboardingTest() {
  const [currentView, setCurrentView] = useState('menu')

  const handleReset = () => {
    setCurrentView('menu')
    localStorage.removeItem('onboardingCompleted')
    localStorage.removeItem('guidedTourCompleted')
  }

  if (currentView === 'welcome') {
    return (
      <WelcomeScreen
        onGetStarted={() => setCurrentView('wizard')}
        onSkip={() => setCurrentView('menu')}
      />
    )
  }

  if (currentView === 'wizard') {
    return (
      <ProfileSetupWizard
        onComplete={() => setCurrentView('tour')}
        onSkip={() => setCurrentView('tour')}
      />
    )
  }

  if (currentView === 'tour') {
    return (
      <>
        <div className="p-8">
          <h1>Dashboard Content</h1>
          <div data-tour="sidebar" className="p-4 bg-blue-100 mb-4">Sidebar</div>
          <div data-tour="summary-cards" className="p-4 bg-green-100 mb-4">Summary Cards</div>
          <div data-tour="asset-allocation" className="p-4 bg-yellow-100 mb-4">Asset Allocation</div>
          <div data-tour="top-performers" className="p-4 bg-red-100 mb-4">Top Performers</div>
          <div data-tour="add-button" className="p-4 bg-purple-100 mb-4">Add Button</div>
          <div data-tour="settings-nav" className="p-4 bg-pink-100 mb-4">Settings Nav</div>
        </div>
        <GuidedTour
          isActive={true}
          onComplete={() => setCurrentView('menu')}
          onSkip={() => setCurrentView('menu')}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-4 p-8">
        <h1 className="text-2xl font-bold text-center">Onboarding Test</h1>
        <div className="space-y-2">
          <Button 
            onClick={() => setCurrentView('welcome')} 
            className="w-full"
          >
            Test Welcome Screen
          </Button>
          <Button 
            onClick={() => setCurrentView('wizard')} 
            className="w-full"
            variant="outline"
          >
            Test Profile Setup Wizard
          </Button>
          <Button 
            onClick={() => setCurrentView('tour')} 
            className="w-full"
            variant="outline"
          >
            Test Guided Tour
          </Button>
          <Button 
            onClick={handleReset} 
            className="w-full"
            variant="destructive"
          >
            Reset Onboarding State
          </Button>
        </div>
      </div>
    </div>
  )
}