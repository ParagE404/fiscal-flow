import React from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { useUser, AuthLoadingSpinner } from '../../contexts/UserContext'

export const ProtectedRoute = observer(({ 
  children, 
  requireEmailVerification = false,
  redirectTo = '/login' 
}) => {
  const { 
    isAuthReady, 
    isAuthenticated, 
    needsEmailVerification,
    isInitializing 
  } = useUser()
  const location = useLocation()

  // Show loading spinner while authentication is initializing
  if (isInitializing || !isAuthReady) {
    return <AuthLoadingSpinner />
  }

  // If not authenticated at all, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // If email verification is required and user hasn't verified email
  if (requireEmailVerification && needsEmailVerification) {
    return <Navigate to="/verify-email/pending" state={{ from: location }} replace />
  }

  // If authenticated (and email verified if required), render the protected content
  return children
})

// Higher-order component for routes that require email verification
export const EmailVerifiedRoute = observer(({ children }) => {
  return (
    <ProtectedRoute requireEmailVerification={true}>
      {children}
    </ProtectedRoute>
  )
})

// Component for routes that should redirect authenticated users (like login/register)
export const PublicOnlyRoute = observer(({ children, redirectTo = '/' }) => {
  const { isAuthReady, isAuthenticated, isInitializing } = useUser()

  // Show loading spinner while authentication is initializing
  if (isInitializing || !isAuthReady) {
    return <AuthLoadingSpinner />
  }

  // If authenticated, redirect to dashboard or specified route
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // If not authenticated, render the public content
  return children
})