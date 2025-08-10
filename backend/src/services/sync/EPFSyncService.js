const { PrismaClient } = require('@prisma/client');
const BaseSyncService = require('./base/BaseSyncService');
const EPFODataProvider = require('./providers/EPFODataProvider');
const EPFErrorRecoveryService = require('./EPFErrorRecoveryService');
const EPFNotificationService = require('./EPFNotificationService');
const {
  createSyncResult,
  createSyncError,
  createSyncWarning,
  SyncErrorTypes,
  SyncStatus,
  InvestmentTypes,
  DataSources,
  RecoveryActions
} = require('./types/SyncTypes');

const prisma = new PrismaClient();

/**
 * EPF Sync Service for synchronizing EPF account data
 * Handles multiple UAN accounts per user and aggregates contribution data
 */
class EPFSyncService extends BaseSyncService {
  constructor() {
    super();
    this.epfoProvider = new EPFODataProvider();
    this.errorRecoveryService = new EPFErrorRecoveryService();
    this.notificationService = new EPFNotificationService();
    this.defaultSource = DataSources.EPFO;
    
    // EPF-specific configuration
    this.maxAccountsPerUser = 10; // Reasonable limit for EPF accounts per user
    this.contributionValidationThreshold = 1000000; // 10 lakh rupees - flag if monthly contribution exceeds this
    this.balanceValidationThreshold = 50000000; // 5 crore rupees - flag if total balance exceeds this
  }

  /**
   * Get the sync type identifier for this service
   * @returns {string} Sync type
   */
  get syncType() {
    return InvestmentTypes.EPF;
  }

