import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SyncSettings } from '../SyncSettings'
import { apiClient } from '@/lib/apiClient'

// Mock the API client
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('SyncSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock API responses
    apiClient.get.mockImplementation((url) => {
      if (url === '/api/sync/config') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/sync/credentials/status') {
        return Promise.resolve({ data: {} })
      }
      if (url === '/api/sync/status') {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it('renders sync settings page', async () => {
    render(<SyncSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Auto-Sync Settings')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Mutual Funds')).toBeInTheDocument()
    expect(screen.getByText('EPF Accounts')).toBeInTheDocument()
    expect(screen.getByText('Stocks & ETFs')).toBeInTheDocument()
  })

  it('displays investment types with correct descriptions', async () => {
    render(<SyncSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Daily NAV updates from AMFI')).toBeInTheDocument()
      expect(screen.getByText('Monthly balance updates from EPFO')).toBeInTheDocument()
      expect(screen.getByText('Hourly price updates during market hours')).toBeInTheDocument()
    })
  })

  it('shows credential management section', async () => {
    render(<SyncSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Credential Management')).toBeInTheDocument()
      expect(screen.getByText('Manage Credentials')).toBeInTheDocument()
    })
  })

  it('shows notification settings section', async () => {
    render(<SyncSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument()
      expect(screen.getByText('Configure Notifications')).toBeInTheDocument()
    })
  })

  it('opens credential management modal when clicked', async () => {
    render(<SyncSettings />)
    
    await waitFor(() => {
      const manageCredentialsButton = screen.getByText('Manage Credentials')
      fireEvent.click(manageCredentialsButton)
    })
    
    // The modal should be visible (though we're not testing the full modal content here)
    expect(screen.getAllByText('Credential Management')).toHaveLength(3)
  })

  it('handles sync configuration updates', async () => {
    const mockConfig = {
      investmentType: 'mutual_funds',
      isEnabled: true,
      syncFrequency: 'daily',
      preferredSource: 'amfi'
    }

    apiClient.put.mockResolvedValue({ data: mockConfig })

    render(<SyncSettings />)
    
    await waitFor(() => {
      const switches = screen.getAllByRole('switch')
      if (switches.length > 0) {
        fireEvent.click(switches[0])
      }
    })

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/sync/config', expect.any(Object))
    })
  })

  it('handles manual sync trigger', async () => {
    apiClient.post.mockResolvedValue({ 
      data: { 
        success: true, 
        recordsProcessed: 5, 
        recordsUpdated: 3 
      } 
    })

    render(<SyncSettings />)
    
    await waitFor(() => {
      const syncButtons = screen.getAllByText('Sync Now')
      if (syncButtons.length > 0) {
        fireEvent.click(syncButtons[0])
      }
    })

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/sync/mutual_funds')
    })
  })
})