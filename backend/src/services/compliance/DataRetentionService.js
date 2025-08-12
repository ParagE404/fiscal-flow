const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

/**
 * Data Retention Service for implementing automated data lifecycle management
 * Handles data archival, cleanup, and compliance with retention policies
 */
class DataRetentionService {
  constructor() {
    this.retentionPolicies = {
      // Financial data - keep for 7 years (regulatory requirement)
      financialData: {
        retentionPeriod: 7 * 365, // days
        archiveAfter: 3 * 365, // Archive after 3 years
        categories: ['mutual_funds', 'stocks', 'epf_accounts', 'fixed_deposits', 'sips']
      },
      
      // Sync logs - keep for 1 year
      syncLogs: {
        retentionPeriod: 365, // days
        archiveAfter: 90, // Archive after 90 days
        categories: ['sync_metadata', 'sync_operation_logs']
      },
      
      // Audit logs - keep for 7 years (compliance)
      auditLogs: {
        retentionPeriod: 7 * 365, // days
        archiveAfter: 2 * 365, // Archive after 2 years
        categories: ['audit_logs']
      },
      
      // Security logs - keep for 3 years
      securityLogs: {
        retentionPeriod: 3 * 365, // days
        archiveAfter: 365, // Archive after 1 year
        categories: ['rate_limit_logs', 'suspicious_activities', 'security_alerts']
      },
      
      // User activity logs - keep for 90 days
      activityLogs: {
        retentionPeriod: 90, // days
        archiveAfter: 30, // Archive after 30 days
        categories: ['notification_logs']
      },
      
      // Temporary data - keep for 30 days
      temporaryData: {
        retentionPeriod: 30, // days
        archiveAfter: 7, // Archive after 7 days
        categories: ['credential_backups', 'data_export_logs']
      }
    };
    
    this.archiveLocation = process.env.ARCHIVE_STORAGE_PATH || './data/archives';
    this.isSchedulerRunning = false;
  }

