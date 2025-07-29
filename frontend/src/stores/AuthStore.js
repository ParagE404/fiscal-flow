import { makeAutoObservable } from 'mobx'
import { apiClient } from '../lib/apiClient'

class AuthStore {
  user = null
  token = null
  isAuthenticated = false
  isLoading = false
  error = null

  constructor() {
    makeAutoObservable(this)
    this.initializeAuth()
  }

  initializeAuth() {
    const token = localStorage.getItem('authToken')
    if (token) {
      this.token = token
      this.isAuthenticated = true
      // Optionally fetch user profile
      this.fetchUserProfile()
    }
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
      this.token = null
      this.user = null
      this.isAuthenticated = false
      localStorage.removeItem('authToken')
    }
  }

  async fetchUserProfile() {
    if (!this.token) return
    
    try {
      const response = await apiClient.getUserProfile()
      this.user = response.user || response
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // If token is invalid, logout
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        this.logout()
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

  get needsEmailVerification() {
    return this.isAuthenticated && !this.isEmailVerified
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
}

export const authStore = new AuthStore()