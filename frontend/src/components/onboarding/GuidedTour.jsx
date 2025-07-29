import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Target,
  TrendingUp,
  PieChart,
  Plus,
  Settings,
  Download
} from 'lucide-react'

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to FiscalFlow!',
    description: 'Let\'s take a quick tour of your new investment dashboard. This will only take a minute.',
    target: null,
    position: 'center'
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar',
    description: 'Use this sidebar to navigate between different sections of your portfolio. Click on any item to switch views.',
    target: '[data-tour="sidebar"]',
    position: 'right'
  },
  {
    id: 'dashboard-cards',
    title: 'Portfolio Summary',
    description: 'These cards show your portfolio overview - total value, invested amount, returns, and monthly growth.',
    target: '[data-tour="summary-cards"]',
    position: 'bottom'
  },
  {
    id: 'asset-allocation',
    title: 'Asset Allocation Chart',
    description: 'This chart shows how your investments are distributed across different asset classes.',
    target: '[data-tour="asset-allocation"]',
    position: 'top'
  },
  {
    id: 'top-performers',
    title: 'Top Performers',
    description: 'See which of your investments are performing best with gains and losses highlighted.',
    target: '[data-tour="top-performers"]',
    position: 'left'
  },
  {
    id: 'add-investment',
    title: 'Add New Investments',
    description: 'Click the "Add" buttons throughout the app to start tracking your investments in each category.',
    target: '[data-tour="add-button"]',
    position: 'bottom'
  },
  {
    id: 'settings',
    title: 'Settings & Export',
    description: 'Access app preferences and export your data from the Settings page.',
    target: '[data-tour="settings-nav"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You\'re ready to start tracking your investments. Remember, you can always access help from the settings menu.',
    target: null,
    position: 'center'
  }
]

export function GuidedTour({ isActive, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const overlayRef = useRef(null)
  const tooltipRef = useRef(null)

  const currentTourStep = tourSteps[currentStep]

  useEffect(() => {
    if (isActive) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
      updateTooltipPosition()
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isActive, currentStep])

  useEffect(() => {
    const handleResize = () => {
      if (isActive) {
        updateTooltipPosition()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, currentStep])

  const updateTooltipPosition = () => {
    const step = tourSteps[currentStep]
    
    if (!step.target || step.position === 'center') {
      // Center the tooltip
      setTooltipPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      })
      return
    }

    const targetElement = document.querySelector(step.target)
    if (!targetElement) {
      console.warn(`Tour target not found: ${step.target}`)
      return
    }

    const targetRect = targetElement.getBoundingClientRect()
    const tooltipElement = tooltipRef.current
    
    if (!tooltipElement) return

    const tooltipRect = tooltipElement.getBoundingClientRect()
    const padding = 20

    let top, left, transform = ''

    switch (step.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - padding
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
        break
      case 'bottom':
        top = targetRect.bottom + padding
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
        break
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
        left = targetRect.left - tooltipRect.width - padding
        break
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2)
        left = targetRect.right + padding
        break
      default:
        top = targetRect.bottom + padding
        left = targetRect.left
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left < padding) left = padding
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding
    }

    setTooltipPosition({ top, left, transform })
  }

  const highlightTarget = (target) => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })

    if (target) {
      const targetElement = document.querySelector(target)
      if (targetElement) {
        targetElement.classList.add('tour-highlight')
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        })
      }
    }
  }

  useEffect(() => {
    if (currentTourStep.target) {
      highlightTarget(currentTourStep.target)
    }
  }, [currentStep])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Remove highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    
    // Mark tour as completed
    localStorage.setItem('guidedTourCompleted', 'true')
    onComplete()
  }

  const handleSkip = () => {
    // Remove highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight')
    })
    
    localStorage.setItem('guidedTourCompleted', 'true')
    onSkip()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
        style={{ pointerEvents: 'auto' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 max-w-sm"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: tooltipPosition.transform
        }}
      >
        <Card className="shadow-2xl border-2 border-blue-200 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentTourStep.title}</CardTitle>
                  <div className="text-xs text-gray-500">
                    Step {currentStep + 1} of {tourSteps.length}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-sm mb-4">
              {currentTourStep.description}
            </CardDescription>

            {/* Progress indicator */}
            <div className="mb-4">
              <div className="flex space-x-1">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded ${
                      index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                >
                  Skip Tour
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentStep === tourSteps.length - 1 ? (
                    'Finish'
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tour highlight styles */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .tour-highlight::before {
          content: '';
          position: absolute;
          inset: -4px;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          pointer-events: none;
          animation: tour-pulse 2s infinite;
        }
        
        @keyframes tour-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  )
}