import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { UserProvider } from './contexts/UserContext'
// import { initializeAccessibility } from './lib/accessibility'
// import { initializePerformanceOptimizations } from './lib/performance'
// import { initializePerformanceMonitoring } from './lib/performance/bundleOptimization.jsx'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute, EmailVerifiedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { LoadingSpinner } from './components/ui/loading-spinner'

// Lazy load components for better performance
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })))
const MutualFunds = lazy(() => import('./pages/MutualFunds').then(module => ({ default: module.MutualFunds })))
const FixedDeposits = lazy(() => import('./pages/FixedDeposits').then(module => ({ default: module.FixedDeposits })))
const EPF = lazy(() => import('./pages/EPF').then(module => ({ default: module.EPF })))
const Stocks = lazy(() => import('./pages/Stocks').then(module => ({ default: module.Stocks })))
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })))
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })))
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })))
const EnhancedRegister = lazy(() => import('./pages/EnhancedRegister').then(module => ({ default: module.EnhancedRegister })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(module => ({ default: module.VerifyEmail })))
const FormDemo = lazy(() => import('./pages/FormDemo').then(module => ({ default: module.FormDemo })))
const BrowserCompatibilityTest = lazy(() => import('./pages/BrowserCompatibilityTest'))
const StyleGuide = lazy(() => import('./components/design-system/StyleGuide'))
const LayoutTest = lazy(() => import('./pages/LayoutTest'))
const SidebarTest = lazy(() => import('./pages/SidebarTest'))

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true)

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Initialize accessibility and performance optimizations
  useEffect(() => {
    // initializeAccessibility()
    // initializePerformanceOptimizations()
    // initializePerformanceMonitoring()
  }, [])

  return (
    <Router>
      <UserProvider>
        <Routes>
          {/* Public-only routes (redirect if authenticated) */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Login />
              </Suspense>
            </PublicOnlyRoute>
          } />
          <Route path="/register" element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Register />
              </Suspense>
            </PublicOnlyRoute>
          } />
          <Route path="/enhanced-register" element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <EnhancedRegister />
              </Suspense>
            </PublicOnlyRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicOnlyRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <ForgotPassword />
              </Suspense>
            </PublicOnlyRoute>
          } />
          
          {/* Email verification routes (accessible to authenticated users) */}
          <Route path="/verify-email/:token" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <VerifyEmail />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/verify-email/pending" element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <VerifyEmail />
              </Suspense>
            </ProtectedRoute>
          } />
          
          {/* Protected routes that require email verification */}
          <Route path="/" element={
            <EmailVerifiedRoute>
              <>
                <Layout />
                {showOnboarding && (
                  <Suspense fallback={<LoadingSpinner />}>
                    <OnboardingFlow onComplete={handleOnboardingComplete} />
                  </Suspense>
                )}
              </>
            </EmailVerifiedRoute>
          }>
            <Route index element={
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="mutual-funds" element={
              <Suspense fallback={<LoadingSpinner />}>
                <MutualFunds />
              </Suspense>
            } />
            <Route path="fixed-deposits" element={
              <Suspense fallback={<LoadingSpinner />}>
                <FixedDeposits />
              </Suspense>
            } />
            <Route path="epf" element={
              <Suspense fallback={<LoadingSpinner />}>
                <EPF />
              </Suspense>
            } />
            <Route path="stocks" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Stocks />
              </Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Settings />
              </Suspense>
            } />
            <Route path="form-demo" element={
              <Suspense fallback={<LoadingSpinner />}>
                <FormDemo />
              </Suspense>
            } />
            <Route path="browser-compatibility-test" element={
              <Suspense fallback={<LoadingSpinner />}>
                <BrowserCompatibilityTest />
              </Suspense>
            } />
            <Route path="style-guide" element={
              <Suspense fallback={<LoadingSpinner />}>
                <StyleGuide />
              </Suspense>
            } />
            <Route path="layout-test" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LayoutTest />
              </Suspense>
            } />
            <Route path="sidebar-test" element={
              <Suspense fallback={<LoadingSpinner />}>
                <SidebarTest />
              </Suspense>
            } />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </UserProvider>
    </Router>
  )
}

export default App
