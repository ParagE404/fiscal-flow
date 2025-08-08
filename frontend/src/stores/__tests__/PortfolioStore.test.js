import { PortfolioStore } from '../PortfolioStore'
import { apiClient } from '../../lib/apiClient'

// Mock the API client
jest.mock('../../lib/apiClient')

describe('PortfolioStore', () => {
  let store

  beforeEach(() => {
    store = new PortfolioStore()
    jest.clearAllMocks()
    console.error = jest.fn()
  })

  describe('Computed Values', () => {
    test('should calculate total portfolio value correctly', () => {
      store.mutualFunds = [
        { currentValue: 10000, investedAmount: 8000 },
        { currentValue: 5000, investedAmount: 4000 }
      ]
      store.stocks = [
        { currentValue: 3000, investedAmount: 2500 }
      ]
      store.fixedDeposits = [
        { currentValue: 12000, investedAmount: 10000 }
      ]
      store.epfAccounts = [
        { totalBalance: 50000 }
      ]

      expect(store.totalPortfolioValue).toBe(80000)
    })

    test('should calculate total invested correctly', () => {
      store.mutualFunds = [
        { currentValue: 10000, investedAmount: 8000 },
        { currentValue: 5000, investedAmount: 4000 }
      ]
      store.stocks = [
        { currentValue: 3000, investedAmount: 2500 }
      ]
      store.fixedDeposits = [
        { currentValue: 12000, investedAmount: 10000 }
      ]
      store.epfAccounts = [
        { totalBalance: 50000, employeeContribution: 25000 }
      ]

      expect(store.totalInvested).toBe(49500)
    })

    test('should calculate total returns correctly', () => {
      store.mutualFunds = [
        { currentValue: 10000, investedAmount: 8000 }
      ]
      store.stocks = [
        { currentValue: 3000, investedAmount: 2500 }
      ]

      expect(store.totalReturns).toBe(2500)
    })

    test('should calculate asset allocation correctly', () => {
      store.mutualFunds = [
        { currentValue: 40000, investedAmount: 30000 }
      ]
      store.stocks = [
        { currentValue: 30000, investedAmount: 25000 }
      ]
      store.fixedDeposits = [
        { currentValue: 20000, investedAmount: 18000 }
      ]
      store.epfAccounts = [
        { totalBalance: 10000 }
      ]

      const allocation = store.assetAllocation

      expect(allocation.mutualFunds.percentage).toBe(40)
      expect(allocation.stocks.percentage).toBe(30)
      expect(allocation.fixedDeposits.percentage).toBe(20)
      expect(allocation.epf.percentage).toBe(10)
    })

    test('should calculate top performers correctly', () => {
      store.mutualFunds = [
        {
          name: 'High Performer Fund',
          currentValue: 12000,
          investedAmount: 10000,
          category: 'Large Cap'
        },
        {
          name: 'Low Performer Fund',
          currentValue: 9000,
          investedAmount: 10000,
          category: 'Mid Cap'
        }
      ]
      store.stocks = [
        {
          companyName: 'Great Stock',
          symbol: 'GREAT',
          pnl: 5000,
          pnlPercentage: 25,
          sector: 'Technology'
        }
      ]

      const topPerformers = store.topPerformers

      expect(topPerformers).toHaveLength(3)
      expect(topPerformers[0].name).toBe('Great Stock')
      expect(topPerformers[0].returnsPercentage).toBe(25)
      expect(topPerformers[1].name).toBe('High Performer Fund')
      expect(topPerformers[1].returnsPercentage).toBe(20)
      expect(topPerformers[2].name).toBe('Low Performer Fund')
      expect(topPerformers[2].returnsPercentage).toBe(-10)
    })
  })

  describe('Mutual Funds Operations', () => {
    test('should fetch mutual funds successfully', async () => {
      const mockData = {
        funds: [{ id: '1', name: 'Test Fund' }],
        summary: { totalInvestment: 10000 }
      }
      apiClient.getMutualFunds.mockResolvedValue(mockData)

      await store.fetchMutualFunds()

      expect(store.loading.mutualFunds).toBe(false)
      expect(store.error.mutualFunds).toBe(null)
      expect(store.mutualFunds).toEqual(mockData.funds)
      expect(store.mutualFundsSummary).toEqual(mockData.summary)
    })

    test('should handle fetch mutual funds error', async () => {
      const error = new Error('Network error')
      apiClient.getMutualFunds.mockRejectedValue(error)

      await expect(store.fetchMutualFunds()).rejects.toThrow('Network error')

      expect(store.loading.mutualFunds).toBe(false)
      expect(store.error.mutualFunds).toBe('Network error')
      expect(store.mutualFunds).toEqual([])
      expect(store.mutualFundsSummary).toEqual({})
    })

    test('should add mutual fund with optimistic update', async () => {
      const fundData = { name: 'New Fund', investedAmount: 5000 }
      const createdFund = { id: '1', ...fundData }
      
      apiClient.createMutualFund.mockResolvedValue(createdFund)
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [createdFund],
        summary: {}
      })

      // Initially empty
      expect(store.mutualFunds).toHaveLength(0)

      const promise = store.addMutualFund(fundData)

      // Should have optimistic update immediately
      expect(store.mutualFunds).toHaveLength(1)
      expect(store.mutualFunds[0].name).toBe('New Fund')
      expect(store.mutualFunds[0].isOptimistic).toBe(true)

      const result = await promise

      expect(result).toEqual(createdFund)
      expect(apiClient.createMutualFund).toHaveBeenCalledWith(fundData)
      expect(apiClient.getMutualFunds).toHaveBeenCalled()
    })

    test('should revert optimistic update on add failure', async () => {
      const fundData = { name: 'New Fund', investedAmount: 5000 }
      const error = new Error('Creation failed')
      
      apiClient.createMutualFund.mockRejectedValue(error)

      // Initially empty
      expect(store.mutualFunds).toHaveLength(0)

      const promise = store.addMutualFund(fundData)

      // Should have optimistic update immediately
      expect(store.mutualFunds).toHaveLength(1)

      await expect(promise).rejects.toThrow('Creation failed')

      // Should revert optimistic update
      expect(store.mutualFunds).toHaveLength(0)
      expect(store.error.mutualFunds).toBe('Creation failed')
    })

    test('should update mutual fund with optimistic update', async () => {
      const originalFund = { id: '1', name: 'Original Fund', investedAmount: 5000 }
      const updateData = { name: 'Updated Fund' }
      const updatedFund = { ...originalFund, ...updateData }
      
      store.mutualFunds = [originalFund]
      
      apiClient.updateMutualFund.mockResolvedValue(updatedFund)
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [updatedFund],
        summary: {}
      })

      const promise = store.updateMutualFund('1', updateData)

      // Should have optimistic update immediately
      expect(store.mutualFunds[0].name).toBe('Updated Fund')
      expect(store.mutualFunds[0].isOptimistic).toBe(true)

      const result = await promise

      expect(result).toEqual(updatedFund)
      expect(apiClient.updateMutualFund).toHaveBeenCalledWith('1', updateData)
      expect(apiClient.getMutualFunds).toHaveBeenCalled()
    })

    test('should revert optimistic update on update failure', async () => {
      const originalFund = { id: '1', name: 'Original Fund', investedAmount: 5000 }
      const updateData = { name: 'Updated Fund' }
      const error = new Error('Update failed')
      
      store.mutualFunds = [originalFund]
      
      apiClient.updateMutualFund.mockRejectedValue(error)

      const promise = store.updateMutualFund('1', updateData)

      // Should have optimistic update immediately
      expect(store.mutualFunds[0].name).toBe('Updated Fund')

      await expect(promise).rejects.toThrow('Update failed')

      // Should revert optimistic update
      expect(store.mutualFunds[0].name).toBe('Original Fund')
      expect(store.error.mutualFunds).toBe('Update failed')
    })

    test('should delete mutual fund with optimistic update', async () => {
      const fundToDelete = { id: '1', name: 'Fund to Delete' }
      const remainingFund = { id: '2', name: 'Remaining Fund' }
      
      store.mutualFunds = [fundToDelete, remainingFund]
      
      apiClient.deleteMutualFund.mockResolvedValue()
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [remainingFund],
        summary: {}
      })

      const promise = store.deleteMutualFund('1')

      // Should have optimistic update immediately
      expect(store.mutualFunds).toHaveLength(1)
      expect(store.mutualFunds[0].id).toBe('2')

      await promise

      expect(apiClient.deleteMutualFund).toHaveBeenCalledWith('1')
      expect(apiClient.getMutualFunds).toHaveBeenCalled()
    })

    test('should revert optimistic update on delete failure', async () => {
      const fundToDelete = { id: '1', name: 'Fund to Delete' }
      const remainingFund = { id: '2', name: 'Remaining Fund' }
      const error = new Error('Delete failed')
      
      store.mutualFunds = [fundToDelete, remainingFund]
      
      apiClient.deleteMutualFund.mockRejectedValue(error)

      const promise = store.deleteMutualFund('1')

      // Should have optimistic update immediately
      expect(store.mutualFunds).toHaveLength(1)

      await expect(promise).rejects.toThrow('Delete failed')

      // Should revert optimistic update
      expect(store.mutualFunds).toHaveLength(2)
      expect(store.mutualFunds.find(f => f.id === '1')).toBeDefined()
      expect(store.error.mutualFunds).toBe('Delete failed')
    })
  })

  describe('Data Synchronization', () => {
    test('should refresh all data successfully', async () => {
      apiClient.getMutualFunds.mockResolvedValue({ funds: [], summary: {} })
      apiClient.getSIPs.mockResolvedValue([])
      apiClient.getFixedDeposits.mockResolvedValue([])
      apiClient.getEPFAccounts.mockResolvedValue([])
      apiClient.getStocks.mockResolvedValue([])

      await store.refreshAllData()

      expect(store.loading.dashboard).toBe(false)
      expect(store.error.dashboard).toBe(null)
      expect(apiClient.getMutualFunds).toHaveBeenCalled()
      expect(apiClient.getSIPs).toHaveBeenCalled()
      expect(apiClient.getFixedDeposits).toHaveBeenCalled()
      expect(apiClient.getEPFAccounts).toHaveBeenCalled()
      expect(apiClient.getStocks).toHaveBeenCalled()
    })

    test('should handle refresh all data error', async () => {
      const error = new Error('Refresh failed')
      apiClient.getMutualFunds.mockRejectedValue(error)

      await expect(store.refreshAllData()).rejects.toThrow('Refresh failed')

      expect(store.loading.dashboard).toBe(false)
      expect(store.error.dashboard).toBe('Refresh failed')
    })

    test('should invalidate cache correctly', () => {
      store.mutualFunds = [{ id: '1' }]
      store.sips = [{ id: '1' }]
      store.fixedDeposits = [{ id: '1' }]
      store.epfAccounts = [{ id: '1' }]
      store.stocks = [{ id: '1' }]

      store.invalidateCache('mutualFunds')

      expect(store.mutualFunds).toEqual([])
      expect(store.sips).toHaveLength(1) // Should not be cleared

      store.invalidateCache('all')

      expect(store.sips).toEqual([])
      expect(store.fixedDeposits).toEqual([])
      expect(store.epfAccounts).toEqual([])
      expect(store.stocks).toEqual([])
    })

    test('should check connection health', async () => {
      apiClient.healthCheck.mockResolvedValue(true)

      const result = await store.checkConnection()

      expect(result).toBe(true)
      expect(apiClient.healthCheck).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should extract error message from different error types', () => {
      expect(store.getErrorMessage('Simple string')).toBe('Simple string')
      expect(store.getErrorMessage(new Error('Error object'))).toBe('Error object')
      expect(store.getErrorMessage({ 
        response: { data: { message: 'API error' } } 
      })).toBe('API error')
      expect(store.getErrorMessage({})).toBe('An unexpected error occurred')
    })

    test('should generate unique temp IDs', () => {
      const id1 = store.generateTempId()
      const id2 = store.generateTempId()

      expect(id1).toMatch(/^temp-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^temp-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    test('should create optimistic items correctly', () => {
      const data = { name: 'Test Item', amount: 1000 }
      const item = store.createOptimisticItem(data, 'mutualFund')

      expect(item.id).toMatch(/^temp-/)
      expect(item.name).toBe('Test Item')
      expect(item.amount).toBe(1000)
      expect(item.isOptimistic).toBe(true)
      expect(item.type).toBe('mutualFund')
      expect(item.createdAt).toBeDefined()
      expect(item.updatedAt).toBeDefined()
    })
  })

  describe('Loading and Error States', () => {
    test('should manage loading states correctly', () => {
      expect(store.loading.mutualFunds).toBe(false)

      store.setLoading('mutualFunds', true)
      expect(store.loading.mutualFunds).toBe(true)

      store.setLoading('mutualFunds', false)
      expect(store.loading.mutualFunds).toBe(false)
    })

    test('should manage error states correctly', () => {
      expect(store.error.mutualFunds).toBe(null)

      store.setError('mutualFunds', 'Test error')
      expect(store.error.mutualFunds).toBe('Test error')

      store.clearError('mutualFunds')
      expect(store.error.mutualFunds).toBe(null)
    })

    test('should clear all errors', () => {
      store.setError('mutualFunds', 'Error 1')
      store.setError('stocks', 'Error 2')
      store.setError('dashboard', 'Error 3')

      store.clearAllErrors()

      expect(store.error.mutualFunds).toBe(null)
      expect(store.error.stocks).toBe(null)
      expect(store.error.dashboard).toBe(null)
    })
  })
})