import { describe, test, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '../apiClient'

// Mock fetch globally
global.fetch = vi.fn()

describe('ApiClient', () => {
  beforeEach(() => {
    fetch.mockClear()
    localStorage.clear()
    console.error = vi.fn()
    console.warn = vi.fn()
  })

  describe('Basic HTTP Methods', () => {
    test('should make GET request successfully', async () => {
      const mockData = { data: { funds: [] } }
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.get('/test')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockData)
    })

    test('should make POST request with data', async () => {
      const mockData = { data: { id: '1', name: 'Test Fund' } }
      const postData = { name: 'Test Fund', amount: 1000 }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.post('/test', postData)
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockData)
    })

    test('should include auth token when available', async () => {
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
  })

  describe('Error Handling', () => {
    test('should handle 401 authentication errors', async () => {
      const mockAuthStore = { clearAuth: vi.fn() }
      
      // Mock dynamic import
      vi.doMock('../stores/AuthStore', () => ({
        authStore: mockAuthStore
      }))

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' })
      })

      await expect(apiClient.get('/test')).rejects.toThrow('Token expired')
    })

    test('should handle network errors with retry', async () => {
      // First two attempts fail, third succeeds
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
      expect(console.warn).toHaveBeenCalledTimes(2)
    })

    test('should handle server errors with retry', async () => {
      // First attempt fails with 500, second succeeds
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Internal server error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        })

      const result = await apiClient.get('/test')
      
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    test('should not retry on client errors (4xx)', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad request' })
      })

      await expect(apiClient.get('/test')).rejects.toThrow('Bad request')
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    test('should retry on rate limit (429)', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Rate limit exceeded' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        })

      const result = await apiClient.get('/test')
      
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })
  })

  describe('Mutual Funds API', () => {
    test('should fetch mutual funds with proper data structure', async () => {
      const mockResponse = {
        data: {
          funds: [{ id: '1', name: 'Test Fund' }],
          summary: { totalInvestment: 10000 }
        }
      }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.getMutualFunds()
      
      expect(result).toEqual({
        funds: [{ id: '1', name: 'Test Fund' }],
        summary: { totalInvestment: 10000 }
      })
    })

    test('should create mutual fund', async () => {
      const fundData = { name: 'New Fund', amount: 5000 }
      const mockResponse = { data: { id: '1', ...fundData } }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.createMutualFund(fundData)
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/mutual-funds',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(fundData)
        })
      )
      expect(result).toEqual({ id: '1', ...fundData })
    })

    test('should update mutual fund', async () => {
      const updateData = { name: 'Updated Fund' }
      const mockResponse = { data: { id: '1', ...updateData } }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.updateMutualFund('1', updateData)
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/mutual-funds/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
      )
      expect(result).toEqual({ id: '1', ...updateData })
    })

    test('should delete mutual fund', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Map([['content-type', 'application/json']])
      })

      await apiClient.deleteMutualFund('1')
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/mutual-funds/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('Health Check', () => {
    test('should return true for healthy API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true
      })

      const result = await apiClient.healthCheck()
      
      expect(result).toBe(true)
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/health')
    })

    test('should return false for unhealthy API', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await apiClient.healthCheck()
      
      expect(result).toBe(false)
    })

    test('should return false on network error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await apiClient.healthCheck()
      
      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Data Structure Handling', () => {
    test('should handle SIPs data structure', async () => {
      const mockResponse = {
        data: {
          sips: [{ id: '1', name: 'Test SIP' }]
        }
      }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.getSIPs()
      
      expect(result).toEqual([{ id: '1', name: 'Test SIP' }])
    })

    test('should handle empty data gracefully', async () => {
      const mockResponse = { data: null }
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      })

      const result = await apiClient.getSIPs()
      
      expect(result).toEqual([])
    })
  })
})