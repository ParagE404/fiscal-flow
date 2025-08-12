/**
 * Export all sync service interfaces and types
 */

const DataProvider = require('./DataProvider');
const SyncService = require('./SyncService');
const {
  createSyncResult,
  createSyncOptions,
  createSyncError,
  createSyncWarning,
  createRecoveryAction,
  validateSyncResult,
  validateSyncOptions,
  SyncErrorTypes,
  SyncStatus,
  SyncFrequency,
  InvestmentTypes,
  DataSources,
  RecoveryActions
} = require('../types/SyncTypes');

module.exports = {
  // Abstract classes/interfaces
  DataProvider,
  SyncService,
  
  // Factory functions
  createSyncResult,
  createSyncOptions,
  createSyncError,
  createSyncWarning,
  createRecoveryAction,
  
  // Validation functions
  validateSyncResult,
  validateSyncOptions,
  
  // Enumerations
  SyncErrorTypes,
  SyncStatus,
  SyncFrequency,
  InvestmentTypes,
  DataSources,
  RecoveryActions
};