  /**
   * Synchronize all EPF accounts for a user
   * @param {string} userId - User ID to sync data for
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async sync(userId, options = {}) {
    const startTime = Date.now();
    const result = createSyncResult({
      source: options.source || this.defaultSource,
      startTime: new Date()
    });

    try {
      // Check if sync is enabled for this user
      if (!options.force && !(await this.isSyncEnabled(userId))) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Get user's EPF accounts
      const epfAccounts = await this.getUserEPFAccounts(userId);
      
      if (epfAccounts.length === 0) {
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Get encrypted credentials
      const credentials = await this.credentialService.getCredentials(userId, 'epfo');
      if (!credentials) {
        throw createSyncError({
          type: SyncErrorTypes.CREDENTIAL_ERROR,
          message: 'EPF credentials not configured for user'
        });
      }

      // Validate credentials
      if (!credentials.uan || !credentials.password) {
        throw createSyncError({
          type: SyncErrorTypes.CREDENTIAL_ERROR,
          message: 'Invalid EPF credentials - UAN and password required'
        });
      }

      // Check if EPFO service is available
      const isAvailable = await this.epfoProvider.isAvailable();
      if (!isAvailable) {
        throw createSyncError({
          type: SyncErrorTypes.SERVICE_UNAVAILABLE,
          message: 'EPFO portal is currently unavailable'
        });
      }

      // Prepare identifiers for data fetching
      const identifiers = epfAccounts
        .map(account => account.uan || account.pfNumber)
        .filter(Boolean);

      if (identifiers.length === 0) {
        throw createSyncError({
          type: SyncErrorTypes.CONFIGURATION_ERROR,
          message: 'No valid UAN or PF numbers found for EPF accounts'
        });
      }

      // Fetch data from EPFO provider with enhanced error handling
      const epfData = await this.withEPFRetry(async () => {
        return await this.epfoProvider.fetchData(identifiers, { credentials });
      }, { userId, accountsAffected: epfAccounts.map(a => a.id) });

      // Validate fetched data
      const validationResult = this.validateData(epfData, {
        maxBalance: this.balanceValidationThreshold,
        maxContribution: this.contributionValidationThreshold
      });

      if (validationResult.errors.length > 0) {
        result.errors.push(...validationResult.errors);
      }

      if (validationResult.warnings.length > 0) {
        result.warnings.push(...validationResult.warnings);
      }

      // Transform data to standard format
      const transformedData = this.transformData(validationResult.validData);

      // Update EPF accounts with synced data
      for (const account of epfAccounts) {
        try {
          const syncedData = transformedData.find(data => 
            data.identifier === account.uan || 
            data.identifier === account.pfNumber
          );

          if (syncedData && !account.manualOverride) {
            await this.updateEPFAccount(account, syncedData, options.dryRun);
            result.recordsUpdated++;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          const syncError = createSyncError({
            type: SyncErrorTypes.DATABASE_ERROR,
            message: `Failed to update EPF account ${account.id}: ${error.message}`,
            investmentId: account.id
          });
          result.errors.push(syncError);
        }
      }

      // Calculate aggregated totals for user
      if (!options.dryRun && result.recordsUpdated > 0) {
        await this.updateUserEPFAggregates(userId);
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;

      // Update sync metadata
      await this.updateSyncMetadata(userId, result);

      // Send notifications based on result
      if (result.success && result.recordsUpdated > 0) {
        await this.notificationService.notifySyncSuccess(userId, result);
        this.errorRecoveryService.resetRetryCount(userId);
        this.errorRecoveryService.resetCredentialFailures(userId);
      } else if (!result.success) {
        await this.notificationService.notifySyncFailure(userId, result, {
          accountsAffected: epfAccounts.map(a => a.id)
        });
      }

      return result;
    } catch (error) {
      console.error(`EPF sync failed for user ${userId}:`, error.message);
      
      result.success = false;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      
      if (error.type) {
        result.errors.push(error);
      } else {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.UNKNOWN_ERROR,
          message: error.message
        }));
      }

      // Handle error recovery and notifications
      const recoveryAction = await this.errorRecoveryService.handleEPFSyncError(error, { userId });
      
      if (recoveryAction.action === RecoveryActions.DISABLE_SYNC) {
        await this.disableSyncForUser(userId, recoveryAction.reason);
      }
      
      await this.notificationService.notifySyncFailure(userId, result, {
        recoveryActions: [recoveryAction]
      });

      await this.updateSyncMetadata(userId, result);
      return result;
    }
  }

  /**
   * Synchronize a single EPF account for a user
   * @param {string} userId - User ID
   * @param {string} accountId - Specific EPF account ID to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async syncSingle(userId, accountId, options = {}) {
    const startTime = Date.now();
    const result = createSyncResult({
      source: options.source || this.defaultSource,
      startTime: new Date()
    });

    try {
      // Get the specific EPF account
      const epfAccount = await prisma.ePFAccount.findFirst({
        where: {
          id: accountId,
          userId: userId
        }
      });

      if (!epfAccount) {
        throw createSyncError({
          type: SyncErrorTypes.CONFIGURATION_ERROR,
          message: `EPF account ${accountId} not found for user ${userId}`
        });
      }

      if (epfAccount.manualOverride && !options.force) {
        result.success = true;
        result.recordsProcessed = 1;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Get encrypted credentials
      const credentials = await this.credentialService.getCredentials(userId, 'epfo');
      if (!credentials) {
        throw createSyncError({
          type: SyncErrorTypes.CREDENTIAL_ERROR,
          message: 'EPF credentials not configured for user'
        });
      }

      // Fetch data for this specific account
      const identifier = epfAccount.uan || epfAccount.pfNumber;
      const accountData = await this.withRetry(async () => {
        return await this.epfoProvider.fetchAccountData(identifier, credentials);
      });

      if (accountData) {
        // Validate the data
        const validationResult = this.validateData([accountData], {
          maxBalance: this.balanceValidationThreshold,
          maxContribution: this.contributionValidationThreshold
        });

        if (validationResult.validData.length > 0) {
          const transformedData = this.transformData(validationResult.validData)[0];
          await this.updateEPFAccount(epfAccount, transformedData, options.dryRun);
          result.recordsUpdated = 1;
        }

        result.recordsProcessed = 1;
        result.errors.push(...validationResult.errors);
        result.warnings.push(...validationResult.warnings);
      }

      result.success = result.errors.length === 0;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;

      // Update sync metadata for this specific account
      await this.updateSyncMetadata(userId, result, accountId);

      return result;
    } catch (error) {
      console.error(`EPF single sync failed for account ${accountId}:`, error.message);
      
      result.success = false;
      result.endTime = new Date();
      result.duration = Date.now() - startTime;
      
      if (error.type) {
        result.errors.push(error);
      } else {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.UNKNOWN_ERROR,
          message: error.message,
          investmentId: accountId
        }));
      }

      await this.updateSyncMetadata(userId, result, accountId);
      return result;
    }
  }

  /**
   * Validate sync configuration for EPF service
   * @param {Object} config - Sync configuration to validate
   * @returns {boolean} True if configuration is valid
   */
  validateConfiguration(config) {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof config.isEnabled !== 'boolean') {
      return false;
    }

