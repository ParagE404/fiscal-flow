import { makeAutoObservable, runInAction } from 'mobx'
import { apiClient } from '../lib/apiClient'

class PortfolioStore {
  // Observable state
  mutualFunds = []
  mutualFundsSummary = {}
  sips = []
  fixedDeposits = []
  epfAccounts = []
  stocks = []
  
  // Loading states
  loading = {
    dashboard: false,
    mutualFunds: false,
    sips: false,
    fixedDeposits: false,
    epf: false,
    stocks: false,
  }
  
  // Error states
  error = {
    dashboard: null,
    mutualFunds: null,
    sips: null,
    fixedDeposits: null,
    epf: null,
    stocks: null,
  }

  // Synchronization state
  lastSyncTimestamp = null
  syncInProgress = false
  autoRefreshInterval = null
  dataVersion = 0

  constructor() {
    makeAutoObservable(this)
    
    // Set up automatic data refresh every 5 minutes
    this.setupAutoRefresh()
  }

  // Computed values
  get totalPortfolioValue() {
    // Use summary data if available, otherwise calculate from individual funds
    const mfValue = this.mutualFundsSummary.totalCurrentValue || 
      (Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.totalCurrentValue || fund.currentValue || 0), 0) : 0)
    const fdValue = Array.isArray(this.fixedDeposits) ? this.fixedDeposits.reduce((sum, fd) => sum + (fd.currentValue || 0), 0) : 0
    const epfValue = Array.isArray(this.epfAccounts) ? this.epfAccounts.reduce((sum, epf) => sum + (epf.totalBalance || 0), 0) : 0
    const stockValue = Array.isArray(this.stocks) ? this.stocks.reduce((sum, stock) => sum + (stock.currentValue || 0), 0) : 0
    
    return mfValue + fdValue + epfValue + stockValue
  }

  get totalInvested() {
    // Use summary data if available, otherwise calculate from individual funds
    const mfInvested = this.mutualFundsSummary.totalInvestment || 
      (Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.totalInvestment || fund.investedAmount || 0), 0) : 0)
    const fdInvested = Array.isArray(this.fixedDeposits) ? this.fixedDeposits.reduce((sum, fd) => sum + (fd.investedAmount || 0), 0) : 0
    const epfInvested = Array.isArray(this.epfAccounts) ? this.epfAccounts.reduce((sum, epf) => sum + (epf.employeeContribution || 0), 0) : 0
    const stockInvested = Array.isArray(this.stocks) ? this.stocks.reduce((sum, stock) => sum + (stock.investedAmount || 0), 0) : 0
    
    return mfInvested + fdInvested + epfInvested + stockInvested
  }

  get totalReturns() {
    return this.totalPortfolioValue - this.totalInvested
  }

  get totalReturnsPercentage() {
    if (this.totalInvested === 0) return 0
    return ((this.totalPortfolioValue - this.totalInvested) / this.totalInvested) * 100
  }

  get monthlyGrowth() {
    // Placeholder calculation - in real implementation, this would compare with previous month's data
    // For now, we'll use a simple approximation based on total returns
    const monthlyRate = this.totalReturnsPercentage / 12
    return {
      value: (this.totalInvested * monthlyRate) / 100,
      percentage: monthlyRate
    }
  }

  get assetAllocation() {
    const total = this.totalPortfolioValue
    if (total === 0) {
      return {
        mutualFunds: { value: 0, percentage: 0 },
        stocks: { value: 0, percentage: 0 },
        fixedDeposits: { value: 0, percentage: 0 },
        epf: { value: 0, percentage: 0 },
      }
    }

    const mfValue = this.mutualFundsSummary.totalCurrentValue || 
      (Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.totalCurrentValue || fund.currentValue || 0), 0) : 0)
    const stockValue = Array.isArray(this.stocks) ? this.stocks.reduce((sum, stock) => sum + (stock.currentValue || 0), 0) : 0
    const fdValue = Array.isArray(this.fixedDeposits) ? this.fixedDeposits.reduce((sum, fd) => sum + (fd.currentValue || 0), 0) : 0
    const epfValue = Array.isArray(this.epfAccounts) ? this.epfAccounts.reduce((sum, epf) => sum + (epf.totalBalance || 0), 0) : 0

    return {
      mutualFunds: {
        value: mfValue,
        percentage: (mfValue / total) * 100,
      },
      stocks: {
        value: stockValue,
        percentage: (stockValue / total) * 100,
      },
      fixedDeposits: {
        value: fdValue,
        percentage: (fdValue / total) * 100,
      },
      epf: {
        value: epfValue,
        percentage: (epfValue / total) * 100,
      },
    }
  }

  get topPerformers() {
    const performers = []

    // Add mutual funds
    if (Array.isArray(this.mutualFunds)) {
      this.mutualFunds.forEach(fund => {
        const totalCurrentValue = fund.totalCurrentValue || fund.currentValue || 0
        const totalInvestment = fund.totalInvestment || fund.investedAmount || 0
        const returns = totalCurrentValue - totalInvestment
        const returnsPercentage = totalInvestment > 0 
          ? (returns / totalInvestment) * 100 
          : 0
        
        performers.push({
          name: fund.name,
          type: 'Mutual Fund',
          returns,
          returnsPercentage,
          category: fund.category || 'General',
        })
      })
    }

    // Add stocks
    if (Array.isArray(this.stocks)) {
      this.stocks.forEach(stock => {
        performers.push({
          name: stock.companyName || stock.symbol,
          type: 'Stock',
          returns: stock.pnl || 0,
          returnsPercentage: stock.pnlPercentage || 0,
          category: stock.sector || 'General',
        })
      })
    }

    // Add fixed deposits
    if (Array.isArray(this.fixedDeposits)) {
      this.fixedDeposits.forEach(fd => {
        const returns = (fd.currentValue || 0) - (fd.investedAmount || 0)
        const returnsPercentage = fd.investedAmount > 0 
          ? (returns / fd.investedAmount) * 100 
          : 0
        
        performers.push({
          name: `${fd.bankName} FD`,
          type: 'Fixed Deposit',
          returns,
          returnsPercentage,
          category: `${fd.interestRate}% ${fd.type}`,
        })
      })
    }

    // Add EPF accounts
    if (Array.isArray(this.epfAccounts)) {
      this.epfAccounts.forEach(epf => {
        // For EPF, we'll calculate returns based on interest earned
        const totalContributions = (epf.employeeContribution || 0) + (epf.employerContribution || 0)
        const returns = (epf.totalBalance || 0) - totalContributions
        const returnsPercentage = totalContributions > 0 
          ? (returns / totalContributions) * 100 
          : 0
        
        performers.push({
          name: `${epf.employerName} EPF`,
          type: 'EPF',
          returns,
          returnsPercentage,
          category: epf.status || 'Active',
        })
      })
    }

    // Filter out performers with zero or invalid data and sort by returns percentage
    return performers
      .filter(performer => performer.returnsPercentage !== 0 || performer.returns !== 0)
      .sort((a, b) => {
        // Primary sort by returns percentage (descending)
        if (b.returnsPercentage !== a.returnsPercentage) {
          return b.returnsPercentage - a.returnsPercentage
        }
        // Secondary sort by absolute returns (descending)
        return b.returns - a.returns
      })
      .slice(0, 5)
  }

  // Actions for Mutual Funds
  async fetchMutualFunds() {
    this.setLoading('mutualFunds', true)
    this.setError('mutualFunds', null)
    
    try {
      const data = await apiClient.getMutualFunds()
      runInAction(() => {
        // Handle both old array format and new object format for backward compatibility
        if (Array.isArray(data)) {
          this.mutualFunds = data
          this.mutualFundsSummary = {}
        } else {
          this.mutualFunds = Array.isArray(data.funds) ? data.funds : []
          this.mutualFundsSummary = data.summary || {}
        }
      })
    } catch (error) {
      this.setError('mutualFunds', this.getErrorMessage(error))
      runInAction(() => {
        this.mutualFunds = []
        this.mutualFundsSummary = {}
      })
      throw error
    } finally {
      this.setLoading('mutualFunds', false)
    }
  }

  async addMutualFund(fundData) {
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticFund = {
      id: tempId,
      ...fundData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOptimistic: true
    }

    runInAction(() => {
      this.mutualFunds.push(optimisticFund)
    })

    try {
      const newFund = await apiClient.createMutualFund(fundData)
      runInAction(() => {
        // Replace optimistic update with real data
        const index = this.mutualFunds.findIndex(fund => fund.id === tempId)
        if (index !== -1) {
          this.mutualFunds[index] = newFund
        }
      })
      
      // Refresh data to ensure consistency
      await this.fetchMutualFunds()
      return newFund
    } catch (error) {
      // Revert optimistic update
      runInAction(() => {
        this.mutualFunds = this.mutualFunds.filter(fund => fund.id !== tempId)
      })
      this.setError('mutualFunds', this.getErrorMessage(error))
      throw error
    }
  }

  async updateMutualFund(id, fundData) {
    // Store original data for rollback
    const originalFund = this.mutualFunds.find(fund => fund.id === id)
    if (!originalFund) {
      throw new Error('Fund not found')
    }

    // Optimistic update
    runInAction(() => {
      const index = this.mutualFunds.findIndex(fund => fund.id === id)
      if (index !== -1) {
        this.mutualFunds[index] = {
          ...this.mutualFunds[index],
          ...fundData,
          updatedAt: new Date().toISOString(),
          isOptimistic: true
        }
      }
    })

    try {
      const updatedFund = await apiClient.updateMutualFund(id, fundData)
      runInAction(() => {
        const index = this.mutualFunds.findIndex(fund => fund.id === id)
        if (index !== -1) {
          this.mutualFunds[index] = updatedFund
        }
      })
      
      // Refresh data to ensure consistency
      await this.fetchMutualFunds()
      return updatedFund
    } catch (error) {
      // Revert optimistic update
      runInAction(() => {
        const index = this.mutualFunds.findIndex(fund => fund.id === id)
        if (index !== -1) {
          this.mutualFunds[index] = originalFund
        }
      })
      this.setError('mutualFunds', this.getErrorMessage(error))
      throw error
    }
  }

  async deleteMutualFund(id) {
    // Store original data for rollback
    const originalFund = this.mutualFunds.find(fund => fund.id === id)
    if (!originalFund) {
      throw new Error('Fund not found')
    }

    // Optimistic update
    runInAction(() => {
      this.mutualFunds = this.mutualFunds.filter(fund => fund.id !== id)
    })

    try {
      await apiClient.deleteMutualFund(id)
      // Refresh data to ensure consistency
      await this.fetchMutualFunds()
    } catch (error) {
      // Revert optimistic update
      runInAction(() => {
        this.mutualFunds.push(originalFund)
        // Re-sort to maintain order
        this.mutualFunds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      })
      this.setError('mutualFunds', this.getErrorMessage(error))
      throw error
    }
  }

  // Actions for SIPs
  async fetchSIPs() {
    this.setLoading('sips', true)
    this.setError('sips', null)
    
    try {
      const data = await apiClient.getSIPs()
      runInAction(() => {
        this.sips = Array.isArray(data) ? data : []
      })
    } catch (error) {
      this.setError('sips', error.message)
      runInAction(() => {
        this.sips = []
      })
    } finally {
      this.setLoading('sips', false)
    }
  }

  async addSIP(sipData) {
    try {
      const newSIP = await apiClient.createSIP(sipData)
      runInAction(() => {
        this.sips.push(newSIP)
      })
      
      // Refresh mutual funds list in case a new fund was created
      // This happens when user selects "None (Create new fund entry)"
      await this.fetchMutualFunds()
      
      return newSIP
    } catch (error) {
      this.setError('sips', error.message)
      throw error
    }
  }

  async updateSIP(id, sipData) {
    try {
      const updatedSIP = await apiClient.updateSIP(id, sipData)
      runInAction(() => {
        const index = this.sips.findIndex(sip => sip.id === id)
        if (index !== -1) {
          this.sips[index] = updatedSIP
        }
      })
      
      // Refresh mutual funds list in case SIP investment amounts changed
      await this.fetchMutualFunds()
      
      return updatedSIP
    } catch (error) {
      this.setError('sips', error.message)
      throw error
    }
  }

  async deleteSIP(id) {
    try {
      await apiClient.deleteSIP(id)
      runInAction(() => {
        this.sips = this.sips.filter(sip => sip.id !== id)
      })
      
      // Refresh mutual funds list in case SIP investment amounts changed
      await this.fetchMutualFunds()
    } catch (error) {
      this.setError('sips', error.message)
      throw error
    }
  }

  // Actions for Fixed Deposits
  async fetchFixedDeposits() {
    this.setLoading('fixedDeposits', true)
    this.setError('fixedDeposits', null)
    
    try {
      const data = await apiClient.getFixedDeposits()
      runInAction(() => {
        this.fixedDeposits = Array.isArray(data) ? data : []
      })
    } catch (error) {
      this.setError('fixedDeposits', error.message)
      runInAction(() => {
        this.fixedDeposits = []
      })
    } finally {
      this.setLoading('fixedDeposits', false)
    }
  }

  async addFixedDeposit(fdData) {
    try {
      const newFD = await apiClient.createFixedDeposit(fdData)
      runInAction(() => {
        this.fixedDeposits.push(newFD)
      })
      return newFD
    } catch (error) {
      this.setError('fixedDeposits', error.message)
      throw error
    }
  }

  async updateFixedDeposit(id, fdData) {
    try {
      const updatedFD = await apiClient.updateFixedDeposit(id, fdData)
      runInAction(() => {
        const index = this.fixedDeposits.findIndex(fd => fd.id === id)
        if (index !== -1) {
          this.fixedDeposits[index] = updatedFD
        }
      })
      return updatedFD
    } catch (error) {
      this.setError('fixedDeposits', error.message)
      throw error
    }
  }

  async deleteFixedDeposit(id) {
    try {
      await apiClient.deleteFixedDeposit(id)
      runInAction(() => {
        this.fixedDeposits = this.fixedDeposits.filter(fd => fd.id !== id)
      })
    } catch (error) {
      this.setError('fixedDeposits', error.message)
      throw error
    }
  }

  // Actions for EPF
  async fetchEPFAccounts() {
    this.setLoading('epf', true)
    this.setError('epf', null)
    
    try {
      const data = await apiClient.getEPFAccounts()
      runInAction(() => {
        this.epfAccounts = Array.isArray(data) ? data : []
      })
    } catch (error) {
      this.setError('epf', error.message)
      runInAction(() => {
        this.epfAccounts = []
      })
    } finally {
      this.setLoading('epf', false)
    }
  }

  async addEPFAccount(epfData) {
    try {
      const newEPF = await apiClient.createEPFAccount(epfData)
      runInAction(() => {
        this.epfAccounts.push(newEPF)
      })
      return newEPF
    } catch (error) {
      this.setError('epf', error.message)
      throw error
    }
  }

  async updateEPFAccount(id, epfData) {
    try {
      const updatedEPF = await apiClient.updateEPFAccount(id, epfData)
      runInAction(() => {
        const index = this.epfAccounts.findIndex(epf => epf.id === id)
        if (index !== -1) {
          this.epfAccounts[index] = updatedEPF
        }
      })
      return updatedEPF
    } catch (error) {
      this.setError('epf', error.message)
      throw error
    }
  }

  async deleteEPFAccount(id) {
    try {
      await apiClient.deleteEPFAccount(id)
      runInAction(() => {
        this.epfAccounts = this.epfAccounts.filter(epf => epf.id !== id)
      })
    } catch (error) {
      this.setError('epf', error.message)
      throw error
    }
  }

  // Actions for Stocks
  async fetchStocks() {
    this.setLoading('stocks', true)
    this.setError('stocks', null)
    
    try {
      const data = await apiClient.getStocks()
      runInAction(() => {
        this.stocks = Array.isArray(data) ? data : []
      })
    } catch (error) {
      this.setError('stocks', error.message)
      runInAction(() => {
        this.stocks = []
      })
    } finally {
      this.setLoading('stocks', false)
    }
  }

  async addStock(stockData) {
    try {
      const newStock = await apiClient.createStock(stockData)
      runInAction(() => {
        this.stocks.push(newStock)
      })
      return newStock
    } catch (error) {
      this.setError('stocks', error.message)
      throw error
    }
  }

  async updateStock(id, stockData) {
    try {
      const updatedStock = await apiClient.updateStock(id, stockData)
      runInAction(() => {
        const index = this.stocks.findIndex(stock => stock.id === id)
        if (index !== -1) {
          this.stocks[index] = updatedStock
        }
      })
      return updatedStock
    } catch (error) {
      this.setError('stocks', error.message)
      throw error
    }
  }

  async deleteStock(id) {
    try {
      await apiClient.deleteStock(id)
      runInAction(() => {
        this.stocks = this.stocks.filter(stock => stock.id !== id)
      })
    } catch (error) {
      this.setError('stocks', error.message)
      throw error
    }
  }

  // Dashboard data fetching with synchronization
  async fetchDashboardData() {
    this.setLoading('dashboard', true)
    this.setError('dashboard', null)
    
    try {
      // Fetch all data in parallel
      await Promise.all([
        this.fetchMutualFunds(),
        this.fetchSIPs(),
        this.fetchFixedDeposits(),
        this.fetchEPFAccounts(),
        this.fetchStocks(),
      ])
      
      // Update last sync timestamp
      this.lastSyncTimestamp = new Date().toISOString()
      
    } catch (error) {
      this.setError('dashboard', this.getErrorMessage(error))
      throw error
    } finally {
      this.setLoading('dashboard', false)
    }
  }

  // Data refresh and synchronization
  async refreshAllData(force = false) {
    // Prevent concurrent refresh operations
    if (this.syncInProgress && !force) {
      console.log('Sync already in progress, skipping...')
      return
    }

    this.syncInProgress = true
    this.setLoading('dashboard', true)
    this.clearAllErrors()
    
    try {
      // Check if we need to refresh based on last sync time
      if (!force && this.shouldSkipRefresh()) {
        console.log('Data is fresh, skipping refresh')
        return
      }

      console.log('Refreshing all portfolio data...')
      
      // Fetch all data in parallel with timeout
      const refreshPromises = [
        this.fetchMutualFunds(),
        this.fetchSIPs(),
        this.fetchFixedDeposits(),
        this.fetchEPFAccounts(),
        this.fetchStocks(),
      ]

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data refresh timeout')), 30000)
      })

      await Promise.race([
        Promise.all(refreshPromises),
        timeoutPromise
      ])

      // Update sync metadata
      runInAction(() => {
        this.lastSyncTimestamp = new Date().toISOString()
        this.dataVersion += 1
      })

      console.log('Portfolio data refresh completed successfully')
      
    } catch (error) {
      this.setError('dashboard', this.getErrorMessage(error))
      console.error('Portfolio data refresh failed:', error)
      throw error
    } finally {
      this.syncInProgress = false
      this.setLoading('dashboard', false)
    }
  }

  // Smart refresh - only refresh if data is stale
  shouldSkipRefresh() {
    if (!this.lastSyncTimestamp) return false
    
    const lastSync = new Date(this.lastSyncTimestamp)
    const now = new Date()
    const timeDiff = now - lastSync
    const fiveMinutes = 5 * 60 * 1000
    
    return timeDiff < fiveMinutes
  }

  // Selective data refresh for specific types
  async refreshDataType(type) {
    this.setLoading(type, true)
    this.setError(type, null)
    
    try {
      switch (type) {
        case 'mutualFunds':
          await this.fetchMutualFunds()
          break
        case 'sips':
          await this.fetchSIPs()
          break
        case 'fixedDeposits':
          await this.fetchFixedDeposits()
          break
        case 'epf':
          await this.fetchEPFAccounts()
          break
        case 'stocks':
          await this.fetchStocks()
          break
        default:
          throw new Error(`Unknown data type: ${type}`)
      }
      
      runInAction(() => {
        this.dataVersion += 1
      })
      
    } catch (error) {
      this.setError(type, this.getErrorMessage(error))
      throw error
    } finally {
      this.setLoading(type, false)
    }
  }

  // Auto-refresh setup
  setupAutoRefresh(intervalMinutes = 5) {
    // Clear existing interval
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval)
    }

    // Set up new interval
    this.autoRefreshInterval = setInterval(async () => {
      try {
        // Only auto-refresh if user is active and no manual operations in progress
        if (this.isUserActive() && !this.hasActiveOperations()) {
          await this.refreshAllData()
        }
      } catch (error) {
        console.warn('Auto-refresh failed:', error.message)
      }
    }, intervalMinutes * 60 * 1000)
  }

  // Check if user is active (has interacted recently)
  isUserActive() {
    // Simple implementation - can be enhanced with actual user activity tracking
    return document.visibilityState === 'visible'
  }

  // Check if there are any active operations that should prevent auto-refresh
  hasActiveOperations() {
    return Object.values(this.loading).some(loading => loading)
  }

  // Stop auto-refresh
  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval)
      this.autoRefreshInterval = null
    }
  }

  // Force refresh all data
  async forceRefresh() {
    return this.refreshAllData(true)
  }

  // Enhanced cache invalidation with consistency checks
  invalidateCache(type = 'all', reason = 'manual') {
    console.log(`Invalidating cache for ${type} (reason: ${reason})`)
    
    runInAction(() => {
      if (type === 'all' || type === 'mutualFunds') {
        this.mutualFunds = []
        this.mutualFundsSummary = {}
        this.clearError('mutualFunds')
      }
      if (type === 'all' || type === 'sips') {
        this.sips = []
        this.clearError('sips')
      }
      if (type === 'all' || type === 'fixedDeposits') {
        this.fixedDeposits = []
        this.clearError('fixedDeposits')
      }
      if (type === 'all' || type === 'epf') {
        this.epfAccounts = []
        this.clearError('epf')
      }
      if (type === 'all' || type === 'stocks') {
        this.stocks = []
        this.clearError('stocks')
      }
      
      // Reset sync metadata if invalidating all
      if (type === 'all') {
        this.lastSyncTimestamp = null
        this.dataVersion = 0
      }
    })
  }

  // Data consistency validation
  validateDataConsistency() {
    const issues = []

    // Check for duplicate IDs
    const allIds = [
      ...this.mutualFunds.map(f => f.id),
      ...this.sips.map(s => s.id),
      ...this.fixedDeposits.map(fd => fd.id),
      ...this.epfAccounts.map(epf => epf.id),
      ...this.stocks.map(stock => stock.id)
    ]

    const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      issues.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`)
    }

    // Check for invalid data structures
    this.mutualFunds.forEach((fund, index) => {
      if (!fund.id || !fund.name) {
        issues.push(`Invalid mutual fund at index ${index}: missing required fields`)
      }
      if (fund.investedAmount < 0 || fund.currentValue < 0) {
        issues.push(`Invalid mutual fund ${fund.name}: negative amounts`)
      }
    })

    this.stocks.forEach((stock, index) => {
      if (!stock.id || !stock.symbol) {
        issues.push(`Invalid stock at index ${index}: missing required fields`)
      }
      if (stock.quantity <= 0 || stock.buyPrice <= 0) {
        issues.push(`Invalid stock ${stock.symbol}: invalid quantity or price`)
      }
    })

    // Check for orphaned optimistic updates
    const optimisticItems = [
      ...this.mutualFunds.filter(f => f.isOptimistic),
      ...this.sips.filter(s => s.isOptimistic),
      ...this.fixedDeposits.filter(fd => fd.isOptimistic),
      ...this.epfAccounts.filter(epf => epf.isOptimistic),
      ...this.stocks.filter(stock => stock.isOptimistic)
    ]

    if (optimisticItems.length > 0) {
      issues.push(`Found ${optimisticItems.length} orphaned optimistic updates`)
    }

    if (issues.length > 0) {
      console.warn('Data consistency issues found:', issues)
      return { valid: false, issues }
    }

    return { valid: true, issues: [] }
  }

  // Clean up orphaned optimistic updates
  cleanupOptimisticUpdates() {
    runInAction(() => {
      this.mutualFunds = this.mutualFunds.filter(f => !f.isOptimistic)
      this.sips = this.sips.filter(s => !s.isOptimistic)
      this.fixedDeposits = this.fixedDeposits.filter(fd => !fd.isOptimistic)
      this.epfAccounts = this.epfAccounts.filter(epf => !epf.isOptimistic)
      this.stocks = this.stocks.filter(stock => !stock.isOptimistic)
    })
  }

  // Sync status information
  getSyncStatus() {
    return {
      lastSync: this.lastSyncTimestamp,
      syncInProgress: this.syncInProgress,
      dataVersion: this.dataVersion,
      hasErrors: Object.values(this.error).some(error => error !== null),
      isLoading: Object.values(this.loading).some(loading => loading),
      autoRefreshEnabled: this.autoRefreshInterval !== null
    }
  }

  // Connection health check
  async checkConnection() {
    try {
      const isHealthy = await apiClient.healthCheck()
      return isHealthy
    } catch (error) {
      console.error('Connection check failed:', error)
      return false
    }
  }

  // Utility methods
  setLoading(key, value) {
    this.loading[key] = value
  }

  setError(key, value) {
    this.error[key] = value
  }

  clearError(key) {
    this.error[key] = null
  }

  clearAllErrors() {
    Object.keys(this.error).forEach(key => {
      this.error[key] = null
    })
  }

  getErrorMessage(error) {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.response?.data?.message) return error.response.data.message
    return 'An unexpected error occurred'
  }

  // Optimistic update helpers
  generateTempId() {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  createOptimisticItem(data, type) {
    return {
      id: this.generateTempId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOptimistic: true,
      type
    }
  }
}

export const portfolioStore = new PortfolioStore()