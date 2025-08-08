import { apiClient } from '../../lib/apiClient'
import { portfolioStore } from '../../stores/PortfolioStore'
import { dataSyncService } from '../../lib/dataSyncService'
import { ApiIntegrationRunner } from '../../test/apiIntegrationRunner'

// Mock fetch for testing
global.fetch = jest.fn()

describe('API Connection and Integration Verification', () => {
  beforeEach(() => {
    fetch.mockClear()
    jest.clearAllMocks()
    console.error = jest.fn()
    console.warn = jest.fn()
    console.log = jest.fn()
  })

  describe('API Client Integration', () => {
    test('should have retry logic with exponential backoff', async () => {
      // Mock network failures followed by success
      fetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        })

      const result = await apiClient.get('/test')
      
      expect(fetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
    })

    test('should handle authentication errors correctly', async () => {
      const mockAuthStore = { clearAuth: jest.fn() }
      
      // Mock dynamic import
      jest.doMock('../../stores/AuthStore', () => ({
        authStore: mockAuthStore
      }))

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' })
      })

      await expect(apiClient.get('/test')).rejects.toThrow('Token expired')
    })

    test('should include auth token in requests', async () => {
      localStorage.setItem('authToken', 'test-token')
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Map([['content-type', 'application/json']])
      })

      await apiClient.get('/test')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    test('should have health check functionality', async () => {
      fetch.mockResolvedValueOnce({ ok: true })

      const result = await apiClient.healthCheck()
      
      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/health')
    })
  })

  describe('Portfolio Store Integration', () => {
    test('should have optimistic updates for all CRUD operations', async () => {
      const mockFund = { name: 'Test Fund', investedAmount: 1000 }
      const createdFund = { id: '1', ...mockFund }
      
      // Mock API responses
      apiClient.createMutualFund = jest.fn().mockResolvedValue(createdFund)
      apiClient.getMutualFunds = jest.fn().mockResolvedValue({
        funds: [createdFund],
        summary: {}
      })

      // Initially empty
      expect(portfolioStore.mutualFunds).toHaveLength(0)

      const promise = portfolioStore.addMutualFund(mockFund)

      // Should have optimistic update immediately
      expect(portfolioStore.mutualFunds).toHaveLength(1)
      expect(portfolioStore.mutualFunds[0].isOptimistic).toBe(true)

      await promise

      // Should be replaced with real data
      expect(apiClient.createMutualFund).toHaveBeenCalledWith(mockFund)
      expect(apiClient.getMutualFunds).toHaveBeenCalled()
    })

    test('should revert optimistic updates on failure', async () => {
      const mockFund = { name: 'Test Fund', investedAmount: 1000 }
      const error = new Error('Creation failed')
      
      apiClient.createMutualFund = jest.fn().mockRejectedValue(error)

      // Initially empty
      expect(portfolioStore.mutualFunds).toHaveLength(0)

      const promise = portfolioStore.addMutualFund(mockFund)

      // Should have optimistic update immediately
      expect(portfolioStore.mutualFunds).toHaveLength(1)

      await expect(promise).rejects.toThrow('Creation failed')

      // Should revert optimistic update
      expect(portfolioStore.mutualFunds).toHaveLength(0)
    })

    test('should have data validation and consistency checks', () => {
      // Add invalid data
      portfolioStore.mutualFunds = [
        { id: '1', name: 'Valid Fund', investedAmount: 1000 },
        { id: '1', name: 'Duplicate ID', investedAmount: 2000 }, // Duplicate ID
        { name: 'Missing ID', investedAmount: 3000 }, // Missing ID
        { id: '2', name: 'Negative Amount', investedAmount: -1000 } // Negative amount
      ]

      const validation = portfolioStore.validateDataConsistency()
      
      expect(validation.valid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues.some(issue => issue.includes('Duplicate IDs'))).toBe(true)
    })

    test('should have cache invalidation functionality', () => {
      // Set up data
      portfolioStore.mutualFunds = [{ id: '1', name: 'Test Fund' }]
      portfolioStore.sips = [{ id: '1', name: 'Test SIP' }]
      portfolioStore.stocks = [{ id: '1', name: 'Test Stock' }]

      // Invalidate specific type
      portfolioStore.invalidateCache('mutualFunds')
      
      expect(portfolioStore.mutualFunds).toHaveLength(0)
      expect(portfolioStore.sips).toHaveLength(1) // Should not be affected

      // Invalidate all
      portfolioStore.invalidateCache('all')
      
      expect(portfolioStore.sips).toHaveLength(0)
      expect(portfolioStore.stocks).toHaveLength(0)
    })

    test('should have auto-refresh functionality', () => {
      expect(portfolioStore.autoRefreshInterval).toBeDefined()
      expect(typeof portfolioStore.setupAutoRefresh).toBe('function')
      expect(typeof portfolioStore.stopAutoRefresh).toBe('function')
    })
  })

  describe('Data Synchronization Service', () => {
    test('should initialize properly', () => {
      expect(dataSyncService).toBeDefined()
      expect(typeof dataSyncService.initialize).toBe('function')
      expect(typeof dataSyncService.syncAllData).toBe('function')
      expect(typeof dataSyncService.queueOperation).toBe('function')
    })

    test('should have sync queue functionality', () => {
      const operation = {
        type: 'create',
        data: { entityType: 'mutualFund', name: 'Test Fund' }
      }

      dataSyncService.queueOperation(operation)
      
      const stats = dataSyncService.getSyncStats()
      expect(stats.queueLength).toBeGreaterThan(0)

      dataSyncService.clearQueue()
      
      const clearedStats = dataSyncService.getSyncStats()
      expect(clearedStats.queueLength).toBe(0)
    })

    test('should provide sync statistics', () => {
      const stats = dataSyncService.getSyncStats()
      
      expect(stats).toHaveProperty('queueLength')
      expect(stats).toHaveProperty('isProcessing')
      expect(stats).toHaveProperty('isOnline')
      expect(stats).toHaveProperty('dataVersion')
    })
  })

  describe('Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new TypeError('Failed to fetch')
      apiClient.getMutualFunds = jest.fn().mockRejectedValue(networkError)

      await expect(portfolioStore.fetchMutualFunds()).rejects.toThrow()
      
      expect(portfolioStore.error.mutualFunds).toBeTruthy()
      expect(portfolioStore.loading.mutualFunds).toBe(false)
    })

    test('should handle server errors with proper messages', async () => {
      const serverError = new Error('Internal server error')
      apiClient.createMutualFund = jest.fn().mockRejectedValue(serverError)

      await expect(portfolioStore.addMutualFund({ name: 'Test' })).rejects.toThrow()
      
      expect(portfolioStore.error.mutualFunds).toBe('Internal server error')
    })

    test('should extract error messages correctly', () => {
      expect(portfolioStore.getErrorMessage('Simple string')).toBe('Simple string')
      expect(portfolioStore.getErrorMessage(new Error('Error object'))).toBe('Error object')
      expect(portfolioStore.getErrorMessage({ 
        response: { data: { message: 'API error' } } 
      })).toBe('API error')
      expect(portfolioStore.getErrorMessage({})).toBe('An unexpected error occurred')
    })
  })

  describe('API Integration Test Runner', () => {
    test('should be able to run comprehensive integration tests', async () => {
      const runner = new ApiIntegrationRunner()
      
      expect(runner).toBeDefined()
      expect(typeof runner.runAllTests).toBe('function')
      expect(typeof runner.testApiConnectivity).toBe('function')
      expect(typeof runner.testMutualFundsEndpoints).toBe('function')
    })

    test('should track test results properly', () => {
      const runner = new ApiIntegrationRunner()
      
      runner.recordSuccess('Test success')
      expect(runner.results.passed).toBe(1)
      expect(runner.results.failed).toBe(0)

      runner.recordError('Test error', new Error('Test error message'))
      expect(runner.results.passed).toBe(1)
      expect(runner.results.failed).toBe(1)
      expect(runner.results.errors).toHaveLength(1)
    })
  })

  describe('Form Integration with API', () => {
    test('should validate data before API submission', async () => {
      const invalidData = {
        name: '', // Required field missing
        investedAmount: -1000 // Invalid negative amount
      }

      // Should not call API with invalid data
      apiClient.createMutualFund = jest.fn()

      try {
        await portfolioStore.addMutualFund(invalidData)
      } catch (error) {
        // Expected to fail validation
      }

      // API should not be called with invalid data
      expect(apiClient.createMutualFund).not.toHaveBeenCalled()
    })

    test('should handle concurrent operations correctly', async () => {
      const fund1 = { name: 'Fund 1', investedAmount: 1000 }
      const fund2 = { name: 'Fund 2', investedAmount: 2000 }

      apiClient.createMutualFund = jest.fn()
        .mockResolvedValueOnce({ id: '1', ...fund1 })
        .mockResolvedValueOnce({ id: '2', ...fund2 })
      
      apiClient.getMutualFunds = jest.fn().mockResolvedValue({
        funds: [],
        summary: {}
      })

      // Start concurrent operations
      const promise1 = portfolioStore.addMutualFund(fund1)
      const promise2 = portfolioStore.addMutualFund(fund2)

      // Both should have optimistic updates
      expect(portfolioStore.mutualFunds).toHaveLength(2)

      await Promise.all([promise1, promise2])

      // Both API calls should have been made
      expect(apiClient.createMutualFund).toHaveBeenCalledTimes(2)
    })
  })

  describe('Real-time Data Synchronization', () => {
    test('should detect stale data correctly', () => {
      // Set old timestamp
      portfolioStore.lastSyncTimestamp = new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 minutes ago
      
      expect(portfolioStore.shouldSkipRefresh()).toBe(false) // Should not skip, data is stale

      // Set recent timestamp
      portfolioStore.lastSyncTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
      
      expect(portfolioStore.shouldSkipRefresh()).toBe(true) // Should skip, data is fresh
    })

    test('should prevent concurrent sync operations', async () => {
      portfolioStore.syncInProgress = true

      // Mock the fetch methods
      apiClient.getMutualFunds = jest.fn().mockResolvedValue({ funds: [], summary: {} })

      await portfolioStore.refreshAllData()

      // Should not call API when sync is in progress
      expect(apiClient.getMutualFunds).not.toHaveBeenCalled()
    })

    test('should update data version on successful sync', async () => {
      const initialVersion = portfolioStore.dataVersion

      // Mock successful API calls
      apiClient.getMutualFunds = jest.fn().mockResolvedValue({ funds: [], summary: {} })
      apiClient.getSIPs = jest.fn().mockResolvedValue([])
      apiClient.getFixedDeposits = jest.fn().mockResolvedValue([])
      apiClient.getEPFAccounts = jest.fn().mockResolvedValue([])
      apiClient.getStocks = jest.fn().mockResolvedValue([])

      await portfolioStore.refreshAllData(true)

      expect(portfolioStore.dataVersion).toBe(initialVersion + 1)
      expect(portfolioStore.lastSyncTimestamp).toBeTruthy()
    })
  })
})

