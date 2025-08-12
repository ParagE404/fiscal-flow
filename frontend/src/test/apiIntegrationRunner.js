import { apiClient } from '../lib/apiClient.js'
import { portfolioStore } from '../stores/PortfolioStore'

/**
 * Comprehensive API Integration Test Runner
 * Tests all CRUD operations end-to-end with proper error handling
 */
class ApiIntegrationRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    }
  }

  async runAllTests() {
    console.log('🚀 Starting API Integration Tests...\n')

    try {
      // Test API connectivity first
      await this.testApiConnectivity()
      
      // Test individual endpoints
      await this.testMutualFundsEndpoints()
      await this.testSIPsEndpoints()
      await this.testFixedDepositsEndpoints()
      await this.testEPFEndpoints()
      await this.testStocksEndpoints()
      
      // Test store integration
      await this.testStoreIntegration()
      
      // Test error handling
      await this.testErrorHandling()
      
      // Test data synchronization
      await this.testDataSynchronization()

    } catch (error) {
      this.recordError('Test runner failed', error)
    }

    this.printResults()
    return this.results
  }

  async testApiConnectivity() {
    console.log('📡 Testing API Connectivity...')
    
    try {
      const isHealthy = await apiClient.healthCheck()
      if (isHealthy) {
        this.recordSuccess('API health check passed')
      } else {
        this.recordError('API health check failed', new Error('Health check returned false'))
      }
    } catch (error) {
      this.recordError('API connectivity test failed', error)
    }
  }

  async testMutualFundsEndpoints() {
    console.log('💰 Testing Mutual Funds Endpoints...')
    
    try {
      // Test GET (empty state)
      const initialData = await apiClient.getMutualFunds()
      if (Array.isArray(initialData.funds)) {
        this.recordSuccess('GET mutual funds - initial load')
      } else {
        this.recordError('GET mutual funds failed', new Error('Invalid data structure'))
      }

      // Test CREATE
      const testFund = {
        name: 'Test Integration Fund',
        category: 'Large Cap',
        riskLevel: 'Moderate',
        rating: 4,
        investedAmount: 10000,
        currentValue: 11000
      }

      const createdFund = await apiClient.createMutualFund(testFund)
      if (createdFund && createdFund.id) {
        this.recordSuccess('POST mutual funds - create')
        
        // Test UPDATE
        const updateData = { currentValue: 12000 }
        const updatedFund = await apiClient.updateMutualFund(createdFund.id, updateData)
        if (updatedFund && updatedFund.currentValue === 12000) {
          this.recordSuccess('PUT mutual funds - update')
        } else {
          this.recordError('PUT mutual funds failed', new Error('Update did not persist'))
        }

        // Test DELETE
        await apiClient.deleteMutualFund(createdFund.id)
        this.recordSuccess('DELETE mutual funds - delete')
        
      } else {
        this.recordError('POST mutual funds failed', new Error('No ID returned'))
      }

    } catch (error) {
      this.recordError('Mutual funds endpoints test failed', error)
    }
  }

  async testSIPsEndpoints() {
    console.log('📈 Testing SIPs Endpoints...')
    
    try {
      // Test GET
      const sips = await apiClient.getSIPs()
      if (Array.isArray(sips)) {
        this.recordSuccess('GET SIPs')
      } else {
        this.recordError('GET SIPs failed', new Error('Invalid data structure'))
      }

      // Test CREATE
      const testSIP = {
        fundName: 'Test SIP Fund',
        amount: 5000,
        frequency: 'Monthly',
        nextDueDate: new Date().toISOString(),
        totalInstallments: 12
      }

      const createdSIP = await apiClient.createSIP(testSIP)
      if (createdSIP && createdSIP.id) {
        this.recordSuccess('POST SIPs - create')
        
        // Test UPDATE
        const updateData = { amount: 6000 }
        const updatedSIP = await apiClient.updateSIP(createdSIP.id, updateData)
        if (updatedSIP && updatedSIP.amount === 6000) {
          this.recordSuccess('PUT SIPs - update')
        } else {
          this.recordError('PUT SIPs failed', new Error('Update did not persist'))
        }

        // Test DELETE
        await apiClient.deleteSIP(createdSIP.id)
        this.recordSuccess('DELETE SIPs - delete')
        
      } else {
        this.recordError('POST SIPs failed', new Error('No ID returned'))
      }

    } catch (error) {
      this.recordError('SIPs endpoints test failed', error)
    }
  }

  async testFixedDepositsEndpoints() {
    console.log('🏦 Testing Fixed Deposits Endpoints...')
    
    try {
      // Test GET
      const fds = await apiClient.getFixedDeposits()
      if (Array.isArray(fds)) {
        this.recordSuccess('GET Fixed Deposits')
      } else {
        this.recordError('GET Fixed Deposits failed', new Error('Invalid data structure'))
      }

      // Test CREATE
      const testFD = {
        bankName: 'Test Bank',
        investedAmount: 100000,
        interestRate: 7.5,
        type: 'Simple',
        startDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        tenure: 12
      }

      const createdFD = await apiClient.createFixedDeposit(testFD)
      if (createdFD && createdFD.id) {
        this.recordSuccess('POST Fixed Deposits - create')
        
        // Test UPDATE
        const updateData = { interestRate: 8.0 }
        const updatedFD = await apiClient.updateFixedDeposit(createdFD.id, updateData)
        if (updatedFD && updatedFD.interestRate === 8.0) {
          this.recordSuccess('PUT Fixed Deposits - update')
        } else {
          this.recordError('PUT Fixed Deposits failed', new Error('Update did not persist'))
        }

        // Test DELETE
        await apiClient.deleteFixedDeposit(createdFD.id)
        this.recordSuccess('DELETE Fixed Deposits - delete')
        
      } else {
        this.recordError('POST Fixed Deposits failed', new Error('No ID returned'))
      }

    } catch (error) {
      this.recordError('Fixed Deposits endpoints test failed', error)
    }
  }

  async testEPFEndpoints() {
    console.log('🏢 Testing EPF Endpoints...')
    
    try {
      // Test GET
      const epfAccounts = await apiClient.getEPFAccounts()
      if (Array.isArray(epfAccounts)) {
        this.recordSuccess('GET EPF Accounts')
      } else {
        this.recordError('GET EPF Accounts failed', new Error('Invalid data structure'))
      }

      // Test CREATE
      const testEPF = {
        employerName: 'Test Company',
        pfNumber: 'TEST123456789',
        status: 'Active',
        totalBalance: 50000,
        employeeContribution: 25000,
        employerContribution: 20000,
        pensionFund: 5000,
        monthlyContribution: 2000,
        startDate: new Date().toISOString()
      }

      const createdEPF = await apiClient.createEPFAccount(testEPF)
      if (createdEPF && createdEPF.id) {
        this.recordSuccess('POST EPF Accounts - create')
        
        // Test UPDATE
        const updateData = { totalBalance: 55000 }
        const updatedEPF = await apiClient.updateEPFAccount(createdEPF.id, updateData)
        if (updatedEPF && updatedEPF.totalBalance === 55000) {
          this.recordSuccess('PUT EPF Accounts - update')
        } else {
          this.recordError('PUT EPF Accounts failed', new Error('Update did not persist'))
        }

        // Test DELETE
        await apiClient.deleteEPFAccount(createdEPF.id)
        this.recordSuccess('DELETE EPF Accounts - delete')
        
      } else {
        this.recordError('POST EPF Accounts failed', new Error('No ID returned'))
      }

    } catch (error) {
      this.recordError('EPF endpoints test failed', error)
    }
  }

  async testStocksEndpoints() {
    console.log('📊 Testing Stocks Endpoints...')
    
    try {
      // Test GET
      const stocks = await apiClient.getStocks()
      if (Array.isArray(stocks)) {
        this.recordSuccess('GET Stocks')
      } else {
        this.recordError('GET Stocks failed', new Error('Invalid data structure'))
      }

      // Test CREATE
      const testStock = {
        symbol: 'TEST',
        companyName: 'Test Company Ltd',
        sector: 'Technology',
        marketCap: 'Large Cap',
        quantity: 100,
        buyPrice: 500,
        currentPrice: 550,
        investedAmount: 50000,
        currentValue: 55000
      }

      const createdStock = await apiClient.createStock(testStock)
      if (createdStock && createdStock.id) {
        this.recordSuccess('POST Stocks - create')
        
        // Test UPDATE
        const updateData = { currentPrice: 600, currentValue: 60000 }
        const updatedStock = await apiClient.updateStock(createdStock.id, updateData)
        if (updatedStock && updatedStock.currentPrice === 600) {
          this.recordSuccess('PUT Stocks - update')
        } else {
          this.recordError('PUT Stocks failed', new Error('Update did not persist'))
        }

        // Test DELETE
        await apiClient.deleteStock(createdStock.id)
        this.recordSuccess('DELETE Stocks - delete')
        
      } else {
        this.recordError('POST Stocks failed', new Error('No ID returned'))
      }

    } catch (error) {
      this.recordError('Stocks endpoints test failed', error)
    }
  }

  async testStoreIntegration() {
    console.log('🏪 Testing Store Integration...')
    
    try {
      // Test store data fetching
      await portfolioStore.fetchMutualFunds()
      if (Array.isArray(portfolioStore.mutualFunds)) {
        this.recordSuccess('Store - fetch mutual funds')
      } else {
        this.recordError('Store integration failed', new Error('Invalid store data'))
      }

      // Test computed values
      const totalValue = portfolioStore.totalPortfolioValue
      if (typeof totalValue === 'number') {
        this.recordSuccess('Store - computed values')
      } else {
        this.recordError('Store computed values failed', new Error('Invalid computed value'))
      }

      // Test error handling in store
      portfolioStore.setError('test', 'Test error')
      if (portfolioStore.error.test === 'Test error') {
        this.recordSuccess('Store - error handling')
        portfolioStore.clearError('test')
      } else {
        this.recordError('Store error handling failed', new Error('Error state not managed'))
      }

    } catch (error) {
      this.recordError('Store integration test failed', error)
    }
  }

  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...')
    
    try {
      // Test invalid endpoint
      try {
        await apiClient.get('/invalid-endpoint')
        this.recordError('Error handling failed', new Error('Should have thrown error'))
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          this.recordSuccess('Error handling - 404 errors')
        } else {
          this.recordError('Error handling - unexpected error format', error)
        }
      }

      // Test network error simulation
      const originalFetch = global.fetch
      global.fetch = () => Promise.reject(new Error('Network error'))
      
      try {
        await apiClient.get('/test')
        this.recordError('Network error handling failed', new Error('Should have thrown error'))
      } catch (error) {
        if (error.message.includes('Network error')) {
          this.recordSuccess('Error handling - network errors')
        } else {
          this.recordError('Network error handling - unexpected error', error)
        }
      }
      
      global.fetch = originalFetch

    } catch (error) {
      this.recordError('Error handling test failed', error)
    }
  }

  async testDataSynchronization() {
    console.log('🔄 Testing Data Synchronization...')
    
    try {
      // Test cache invalidation
      portfolioStore.invalidateCache('mutualFunds')
      if (portfolioStore.mutualFunds.length === 0) {
        this.recordSuccess('Data sync - cache invalidation')
      } else {
        this.recordError('Cache invalidation failed', new Error('Cache not cleared'))
      }

      // Test data refresh
      await portfolioStore.refreshAllData()
      this.recordSuccess('Data sync - refresh all data')

      // Test connection health check
      const isHealthy = await portfolioStore.checkConnection()
      if (typeof isHealthy === 'boolean') {
        this.recordSuccess('Data sync - connection health check')
      } else {
        this.recordError('Connection health check failed', new Error('Invalid health check result'))
      }

    } catch (error) {
      this.recordError('Data synchronization test failed', error)
    }
  }

  recordSuccess(testName) {
    console.log(`✅ ${testName}`)
    this.results.passed++
  }

  recordError(testName, error) {
    console.log(`❌ ${testName}: ${error.message}`)
    this.results.failed++
    this.results.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack
    })
  }

  printResults() {
    console.log('\n📊 Test Results Summary:')
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`)
    
    if (this.results.errors.length > 0) {
      console.log('\n🔍 Error Details:')
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`)
      })
    }
    
    console.log('\n🎉 API Integration Tests Complete!')
  }
}

// Export for use in tests or manual execution
export { ApiIntegrationRunner }

// Allow manual execution
if (typeof window !== 'undefined' && window.runApiIntegrationTests) {
  window.runApiIntegrationTests = async () => {
    const runner = new ApiIntegrationRunner()
    return await runner.runAllTests()
  }
}