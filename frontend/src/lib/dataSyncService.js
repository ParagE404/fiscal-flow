import { portfolioStore } from '../stores/PortfolioStore'

/**
 * Data Synchronization Service
 * Handles real-time data synchronization, conflict resolution, and cache management
 */
class DataSyncService {
  constructor() {
    this.syncQueue = []
    this.isProcessingQueue = false
    this.conflictResolutionStrategy = 'server-wins' // 'server-wins', 'client-wins', 'merge'
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  /**
   * Initialize the sync service
   */
  initialize() {
    this.setupEventListeners()
    this.startPeriodicSync()
    console.log('Data Sync Service initialized')
  }

  /**
   * Setup event listeners for data changes
   */
  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', this.cleanup.bind(this))
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    console.log('Connection restored, syncing data...')
    try {
      await this.syncAllData()
    } catch (error) {
      console.error('Failed to sync data after coming online:', error)
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Connection lost, enabling offline mode')
    // Could implement offline queue here
  }

  /**
   * Handle visibility change
   */
  async handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // User returned to tab, check if data needs refresh
      const syncStatus = portfolioStore.getSyncStatus()
      if (syncStatus.lastSync) {
        const lastSync = new Date(syncStatus.lastSync)
        const now = new Date()
        const timeDiff = now - lastSync
        const tenMinutes = 10 * 60 * 1000
        
        if (timeDiff > tenMinutes) {
          console.log('Data is stale, refreshing...')
          try {
            await this.syncAllData()
          } catch (error) {
            console.error('Failed to refresh stale data:', error)
          }
        }
      }
    }
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync(intervalMinutes = 10) {
    setInterval(async () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        try {
          await this.syncAllData()
        } catch (error) {
          console.warn('Periodic sync failed:', error.message)
        }
      }
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Sync all data with conflict resolution
   */
  async syncAllData() {
    try {
      // Get current local data version
      const localVersion = portfolioStore.dataVersion
      
      // Fetch fresh data from server
      await portfolioStore.refreshAllData(true)
      
      // Check if data was updated during sync
      const newVersion = portfolioStore.dataVersion
      if (newVersion !== localVersion + 1) {
        console.log('Data version mismatch detected, validating consistency...')
        await this.validateAndResolveConflicts()
      }
      
      console.log('Data sync completed successfully')
      
    } catch (error) {
      console.error('Data sync failed:', error)
      throw error
    }
  }

  /**
   * Validate data and resolve conflicts
   */
  async validateAndResolveConflicts() {
    const validation = portfolioStore.validateDataConsistency()
    
    if (!validation.valid) {
      console.warn('Data consistency issues detected:', validation.issues)
      
      // Clean up orphaned optimistic updates
      portfolioStore.cleanupOptimisticUpdates()
      
      // Force refresh to get clean data from server
      await portfolioStore.forceRefresh()
      
      // Validate again
      const revalidation = portfolioStore.validateDataConsistency()
      if (!revalidation.valid) {
        console.error('Data consistency issues persist after cleanup:', revalidation.issues)
        throw new Error('Data consistency validation failed')
      }
    }
  }

  /**
   * Queue operation for synchronization
   */
  queueOperation(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: new Date().toISOString(),
      retries: 0
    })
    
    this.processQueue()
  }

  /**
   * Process the synchronization queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.syncQueue.length > 0) {
      const operation = this.syncQueue.shift()
      
      try {
        await this.executeOperation(operation)
        console.log(`Sync operation completed: ${operation.type}`)
      } catch (error) {
        console.error(`Sync operation failed: ${operation.type}`, error)
        
        // Retry logic
        if (operation.retries < this.maxRetries) {
          operation.retries++
          this.syncQueue.unshift(operation) // Put back at front
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * operation.retries))
        } else {
          console.error(`Max retries exceeded for operation: ${operation.type}`)
          // Could emit event for UI notification
        }
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Execute a sync operation
   */
  async executeOperation(operation) {
    const { type, data, id } = operation

    switch (type) {
      case 'create':
        return await this.handleCreate(data)
      case 'update':
        return await this.handleUpdate(id, data)
      case 'delete':
        return await this.handleDelete(id, data.entityType)
      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Handle create operation
   */
  async handleCreate(data) {
    const { entityType, ...entityData } = data
    
    switch (entityType) {
      case 'mutualFund':
        return await portfolioStore.addMutualFund(entityData)
      case 'sip':
        return await portfolioStore.addSIP(entityData)
      case 'fixedDeposit':
        return await portfolioStore.addFixedDeposit(entityData)
      case 'epfAccount':
        return await portfolioStore.addEPFAccount(entityData)
      case 'stock':
        return await portfolioStore.addStock(entityData)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Handle update operation
   */
  async handleUpdate(id, data) {
    const { entityType, ...entityData } = data
    
    switch (entityType) {
      case 'mutualFund':
        return await portfolioStore.updateMutualFund(id, entityData)
      case 'sip':
        return await portfolioStore.updateSIP(id, entityData)
      case 'fixedDeposit':
        return await portfolioStore.updateFixedDeposit(id, entityData)
      case 'epfAccount':
        return await portfolioStore.updateEPFAccount(id, entityData)
      case 'stock':
        return await portfolioStore.updateStock(id, entityData)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Handle delete operation
   */
  async handleDelete(id, entityType) {
    switch (entityType) {
      case 'mutualFund':
        return await portfolioStore.deleteMutualFund(id)
      case 'sip':
        return await portfolioStore.deleteSIP(id)
      case 'fixedDeposit':
        return await portfolioStore.deleteFixedDeposit(id)
      case 'epfAccount':
        return await portfolioStore.deleteEPFAccount(id)
      case 'stock':
        return await portfolioStore.deleteStock(id)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessingQueue,
      isOnline: navigator.onLine,
      lastSync: portfolioStore.lastSyncTimestamp,
      dataVersion: portfolioStore.dataVersion
    }
  }

  /**
   * Force immediate sync
   */
  async forcSync() {
    await this.syncAllData()
    await this.processQueue()
  }

  /**
   * Clear sync queue
   */
  clearQueue() {
    this.syncQueue = []
    console.log('Sync queue cleared')
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearQueue()
    portfolioStore.stopAutoRefresh()
    console.log('Data Sync Service cleaned up')
  }
}

// Create singleton instance
export const dataSyncService = new DataSyncService()

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  dataSyncService.initialize()
}