// Integration test to verify all components work together
describe('End-to-End Integration', () => {
  test('should handle complete user workflow', async () => {
    // Mock all API endpoints
    const mockFund = { id: '1', name: 'Integration Test Fund', investedAmount: 5000, currentValue: 5500 }
    
    apiClient.getMutualFunds = jest.fn().mockResolvedValue({ funds: [], summary: {} })
    apiClient.createMutualFund = jest.fn().mockResolvedValue(mockFund)
    apiClient.updateMutualFund = jest.fn().mockResolvedValue({ ...mockFund, currentValue: 6000 })
    apiClient.deleteMutualFund = jest.fn().mockResolvedValue()

    // 1. Initial load
    await portfolioStore.fetchMutualFunds()
    expect(portfolioStore.mutualFunds).toHaveLength(0)

    // 2. Create fund
    await portfolioStore.addMutualFund({ name: 'Integration Test Fund', investedAmount: 5000 })
    expect(apiClient.createMutualFund).toHaveBeenCalled()

    // 3. Update fund
    await portfolioStore.updateMutualFund('1', { currentValue: 6000 })
    expect(apiClient.updateMutualFund).toHaveBeenCalledWith('1', { currentValue: 6000 })

    // 4. Delete fund
    await portfolioStore.deleteMutualFund('1')
    expect(apiClient.deleteMutualFund).toHaveBeenCalledWith('1')

    // 5. Verify no errors
    expect(portfolioStore.error.mutualFunds).toBe(null)
  })
})