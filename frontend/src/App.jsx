import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { Dashboard } from './pages/Dashboard'
import { MutualFunds } from './pages/MutualFunds'
import { FixedDeposits } from './pages/FixedDeposits'
import { EPF } from './pages/EPF'
import { Stocks } from './pages/Stocks'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { VerifyEmail } from './pages/VerifyEmail'

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true)

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  return (
    <Router>
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-email/pending" element={<VerifyEmail />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <>
              <Layout />
              {showOnboarding && (
                <OnboardingFlow onComplete={handleOnboardingComplete} />
              )}
            </>
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="mutual-funds" element={<MutualFunds />} />
          <Route path="fixed-deposits" element={<FixedDeposits />} />
          <Route path="epf" element={<EPF />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </Router>
  )
}

export default App