  /**
   * Start the automated data retention scheduler
   */
  startScheduler() {
    if (this.isSchedulerRunning) {
      console.log('Data retention scheduler is already running');
      return;
    }

    // Run daily at 2 AM IST
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting automated data retention process...');
      try {
        await this.runRetentionProcess();
      } catch (error) {
        console.error('Data retention process failed:', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    // Run weekly archival on Sundays at 3 AM IST
    cron.schedule('0 3 * * 0', async () => {
      console.log('Starting automated data archival process...');
      try {
        await this.runArchivalProcess();
      } catch (error) {
        console.error('Data archival process failed:', error);
      }
    }, {
      timezone: "Asia/Kolkata"
    });

    this.isSchedulerRunning = true;
    console.log('Data retention scheduler started');
  }

  /**
   * Stop the automated data retention scheduler
   */
  stopScheduler() {
    this.isSchedulerRunning = false;
    console.log('Data retention scheduler stopped');
  }

  /**
   * Run the complete data retention process
   * @returns {Promise<Object>} Retention process summary
   */
  async runRetentionProcess() {
    const summary = {
      startTime: new Date(),
      endTime: null,
      processedPolicies: 0,
      archivedRecords: 0,
      deletedRecords: 0,
      errors: []
    };

    try {
      for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
        try {
          console.log(`Processing retention policy: ${policyName}`);
          
          const policyResult = await this.processPolicyCategories(policy);
          summary.archivedRecords += policyResult.archived;
          summary.deletedRecords += policyResult.deleted;
          summary.processedPolicies++;
          
        } catch (error) {
          console.error(`Failed to process policy ${policyName}:`, error);
          summary.errors.push({
            policy: policyName,
            error: error.message
          });
        }
      }

      summary.endTime = new Date();
      
      // Log the retention process
      await this.logRetentionProcess(summary);
      
      return summary;
    } catch (error) {
      summary.endTime = new Date();
      summary.errors.push({ general: error.message });
      throw error;
    }
  }

  /**
   * Process categories for a specific retention policy
   * @param {Object} policy - Retention policy configuration
   * @returns {Promise<Object>} Processing results
   */
  async processPolicyCategories(policy) {
    const result = { archived: 0, deleted: 0 };
    
    const archiveThreshold = new Date(Date.now() - policy.archiveAfter * 24 * 60 * 60 * 1000);
    const deleteThreshold = new Date(Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000);

    for (const category of policy.categories) {
      // Archive old records
      const archivedCount = await this.archiveRecords(category, archiveThreshold);
      result.archived += archivedCount;

      // Delete expired records
      const deletedCount = await this.deleteExpiredRecords(category, deleteThreshold);
      result.deleted += deletedCount;
    }

    return result;
  }

  /**
   * Archive records older than threshold
   * @param {string} category - Data category
   * @param {Date} threshold - Archive threshold date
   * @returns {Promise<number>} Number of archived records
   */
  async archiveRecords(category, threshold) {
    try {
      const modelName = this.getCategoryModelName(category);
      const timestampField = this.getTimestampField(category);
      
      if (!modelName || !timestampField) {
        console.warn(`Unknown category for archival: ${category}`);
        return 0;
      }

      // Find records to archive
      const recordsToArchive = await prisma[modelName].findMany({
        where: {
          [timestampField]: { lt: threshold },
          archived: { not: true } // Only archive non-archived records
        }
      });

      if (recordsToArchive.length === 0) {
        return 0;
      }

      // Create archive file
      const archiveData = {
        category,
        archiveDate: new Date(),
        recordCount: recordsToArchive.length,
        records: recordsToArchive
      };

      const archiveFileName = `${category}_${Date.now()}.json`;
      await this.saveArchiveFile(archiveFileName, archiveData);

      // Mark records as archived
      const recordIds = recordsToArchive.map(record => record.id);
      await prisma[modelName].updateMany({
        where: { id: { in: recordIds } },
        data: { 
          archived: true,
          archivedAt: new Date(),
          archiveFile: archiveFileName
        }
      });

      console.log(`Archived ${recordsToArchive.length} records from ${category}`);
      return recordsToArchive.length;
      
    } catch (error) {
      console.error(`Failed to archive records for category ${category}:`, error);
      return 0;
    }
  }

  /**
   * Delete expired records
   * @param {string} category - Data category
   * @param {Date} threshold - Deletion threshold date
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteExpiredRecords(category, threshold) {
    try {
      const modelName = this.getCategoryModelName(category);
      const timestampField = this.getTimestampField(category);
      
      if (!modelName || !timestampField) {
        console.warn(`Unknown category for deletion: ${category}`);
        return 0;
      }

      // Delete expired records
      const deleteResult = await prisma[modelName].deleteMany({
        where: {
          [timestampField]: { lt: threshold }
        }
      });

      if (deleteResult.count > 0) {
        console.log(`Deleted ${deleteResult.count} expired records from ${category}`);
      }

      return deleteResult.count;
      
    } catch (error) {
      console.error(`Failed to delete expired records for category ${category}:`, error);
      return 0;
    }
  }

  /**
   * Run the archival process for old data
   * @returns {Promise<Object>} Archival process summary
   */
  async runArchivalProcess() {
    const summary = {
      startTime: new Date(),
      endTime: null,
      totalArchived: 0,
      archiveFiles: [],
      errors: []
    };

    try {
      // Archive old financial data (older than 3 years but keep for compliance)
      const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
      
      const financialCategories = ['mutual_funds', 'stocks', 'epf_accounts', 'fixed_deposits'];
      
      for (const category of financialCategories) {
        try {
          const archived = await this.archiveRecords(category, threeYearsAgo);
          summary.totalArchived += archived;
        } catch (error) {
          summary.errors.push({
            category,
            error: error.message
          });
        }
      }

      summary.endTime = new Date();
      
      // Log the archival process
      await prisma.dataArchivalLog.create({
        data: {
          archivalDate: summary.startTime,
          totalRecordsArchived: summary.totalArchived,
          archiveFiles: JSON.stringify(summary.archiveFiles),
          errors: JSON.stringify(summary.errors)
        }
      });

      return summary;
    } catch (error) {
      summary.endTime = new Date();
      summary.errors.push({ general: error.message });
      throw error;
    }
  }

  /**
   * Get Prisma model name for category
   * @param {string} category - Data category
   * @returns {string} Prisma model name
   */
  getCategoryModelName(category) {
    const modelMap = {
      'mutual_funds': 'mutualFund',
      'stocks': 'stock',
      'epf_accounts': 'epfAccount',
      'fixed_deposits': 'fixedDeposit',
      'sips': 'sip',
      'sync_metadata': 'syncMetadata',
      'sync_operation_logs': 'syncOperationLog',
      'audit_logs': 'auditLog',
      'rate_limit_logs': 'rateLimitLog',
      'suspicious_activities': 'suspiciousActivity',
      'security_alerts': 'securityAlert',
      'notification_logs': 'notificationLog',
      'credential_backups': 'credentialBackup',
      'data_export_logs': 'dataExportLog'
    };
    
    return modelMap[category];
  }

  /**
   * Get timestamp field name for category
   * @param {string} category - Data category
   * @returns {string} Timestamp field name
   */
  getTimestampField(category) {
    const timestampMap = {
      'mutual_funds': 'createdAt',
      'stocks': 'createdAt',
      'epf_accounts': 'createdAt',
      'fixed_deposits': 'createdAt',
      'sips': 'createdAt',
      'sync_metadata': 'createdAt',
      'sync_operation_logs': 'timestamp',
      'audit_logs': 'timestamp',
      'rate_limit_logs': 'timestamp',
      'suspicious_activities': 'timestamp',
      'security_alerts': 'timestamp',
      'notification_logs': 'sentAt',
      'credential_backups': 'createdAt',
      'data_export_logs': 'exportDate'
    };
    
    return timestampMap[category];
  }

  /**
   * Save archive data to file
   * @param {string} fileName - Archive file name
   * @param {Object} data - Data to archive
   * @returns {Promise<void>}
   */
  async saveArchiveFile(fileName, data) {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Ensure archive directory exists
    await fs.mkdir(this.archiveLocation, { recursive: true });
    
    const filePath = path.join(this.archiveLocation, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    
    console.log(`Archive saved to: ${filePath}`);
  }

  /**
   * Log retention process results
   * @param {Object} summary - Process summary
   * @returns {Promise<void>}
   */
  async logRetentionProcess(summary) {
    await prisma.dataRetentionLog.create({
      data: {
        cleanupDate: summary.startTime,
        recordsCleaned: JSON.stringify({
          archived: summary.archivedRecords,
          deleted: summary.deletedRecords,
          policies: summary.processedPolicies
        }),
        totalRecordsCleaned: summary.archivedRecords + summary.deletedRecords
      }
    });
  }

  /**
   * Get retention status for all categories
   * @returns {Promise<Object>} Retention status report
   */
  async getRetentionStatus() {
    const status = {
      reportDate: new Date(),
      categories: {},
      upcomingActions: []
    };

    for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
      const archiveThreshold = new Date(Date.now() - policy.archiveAfter * 24 * 60 * 60 * 1000);
      const deleteThreshold = new Date(Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000);

      for (const category of policy.categories) {
        const modelName = this.getCategoryModelName(category);
        const timestampField = this.getTimestampField(category);
        
        if (!modelName || !timestampField) continue;

        const [total, toArchive, toDelete] = await Promise.all([
          prisma[modelName].count(),
          prisma[modelName].count({
            where: {
              [timestampField]: { lt: archiveThreshold },
              archived: { not: true }
            }
          }),
          prisma[modelName].count({
            where: {
              [timestampField]: { lt: deleteThreshold }
            }
          })
        ]);

        status.categories[category] = {
          totalRecords: total,
          pendingArchival: toArchive,
          pendingDeletion: toDelete,
          policy: policyName
        };

        if (toArchive > 0) {
          status.upcomingActions.push({
            action: 'archive',
            category,
            recordCount: toArchive,
            scheduledDate: this.getNextScheduledDate('archive')
          });
        }

        if (toDelete > 0) {
          status.upcomingActions.push({
            action: 'delete',
            category,
            recordCount: toDelete,
            scheduledDate: this.getNextScheduledDate('delete')
          });
        }
      }
    }

    return status;
  }

  /**
   * Get next scheduled date for retention actions
   * @param {string} actionType - Type of action ('archive' or 'delete')
   * @returns {Date} Next scheduled date
   */
  getNextScheduledDate(actionType) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(actionType === 'archive' ? 3 : 2, 0, 0, 0); // 3 AM for archive, 2 AM for delete
    
    return tomorrow;
  }
}

module.exports = DataRetentionService;