import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { WelcomeScreen } from './WelcomeScreen'
import { ProfileSetupWizard } from './ProfileSetupWizard'
import { GuidedTour } from './GuidedTour'
import { useAuthStore } from '@/stores/StoreContext'

const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  PROFILE_SETUP: 'profile_setup',
  GUIDED_TOUR: 'guided_tour',
  COMPLETED: 'completed'
}

export const OnboardingFlow = observer(({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.WELCOME)
  const [isVisible, setIsVisible] = useState(false)
  const authStore = useAuthStore()

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted')
    const hasCompletedTour = localStorage.getItem('guidedTourCompleted')
    
    if (hasCompletedOnboarding && hasCompletedTour) {
      setCurrentStep(ONBOARDING_STEPS.COMPLETED)
      return
    }

    // Check if user is new (just registered)
    const isNewUser = !authStore.user?.lastLogin || 
                     new Date(authStore.user.createdAt).getTime() === new Date(authStore.user.updatedAt).getTime()

    if (isNewUser && !hasCompletedOnboarding) {
      setIsVisible(true)
      setCurrentStep(ONBOARDING_STEPS.WELCOME)
    } else if (!hasCompletedTour) {
      setIsVisible(true)
      setCurrentStep(ONBOARDING_STEPS.GUIDED_TOUR)
    } else {
      setCurrentStep(ONBOARDING_STEPS.COMPLETED)
    }
  }, [authStore.user])

  const handleWelcomeComplete = () => {
    setCurrentStep(ONBOARDING_STEPS.PROFILE_SETUP)
  }

  const handleProfileSetupComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    setCurrentStep(ONBOARDING_STEPS.GUIDED_TOUR)
  }

  const handleGuidedTourComplete = () => {
    localStorage.setItem('guidedTourCompleted', 'true')
    setCurrentStep(ONBOARDING_STEPS.COMPLETED)
    setIsVisible(false)
    onComplete()
  }

  const handleSkipToApp = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    localStorage.setItem('guidedTourCompleted', 'true')
    setCurrentStep(ONBOARDING_STEPS.COMPLETED)
    setIsVisible(false)
    onComplete()
  }

  const handleSkipToTour = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    setCurrentStep(ONBOARDING_STEPS.GUIDED_TOUR)
  }

  // Don't render anything if onboarding is completed
  if (currentStep === ONBOARDING_STEPS.COMPLETED || !isVisible) {
    return null
  }

  return (
    <>
      {currentStep === ONBOARDING_STEPS.WELCOME && (
        <WelcomeScreen
          onGetStarted={handleWelcomeComplete}
          onSkip={handleSkipToApp}
        />
      )}

      {currentStep === ONBOARDING_STEPS.PROFILE_SETUP && (
        <ProfileSetupWizard
          onComplete={handleProfileSetupComplete}
          onSkip={handleSkipToTour}
        />
      )}

      {currentStep === ONBOARDING_STEPS.GUIDED_TOUR && (
        <GuidedTour
          isActive={true}
          onComplete={handleGuidedTourComplete}
          onSkip={handleGuidedTourComplete}
        />
      )}
    </>
  )
})

// Hook to manually trigger guided tour
export const useGuidedTour = () => {
  const [showTour, setShowTour] = useState(false)

  const startTour = () => {
    setShowTour(true)
  }

  const endTour = () => {
    setShowTour(false)
  }

  return {
    showTour,
    startTour,
    endTour,
    GuidedTourComponent: ({ onComplete }) => (
      <GuidedTour
        isActive={showTour}
        onComplete={() => {
          endTour()
          onComplete?.()
        }}
        onSkip={() => {
          endTour()
          onComplete?.()
        }}
      />
    )
  }
}