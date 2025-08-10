import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SyncStatusIndicator, SyncStatusBadge } from '../SyncStatusIndicator'

describe('SyncStatusIndicator', () => {
  it('renders with synced status', () => {
    render(
      <SyncStatusIndicator
        syncStatus="synced"
        syncType="mutual_funds"
        lastSyncAt={new Date('2024-01-01T12:00:00Z')}
      />
    )
    
    expect(screen.getByText('Synced')).toBeInTheDocument()
  })

  it('renders with failed status', () => {
    render(
      <SyncStatusIndicator
        syncStatus="failed"
        syncType="epf"
      />
    )
    
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders with in_progress status', () => {
    render(
      <SyncStatusIndicator
        syncStatus="in_progress"
        syncType="stocks"
      />
    )
    
    expect(screen.getByText('Syncing')).toBeInTheDocument()
  })
})

describe('SyncStatusBadge', () => {
  it('renders badge with correct status', () => {
    render(
      <SyncStatusBadge
        syncStatus="synced"
        syncType="mutual_funds"
      />
    )
    
    expect(screen.getByText('Synced')).toBeInTheDocument()
  })

  it('shows investment type icon', () => {
    render(
      <SyncStatusBadge
        syncStatus="synced"
        syncType="mutual_funds"
      />
    )
    
    // Check for the mutual funds emoji
    expect(screen.getByText('📈')).toBeInTheDocument()
  })
})