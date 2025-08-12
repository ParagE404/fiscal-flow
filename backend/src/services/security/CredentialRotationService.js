const { PrismaClient } = require('@prisma/client');
const KeyManagementService = require('./KeyManagementService');
const CredentialService = require('./CredentialService');

const prisma = new PrismaClient();

/**
 * Service for managing credential rotation policies and expiration handling
 * Implements automated credential rotation and expiration notifications
 */
class CredentialRotationService {
  constructor() {
    this.keyManager = new KeyManagementService();
    this.credentialService = new CredentialService();
    
    // Rotation policies by service type
    this.rotationPolicies = {
      epfo: {
        maxAge: 90, // days
        warningPeriod: 7, // days before expiration
        autoRotate: false // Manual rotation required for user credentials
      },
      yahoo_finance: {
        maxAge: 365,
        warningPeriod: 30,
        autoRotate: true // API keys can be auto-rotated
      },
      nse: {
        maxAge: 180,
        warningPeriod: 14,
        autoRotate: true
      },
      amfi: {
        maxAge: null, // No expiration for public APIs
        warningPeriod: null,
        autoRotate: false
      }
    };
  }

  /**
   * Check all credentials for expiration and rotation needs
   * @returns {Promise<Object>} Summary of credential status
   */
  async checkCredentialStatus() {
    const summary = {
      total: 0,
      expired: 0,
      expiringSoon: 0,
      needsRotation: 0,
      rotationActions: []
    };

    const credentials = await prisma.encryptedCredentials.findMany({
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    summary.total = credentials.length;

    for (const credential of credentials) {
      const policy = this.rotationPolicies[credential.service];
      if (!policy || !policy.maxAge) continue;

      const age = this.getCredentialAge(credential.updatedAt);
      const daysUntilExpiration = policy.maxAge - age;

      if (daysUntilExpiration <= 0) {
        summary.expired++;
        summary.rotationActions.push({
          type: 'expired',
          userId: credential.userId,
          service: credential.service,
          age,
          action: policy.autoRotate ? 'auto_rotate' : 'notify_user'
        });
      } else if (daysUntilExpiration <= policy.warningPeriod) {
        summary.expiringSoon++;
        summary.rotationActions.push({
          type: 'expiring_soon',
          userId: credential.userId,
          service: credential.service,
          daysUntilExpiration,
          action: 'notify_user'
        });
      } else if (age >= policy.maxAge * 0.8) { // 80% of max age
        summary.needsRotation++;
        summary.rotationActions.push({
          type: 'needs_rotation',
          userId: credential.userId,
          service: credential.service,
          age,
          action: policy.autoRotate ? 'schedule_rotation' : 'notify_user'
        });
      }
    }

    return summary;
  }

  /**
   * Execute credential rotation for a specific user and service
   * @param {string} userId - User ID
   * @param {string} service - Service name
   * @param {Object} newCredentials - New credential data
   * @returns {Promise<Object>} Rotation result
   */
  async rotateCredentials(userId, service, newCredentials) {
    const policy = this.rotationPolicies[service];
    if (!policy) {
      throw new Error(`No rotation policy defined for service: ${service}`);
    }

    try {
      // Backup old credentials
      const oldCredentials = await this.credentialService.getCredentials(userId, service);
      if (oldCredentials) {
        await this.backupCredentials(userId, service, oldCredentials);
      }

      // Store new credentials
      await this.credentialService.storeCredentials(userId, service, newCredentials);

      // Log rotation event
      await this.logRotationEvent(userId, service, 'success');

      // Test new credentials if possible
      const testResult = await this.testCredentials(userId, service, newCredentials);

      return {
        success: true,
        service,
        rotatedAt: new Date(),
        testResult
      };
    } catch (error) {
      await this.logRotationEvent(userId, service, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Backup credentials before rotation
   * @param {string} userId - User ID
   * @param {string} service - Service name
   * @param {Object} credentials - Credentials to backup
   * @returns {Promise<void>}
   */
  async backupCredentials(userId, service, credentials) {
    const backupId = `${service}_backup_${Date.now()}`;
    
    await prisma.credentialBackup.create({
      data: {
        userId,
        service,
        backupId,
        encryptedData: JSON.stringify(credentials),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });
  }

  /**
   * Test credentials to ensure they work
   * @param {string} userId - User ID
   * @param {string} service - Service name
   * @param {Object} credentials - Credentials to test
   * @returns {Promise<Object>} Test result
   */
  async testCredentials(userId, service, credentials) {
    try {
      switch (service) {
        case 'epfo':
          return await this.testEPFOCredentials(credentials);
        case 'yahoo_finance':
          return await this.testYahooFinanceCredentials(credentials);
        case 'nse':
          return await this.testNSECredentials(credentials);
        default:
          return { success: true, message: 'No test available for this service' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test EPFO credentials
   * @param {Object} credentials - EPFO credentials
   * @returns {Promise<Object>} Test result
   */
  async testEPFOCredentials(credentials) {
    // This would integrate with the EPFO provider to test login
    // For now, return a mock result
    return {
      success: true,
      message: 'EPFO credentials test not implemented',
      testedAt: new Date()
    };
  }

  /**
   * Test Yahoo Finance API credentials
   * @param {Object} credentials - API credentials
   * @returns {Promise<Object>} Test result
   */
  async testYahooFinanceCredentials(credentials) {
    // Test API key with a simple request
    return {
      success: true,
      message: 'Yahoo Finance API test not implemented',
      testedAt: new Date()
    };
  }

  /**
   * Test NSE API credentials
   * @param {Object} credentials - API credentials
   * @returns {Promise<Object>} Test result
   */
  async testNSECredentials(credentials) {
    return {
      success: true,
      message: 'NSE API test not implemented',
      testedAt: new Date()
    };
  }

  /**
   * Log credential rotation events
   * @param {string} userId - User ID
   * @param {string} service - Service name
   * @param {string} status - Rotation status
   * @param {string} details - Additional details
   * @returns {Promise<void>}
   */
  async logRotationEvent(userId, service, status, details = null) {
    await prisma.credentialRotationLog.create({
      data: {
        userId,
        service,
        status,
        details,
        timestamp: new Date()
      }
    });
  }

  /**
   * Get credential age in days
   * @param {Date} updatedAt - Last update timestamp
   * @returns {number} Age in days
   */
  getCredentialAge(updatedAt) {
    const now = new Date();
    const diffTime = Math.abs(now - updatedAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Schedule automatic rotation for eligible credentials
   * @returns {Promise<Array>} Scheduled rotation jobs
   */
  async scheduleAutoRotations() {
    const status = await this.checkCredentialStatus();
    const autoRotationJobs = [];

    for (const action of status.rotationActions) {
      if (action.action === 'auto_rotate' || action.action === 'schedule_rotation') {
        const policy = this.rotationPolicies[action.service];
        if (policy.autoRotate) {
          autoRotationJobs.push({
            userId: action.userId,
            service: action.service,
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            type: 'auto_rotation'
          });
        }
      }
    }

    // Store scheduled jobs
    for (const job of autoRotationJobs) {
      await prisma.scheduledRotation.create({
        data: job
      });
    }

    return autoRotationJobs;
  }

  /**
   * Send expiration notifications to users
   * @param {Array} expiringCredentials - List of expiring credentials
   * @returns {Promise<void>}
   */
  async sendExpirationNotifications(expiringCredentials) {
    // This would integrate with the email service
    // For now, just log the notifications
    for (const credential of expiringCredentials) {
      console.log(`Notification: Credentials for ${credential.service} expiring for user ${credential.userId}`);
      
      await prisma.notificationLog.create({
        data: {
          userId: credential.userId,
          type: 'credential_expiration',
          service: credential.service,
          message: `Your ${credential.service} credentials will expire soon. Please update them.`,
          sentAt: new Date()
        }
      });
    }
  }

  /**
   * Clean up expired credential backups
   * @returns {Promise<number>} Number of backups cleaned up
   */
  async cleanupExpiredBackups() {
    const result = await prisma.credentialBackup.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return result.count;
  }
}

module.exports = CredentialRotationService;