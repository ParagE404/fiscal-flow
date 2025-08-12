class ApiClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    this.retryAttempts = 3
    this.retryDelay = 1000 // 1 second
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken')
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body)
    }

    // Implement retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, config)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Handle specific error cases
          if (response.status === 401) {
            // Token expired or invalid - clear token from localStorage
            if (errorData.message?.includes('Token expired') || 
                errorData.message?.includes('Invalid token') ||
                errorData.message?.includes('Authentication failed')) {
              // Clear token directly to avoid circular dependency
              localStorage.removeItem('authToken')
              // Dispatch a custom event that AuthStore can listen to
              window.dispatchEvent(new CustomEvent('auth:token-expired'))
            }
          }
          
          // Don't retry on client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
          }
          
          // Retry on server errors (5xx) and rate limit (429)
          if (attempt < this.retryAttempts && (response.status >= 500 || response.status === 429)) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
            console.warn(`API request failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms...`)
            await this.sleep(delay)
            continue
          }
          
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return await response.json()
        }
        
        return await response.text()
      } catch (error) {
        // Network errors or other fetch failures
        if (attempt < this.retryAttempts && (error.name === 'TypeError' || error.message.includes('fetch'))) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          console.warn(`Network error (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms...`, error.message)
          await this.sleep(delay)
          continue
        }
        
        console.error('API request failed:', error)
        throw error
      }
    }
  }

  // Utility method for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    })
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    })
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  // Dashboard endpoints
  async getDashboard() {
    return this.get('/dashboard')
  }

  // Mutual Funds endpoints
  async getMutualFunds() {
    const response = await this.get('/mutual-funds')
    // Return both funds and summary data
    return {
      funds: response.data?.funds || [],
      summary: response.data?.summary || {}
    }
  }

  async createMutualFund(data) {
    const response = await this.post('/mutual-funds', data)
    return response.data
  }

  async updateMutualFund(id, data) {
    const response = await this.put(`/mutual-funds/${id}`, data)
    return response.data
  }

  async deleteMutualFund(id) {
    return this.delete(`/mutual-funds/${id}`)
  }

  // SIPs endpoints
  async getSIPs() {
    const response = await this.get('/sips')
    // Extract the sips array from the response data structure
    return response.data?.sips || []
  }

  async createSIP(data) {
    const response = await this.post('/sips', data)
    return response.data
  }

  async updateSIP(id, data) {
    const response = await this.put(`/sips/${id}`, data)
    return response.data
  }

  async deleteSIP(id) {
    return this.delete(`/sips/${id}`)
  }

  // Fixed Deposits endpoints
  async getFixedDeposits() {
    const response = await this.get('/fixed-deposits')
    // Extract the fixedDeposits array from the response data structure
    return response.data?.fixedDeposits || []
  }

  async createFixedDeposit(data) {
    const response = await this.post('/fixed-deposits', data)
    return response.data
  }

  async updateFixedDeposit(id, data) {
    const response = await this.put(`/fixed-deposits/${id}`, data)
    return response.data
  }

  async deleteFixedDeposit(id) {
    return this.delete(`/fixed-deposits/${id}`)
  }

  // EPF endpoints
  async getEPFAccounts() {
    const response = await this.get('/epf')
    // Extract the epfAccounts array from the response data structure
    return response.data?.epfAccounts || []
  }

  async createEPFAccount(data) {
    const response = await this.post('/epf', data)
    return response.data
  }

  async updateEPFAccount(id, data) {
    const response = await this.put(`/epf/${id}`, data)
    return response.data
  }

  async deleteEPFAccount(id) {
    return this.delete(`/epf/${id}`)
  }

  // Stocks endpoints
  async getStocks() {
    const response = await this.get('/stocks')
    // Extract the stocks array from the response data structure
    return response.data?.stocks || []
  }

  async createStock(data) {
    const response = await this.post('/stocks', data)
    return response.data
  }

  async updateStock(id, data) {
    const response = await this.put(`/stocks/${id}`, data)
    return response.data
  }

  async deleteStock(id) {
    return this.delete(`/stocks/${id}`)
  }

  // Export endpoints
  async exportAll() {
    return this.get('/export/all')
  }

  async exportMutualFunds() {
    return this.get('/export/mutual-funds')
  }

  async exportFixedDeposits() {
    return this.get('/export/fixed-deposits')
  }

  async exportEPF() {
    return this.get('/export/epf')
  }

  async exportStocks() {
    return this.get('/export/stocks')
  }

  // Authentication endpoints
  async register(data) {
    const response = await this.post('/auth/register', data)
    return response
  }

  async login(data) {
    const response = await this.post('/auth/login', data)
    return response
  }

  async logout() {
    return this.post('/auth/logout')
  }

  async sendVerificationEmail(email) {
    // If email is provided, use it (for unauthenticated users)
    // Otherwise, use the authenticated endpoint
    if (email) {
      return this.post('/auth/send-verification', { email })
    } else {
      return this.post('/auth/send-verification')
    }
  }

  async verifyEmail(token) {
    return this.get(`/auth/verify-email/${token}`)
  }

  async resetPassword(email) {
    return this.post('/auth/reset-password', { email })
  }

  async getUserProfile() {
    return this.get('/user/profile')
  }

  async updateUserProfile(data) {
    return this.put('/user/profile', data)
  }

  async changePassword(data) {
    return this.post('/user/change-password', data)
  }

  async getSecurityInfo() {
    return this.get('/user/security')
  }

  async deleteAccount(data) {
    return this.delete('/user/account', {
      method: 'DELETE',
      body: data
    })
  }

  async exportUserData() {
    return this.get('/user/export-data')
  }

  async getUserPreferences() {
    return this.get('/user/preferences')
  }

  async updateUserPreferences(data) {
    return this.put('/user/preferences', data)
  }

  async resetUserPreferences() {
    return this.post('/user/preferences/reset')
  }

  // Health check endpoint for testing connectivity
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`)
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }
}

export const apiClient = new ApiClient()