import { useState, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { usePortfolioStore } from '../stores/StoreContext'
import { dataSyncService } from '../lib/dataSyncService.js'

/**
 * Custom hook for managing data synchronization in components
 * Provides real-time sync status and control methods
 */
export function useDataSync() {
  const portfolioStore = usePortfolioStore()
  const [syncStats, setSyncStats] = useState(dataSyncService.getSyncStats())
  const [lastError, setLastError] = useState(null)

  // Update sync stats periodically
  useEffect(() => {
    const updateStats = () => {
      setSyncStats(dataSyncService.getSyncStats())
    }

    const interval = setInterval(updateStats, 1000)
    return () => clearInterval(interval)
  }, [])

  // Monitor portfolio store errors
  useEffect(() => {
    const errors = Object.values(portfolioStore.error).filter(error => error !== null)
    if (errors.length > 0) {
      setLastError(errors[0])
    } else {
      setLastError(null)
    }
  }, [portfolioStore.error])

  // Force sync function
  const forceSync = useCallback(async () => {
    try {
      setLastError(null)
      await dataSyncService.forcSync()
    } catch (error) {
      setLastError(error.message)
      throw error
    }
  }, [])

  // Refresh specific data type
  const refreshDataType = useCallback(async (type) => {
    try {
      setLastError(null)
      await portfolioStore.refreshDataType(type)
    } catch (error) {
      setLastError(error.message)
      throw error
    }
  }, [portfolioStore])

  // Clear sync queue
  const clearSyncQueue = useCallback(() => {
    dataSyncService.clearQueue()
    setSyncStats(dataSyncService.getSyncStats())
  }, [])

  // Get detailed sync status
  const getSyncStatus = useCallback(() => {
    return {
      ...portfolioStore.getSyncStatus(),
      ...syncStats,
      lastError
    }
  }, [portfolioStore, syncStats, lastError])

  // Check if data is stale
  const isDataStale = useCallback((maxAgeMinutes = 10) => {
    if (!syncStats.lastSync) return true
    
    const lastSync = new Date(syncStats.lastSync)
    const now = new Date()
    const ageMinutes = (now - lastSync) / (1000 * 60)
    
    return ageMinutes > maxAgeMinutes
  }, [syncStats.lastSync])

  // Validate data consistency
  const validateData = useCallback(() => {
    return portfolioStore.validateDataConsistency()
  }, [portfolioStore])

  // Clean up optimistic updates
  const cleanupOptimisticUpdates = useCallback(() => {
    portfolioStore.cleanupOptimisticUpdates()
  }, [portfolioStore])

  return {
    // Status
    syncStats,
    lastError,
    isOnline: syncStats.isOnline,
    isSyncing: syncStats.isProcessing || portfolioStore.syncInProgress,
    isDataStale: isDataStale(),
    
    // Actions
    forceSync,
    refreshDataType,
    clearSyncQueue,
    validateData,
    cleanupOptimisticUpdates,
    
    // Utilities
    getSyncStatus,
    isDataStale: isDataStale
  }
}

/**
 * Higher-order component for automatic data synchronization
 */
export function withDataSync(WrappedComponent) {
  return observer(function DataSyncWrapper(props) {
    const dataSync = useDataSync()
    
    return (
      <WrappedComponent
        {...props}
        dataSync={dataSync}
      />
    )
  })
}

/**
 * Hook for monitoring specific data type sync status
 */
export function useDataTypeSync(dataType) {
  const portfolioStore = usePortfolioStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await portfolioStore.refreshDataType(dataType)
    } catch (error) {
      console.error(`Failed to refresh ${dataType}:`, error)
      throw error
    } finally {
      setIsRefreshing(false)
    }
  }, [portfolioStore, dataType])

  const isLoading = portfolioStore.loading[dataType] || isRefreshing
  const error = portfolioStore.error[dataType]
  const hasData = portfolioStore[dataType]?.length > 0

  return {
    isLoading,
    error,
    hasData,
    refresh,
    data: portfolioStore[dataType]
  }
}

/**
 * Hook for optimistic updates with automatic rollback
 */
export function useOptimisticUpdate() {
  const [pendingUpdates, setPendingUpdates] = useState(new Map())

  const performOptimisticUpdate = useCallback(async (
    optimisticUpdate,
    actualUpdate,
    rollbackUpdate
  ) => {
    const updateId = Date.now().toString()
    
    try {
      // Apply optimistic update
      optimisticUpdate()
      setPendingUpdates(prev => new Map(prev).set(updateId, { rollbackUpdate }))
      
      // Perform actual update
      const result = await actualUpdate()
      
      // Remove from pending updates on success
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(updateId)
        return newMap
      })
      
      return result
      
    } catch (error) {
      // Rollback optimistic update on failure
      const update = pendingUpdates.get(updateId)
      if (update) {
        update.rollbackUpdate()
        setPendingUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(updateId)
          return newMap
        })
      }
      
      throw error
    }
  }, [pendingUpdates])

  const hasPendingUpdates = pendingUpdates.size > 0

  return {
    performOptimisticUpdate,
    hasPendingUpdates,
    pendingCount: pendingUpdates.size
  }
}