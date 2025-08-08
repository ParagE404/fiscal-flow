import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { UserProvider } from '../../../contexts/UserContext'
import { StoreProvider } from '../../../stores/StoreContext'

// Mock the UserContext
const mockUserContext = {
  isAuthReady: true,
  isAuthenticated: false,
  needsEmailVerification: false,
  isInitializing: false,
}

vi.mock('../../../contexts/UserContext', () => ({
  ...vi.importActual('../../../contexts/UserContext'),
  useUser: () => mockUserContext,
}))

const TestComponent = () => <div>Protected Content</div>

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <StoreProvider>
        <UserProvider>
          {component}
        </UserProvider>
      </StoreProvider>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  test('redirects to login when not authenticated', () => {
    mockUserContext.isAuthenticated = false
    mockUserContext.isAuthReady = true
    mockUserContext.isInitializing = false

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    // Should redirect to login, so protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  test('shows loading spinner when initializing', () => {
    mockUserContext.isInitializing = true
    mockUserContext.isAuthReady = false

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders protected content when authenticated', () => {
    mockUserContext.isAuthenticated = true
    mockUserContext.isAuthReady = true
    mockUserContext.isInitializing = false
    mockUserContext.needsEmailVerification = false

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('redirects to email verification when email verification is required', () => {
    mockUserContext.isAuthenticated = true
    mockUserContext.isAuthReady = true
    mockUserContext.isInitializing = false
    mockUserContext.needsEmailVerification = true

    renderWithProviders(
      <ProtectedRoute requireEmailVerification={true}>
        <TestComponent />
      </ProtectedRoute>
    )

    // Should redirect to email verification, so protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})