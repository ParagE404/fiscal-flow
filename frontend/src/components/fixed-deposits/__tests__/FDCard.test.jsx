import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FDCard } from '../FDCard'

// Mock the utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
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
    expect(screen.getByText(/Simple Interest/)).toBeInTheDocument()
    expect(screen.getByText(/6\.50% p\.a\./)).toBeInTheDocument()
    expect(screen.getByText('₹1,00,000')).toBeInTheDocument()
    expect(screen.getByText('₹1,05,000')).toBeInTheDocument()
    expect(screen.getByText('₹1,10,000')).toBeInTheDocument()
    expect(screen.getByText('₹5,000')).toBeInTheDocument()
    expect(screen.getByText('180 days left')).toBeInTheDocument()
  })

  test('shows loading state correctly', () => {
    render(<FDCard loading={true} />)
    
    // Check for loading state by looking for shimmer elements
    expect(document.querySelector('.shimmer')).toBeInTheDocument()
  })

  test('calls onEdit when edit button is clicked', () => {
    render(
      <FDCard 
        fixedDeposit={mockFD} 
        onEdit={mockOnEdit} 
        onDelete={mockOnDelete} 
      />
    )

    // Find the edit button by looking for the edit icon
    const buttons = screen.getAllByRole('button')
    const editButton = buttons.find(button => 
      button.querySelector('svg.lucide-square-pen')
    )
    
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

    // Find the delete button by looking for the trash icon
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(button => 
      button.querySelector('svg.lucide-trash2')
    )
    
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

    expect(screen.getAllByText('Matured')).toHaveLength(2)
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