const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const csv = require('csv-writer');

const prisma = new PrismaClient();

/**
 * Data Export Service for GDPR data portability requirements
 * Provides multiple export formats and secure download mechanisms
 */
class DataExportService {
  constructor() {
    this.exportFormats = {
      JSON: 'json',
      CSV: 'csv',
      XML: 'xml',
      PDF: 'pdf'
    };
    
    this.exportLocation = process.env.EXPORT_STORAGE_PATH || './data/exports';
    this.downloadUrlExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Create a comprehensive data export for a user
   * @param {string} userId - User ID
   * @param {string} format - Export format (json, csv, xml, pdf)
   * @param {Array} categories - Data categories to include
   * @returns {Promise<Object>} Export details
   */
  async createUserDataExport(userId, format = 'json', categories = null) {
    try {
      const exportId = `export_${userId}_${Date.now()}`;
      const exportDate = new Date();
      
      // Log export request
      const exportLog = await prisma.dataExportLog.create({
        data: {
          userId,
          exportDate,
          format,
          status: 'pending'
        }
      });

      // Collect user data
      const userData = await this.collectUserData(userId, categories);
      
      // Generate export file based on format
      let exportFile;
      let dataSize;
      
      switch (format.toLowerCase()) {
        case 'json':
          exportFile = await this.generateJSONExport(exportId, userData);
          break;
        case 'csv':
          exportFile = await this.generateCSVExport(exportId, userData);
          break;
        case 'xml':
          exportFile = await this.generateXMLExport(exportId, userData);
          break;
        case 'pdf':
          exportFile = await this.generatePDFExport(exportId, userData);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Get file size
      const stats = await fs.stat(exportFile.path);
      dataSize = stats.size;

      // Generate secure download URL
      const downloadUrl = await this.generateSecureDownloadUrl(exportFile.path, exportId);
      const expiresAt = new Date(Date.now() + this.downloadUrlExpiry);

      // Update export log
      await prisma.dataExportLog.update({
        where: { id: exportLog.id },
        data: {
          status: 'completed',
          dataSize,
          downloadUrl,
          expiresAt
        }
      });

      return {
        exportId,
        format,
        dataSize,
        downloadUrl,
        expiresAt,
        categories: categories || Object.keys(userData)
      };
      
    } catch (error) {
      console.error('Failed to create user data export:', error);
      
      // Update export log with error
      if (exportLog) {
        await prisma.dataExportLog.update({
          where: { id: exportLog.id },
          data: { status: 'failed' }
        });
      }
      
      throw error;
    }
  }

  /**
   * Collect all user data for export
   * @param {string} userId - User ID
   * @param {Array} categories - Specific categories to include
   * @returns {Promise<Object>} Complete user data
   */
  async collectUserData(userId, categories = null) {
    const userData = {
      exportMetadata: {
        userId,
        exportDate: new Date().toISOString(),
        dataVersion: '1.0',
        exportedBy: 'FinVista Data Export Service'
      }
    };

    const allCategories = {
      profile: () => this.collectProfileData(userId),
      investments: () => this.collectInvestmentData(userId),
      sync: () => this.collectSyncData(userId),
      activity: () => this.collectActivityData(userId),
      preferences: () => this.collectPreferencesData(userId),
      consents: () => this.collectConsentData(userId)
    };

    const categoriesToExport = categories || Object.keys(allCategories);

    for (const category of categoriesToExport) {
      if (allCategories[category]) {
        try {
          userData[category] = await allCategories[category]();
        } catch (error) {
          console.error(`Failed to collect ${category} data:`, error);
          userData[category] = { error: `Failed to export ${category} data` };
        }
      }
    }

    return userData;
  }

  /**
   * Collect user profile data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Profile data
   */
  async collectProfileData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isEmailVerified: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });

    return {
      personalInfo: user,
      accountStatus: {
        emailVerified: user.isEmailVerified,
        accountAge: this.calculateAccountAge(user.createdAt),
        lastActivity: user.lastLogin
      }
    };
  }

  /**
   * Collect investment data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Investment data
   */
  async collectInvestmentData(userId) {
    const [mutualFunds, stocks, epfAccounts, fixedDeposits, sips] = await Promise.all([
      prisma.mutualFund.findMany({ where: { userId } }),
      prisma.stock.findMany({ where: { userId } }),
      prisma.epfAccount.findMany({ where: { userId } }),
      prisma.fixedDeposit.findMany({ where: { userId } }),
      prisma.sip.findMany({ where: { userId } })
    ]);

    return {
      mutualFunds: mutualFunds.map(fund => this.sanitizeFinancialData(fund)),
      stocks: stocks.map(stock => this.sanitizeFinancialData(stock)),
      epfAccounts: epfAccounts.map(epf => this.sanitizeFinancialData(epf)),
      fixedDeposits: fixedDeposits.map(fd => this.sanitizeFinancialData(fd)),
      sips: sips.map(sip => this.sanitizeFinancialData(sip)),
      summary: {
        totalInvestments: mutualFunds.length + stocks.length + epfAccounts.length + fixedDeposits.length,
        activeSIPs: sips.filter(sip => sip.status === 'active').length
      }
    };
  }

  /**
   * Collect sync configuration and metadata
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync data
   */
  async collectSyncData(userId) {
    const [syncConfigs, syncMetadata] = await Promise.all([
      prisma.syncConfiguration.findMany({ where: { userId } }),
      prisma.syncMetadata.findMany({ 
        where: { userId },
        orderBy: { lastSyncAt: 'desc' },
        take: 100 // Limit to last 100 sync operations
      })
    ]);

    return {
      configurations: syncConfigs,
      recentSyncHistory: syncMetadata.map(sync => ({
        investmentType: sync.investmentType,
        lastSyncAt: sync.lastSyncAt,
        syncStatus: sync.syncStatus,
        syncSource: sync.syncSource,
        errorMessage: sync.errorMessage
      })),
      syncSummary: {
        enabledSyncs: syncConfigs.filter(config => config.isEnabled).length,
        totalSyncOperations: syncMetadata.length
      }
    };
  }

  /**
   * Collect user activity data (limited for privacy)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Activity data
   */
  async collectActivityData(userId) {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: threeMonthsAgo }
      },
      select: {
        auditType: true,
        investmentType: true,
        source: true,
        timestamp: true
        // Exclude sensitive details and IP addresses
      },
      orderBy: { timestamp: 'desc' },
      take: 500 // Limit to last 500 activities
    });

    return {
      recentActivity: auditLogs,
      activitySummary: {
        totalActivities: auditLogs.length,
        timeRange: {
          from: threeMonthsAgo.toISOString(),
          to: new Date().toISOString()
        },
        activityTypes: this.summarizeActivityTypes(auditLogs)
      }
    };
  }

  /**
   * Collect user preferences and settings
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Preferences data
   */
  async collectPreferencesData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });

    const syncConfigs = await prisma.syncConfiguration.findMany({
      where: { userId },
      select: {
        investmentType: true,
        isEnabled: true,
        syncFrequency: true,
        notifyOnSuccess: true,
        notifyOnFailure: true
      }
    });

    return {
      userPreferences: user.preferences || {},
      syncPreferences: syncConfigs,
      privacySettings: {
        dataProcessingConsent: await this.getConsentStatus(userId, 'sync_data_processing'),
        credentialStorageConsent: await this.getConsentStatus(userId, 'credential_storage'),
        thirdPartyApisConsent: await this.getConsentStatus(userId, 'third_party_apis')
      }
    };
  }

  /**
   * Collect consent records
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Consent data
   */
  async collectConsentData(userId) {
    const consents = await prisma.userConsent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });

    return {
      consentHistory: consents.map(consent => ({
        consentType: consent.consentType,
        granted: consent.granted,
        version: consent.version,
        timestamp: consent.timestamp
        // Exclude IP and user agent for privacy
      })),
      currentConsents: this.getCurrentConsents(consents)
    };
  }

  /**
   * Generate JSON export file
   * @param {string} exportId - Export ID
   * @param {Object} userData - User data to export
   * @returns {Promise<Object>} Export file details
   */
  async generateJSONExport(exportId, userData) {
    const fileName = `${exportId}.json`;
    const filePath = path.join(this.exportLocation, fileName);
    
    // Ensure export directory exists
    await fs.mkdir(this.exportLocation, { recursive: true });
    
    // Write JSON file
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
    
    return {
      fileName,
      path: filePath,
      mimeType: 'application/json'
    };
  }

  /**
   * Generate CSV export files (multiple files for different data types)
   * @param {string} exportId - Export ID
   * @param {Object} userData - User data to export
   * @returns {Promise<Object>} Export file details
   */
  async generateCSVExport(exportId, userData) {
    const exportDir = path.join(this.exportLocation, exportId);
    await fs.mkdir(exportDir, { recursive: true });
    
    const csvFiles = [];
    
    // Generate CSV for each data category
    for (const [category, data] of Object.entries(userData)) {
      if (category === 'exportMetadata') continue;
      
      try {
        const csvFile = await this.generateCategoryCSV(exportDir, category, data);
        if (csvFile) csvFiles.push(csvFile);
      } catch (error) {
        console.error(`Failed to generate CSV for ${category}:`, error);
      }
    }
    
    // Create ZIP archive of all CSV files
    const zipFileName = `${exportId}.zip`;
    const zipPath = path.join(this.exportLocation, zipFileName);
    await this.createZipArchive(exportDir, zipPath);
    
    // Clean up individual CSV files
    await fs.rmdir(exportDir, { recursive: true });
    
    return {
      fileName: zipFileName,
      path: zipPath,
      mimeType: 'application/zip'
    };
  }

  /**
   * Generate secure download URL for export file
   * @param {string} filePath - File path
   * @param {string} exportId - Export ID
   * @returns {Promise<string>} Secure download URL
   */
  async generateSecureDownloadUrl(filePath, exportId) {
    // In a real implementation, this would generate a signed URL
    // For now, return a placeholder URL
    const token = Buffer.from(`${exportId}:${Date.now()}`).toString('base64');
    return `/api/exports/download/${token}`;
  }

  /**
   * Sanitize financial data for export (remove sensitive fields)
   * @param {Object} data - Financial data object
   * @returns {Object} Sanitized data
   */
  sanitizeFinancialData(data) {
    const sanitized = { ...data };
    
    // Remove internal IDs and sensitive fields
    delete sanitized.id;
    delete sanitized.userId;
    
    return sanitized;
  }

  /**
   * Calculate account age in days
   * @param {Date} createdAt - Account creation date
   * @returns {number} Account age in days
   */
  calculateAccountAge(createdAt) {
    const now = new Date();
    const diffTime = Math.abs(now - createdAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Summarize activity types from audit logs
   * @param {Array} auditLogs - Audit log entries
   * @returns {Object} Activity type summary
   */
  summarizeActivityTypes(auditLogs) {
    const summary = {};
    
    auditLogs.forEach(log => {
      summary[log.auditType] = (summary[log.auditType] || 0) + 1;
    });
    
    return summary;
  }

  /**
   * Get current consent status for a specific type
   * @param {string} userId - User ID
   * @param {string} consentType - Consent type
   * @returns {Promise<boolean>} Current consent status
   */
  async getConsentStatus(userId, consentType) {
    const consent = await prisma.userConsent.findFirst({
      where: { userId, consentType },
      orderBy: { timestamp: 'desc' }
    });
    
    return consent ? consent.granted : false;
  }

  /**
   * Get current consents from consent history
   * @param {Array} consents - All consent records
   * @returns {Object} Current consent status by type
   */
  getCurrentConsents(consents) {
    const current = {};
    
    consents.forEach(consent => {
      if (!current[consent.consentType] || 
          current[consent.consentType].timestamp < consent.timestamp) {
        current[consent.consentType] = {
          granted: consent.granted,
          timestamp: consent.timestamp,
          version: consent.version
        };
      }
    });
    
    return current;
  }

  /**
   * Create ZIP archive of files
   * @param {string} sourceDir - Source directory
   * @param {string} outputPath - Output ZIP path
   * @returns {Promise<void>}
   */
  async createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Generate CSV file for a data category
   * @param {string} exportDir - Export directory
   * @param {string} category - Data category
   * @param {Object} data - Category data
   * @returns {Promise<string>} CSV file path
   */
  async generateCategoryCSV(exportDir, category, data) {
    // This is a simplified implementation
    // In practice, you'd need more sophisticated CSV generation
    // based on the data structure of each category
    
    const csvPath = path.join(exportDir, `${category}.csv`);
    const csvContent = JSON.stringify(data, null, 2);
    
    await fs.writeFile(csvPath, csvContent);
    return csvPath;
  }
}

module.exports = DataExportService;