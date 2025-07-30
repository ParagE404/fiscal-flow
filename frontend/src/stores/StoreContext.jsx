import React, { createContext, useContext } from 'react'
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