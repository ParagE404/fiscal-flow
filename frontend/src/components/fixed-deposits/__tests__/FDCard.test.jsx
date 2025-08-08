import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FDCard } from '../FDCard'

// Mock the utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount) => `₹${amount.toLocaleString('en-IN')}`,
  formatPercentage: (percentage) => `${percentage.toFixed(2)}%`,
  getValueColor: (value) => value > 0 ? 'text-success-600' : value < 0 ? 'text-destructive-600' : 'text-muted-foreground'
}))

const mockFD = {
  id: '1',
  bankName: 'HDFC Bank',
  investedAmount: 100000,
  currentValue: 105000,
  maturityAmount: 110000,
  interestRate: 6.5,
  type: 'Simple',
  startDate: '2024-01-01T00:00:00.000Z',
  maturityDate: '2025-01-01T00:00:00.000Z',
  daysRemaining: 180,
  progressPercentage: 50.7,
  interestEarned: 5000,
  isMatured: false,
  isMaturingSoon: false
}

describe('FDCard', () => {
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders FD card with correct information', () => {
    render(
      <FDCard 
        fixedDeposit={mockFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    expect(screen.getByText('HDFC Bank')).toBeInTheDocument()
    expect(screen.getByText('Simple Interest')).toBeInTheDocument()
    expect(screen.getByText('6.50% p.a.')).toBeInTheDocument()
    expect(screen.getByText('₹100,000')).toBeInTheDocument()
    expect(screen.getByText('₹105,000')).toBeInTheDocument()
    expect(screen.getByText('₹110,000')).toBeInTheDocument()
    expect(screen.getByText('₹5,000')).toBeInTheDocument()
    expect(screen.getByText('180 days left')).toBeInTheDocument()
  })

  test('shows loading state correctly', () => {
    render(<FDCard loading={true} />)
    
    expect(screen.getByTestId('fd-card-loading') || document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  test('calls onEdit when edit button is clicked', () => {
    render(
      <FDCard 
        fixedDeposit={mockFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledWith(mockFD)
  })

  test('calls onDelete when delete button is clicked', () => {
    render(
      <FDCard 
        fixedDeposit={mockFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith(mockFD)
  })

  test('shows matured status for matured FDs', () => {
    const maturedFD = {
      ...mockFD,
      isMatured: true,
      daysRemaining: 0
    }

    render(
      <FDCard 
        fixedDeposit={maturedFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    expect(screen.getByText('Matured')).toBeInTheDocument()
  })

  test('shows maturing soon status for FDs maturing soon', () => {
    const maturingSoonFD = {
      ...mockFD,
      isMaturingSoon: true,
      daysRemaining: 15
    }

    render(
      <FDCard 
        fixedDeposit={maturingSoonFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    expect(screen.getByText('Maturing Soon')).toBeInTheDocument()
    expect(screen.getByText('15 days left')).toBeInTheDocument()
  })
})