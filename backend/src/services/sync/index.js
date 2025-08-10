/**
 * Core Sync Service Infrastructure
 * 
 * This module exports all the essential components for the auto-sync integration:
 * - Base interfaces and abstract classes
 * - Type definitions and factory functions
 * - Credential management service
 * - Base sync service implementation
 */

// Interfaces and Types
const {
  DataProvider,
  SyncService,
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
} = require('./interfaces');

// Security Services
const CredentialService = require('./security/CredentialService');

// Base Services
const BaseSyncService = require('./base/BaseSyncService');

// Sync Service Implementations
const MutualFundSyncService = require('./MutualFundSyncService');
const EPFSyncService = require('./EPFSyncService');

// Data Providers
const AMFIDataProvider = require('./providers/AMFIDataProvider');
const EPFODataProvider = require('./providers/EPFODataProvider');

// Error Recovery Services
const EPFErrorRecoveryService = require('./EPFErrorRecoveryService');

// Notification Services
const EPFNotificationService = require('./EPFNotificationService');

module.exports = {
  // Abstract Classes/Interfaces
  DataProvider,
  SyncService,
  BaseSyncService,
  
  // Sync Service Implementations
  MutualFundSyncService,
  EPFSyncService,
  
  // Data Providers
  AMFIDataProvider,
  EPFODataProvider,
  
  // Support Services
  CredentialService,
  EPFErrorRecoveryService,
  EPFNotificationService,
  
  // Factory Functions
  createSyncResult,
  createSyncOptions,
  createSyncError,
  createSyncWarning,
  createRecoveryAction,
  
  // Validation Functions
  validateSyncResult,
  validateSyncOptions,
  
  // Constants and Enums
  SyncErrorTypes,
  SyncStatus,
  SyncFrequency,
  InvestmentTypes,
  DataSources,
  RecoveryActions
};