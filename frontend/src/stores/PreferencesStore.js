import { makeAutoObservable, runInAction } from 'mobx'
import { apiClient } from '../lib/apiClient'

class PreferencesStore {
  // Preferences state
  preferences = {
    theme: 'system',
    currency: {
      code: 'INR',
      symbol: '₹',
      format: 'indian'
    },
    numberFormat: {
      style: 'indian',
      decimalPlaces: 2
    },
    autoRefreshPrices: false,
    pushNotifications: {
      enabled: false,
      sipReminders: false,
      fdMaturityAlerts: false,
      portfolioUpdates: false
    },
    dashboard: {
      defaultView: 'overview',
      showWelcomeMessage: true,
      compactMode: false
    },
    onboarding: {
      completed: false,
      skippedSteps: [],
      lastCompletedStep: null
    }
  }

  // Loading states
  loading = false
  error = null
  initialized = false

  constructor() {
    makeAutoObservable(this)
  }

  // Initialize preferences from server
  async initialize() {
    if (this.initialized) return
    
    try {
      this.loading = true
      this.error = null
      
      const response = await apiClient.getUserPreferences()
      
      runInAction(() => {
        this.preferences = response.preferences
        this.initialized = true
        this.applyTheme()
      })
    } catch (error) {
      runInAction(() => {
        this.error = error.message
        console.error('Failed to load preferences:', error)
        // Fall back to localStorage if server fails
        this.loadFromLocalStorage()
      })
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // Update preferences
  async updatePreferences(updates) {
    try {
      this.loading = true
      this.error = null

      const response = await apiClient.updateUserPreferences(updates)
      
      runInAction(() => {
        this.preferences = response.preferences
        this.applyTheme()
        this.saveToLocalStorage() // Backup to localStorage
      })

      return true
    } catch (error) {
      runInAction(() => {
        this.error = error.message
      })
      console.error('Failed to update preferences:', error)
      throw error
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // Reset preferences to defaults
  async resetPreferences() {
    try {
      this.loading = true
      this.error = null

      const response = await apiClient.resetUserPreferences()
      
      runInAction(() => {
        this.preferences = response.preferences
        this.applyTheme()
        this.saveToLocalStorage()
      })

      return true
    } catch (error) {
      runInAction(() => {
        this.error = error.message
      })
      console.error('Failed to reset preferences:', error)
      throw error
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // Theme management
  get effectiveTheme() {
    if (this.preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return this.preferences.theme
  }

  applyTheme() {
    const theme = this.effectiveTheme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async setTheme(theme) {
    await this.updatePreferences({ theme })
  }

  // Currency formatting
  formatCurrency(amount) {
    const { currency, numberFormat } = this.preferences
    
    if (numberFormat.style === 'indian') {
      return this.formatIndianCurrency(amount, currency.symbol, numberFormat.decimalPlaces)
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces
      }).format(amount)
    }
  }

  formatIndianCurrency(amount, symbol = '₹', decimalPlaces = 2) {
    const numStr = amount.toFixed(decimalPlaces)
    const [integerPart, decimalPart] = numStr.split('.')
    
    // Indian number formatting (lakhs and crores)
    let formattedInteger = ''
    const len = integerPart.length
    
    if (len <= 3) {
      formattedInteger = integerPart
    } else if (len <= 5) {
      formattedInteger = integerPart.slice(0, len - 3) + ',' + integerPart.slice(len - 3)
    } else if (len <= 7) {
      formattedInteger = integerPart.slice(0, len - 5) + ',' + 
                        integerPart.slice(len - 5, len - 3) + ',' + 
                        integerPart.slice(len - 3)
    } else {
      // For very large numbers, use crore formatting
      const crores = Math.floor(amount / 10000000)
      const remainder = amount % 10000000
      const lakhs = Math.floor(remainder / 100000)
      const thousands = remainder % 100000
      
      let parts = []
      if (crores > 0) parts.push(crores + ' Cr')
      if (lakhs > 0) parts.push(lakhs + ' L')
      if (thousands > 0) parts.push(this.formatIndianCurrency(thousands, '', decimalPlaces).replace(symbol, ''))
      
      return symbol + parts.join(' ')
    }
    
    return symbol + formattedInteger + (decimalPart ? '.' + decimalPart : '')
  }

  // Number formatting
  formatNumber(number) {
    const { numberFormat } = this.preferences
    
    if (numberFormat.style === 'indian') {
      return this.formatIndianCurrency(number, '', numberFormat.decimalPlaces).replace('₹', '')
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces
      }).format(number)
    }
  }

  // Percentage formatting
  formatPercentage(value, decimalPlaces = 2) {
    return (value >= 0 ? '+' : '') + value.toFixed(decimalPlaces) + '%'
  }

  // Dashboard preferences
  async updateDashboardPreferences(updates) {
    await this.updatePreferences({
      dashboard: {
        ...this.preferences.dashboard,
        ...updates
      }
    })
  }

  // Notification preferences
  async updateNotificationPreferences(updates) {
    await this.updatePreferences({
      pushNotifications: {
        ...this.preferences.pushNotifications,
        ...updates
      }
    })
  }

  // Onboarding preferences
  async updateOnboardingPreferences(updates) {
    await this.updatePreferences({
      onboarding: {
        ...this.preferences.onboarding,
        ...updates
      }
    })
  }

  async markOnboardingComplete() {
    await this.updateOnboardingPreferences({ completed: true })
  }

  async skipOnboardingStep(step) {
    const skippedSteps = [...this.preferences.onboarding.skippedSteps]
    if (!skippedSteps.includes(step)) {
      skippedSteps.push(step)
      await this.updateOnboardingPreferences({ skippedSteps })
    }
  }

  // Local storage backup (for offline support)
  saveToLocalStorage() {
    try {
      localStorage.setItem('fiscalflow-preferences-backup', JSON.stringify(this.preferences))
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error)
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('fiscalflow-preferences-backup')
      if (saved) {
        runInAction(() => {
          this.preferences = { ...this.preferences, ...JSON.parse(saved) }
          this.initialized = true
          this.applyTheme()
        })
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error)
    }
  }

  // System theme change listener
  setupSystemThemeListener() {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (this.preferences.theme === 'system') {
          this.applyTheme()
        }
      })
    }
  }
}

export const preferencesStore = new PreferencesStore()

// Setup system theme listener
if (typeof window !== 'undefined') {
  preferencesStore.setupSystemThemeListener()
}