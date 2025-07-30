import React, { createContext, useContext } from 'react'
import { observer } from 'mobx-react-lite'
import { useAuthStore } from '../stores/StoreContext'

// Create the UserContext
const UserContext = createContext(null)

// UserProvider component that provides user data and auth state
export const UserProvider = observer(({ children }) => {
  const authStore = useAuthStore()

  const contextValue = {
    // User data
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    isInitializing: authStore.isInitializing,
    error: authStore.error,
    
    // Authentication status
    isAuthReady: authStore.isAuthReady,
    isFullyAuthenticated: authStore.isFullyAuthenticated,
    needsEmailVerification: authStore.needsEmailVerification,
    
    // User display info
    userDisplayName: authStore.userDisplayName,
    
    // Auth actions
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
    register: authStore.register.bind(authStore),
    updateProfile: authStore.updateProfile.bind(authStore),
    sendVerificationEmail: authStore.sendVerificationEmail.bind(authStore),
    verifyEmail: authStore.verifyEmail.bind(authStore),
    resetPassword: authStore.resetPassword.bind(authStore),
    clearError: authStore.clearError.bind(authStore),
    
    // Session management
    refreshToken: authStore.refreshToken.bind(authStore),
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
})

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Loading component for authentication initialization
export const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>
)