import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoreProvider } from '../../stores/StoreContext'
import { MutualFundsPage } from '../../pages/MutualFunds'
import { apiClient } from '../../lib/apiClient'

// Mock the API client
jest.mock('../../lib/apiClient')

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn()
  }
}))

// Mock router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}))

describe('Portfolio Integration Flow', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses by default
    apiClient.getMutualFunds.mockResolvedValue({
      funds: [],
      summary: {
        totalInvestment: 0,
        totalCurrentValue: 0,
        avgCAGR: 0
      }
    })
    apiClient.getSIPs.mockResolvedValue([])
  })

  const renderWithStore = (component) => {
    return render(
      <StoreProvider>
        {component}
      </StoreProvider>
    )
  }

  describe('Mutual Fund CRUD Operations', () => {
    test('should complete full mutual fund lifecycle - create, read, update, delete', async () => {
      // Mock API responses for the full lifecycle
      const newFund = {
        id: '1',
        name: 'HDFC Top 100 Fund',
        category: 'Large Cap',
        riskLevel: 'Moderate',
        rating: 4,
        investedAmount: 10000,
        currentValue: 12000,
        cagr: 15.5
      }

      const updatedFund = {
        ...newFund,
        currentValue: 13000,
        cagr: 18.2
      }

      // Initial load - empty state
      renderWithStore(<MutualFundsPage />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Total Invested')).toBeInTheDocument()
      })

      // Verify empty state
      expect(screen.getByText('No mutual funds found')).toBeInTheDocument()

      // CREATE: Add new mutual fund
      apiClient.createMutualFund.mockResolvedValue(newFund)
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [newFund],
        summary: {
          totalInvestment: 10000,
          totalCurrentValue: 12000,
          avgCAGR: 15.5
        }
      })

      // Click Add Fund button
      const addButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(addButton)

      // Fill out the form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/fund name/i)
      const categorySelect = screen.getByLabelText(/category/i)
      const riskSelect = screen.getByLabelText(/risk level/i)
      const ratingInput = screen.getByLabelText(/rating/i)
      const investedInput = screen.getByLabelText(/invested amount/i)
      const currentInput = screen.getByLabelText(/current value/i)

      await user.type(nameInput, 'HDFC Top 100 Fund')
      await user.selectOptions(categorySelect, 'Large Cap')
      await user.selectOptions(riskSelect, 'Moderate')
      await user.type(ratingInput, '4')
      await user.type(investedInput, '10000')
      await user.type(currentInput, '12000')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton)

      // Verify API call
      await waitFor(() => {
        expect(apiClient.createMutualFund).toHaveBeenCalledWith({
          name: 'HDFC Top 100 Fund',
          category: 'Large Cap',
          riskLevel: 'Moderate',
          rating: 4,
          investedAmount: 10000,
          currentValue: 12000
        })
      })

      // READ: Verify fund appears in list
      await waitFor(() => {
        expect(screen.getByText('HDFC Top 100 Fund')).toBeInTheDocument()
        expect(screen.getByText('₹10,000')).toBeInTheDocument()
        expect(screen.getByText('₹12,000')).toBeInTheDocument()
        expect(screen.getByText('15.5%')).toBeInTheDocument()
      })

      // UPDATE: Edit the fund
      apiClient.updateMutualFund.mockResolvedValue(updatedFund)
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [updatedFund],
        summary: {
          totalInvestment: 10000,
          totalCurrentValue: 13000,
          avgCAGR: 18.2
        }
      })

      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      // Update current value
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const currentValueInput = screen.getByDisplayValue('12000')
      await user.clear(currentValueInput)
      await user.type(currentValueInput, '13000')

      const updateButton = screen.getByRole('button', { name: /update fund/i })
      await user.click(updateButton)

      // Verify update API call
      await waitFor(() => {
        expect(apiClient.updateMutualFund).toHaveBeenCalledWith('1', {
          currentValue: 13000
        })
      })

      // Verify updated values appear
      await waitFor(() => {
        expect(screen.getByText('₹13,000')).toBeInTheDocument()
        expect(screen.getByText('18.2%')).toBeInTheDocument()
      })

      // DELETE: Remove the fund
      apiClient.deleteMutualFund.mockResolvedValue()
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [],
        summary: {
          totalInvestment: 0,
          totalCurrentValue: 0,
          avgCAGR: 0
        }
      })

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Verify delete API call
      await waitFor(() => {
        expect(apiClient.deleteMutualFund).toHaveBeenCalledWith('1')
      })

      // Verify fund is removed from list
      await waitFor(() => {
        expect(screen.queryByText('HDFC Top 100 Fund')).not.toBeInTheDocument()
        expect(screen.getByText('No mutual funds found')).toBeInTheDocument()
      })
    })

    test('should handle API errors gracefully during operations', async () => {
      renderWithStore(<MutualFundsPage />)

      // Mock API error
      const error = new Error('Network connection failed')
      apiClient.createMutualFund.mockRejectedValue(error)

      // Try to add a fund
      const addButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(addButton)

      // Fill minimal form data
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/fund name/i)
      await user.type(nameInput, 'Test Fund')

      const submitButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton)

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/network connection failed/i)).toBeInTheDocument()
      })

      // Verify optimistic update was reverted
      expect(screen.queryByText('Test Fund')).not.toBeInTheDocument()
    })

    test('should show loading states during API operations', async () => {
      // Mock slow API response
      let resolveCreate
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })
      apiClient.createMutualFund.mockReturnValue(createPromise)

      renderWithStore(<MutualFundsPage />)

      const addButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(addButton)

      // Fill and submit form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText(/fund name/i)
      await user.type(nameInput, 'Test Fund')

      const submitButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton)

      // Verify loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()

      // Resolve the promise
      resolveCreate({
        id: '1',
        name: 'Test Fund',
        investedAmount: 1000,
        currentValue: 1000
      })

      await waitFor(() => {
        expect(screen.queryByText(/saving/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Synchronization', () => {
    test('should maintain data consistency across operations', async () => {
      const fund1 = {
        id: '1',
        name: 'Fund 1',
        investedAmount: 5000,
        currentValue: 6000
      }
      const fund2 = {
        id: '2',
        name: 'Fund 2',
        investedAmount: 3000,
        currentValue: 3500
      }

      // Initial state with two funds
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [fund1, fund2],
        summary: {
          totalInvestment: 8000,
          totalCurrentValue: 9500,
          avgCAGR: 12.5
        }
      })

      renderWithStore(<MutualFundsPage />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Fund 1')).toBeInTheDocument()
        expect(screen.getByText('Fund 2')).toBeInTheDocument()
      })

      // Verify summary calculations
      expect(screen.getByText('₹8,000')).toBeInTheDocument() // Total invested
      expect(screen.getByText('₹9,500')).toBeInTheDocument() // Current value

      // Update one fund
      const updatedFund1 = {
        ...fund1,
        currentValue: 7000
      }

      apiClient.updateMutualFund.mockResolvedValue(updatedFund1)
      apiClient.getMutualFunds.mockResolvedValue({
        funds: [updatedFund1, fund2],
        summary: {
          totalInvestment: 8000,
          totalCurrentValue: 10500,
          avgCAGR: 15.2
        }
      })

      // Perform update operation
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const currentValueInput = screen.getByDisplayValue('6000')
      await user.clear(currentValueInput)
      await user.type(currentValueInput, '7000')

      const updateButton = screen.getByRole('button', { name: /update fund/i })
      await user.click(updateButton)

      // Verify data synchronization
      await waitFor(() => {
        expect(screen.getByText('₹10,500')).toBeInTheDocument() // Updated total
      })

      // Verify both funds are still present with correct data
      expect(screen.getByText('Fund 1')).toBeInTheDocument()
      expect(screen.getByText('Fund 2')).toBeInTheDocument()
    })

    test('should handle concurrent operations correctly', async () => {
      renderWithStore(<MutualFundsPage />)

      // Mock multiple concurrent API calls
      const fund1Promise = Promise.resolve({
        id: '1',
        name: 'Fund 1',
        investedAmount: 1000,
        currentValue: 1100
      })
      const fund2Promise = Promise.resolve({
        id: '2',
        name: 'Fund 2',
        investedAmount: 2000,
        currentValue: 2200
      })

      apiClient.createMutualFund
        .mockReturnValueOnce(fund1Promise)
        .mockReturnValueOnce(fund2Promise)

      // Start two concurrent operations
      const addButton = screen.getByRole('button', { name: /add fund/i })
      
      // First operation
      await user.click(addButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const nameInput1 = screen.getByLabelText(/fund name/i)
      await user.type(nameInput1, 'Fund 1')
      
      const submitButton1 = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton1)

      // Second operation (before first completes)
      await user.click(addButton)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const nameInput2 = screen.getByLabelText(/fund name/i)
      await user.type(nameInput2, 'Fund 2')
      
      const submitButton2 = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton2)

      // Wait for both operations to complete
      await Promise.all([fund1Promise, fund2Promise])

      // Verify both operations succeeded
      await waitFor(() => {
        expect(apiClient.createMutualFund).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Form Validation Integration', () => {
    test('should validate form data before API submission', async () => {
      renderWithStore(<MutualFundsPage />)

      const addButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton)

      // Verify validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/fund name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      })

      // Verify API was not called
      expect(apiClient.createMutualFund).not.toHaveBeenCalled()

      // Fill required fields
      const nameInput = screen.getByLabelText(/fund name/i)
      await user.type(nameInput, 'Valid Fund Name')

      const categorySelect = screen.getByLabelText(/category/i)
      await user.selectOptions(categorySelect, 'Large Cap')

      // Submit again
      await user.click(submitButton)

      // Verify validation passes and API is called
      await waitFor(() => {
        expect(apiClient.createMutualFund).toHaveBeenCalled()
      })
    })

    test('should validate numeric inputs correctly', async () => {
      renderWithStore(<MutualFundsPage />)

      const addButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Enter invalid numeric values
      const investedInput = screen.getByLabelText(/invested amount/i)
      const ratingInput = screen.getByLabelText(/rating/i)

      await user.type(investedInput, '-1000') // Negative amount
      await user.type(ratingInput, '6') // Rating > 5

      const submitButton = screen.getByRole('button', { name: /add fund/i })
      await user.click(submitButton)

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
        expect(screen.getByText(/rating must be between 1 and 5/i)).toBeInTheDocument()
      })

      // Verify API was not called
      expect(apiClient.createMutualFund).not.toHaveBeenCalled()
    })
  })
})