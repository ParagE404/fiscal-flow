import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ErrorState, 
  InlineError, 
  FieldError, 
  NetworkError, 
  NotFoundError, 
  EmptyState 
} from '@/components/ui/error-state'
import { 
  PageLoading, 
  ContentLoading, 
  InlineLoading, 
  DataLoading, 
  FormLoading, 
  FinancialDataLoading 
} from '@/components/ui/loading-states'
import { 
  FinancialLoader, 
  PulsingDots, 
  WaveLoader, 
  SegmentLoader, 
  MorphingLoader, 
  TypingLoader, 
  ProgressCircle, 
  AnimatedLoadingCard, 
  FullScreenLoader 
} from '@/components/ui/engaging-loader'
import { Progress, CircularProgress, StepProgress, MultiStepProgress } from '@/components/ui/progress'
import { RefreshCw, Home, ArrowLeft, Plus, TrendingUp } from 'lucide-react'

export default function LoadingErrorDemo() {
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false)
  const [progress, setProgress] = useState(45)
  const [currentStep, setCurrentStep] = useState(1)

  const steps = [
    "Initialize application",
    "Load user data", 
    "Fetch portfolio",
    "Calculate returns",
    "Render dashboard"
  ]

  const multiSteps = [
    { title: "Account Setup", description: "Create your profile" },
    { title: "Verification", description: "Verify your identity" },
    { title: "Portfolio", description: "Add your investments" },
    { title: "Complete", description: "Start tracking" }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-h1 font-bold">Loading & Error States Demo</h1>
        <p className="text-body text-muted-foreground">
          Showcase of modern loading animations and error handling components
        </p>
      </div>

      {/* Error States Section */}
      <section className="space-y-6">
        <h2 className="text-h2 font-semibold">Error States</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorState
            title="Payment Failed"
            message="Your payment could not be processed. Please check your payment method and try again."
            type="error"
            actions={[
              { label: "Retry Payment", onClick: () => {}, icon: RefreshCw },
              { label: "Change Method", onClick: () => {}, variant: "outline" }
            ]}
          />

          <NetworkError onRetry={() => {}} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NotFoundError />
          
          <EmptyState
            title="No investments yet"
            message="Start building your portfolio by adding your first investment."
            icon={TrendingUp}
            actions={[
              { label: "Add Investment", onClick: () => {}, icon: Plus }
            ]}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-h3 font-semibold">Inline Error Messages</h3>
          <InlineError message="This field is required and cannot be empty." />
          <InlineError 
            message="Your session has expired. Please log in again." 
            variant="warning" 
          />
          <FieldError message="Password must be at least 8 characters long" />
        </div>
      </section>
    </div>
  )
}   
   {/* Loading States Section */}
      <section className="space-y-6">
        <h2 className="text-h2 font-semibold">Loading States</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="modern-card">
            <CardHeader>
              <CardTitle>Page Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <PageLoading 
                title="Loading Dashboard..."
                description="Preparing your financial overview"
                progress={progress}
              />
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardHeader>
              <CardTitle>Data Loading</CardTitle>
            </CardHeader>
            <CardContent>
              <DataLoading 
                title="Syncing portfolio..."
                description="Fetching latest market data"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-h3 font-semibold">Content Loading Skeletons</h3>
          <ContentLoading type="cards" count={3} />
        </div>

        <div className="space-y-4">
          <h3 className="text-h3 font-semibold">Financial Data Loading</h3>
          <FinancialDataLoading />
        </div>
      </section>

      {/* Engaging Loaders Section */}
      <section className="space-y-6">
        <h2 className="text-h2 font-semibold">Engaging Loaders</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <FinancialLoader size="lg" />
              <p className="text-sm mt-2">Financial Icons</p>
            </CardContent>
          </Card>

          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <PulsingDots count={3} size="lg" />
              <p className="text-sm mt-2">Pulsing Dots</p>
            </CardContent>
          </Card>

          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <WaveLoader bars={5} />
              <p className="text-sm mt-2">Wave Loader</p>
            </CardContent>
          </Card>

          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <SegmentLoader size="lg" />
              <p className="text-sm mt-2">Segments</p>
            </CardContent>
          </Card>

          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <MorphingLoader size="lg" />
              <p className="text-sm mt-2">Morphing</p>
            </CardContent>
          </Card>

          <Card className="modern-card p-6 text-center">
            <CardContent className="p-0">
              <ProgressCircle progress={75} size={60} />
              <p className="text-sm mt-2">Progress Circle</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-h3 font-semibold">Typing Loader</h3>
          <Card className="modern-card p-6">
            <TypingLoader 
              texts={[
                "Analyzing your portfolio...",
                "Calculating returns...",
                "Generating insights...",
                "Almost ready..."
              ]}
            />
          </Card>
        </div>

        <AnimatedLoadingCard 
          title="Processing Investment"
          description="Your transaction is being processed securely"
          progress={progress}
        />
      </section>

      {/* Progress Indicators Section */}
      <section className="space-y-6">
        <h2 className="text-h2 font-semibold">Progress Indicators</h2>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-h3 font-semibold">Linear Progress</h3>
            <Progress value={progress} showValue />
            <Progress value={progress} variant="success" showValue />
            <Progress value={progress} variant="gradient" showValue animated />
          </div>

          <div className="space-y-4">
            <h3 className="text-h3 font-semibold">Circular Progress</h3>
            <div className="flex gap-6">
              <CircularProgress value={progress} showValue />
              <CircularProgress value={progress} variant="success" showValue />
              <CircularProgress value={progress} variant="warning" showValue />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-h3 font-semibold">Step Progress</h3>
            <StepProgress steps={steps} currentStep={currentStep} />
          </div>

          <div className="space-y-4">
            <h3 className="text-h3 font-semibold">Multi-Step Progress</h3>
            <MultiStepProgress steps={multiSteps} currentStep={currentStep} />
          </div>
        </div>
      </section>

      {/* Interactive Controls */}
      <section className="space-y-6">
        <h2 className="text-h2 font-semibold">Interactive Controls</h2>
        
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setProgress(Math.min(100, progress + 10))}>
            Increase Progress
          </Button>
          <Button onClick={() => setProgress(Math.max(0, progress - 10))} variant="outline">
            Decrease Progress
          </Button>
          <Button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}>
            Next Step
          </Button>
          <Button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} variant="outline">
            Previous Step
          </Button>
          <Button onClick={() => setShowFullScreenLoader(true)} variant="purple">
            Show Full Screen Loader
          </Button>
        </div>
      </section>

      {/* Full Screen Loader */}
      {showFullScreenLoader && (
        <FullScreenLoader
          title="Setting up your account..."
          subtitle="This will only take a moment"
          progress={progress}
          steps={steps}
          currentStep={currentStep}
          onClick={() => setShowFullScreenLoader(false)}
        />
      )}
    </div>
  )
}