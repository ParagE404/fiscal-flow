import React from 'react'
import { observer } from 'mobx-react-lite'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/StoreContext'

export const ProtectedRoute = observer(({ children }) => {
  const authStore = useAuthStore()
  const location = useLocation()

  // If not authenticated, redirect to login
  if (!authStore.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated, render the protected content
  // Email verification is handled by the EmailVerificationBanner component
  return children
})