import { makeAutoObservable } from 'mobx'
import { apiClient } from '../lib/apiClient'

class AuthStore {
  user = null
  token = null
  isAuthenticated = false
  isLoading = false
  isInitializing = true
  error = null
  tokenRefreshTimer = null

  constructor() {
    makeAutoObservable(this)
    this.initializeAuth()
    
    // Listen for token expiration events from apiClient
    window.addEventListener('auth:token-expired', () => {
      this.clearAuth()
    })
  }

  async initializeAuth() {
    this.isInitializing = true
    const token = localStorage.getItem('authToken')
    
    if (token) {
      try {
        // Verify token is still valid by fetching user profile
        this.token = token
        await this.fetchUserProfile()
        this.isAuthenticated = true
        this.setupTokenRefresh()
        
        // Initialize user preferences
        await this.initializeUserPreferences()
      } catch (error) {
        console.error('Token validation failed:', error)
        // Token is invalid, clear it
        this.clearAuth()
      }
    }
    
    this.isInitializing = false
  }

  async login(credentials) {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.login(credentials)
      
      if (response.token) {
        this.token = response.token
        this.user = response.user
        this.isAuthenticated = true
        localStorage.setItem('authToken', response.token)
        this.setupTokenRefresh()
        
        // Initialize user preferences
        await this.initializeUserPreferences()
      }
      
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  async register(userData) {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.register(userData)
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  async logout() {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearAuth()
    }
  }

  clearAuth() {
    this.token = null
    this.user = null
    this.isAuthenticated = false
    this.clearTokenRefresh()
    localStorage.removeItem('authToken')
  }

  async initializeUserPreferences() {
    try {
      // Import preferencesStore dynamically to avoid circular dependency
      const { preferencesStore } = await import('./PreferencesStore')
      await preferencesStore.initialize()
    } catch (error) {
      console.error('Failed to initialize user preferences:', error)
    }
  }

  async fetchUserProfile() {
    if (!this.token) return
    
    try {
      const response = await apiClient.getUserProfile()
      this.user = response.user || response
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // If token is invalid, clear auth
      if (error.message.includes('401') || error.message.includes('unauthorized') || 
          error.message.includes('Token expired')) {
        this.clearAuth()
        throw error
      }
    }
  }

  async updateProfile(profileData) {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.updateUserProfile(profileData)
      this.user = response.user
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  async sendVerificationEmail() {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.sendVerificationEmail()
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  get isEmailVerified() {
    return this.user?.isEmailVerified || false
  }

  async resetPassword(email) {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.resetPassword(email)
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  async verifyEmail(token) {
    this.isLoading = true
    this.error = null
    
    try {
      const response = await apiClient.verifyEmail(token)
      return response
    } catch (error) {
      this.error = error.message
      throw error
    } finally {
      this.isLoading = false
    }
  }

  clearError() {
    this.error = null
  }

  // Token refresh and session management
  setupTokenRefresh() {
    this.clearTokenRefresh()
    
    if (!this.token) return
    
    try {
      // Decode token to get expiration time
      const tokenPayload = JSON.parse(atob(this.token.split('.')[1]))
      const expirationTime = tokenPayload.exp * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh token 5 minutes before expiry
      const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60000) // At least 1 minute
      
      if (refreshTime > 0) {
        this.tokenRefreshTimer = setTimeout(() => {
          this.refreshToken()
        }, refreshTime)
      } else {
        // Token is already expired or about to expire
        this.clearAuth()
      }
    } catch (error) {
      console.error('Error setting up token refresh:', error)
      this.clearAuth()
    }
  }

  clearTokenRefresh() {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer)
      this.tokenRefreshTimer = null
    }
  }

  async refreshToken() {
    try {
      // For JWT tokens, we typically need to re-authenticate
      // Since we don't have a refresh token endpoint, we'll validate the current token
      await this.fetchUserProfile()
      
      // If successful, setup next refresh
      this.setupTokenRefresh()
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Token is invalid, clear auth and redirect to login
      this.clearAuth()
    }
  }

  // Check if user needs email verification
  get needsEmailVerification() {
    return this.isAuthenticated && this.user && !this.user.isEmailVerified
  }

  // Check if user is fully authenticated (including email verification)
  get isFullyAuthenticated() {
    return this.isAuthenticated && this.user && this.user.isEmailVerified
  }

  // Get user display name
  get userDisplayName() {
    return this.user?.name || this.user?.email || 'User'
  }

  // Check if authentication is ready (not initializing)
  get isAuthReady() {
    return !this.isInitializing
  }
}

export const authStore = new AuthStore()