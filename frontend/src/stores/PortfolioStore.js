import { makeAutoObservable, runInAction } from 'mobx'
import { apiClient } from '../lib/apiClient'

class PortfolioStore {
  // Observable state
  mutualFunds = []
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

  constructor() {
    makeAutoObservable(this)
  }

  // Computed values
  get totalPortfolioValue() {
    const mfValue = Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.currentValue || 0), 0) : 0
    const fdValue = Array.isArray(this.fixedDeposits) ? this.fixedDeposits.reduce((sum, fd) => sum + (fd.currentValue || 0), 0) : 0
    const epfValue = Array.isArray(this.epfAccounts) ? this.epfAccounts.reduce((sum, epf) => sum + (epf.totalBalance || 0), 0) : 0
    const stockValue = Array.isArray(this.stocks) ? this.stocks.reduce((sum, stock) => sum + (stock.currentValue || 0), 0) : 0
    
    return mfValue + fdValue + epfValue + stockValue
  }

  get totalInvested() {
    const mfInvested = Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.investedAmount || 0), 0) : 0
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

    const mfValue = Array.isArray(this.mutualFunds) ? this.mutualFunds.reduce((sum, fund) => sum + (fund.currentValue || 0), 0) : 0
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
        const returns = (fund.currentValue || 0) - (fund.investedAmount || 0)
        const returnsPercentage = fund.investedAmount > 0 
          ? (returns / fund.investedAmount) * 100 
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
        this.mutualFunds = Array.isArray(data) ? data : []
      })
    } catch (error) {
      this.setError('mutualFunds', error.message)
      runInAction(() => {
        this.mutualFunds = []
      })
    } finally {
      this.setLoading('mutualFunds', false)
    }
  }

  async addMutualFund(fundData) {
    try {
      const newFund = await apiClient.createMutualFund(fundData)
      runInAction(() => {
        this.mutualFunds.push(newFund)
      })
      return newFund
    } catch (error) {
      this.setError('mutualFunds', error.message)
      throw error
    }
  }

  async updateMutualFund(id, fundData) {
    try {
      const updatedFund = await apiClient.updateMutualFund(id, fundData)
      runInAction(() => {
        const index = this.mutualFunds.findIndex(fund => fund.id === id)
        if (index !== -1) {
          this.mutualFunds[index] = updatedFund
        }
      })
      return updatedFund
    } catch (error) {
      this.setError('mutualFunds', error.message)
      throw error
    }
  }

  async deleteMutualFund(id) {
    try {
      await apiClient.deleteMutualFund(id)
      runInAction(() => {
        this.mutualFunds = this.mutualFunds.filter(fund => fund.id !== id)
      })
    } catch (error) {
      this.setError('mutualFunds', error.message)
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

  // Dashboard data fetching
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
    } catch (error) {
      this.setError('dashboard', error.message)
    } finally {
      this.setLoading('dashboard', false)
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
}

export const portfolioStore = new PortfolioStore()