    // Validate sync frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'custom'];
    if (config.syncFrequency && !validFrequencies.includes(config.syncFrequency)) {
      return false;
    }

    // Validate data source
    if (config.preferredSource && config.preferredSource !== DataSources.EPFO) {
      return false; // EPF only supports EPFO as data source
    }

    return true;
  }

  /**
   * Get the default sync configuration for EPF service
   * @returns {Object} Default configuration object
   */
  getDefaultConfiguration() {
    return {
      isEnabled: false, // Disabled by default due to credential requirements
      syncFrequency: 'monthly', // EPF data typically updates monthly
      preferredSource: DataSources.EPFO,
      fallbackSource: null, // No fallback for EPF data
      notifyOnSuccess: false,
      notifyOnFailure: true,
      customSchedule: '0 2 1 * *' // 1st of every month at 2 AM
    };
  }

  // Private helper methods

  /**
   * Get user's EPF accounts from database
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of EPF accounts
   * @private
   */
  async getUserEPFAccounts(userId) {
    try {
      return await prisma.ePFAccount.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    } catch (error) {
      console.error(`Failed to get EPF accounts for user ${userId}:`, error.message);
      throw createSyncError({
        type: SyncErrorTypes.DATABASE_ERROR,
        message: `Failed to retrieve EPF accounts: ${error.message}`
      });
    }
  }

  /**
   * Update EPF account with synced data
   * @param {Object} account - EPF account to update
   * @param {Object} syncedData - Synced data from EPFO
   * @param {boolean} dryRun - Whether this is a dry run
   * @returns {Promise<void>}
   * @private
   */
  async updateEPFAccount(account, syncedData, dryRun = false) {
    try {
      // Resolve data conflicts
      const { resolvedData, conflicts } = this.resolveDataConflicts(account, syncedData);

      if (conflicts.length > 0) {
        console.log(`Data conflicts resolved for EPF account ${account.id}:`, conflicts);
      }

      if (!dryRun) {
        await prisma.ePFAccount.update({
          where: { id: account.id },
          data: {
            totalBalance: resolvedData.balance || account.totalBalance,
            employeeContribution: resolvedData.employeeContribution || account.employeeContribution,
            employerContribution: resolvedData.employerContribution || account.employerContribution,
            pensionFund: resolvedData.pensionContribution || account.pensionFund,
            lastSyncAt: new Date(),
            syncStatus: SyncStatus.SYNCED,
            updatedAt: new Date()
          }
        });

        console.log(`Updated EPF account ${account.id} with synced data`);
      }
    } catch (error) {
      console.error(`Failed to update EPF account ${account.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update user's aggregated EPF totals
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   * @private
   */
  async updateUserEPFAggregates(userId) {
    try {
      const accounts = await this.getUserEPFAccounts(userId);
      
      const aggregates = accounts.reduce((totals, account) => {
        totals.totalBalance += account.totalBalance || 0;
        totals.totalEmployeeContribution += account.employeeContribution || 0;
        totals.totalEmployerContribution += account.employerContribution || 0;
        totals.totalPensionFund += account.pensionFund || 0;
        return totals;
      }, {
        totalBalance: 0,
        totalEmployeeContribution: 0,
        totalEmployerContribution: 0,
        totalPensionFund: 0
      });

      // Store aggregates in user preferences or separate table
      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...((await prisma.user.findUnique({ where: { id: userId } }))?.preferences || {}),
            epfAggregates: {
              ...aggregates,
              lastUpdated: new Date().toISOString()
            }
          }
        }
      });

      console.log(`Updated EPF aggregates for user ${userId}:`, aggregates);
    } catch (error) {
      console.error(`Failed to update EPF aggregates for user ${userId}:`, error.message);
      // Don't throw here as this is a secondary operation
    }
  }

  /**
   * Apply validation rules specific to EPF data
   * @param {Object} record - EPF data record to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   * @protected
   */
  applyValidationRules(record, rules) {
    const errors = [];
    const warnings = [];

    // Validate UAN format
    if (record.identifier && !/^\d{12}$/.test(record.identifier)) {
      errors.push('Invalid UAN format - must be 12 digits');
    }

    // Validate balance amounts
    if (record.balance < 0) {
      errors.push('EPF balance cannot be negative');
    }

    if (record.balance > rules.maxBalance) {
      warnings.push(`EPF balance (₹${record.balance.toLocaleString()}) exceeds threshold`);
    }

    // Validate contribution amounts
    if (record.employeeContribution < 0 || record.employerContribution < 0) {
      errors.push('Contribution amounts cannot be negative');
    }

    // Check for unusually high monthly contributions
    const totalContribution = (record.employeeContribution || 0) + (record.employerContribution || 0);
    if (totalContribution > rules.maxContribution) {
      warnings.push(`Monthly contribution (₹${totalContribution.toLocaleString()}) exceeds threshold`);
    }

    // Validate contribution ratios (employee contribution should not exceed employer contribution by too much)
    if (record.employeeContribution > 0 && record.employerContribution > 0) {
      const ratio = record.employeeContribution / record.employerContribution;
      if (ratio > 2.0) { // Employee contribution more than 2x employer contribution is unusual
        warnings.push('Employee contribution ratio seems unusually high compared to employer contribution');
      }
    }

    // Validate pension fund (should be reasonable percentage of total)
    if (record.pensionContribution > record.balance * 0.5) {
      warnings.push('Pension fund amount seems unusually high compared to total balance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Apply transformation rules to EPF data
   * @param {Object} record - EPF data record to transform
   * @param {Object} rules - Transformation rules
   * @returns {Object} Transformed record
   * @protected
   */
  applyTransformationRules(record, rules) {
    return {
      ...record,
      // Ensure numeric values are properly formatted
      balance: Math.round((record.balance || 0) * 100) / 100,
      employeeContribution: Math.round((record.employeeContribution || 0) * 100) / 100,
      employerContribution: Math.round((record.employerContribution || 0) * 100) / 100,
      pensionContribution: Math.round((record.pensionContribution || 0) * 100) / 100,
      
      // Add calculated fields
      totalContribution: Math.round(((record.employeeContribution || 0) + (record.employerContribution || 0)) * 100) / 100,
      
      // Ensure dates are properly formatted
      lastUpdated: record.lastUpdated instanceof Date ? record.lastUpdated : new Date(record.lastUpdated || Date.now())
    };
  }

  /**
   * Get list of fields that can be synced for EPF accounts
   * @returns {string[]} Array of field names
   * @protected
   */
  getSyncableFields() {
    return [
      'totalBalance',
      'employeeContribution', 
      'employerContribution',
      'pensionFund',
      'lastSyncAt',
      'syncStatus'
    ];
  }

  /**
   * Get fallback data source (EPF has no fallback)
   * @param {string} currentSource - Current data source
   * @returns {string|null} Fallback source or null
   * @protected
   */
  getFallbackSource(currentSource) {
    // EPF data is only available from EPFO portal
    return null;
  }

  /**
   * Execute operation with EPF-specific retry logic
   * @param {Function} operation - Operation to execute
   * @param {Object} context - Context information
   * @returns {Promise<any>} Operation result
   * @private
   */
  async withEPFRetry(operation, context = {}) {
    const { userId, accountsAffected = [] } = context;
    let lastError;
    let attempt = 1;
    
    while (attempt <= this.errorRecoveryService.maxRetryAttempts) {
      try {
        const result = await operation();
        
        // Reset portal downtime tracking on success
        this.errorRecoveryService.resetPortalDowntime();
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Get recovery action from error recovery service
        const recoveryAction = await this.errorRecoveryService.handleEPFSyncError(error, {
          userId,
          attempt,
          accountsAffected
        });
        
        // Handle different recovery actions
        switch (recoveryAction.action) {
          case RecoveryActions.RETRY:
            if (attempt >= recoveryAction.maxRetries) {
              throw lastError;
            }
            
            console.warn(`EPF sync attempt ${attempt} failed, retrying in ${recoveryAction.delay}ms:`, error.message);
            await new Promise(resolve => setTimeout(resolve, recoveryAction.delay));
            
            if (recoveryAction.metadata?.reauthenticate) {
              // Clear session and force re-authentication
              this.epfoProvider.clearSession(`${context.credentials?.uan}`);
            }
            
            attempt++;
            break;
            
          case RecoveryActions.DELAY:
            console.warn(`EPF sync delayed for ${recoveryAction.delay}ms:`, recoveryAction.reason);
            await new Promise(resolve => setTimeout(resolve, recoveryAction.delay));
            attempt++;
            break;
            
          case RecoveryActions.DISABLE_SYNC:
            await this.disableSyncForUser(userId, recoveryAction.reason);
            throw lastError;
            
          case RecoveryActions.MANUAL_INTERVENTION:
            if (recoveryAction.metadata?.notifyUser) {
              await this.notificationService.notifyCredentialExpiry(userId, {
                failureCount: attempt,
                lastFailure: new Date()
              });
            }
            throw lastError;
            
          default:
            throw lastError;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Disable sync for a user due to persistent failures
   * @param {string} userId - User ID
   * @param {string} reason - Reason for disabling
   * @returns {Promise<void>}
   * @private
   */
  async disableSyncForUser(userId, reason) {
    try {
      await prisma.syncConfiguration.upsert({
        where: {
          userId_investmentType: {
            userId,
            investmentType: this.syncType
          }
        },
        update: {
          isEnabled: false,
          updatedAt: new Date()
        },
        create: {
          userId,
          investmentType: this.syncType,
          isEnabled: false,
          syncFrequency: 'monthly',
          preferredSource: this.defaultSource,
          notifyOnFailure: true
        }
      });
      
      console.log(`Disabled EPF sync for user ${userId}: ${reason}`);
    } catch (error) {
      console.error(`Failed to disable EPF sync for user ${userId}:`, error.message);
    }
  }

  /**
   * Enable manual override for an EPF account
   * @param {string} userId - User ID
   * @param {string} accountId - EPF account ID
   * @param {string} reason - Reason for manual override
   * @returns {Promise<void>}
   */
  async enableManualOverride(userId, accountId, reason = 'User requested manual override') {
    try {
      const account = await prisma.ePFAccount.findFirst({
        where: {
          id: accountId,
          userId: userId
        }
      });

      if (!account) {
        throw new Error(`EPF account ${accountId} not found for user ${userId}`);
      }

      await prisma.ePFAccount.update({
        where: { id: accountId },
        data: {
          manualOverride: true,
          syncStatus: SyncStatus.MANUAL,
          updatedAt: new Date()
        }
      });

      // Notify user about manual override activation
      await this.notificationService.notifyManualOverride(userId, {
        accountId,
        accountName: account.employerName,
        reason
      });

      console.log(`Enabled manual override for EPF account ${accountId}: ${reason}`);
    } catch (error) {
      console.error(`Failed to enable manual override for account ${accountId}:`, error.message);
      throw error;
    }
  }

  /**
   * Disable manual override for an EPF account
   * @param {string} userId - User ID
   * @param {string} accountId - EPF account ID
   * @returns {Promise<void>}
   */
  async disableManualOverride(userId, accountId) {
    try {
      await prisma.ePFAccount.update({
        where: { 
          id: accountId,
          userId: userId
        },
        data: {
          manualOverride: false,
          syncStatus: SyncStatus.PENDING,
          updatedAt: new Date()
        }
      });

      console.log(`Disabled manual override for EPF account ${accountId}`);
    } catch (error) {
      console.error(`Failed to disable manual override for account ${accountId}:`, error.message);
      throw error;
    }
  }

  /**
   * Check for credential expiration and notify users
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async checkCredentialExpiration(userId) {
    try {
      const credentials = await this.credentialService.getCredentials(userId, 'epfo');
      if (!credentials) {
        return;
      }

      // Check if credentials need rotation (this would be based on your credential service logic)
      const credentialRecord = await prisma.encryptedCredentials.findUnique({
        where: {
          userId_service: {
            userId,
            service: 'epfo'
          }
        }
      });

      if (credentialRecord) {
        const daysSinceUpdate = Math.floor((Date.now() - credentialRecord.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Notify if credentials are older than 90 days
        if (daysSinceUpdate > 90) {
          await this.notificationService.notifyCredentialExpiry(userId, {
            lastUpdated: credentialRecord.updatedAt,
            daysSinceUpdate
          });
        }
      }
    } catch (error) {
      console.error(`Failed to check credential expiration for user ${userId}:`, error.message);
    }
  }

  /**
   * Parse contribution history for trend analysis
   * @param {Array} contributionHistory - Array of contribution records
   * @returns {Object} Parsed contribution trends
   * @private
   */
  parseContributionTrends(contributionHistory) {
    if (!contributionHistory || contributionHistory.length === 0) {
      return {
        averageMonthlyContribution: 0,
        trend: 'stable',
        lastContributionDate: null
      };
    }

    // Sort by date
    const sortedContributions = contributionHistory
      .filter(c => c.date && c.employeeShare >= 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedContributions.length === 0) {
      return {
        averageMonthlyContribution: 0,
        trend: 'stable',
        lastContributionDate: null
      };
    }

    // Calculate average monthly contribution
    const totalContribution = sortedContributions.reduce((sum, c) => 
      sum + (c.employeeShare || 0) + (c.employerShare || 0), 0
    );
    const averageMonthlyContribution = totalContribution / sortedContributions.length;

    // Determine trend (compare last 3 months with previous 3 months)
    let trend = 'stable';
    if (sortedContributions.length >= 6) {
      const recent = sortedContributions.slice(-3);
      const previous = sortedContributions.slice(-6, -3);
      
      const recentAvg = recent.reduce((sum, c) => sum + (c.employeeShare || 0) + (c.employerShare || 0), 0) / 3;
      const previousAvg = previous.reduce((sum, c) => sum + (c.employeeShare || 0) + (c.employerShare || 0), 0) / 3;
      
      if (recentAvg > previousAvg * 1.1) {
        trend = 'increasing';
      } else if (recentAvg < previousAvg * 0.9) {
        trend = 'decreasing';
      }
    }

    return {
      averageMonthlyContribution: Math.round(averageMonthlyContribution * 100) / 100,
      trend,
      lastContributionDate: sortedContributions[sortedContributions.length - 1].date
    };
  }
}

module.exports = EPFSyncService;