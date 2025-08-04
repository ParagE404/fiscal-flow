import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { UserProvider } from './contexts/UserContext'
import { initializeAccessibility } from './lib/accessibility'
import { initializePerformanceOptimizations } from './lib/performance'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute, EmailVerifiedRoute, PublicOnlyRoute } from './components/auth/ProtectedRoute'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { Dashboard } from './pages/Dashboard'
import { MutualFunds } from './pages/MutualFunds'
import { FixedDeposits } from './pages/FixedDeposits'
import { EPF } from './pages/EPF'
import { Stocks } from './pages/Stocks'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { EnhancedRegister } from './pages/EnhancedRegister'
import { ForgotPassword } from './pages/ForgotPassword'
import { VerifyEmail } from './pages/VerifyEmail'
import { FormDemo } from './pages/FormDemo'
import BrowserCompatibilityTest from './pages/BrowserCompatibilityTest'
import StyleGuide from './components/design-system/StyleGuide'
import LayoutTest from './pages/LayoutTest'
import SidebarTest from './pages/SidebarTest'

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true)

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Initialize accessibility and performance optimizations
  useEffect(() => {
    initializeAccessibility()
    initializePerformanceOptimizations()
  }, [])

  return (
    <Router>
      <UserProvider>
        <Routes>
          {/* Public-only routes (redirect if authenticated) */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />
          <Route path="/register" element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          } />
          <Route path="/enhanced-register" element={
            <PublicOnlyRoute>
              <EnhancedRegister />
            </PublicOnlyRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          } />
          
          {/* Email verification routes (accessible to authenticated users) */}
          <Route path="/verify-email/:token" element={
            <ProtectedRoute>
              <VerifyEmail />
            </ProtectedRoute>
          } />
          <Route path="/verify-email/pending" element={
            <ProtectedRoute>
              <VerifyEmail />
            </ProtectedRoute>
          } />
          
          {/* Protected routes that require email verification */}
          <Route path="/" element={
            <EmailVerifiedRoute>
              <>
                <Layout />
                {showOnboarding && (
                  <OnboardingFlow onComplete={handleOnboardingComplete} />
                )}
              </>
            </EmailVerifiedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="mutual-funds" element={<MutualFunds />} />
            <Route path="fixed-deposits" element={<FixedDeposits />} />
            <Route path="epf" element={<EPF />} />
            <Route path="stocks" element={<Stocks />} />
            <Route path="settings" element={<Settings />} />
            <Route path="form-demo" element={<FormDemo />} />
            <Route path="browser-compatibility-test" element={<BrowserCompatibilityTest />} />
            <Route path="style-guide" element={<StyleGuide />} />
            <Route path="layout-test" element={<LayoutTest />} />
            <Route path="sidebar-test" element={<SidebarTest />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </UserProvider>
    </Router>
  )
}

export default App
