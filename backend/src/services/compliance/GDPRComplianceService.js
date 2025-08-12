const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

/**
 * GDPR Compliance Service for handling data protection requirements
 * Implements user consent management, data retention policies, and data portability
 */
class GDPRComplianceService {
  constructor() {
    this.consentTypes = {
      SYNC_DATA_PROCESSING: 'sync_data_processing',
      CREDENTIAL_STORAGE: 'credential_storage',
      ANALYTICS: 'analytics',
      MARKETING: 'marketing',
      THIRD_PARTY_APIS: 'third_party_apis'
    };
    
    this.retentionPolicies = {
      syncLogs: 365, // days
      auditLogs: 2555, // 7 years for financial data
      rateLimitLogs: 90, // days
      suspiciousActivity: 1095, // 3 years
      credentialBackups: 30, // days
      notificationLogs: 365 // days
    };
    
    this.dataCategories = {
      PERSONAL_DATA: 'personal_data',
      FINANCIAL_DATA: 'financial_data',
      TECHNICAL_DATA: 'technical_data',
      USAGE_DATA: 'usage_data'
    };
  }

  /**
   * Record user consent for data processing activities
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent
   * @param {boolean} granted - Whether consent is granted
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User's browser info
   * @returns {Promise<Object>} Consent record
   */
  async recordConsent(userId, consentType, granted, ipAddress, userAgent) {
    try {
      // Validate consent type
      if (!Object.values(this.consentTypes).includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Create consent record
      const consent = await prisma.userConsent.create({
        data: {
          userId,
          consentType,
          granted,
          ipAddress,
          userAgent,
          timestamp: new Date(),
          version: '1.0' // Consent version for tracking changes
        }
      });

      // Log the consent action
      await prisma.auditLog.create({
        data: {
          userId,
          auditType: 'consent_recorded',
          details: {
            consentType,
            granted,
            version: '1.0'
          },
          ipAddress,
          userAgent
        }
      });

      return consent;
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw error;
    }
  }

  /**
   * Check if user has granted consent for specific data processing
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to check
   * @returns {Promise<boolean>} True if consent is granted
   */
  async hasConsent(userId, consentType) {
    try {
      const consent = await prisma.userConsent.findFirst({
        where: {
          userId,
          consentType
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return consent ? consent.granted : false;
    } catch (error) {
      console.error('Failed to check consent:', error);
      return false;
    }
  }

  /**
   * Withdraw user consent for specific data processing
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to withdraw
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User's browser info
   * @returns {Promise<void>}
   */
  async withdrawConsent(userId, consentType, ipAddress, userAgent) {
    await this.recordConsent(userId, consentType, false, ipAddress, userAgent);
    
    // Take action based on withdrawn consent
    switch (consentType) {
      case this.consentTypes.SYNC_DATA_PROCESSING:
        await this.disableAllSyncForUser(userId);
        break;
      case this.consentTypes.CREDENTIAL_STORAGE:
        await this.deleteUserCredentials(userId);
        break;
      case this.consentTypes.THIRD_PARTY_APIS:
        await this.disableThirdPartyIntegrations(userId);
        break;
    }
  }

  /**
   * Get all consent records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of consent records
   */
  async getUserConsents(userId) {
    return await prisma.userConsent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });
  }

  /**
   * Export all user data for GDPR data portability
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete user data export
   */
  async exportUserData(userId) {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        personalData: {},
        financialData: {},
        technicalData: {},
        usageData: {}
      };

      // Export personal data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true
        }
      });
      exportData.personalData.profile = user;

      // Export financial data
      const [mutualFunds, stocks, epfAccounts, fixedDeposits, sips] = await Promise.all([
        prisma.mutualFund.findMany({ where: { userId } }),
        prisma.stock.findMany({ where: { userId } }),
        prisma.epfAccount.findMany({ where: { userId } }),
        prisma.fixedDeposit.findMany({ where: { userId } }),
        prisma.sip.findMany({ where: { userId } })
      ]);

      exportData.financialData = {
        mutualFunds,
        stocks,
        epfAccounts,
        fixedDeposits,
        sips
      };

      // Export sync data
      const [syncMetadata, syncConfigurations] = await Promise.all([
        prisma.syncMetadata.findMany({ where: { userId } }),
        prisma.syncConfiguration.findMany({ where: { userId } })
      ]);

      exportData.technicalData.sync = {
        metadata: syncMetadata,
        configurations: syncConfigurations
      };

      // Export usage data (last 90 days only for privacy)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: { gte: ninetyDaysAgo }
        },
        select: {
          auditType: true,
          investmentType: true,
          source: true,
          timestamp: true,
          details: true
        }
      });

      exportData.usageData.auditLogs = auditLogs;

      // Export consent records
      const consents = await this.getUserConsents(userId);
      exportData.technicalData.consents = consents;

      // Log the export request
      await prisma.auditLog.create({
        data: {
          userId,
          auditType: 'data_export_requested',
          details: {
            exportDate: exportData.exportDate,
            dataCategories: Object.keys(exportData)
          }
        }
      });

      return exportData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  /**
   * Delete all user data (right to be forgotten)
   * @param {string} userId - User ID
   * @param {string} reason - Reason for deletion
   * @returns {Promise<Object>} Deletion summary
   */
  async deleteUserData(userId, reason = 'User requested deletion') {
    try {
      const deletionSummary = {
        userId,
        deletionDate: new Date(),
        reason,
        deletedRecords: {}
      };

      // Before deletion, create a minimal audit record (anonymized)
      const anonymizedId = `deleted_${Date.now()}`;
      
      await prisma.dataDeletionLog.create({
        data: {
          originalUserId: userId,
          anonymizedId,
          reason,
          deletionDate: new Date(),
          recordsCounts: JSON.stringify({}) // Will be updated below
        }
      });

      // Delete in order to respect foreign key constraints
      const deletionOrder = [
        { model: 'auditLog', field: 'userId' },
        { model: 'syncMetadata', field: 'userId' },
        { model: 'syncConfiguration', field: 'userId' },
        { model: 'encryptedCredentials', field: 'userId' },
        { model: 'sip', field: 'userId' },
        { model: 'mutualFund', field: 'userId' },
        { model: 'stock', field: 'userId' },
        { model: 'epfAccount', field: 'userId' },
        { model: 'fixedDeposit', field: 'userId' },
        { model: 'userConsent', field: 'userId' },
        { model: 'rateLimitLog', field: 'userId' },
        { model: 'suspiciousActivity', field: 'userId' },
        { model: 'user', field: 'id' }
      ];

      for (const { model, field } of deletionOrder) {
        const count = await prisma[model].count({
          where: { [field]: userId }
        });
        
        if (count > 0) {
          await prisma[model].deleteMany({
            where: { [field]: userId }
          });
          deletionSummary.deletedRecords[model] = count;
        }
      }

      // Update the deletion log with record counts
      await prisma.dataDeletionLog.update({
        where: { anonymizedId },
        data: {
          recordsCounts: JSON.stringify(deletionSummary.deletedRecords)
        }
      });

      return deletionSummary;
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  /**
   * Apply data retention policies by cleaning up old data
   * @returns {Promise<Object>} Cleanup summary
   */
  async applyRetentionPolicies() {
    const cleanupSummary = {
      cleanupDate: new Date(),
      cleanedRecords: {}
    };

    try {
      // Clean up sync logs
      const syncLogsThreshold = new Date(Date.now() - this.retentionPolicies.syncLogs * 24 * 60 * 60 * 1000);
      const syncLogsDeleted = await prisma.syncOperationLog.deleteMany({
        where: {
          timestamp: { lt: syncLogsThreshold }
        }
      });
      cleanupSummary.cleanedRecords.syncLogs = syncLogsDeleted.count;

      // Clean up rate limit logs
      const rateLimitThreshold = new Date(Date.now() - this.retentionPolicies.rateLimitLogs * 24 * 60 * 60 * 1000);
      const rateLimitDeleted = await prisma.rateLimitLog.deleteMany({
        where: {
          timestamp: { lt: rateLimitThreshold }
        }
      });
      cleanupSummary.cleanedRecords.rateLimitLogs = rateLimitDeleted.count;

      // Clean up suspicious activity logs
      const suspiciousThreshold = new Date(Date.now() - this.retentionPolicies.suspiciousActivity * 24 * 60 * 60 * 1000);
      const suspiciousDeleted = await prisma.suspiciousActivity.deleteMany({
        where: {
          timestamp: { lt: suspiciousThreshold }
        }
      });
      cleanupSummary.cleanedRecords.suspiciousActivity = suspiciousDeleted.count;

      // Clean up expired credential backups
      const credentialBackupThreshold = new Date(Date.now() - this.retentionPolicies.credentialBackups * 24 * 60 * 60 * 1000);
      const credentialBackupsDeleted = await prisma.credentialBackup.deleteMany({
        where: {
          createdAt: { lt: credentialBackupThreshold }
        }
      });
      cleanupSummary.cleanedRecords.credentialBackups = credentialBackupsDeleted.count;

      // Clean up notification logs
      const notificationThreshold = new Date(Date.now() - this.retentionPolicies.notificationLogs * 24 * 60 * 60 * 1000);
      const notificationDeleted = await prisma.notificationLog.deleteMany({
        where: {
          sentAt: { lt: notificationThreshold }
        }
      });
      cleanupSummary.cleanedRecords.notificationLogs = notificationDeleted.count;

      // Log the cleanup operation
      await prisma.dataRetentionLog.create({
        data: {
          cleanupDate: cleanupSummary.cleanupDate,
          recordsCleaned: JSON.stringify(cleanupSummary.cleanedRecords),
          totalRecordsCleaned: Object.values(cleanupSummary.cleanedRecords).reduce((sum, count) => sum + count, 0)
        }
      });

      return cleanupSummary;
    } catch (error) {
      console.error('Failed to apply retention policies:', error);
      throw error;
    }
  }

  /**
   * Generate privacy report for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Privacy report
   */
  async generatePrivacyReport(userId) {
    const report = {
      userId,
      reportDate: new Date(),
      dataCategories: {},
      consents: {},
      dataRetention: {},
      thirdPartySharing: {}
    };

    // Count data by category
    const [mutualFunds, stocks, epfAccounts, auditLogs, syncLogs] = await Promise.all([
      prisma.mutualFund.count({ where: { userId } }),
      prisma.stock.count({ where: { userId } }),
      prisma.epfAccount.count({ where: { userId } }),
      prisma.auditLog.count({ where: { userId } }),
      prisma.syncOperationLog.count({ where: { userId } })
    ]);

    report.dataCategories = {
      financialRecords: mutualFunds + stocks + epfAccounts,
      auditRecords: auditLogs,
      syncRecords: syncLogs
    };

    // Get current consents
    const consents = await this.getUserConsents(userId);
    report.consents = consents.reduce((acc, consent) => {
      acc[consent.consentType] = {
        granted: consent.granted,
        lastUpdated: consent.timestamp
      };
      return acc;
    }, {});

    // Data retention information
    report.dataRetention = {
      policies: this.retentionPolicies,
      nextCleanup: this.calculateNextCleanupDate()
    };

    // Third-party data sharing
    const syncConfigs = await prisma.syncConfiguration.findMany({
      where: { userId, isEnabled: true }
    });
    
    report.thirdPartySharing = {
      enabledIntegrations: syncConfigs.map(config => ({
        type: config.investmentType,
        source: config.preferredSource,
        lastSync: config.updatedAt
      }))
    };

    return report;
  }

  /**
   * Disable all sync operations for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async disableAllSyncForUser(userId) {
    await prisma.syncConfiguration.updateMany({
      where: { userId },
      data: { isEnabled: false }
    });
  }

  /**
   * Delete all stored credentials for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUserCredentials(userId) {
    await prisma.encryptedCredentials.deleteMany({
      where: { userId }
    });
  }

  /**
   * Disable third-party integrations for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async disableThirdPartyIntegrations(userId) {
    await prisma.syncConfiguration.updateMany({
      where: { userId },
      data: { 
        isEnabled: false,
        preferredSource: 'manual'
      }
    });
  }

  /**
   * Calculate next cleanup date based on retention policies
   * @returns {Date} Next cleanup date
   */
  calculateNextCleanupDate() {
    // Run cleanup weekly
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  /**
   * Anonymize user data instead of deletion (for legal requirements)
   * @param {string} userId - User ID
   * @returns {Promise<string>} Anonymized user ID
   */
  async anonymizeUserData(userId) {
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update user record with anonymized data
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `${anonymizedId}@anonymized.local`,
        name: 'Anonymized User',
        avatar: null,
        preferences: null
      }
    });

    // Log the anonymization
    await prisma.auditLog.create({
      data: {
        userId,
        auditType: 'user_data_anonymized',
        details: {
          anonymizedId,
          anonymizationDate: new Date()
        }
      }
    });

    return anonymizedId;
  }
}

module.exports = GDPRComplianceService;