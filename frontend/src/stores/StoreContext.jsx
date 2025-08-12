import React, { createContext, useContext, useEffect } from 'react'
import { portfolioStore } from './PortfolioStore'
import { uiStore } from './UIStore'
import { authStore } from './AuthStore'
import { preferencesStore } from './PreferencesStore'

// Create store context
const StoreContext = createContext({
  portfolioStore,
  uiStore,
  authStore,
  preferencesStore,
})

// Store provider component
export function StoreProvider({ children }) {
  useEffect(() => {
    // Listen for preferences initialization request from AuthStore
    const handleInitializePreferences = async () => {
      try {
        await preferencesStore.initialize()
      } catch (error) {
        console.error('Failed to initialize user preferences:', error)
      }
    }

    window.addEventListener('auth:initialize-preferences', handleInitializePreferences)
    
    return () => {
      window.removeEventListener('auth:initialize-preferences', handleInitializePreferences)
    }
  }, [])

  return (
    <StoreContext.Provider value={{ portfolioStore, uiStore, authStore, preferencesStore }}>
      {children}
    </StoreContext.Provider>
  )
}

// Custom hook to use stores
export function useStores() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider')
  }
  return context
}

// Individual store hooks for convenience
export function usePortfolioStore() {
  const { portfolioStore } = useStores()
  return portfolioStore
}

export function useUIStore() {
  const { uiStore } = useStores()
  return uiStore
}

export function useAuthStore() {
  const { authStore } = useStores()
  return authStore
}

export function usePreferencesStore() {
  const { preferencesStore } = useStores()
  return preferencesStore
}