/**
 * Interface for sync services that handle automated data synchronization
 * All sync services must implement these methods for consistent behavior
 */
class SyncService {
  constructor() {
    if (this.constructor === SyncService) {
      throw new Error('SyncService is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Get the sync type identifier for this service
   * @returns {string} Sync type (e.g., 'mutual_funds', 'epf', 'stocks')
   */
  get syncType() {
    throw new Error('syncType getter must be implemented by subclass');
  }

  /**
   * Synchronize all investments of this type for a user
   * @param {string} userId - User ID to sync data for
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async sync(userId, options = {}) {
    throw new Error('sync method must be implemented by subclass');
  }

  /**
   * Synchronize a single investment for a user
   * @param {string} userId - User ID
   * @param {string} investmentId - Specific investment ID to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async syncSingle(userId, investmentId, options = {}) {
    throw new Error('syncSingle method must be implemented by subclass');
  }

  /**
   * Validate sync configuration for this service
   * @param {Object} config - Sync configuration to validate
   * @returns {boolean} True if configuration is valid
   */
  validateConfiguration(config) {
    throw new Error('validateConfiguration method must be implemented by subclass');
  }

  /**
   * Get the default sync configuration for this service
   * @returns {Object} Default configuration object
   */
  getDefaultConfiguration() {
    return {
      isEnabled: false,
      syncFrequency: 'daily',
      preferredSource: null,
      fallbackSource: null,
      notifyOnSuccess: false,
      notifyOnFailure: true
    };
  }

  /**
   * Check if sync is currently enabled for a user
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} True if sync is enabled
   */
  async isSyncEnabled(userId) {
    // This will be implemented in the base class
    throw new Error('isSyncEnabled method must be implemented by subclass');
  }

  /**
   * Get sync status for a user's investments of this type
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync status information
   */
  async getSyncStatus(userId) {
    throw new Error('getSyncStatus method must be implemented by subclass');
  }

  /**
   * Handle sync errors and determine recovery actions
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the sync operation
   * @returns {Promise<Object>} Recovery action to take
   */
  async handleSyncError(error, context) {
    throw new Error('handleSyncError method must be implemented by subclass');
  }
}

module.exports = SyncService;