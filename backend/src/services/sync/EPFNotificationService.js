const { PrismaClient } = require('@prisma/client');
const { createSyncWarning } = require('./types/SyncTypes');

const prisma = new PrismaClient();

/**
 * EPF Notification Service for handling sync failure notifications and credential expiration alerts
 */
class EPFNotificationService {
  constructor() {
    this.emailService = null; // Will be injected or imported
    this.notificationQueue = [];
    this.maxQueueSize = 1000;
    this.batchSize = 10;
    this.processingInterval = 30000; // 30 seconds
    
    // Notification templates
    this.templates = {
      syncFailure: {
        subject: 'EPF Sync Failed - Action Required',
        priority: 'high'
      },
      credentialExpiry: {
        subject: 'EPF Credentials Need Update',
        priority: 'medium'
      },
      portalDowntime: {
        subject: 'EPF Portal Temporarily Unavailable',
        priority: 'low'
      },
      syncSuccess: {
        subject: 'EPF Data Successfully Updated',
        priority: 'low'
      },
      manualOverride: {
        subject: 'EPF Manual Override Activated',
        priority: 'medium'
      }
    };
    
    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Notify user of EPF sync failure
   * @param {string} userId - User ID
   * @param {Object} syncResult - Sync result with errors
   * @param {Object} context - Additional context
   * @returns {Promise<void>}
   */
  async notifySyncFailure(userId, syncResult, context = {}) {
    try {
      const user = await this.getUser(userId);
      if (!user || !this.shouldNotify(user, 'syncFailure')) {
        return;
      }

      const notification = {
        type: 'syncFailure',
        userId,
        user,
        data: {
          errors: syncResult.errors,
          recordsProcessed: syncResult.recordsProcessed,
          lastSyncAt: syncResult.startTime,
          accountsAffected: context.accountsAffected || [],
          recoveryActions: context.recoveryActions || []
        },
        timestamp: new Date(),
        priority: this.templates.syncFailure.priority
      };

      await this.queueNotification(notification);
    } catch (error) {
      console.error(`Failed to queue sync failure notification for user ${userId}:`, error.message);
    }
  }

  /**
   * Notify user of credential expiration or issues
   * @param {string} userId - User ID
   * @param {Object} credentialInfo - Credential information
   * @returns {Promise<void>}
   */
  async notifyCredentialExpiry(userId, credentialInfo = {}) {
    try {
      const user = await this.getUser(userId);
      if (!user || !this.shouldNotify(user, 'credentialExpiry')) {
        return;
      }

      const notification = {
        type: 'credentialExpiry',
        userId,
        user,
        data: {
          service: 'epfo',
          expiryDate: credentialInfo.expiryDate,
          lastSuccessfulSync: credentialInfo.lastSuccessfulSync,
          failureCount: credentialInfo.failureCount || 0,
          actionRequired: true
        },
        timestamp: new Date(),
        priority: this.templates.credentialExpiry.priority
      };

      await this.queueNotification(notification);
    } catch (error) {
      console.error(`Failed to queue credential expiry notification for user ${userId}:`, error.message);
    }
  }

  /**
   * Notify user of portal downtime
   * @param {string} userId - User ID
   * @param {Object} downtimeInfo - Downtime information
   * @returns {Promise<void>}
   */
  async notifyPortalDowntime(userId, downtimeInfo = {}) {
    try {
      const user = await this.getUser(userId);
      if (!user || !this.shouldNotify(user, 'portalDowntime')) {
        return;
      }

      const notification = {
        type: 'portalDowntime',
        userId,
        user,
        data: {
          downtimeDuration: downtimeInfo.duration,
          estimatedResolution: downtimeInfo.estimatedResolution,
          affectedAccounts: downtimeInfo.affectedAccounts || [],
          nextRetryAt: downtimeInfo.nextRetryAt
        },
        timestamp: new Date(),
        priority: this.templates.portalDowntime.priority
      };

      await this.queueNotification(notification);
    } catch (error) {
      console.error(`Failed to queue portal downtime notification for user ${userId}:`, error.message);
    }
  }

  /**
   * Notify user of successful sync (if enabled)
   * @param {string} userId - User ID
   * @param {Object} syncResult - Successful sync result
   * @returns {Promise<void>}
   */
  async notifySyncSuccess(userId, syncResult) {
    try {
      const user = await this.getUser(userId);
      if (!user || !this.shouldNotify(user, 'syncSuccess')) {
        return;
      }

      const notification = {
        type: 'syncSuccess',
        userId,
        user,
        data: {
          recordsUpdated: syncResult.recordsUpdated,
          totalBalance: syncResult.metadata?.totalBalance,
          lastSyncAt: syncResult.endTime,
          accountsUpdated: syncResult.metadata?.accountsUpdated || []
        },
        timestamp: new Date(),
        priority: this.templates.syncSuccess.priority
      };

      await this.queueNotification(notification);
    } catch (error) {
      console.error(`Failed to queue sync success notification for user ${userId}:`, error.message);
    }
  }

  /**
   * Notify user when manual override is activated
   * @param {string} userId - User ID
   * @param {Object} overrideInfo - Override information
   * @returns {Promise<void>}
   */
  async notifyManualOverride(userId, overrideInfo = {}) {
    try {
      const user = await this.getUser(userId);
      if (!user || !this.shouldNotify(user, 'manualOverride')) {
        return;
      }

      const notification = {
        type: 'manualOverride',
        userId,
        user,
        data: {
          accountId: overrideInfo.accountId,
          accountName: overrideInfo.accountName,
          reason: overrideInfo.reason,
          activatedAt: new Date(),
          syncDisabled: true
        },
        timestamp: new Date(),
        priority: this.templates.manualOverride.priority
      };

      await this.queueNotification(notification);
    } catch (error) {
      console.error(`Failed to queue manual override notification for user ${userId}:`, error.message);
    }
  }

  /**
   * Queue notification for processing
   * @param {Object} notification - Notification to queue
   * @returns {Promise<void>}
   * @private
   */
  async queueNotification(notification) {
    if (this.notificationQueue.length >= this.maxQueueSize) {
      console.warn('Notification queue is full, dropping oldest notifications');
      this.notificationQueue.splice(0, this.batchSize);
    }

    this.notificationQueue.push(notification);
    console.log(`Queued ${notification.type} notification for user ${notification.userId}`);
  }

  /**
   * Process notification queue
   * @private
   */
  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const batch = this.notificationQueue.splice(0, this.batchSize);
    
    for (const notification of batch) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.error(`Failed to send notification:`, error.message);
        // Could implement retry logic here
      }
    }
  }

  /**
   * Send individual notification
   * @param {Object} notification - Notification to send
   * @returns {Promise<void>}
   * @private
   */
  async sendNotification(notification) {
    const { type, user, data } = notification;
    
    // Generate notification content
    const content = this.generateNotificationContent(type, data);
    
    // Send email notification if user has email notifications enabled
    if (user.email && this.shouldSendEmail(user, type)) {
      await this.sendEmailNotification(user, type, content);
    }
    
    // Store in-app notification
    await this.storeInAppNotification(notification.userId, type, content);
    
    console.log(`Sent ${type} notification to user ${notification.userId}`);
  }

  /**
   * Generate notification content based on type and data
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @returns {Object} Generated content
   * @private
   */
  generateNotificationContent(type, data) {
    switch (type) {
      case 'syncFailure':
        return {
          title: 'EPF Sync Failed',
          message: this.generateSyncFailureMessage(data),
          actionRequired: true,
          actions: [
            { label: 'Update Credentials', action: 'update_credentials' },
            { label: 'View Details', action: 'view_sync_log' }
          ]
        };
        
      case 'credentialExpiry':
        return {
          title: 'EPF Credentials Need Update',
          message: this.generateCredentialExpiryMessage(data),
          actionRequired: true,
          actions: [
            { label: 'Update Credentials', action: 'update_credentials' }
          ]
        };
        
      case 'portalDowntime':
        return {
          title: 'EPF Portal Temporarily Unavailable',
          message: this.generatePortalDowntimeMessage(data),
          actionRequired: false,
          actions: []
        };
        
      case 'syncSuccess':
        return {
          title: 'EPF Data Updated Successfully',
          message: this.generateSyncSuccessMessage(data),
          actionRequired: false,
          actions: [
            { label: 'View EPF Dashboard', action: 'view_epf_dashboard' }
          ]
        };
        
      case 'manualOverride':
        return {
          title: 'EPF Manual Override Activated',
          message: this.generateManualOverrideMessage(data),
          actionRequired: false,
          actions: [
            { label: 'Manage Sync Settings', action: 'manage_sync_settings' }
          ]
        };
        
      default:
        return {
          title: 'EPF Notification',
          message: 'An EPF-related event occurred.',
          actionRequired: false,
          actions: []
        };
    }
  }

  /**
   * Generate sync failure message
   * @param {Object} data - Failure data
   * @returns {string} Generated message
   * @private
   */
  generateSyncFailureMessage(data) {
    const errorCount = data.errors?.length || 0;
    const accountCount = data.accountsAffected?.length || 0;
    
    let message = `We encountered ${errorCount} error${errorCount !== 1 ? 's' : ''} while syncing your EPF data`;
    
    if (accountCount > 0) {
      message += ` across ${accountCount} account${accountCount !== 1 ? 's' : ''}`;
    }
    
    message += '. ';
    
    // Add specific error information
    if (data.errors && data.errors.length > 0) {
      const primaryError = data.errors[0];
      if (primaryError.type === 'authentication_failed') {
        message += 'Please check your EPFO login credentials and update them if necessary.';
      } else if (primaryError.type === 'service_unavailable') {
        message += 'The EPFO portal appears to be temporarily unavailable. We\'ll retry automatically.';
      } else {
        message += 'Please check your sync settings or contact support if the issue persists.';
      }
    }
    
    return message;
  }

  /**
   * Generate credential expiry message
   * @param {Object} data - Credential data
   * @returns {string} Generated message
   * @private
   */
  generateCredentialExpiryMessage(data) {
    let message = 'Your EPFO login credentials ';
    
    if (data.expiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(data.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > 0) {
        message += `will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
      } else {
        message += 'have expired';
      }
    } else {
      message += 'need to be updated';
    }
    
    message += '. Please update your credentials to continue automatic EPF data synchronization.';
    
    if (data.failureCount > 0) {
      message += ` We've had ${data.failureCount} failed sync attempt${data.failureCount !== 1 ? 's' : ''} recently.`;
    }
    
    return message;
  }

  /**
   * Generate portal downtime message
   * @param {Object} data - Downtime data
   * @returns {string} Generated message
   * @private
   */
  generatePortalDowntimeMessage(data) {
    let message = 'The EPFO portal is currently unavailable';
    
    if (data.downtimeDuration) {
      const hours = Math.floor(data.downtimeDuration / (1000 * 60 * 60));
      const minutes = Math.floor((data.downtimeDuration % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        message += ` for ${hours} hour${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) {
          message += ` and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
      } else if (minutes > 0) {
        message += ` for ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    }
    
    message += '. We\'ll automatically retry syncing your EPF data once the portal is back online.';
    
    if (data.nextRetryAt) {
      const nextRetry = new Date(data.nextRetryAt);
      message += ` Next retry scheduled for ${nextRetry.toLocaleString()}.`;
    }
    
    return message;
  }

  /**
   * Generate sync success message
   * @param {Object} data - Success data
   * @returns {string} Generated message
   * @private
   */
  generateSyncSuccessMessage(data) {
    let message = 'Your EPF data has been successfully updated';
    
    if (data.recordsUpdated > 0) {
      message += ` with ${data.recordsUpdated} account${data.recordsUpdated !== 1 ? 's' : ''} synchronized`;
    }
    
    message += '.';
    
    if (data.totalBalance) {
      message += ` Your current total EPF balance is ₹${data.totalBalance.toLocaleString()}.`;
    }
    
    return message;
  }

  /**
   * Generate manual override message
   * @param {Object} data - Override data
   * @returns {string} Generated message
   * @private
   */
  generateManualOverrideMessage(data) {
    let message = 'Manual override has been activated';
    
    if (data.accountName) {
      message += ` for your ${data.accountName} EPF account`;
    }
    
    message += '. Automatic synchronization is now disabled for this account.';
    
    if (data.reason) {
      message += ` Reason: ${data.reason}`;
    }
    
    message += ' You can re-enable automatic sync in your settings when ready.';
    
    return message;
  }

  /**
   * Send email notification
   * @param {Object} user - User object
   * @param {string} type - Notification type
   * @param {Object} content - Notification content
   * @returns {Promise<void>}
   * @private
   */
  async sendEmailNotification(user, type, content) {
    // This would integrate with your email service
    // For now, just log the email that would be sent
    console.log(`Email notification for ${user.email}:`, {
      subject: this.templates[type]?.subject || 'EPF Notification',
      title: content.title,
      message: content.message,
      actionRequired: content.actionRequired
    });
    
    // TODO: Implement actual email sending
    // await this.emailService.send({
    //   to: user.email,
    //   subject: this.templates[type]?.subject || 'EPF Notification',
    //   template: 'epf-notification',
    //   data: { user, content }
    // });
  }

  /**
   * Store in-app notification
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} content - Notification content
   * @returns {Promise<void>}
   * @private
   */
  async storeInAppNotification(userId, type, content) {
    try {
      // Store notification in database for in-app display
      // This would require a notifications table in your schema
      console.log(`In-app notification stored for user ${userId}:`, {
        type,
        title: content.title,
        message: content.message,
        actionRequired: content.actionRequired
      });
      
      // TODO: Implement actual database storage
      // await prisma.notification.create({
      //   data: {
      //     userId,
      //     type,
      //     title: content.title,
      //     message: content.message,
      //     actionRequired: content.actionRequired,
      //     actions: JSON.stringify(content.actions),
      //     isRead: false
      //   }
      // });
    } catch (error) {
      console.error(`Failed to store in-app notification:`, error.message);
    }
  }

  /**
   * Get user information
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User object
   * @private
   */
  async getUser(userId) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true
        }
      });
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Check if user should receive notifications of this type
   * @param {Object} user - User object
   * @param {string} notificationType - Type of notification
   * @returns {boolean} True if should notify
   * @private
   */
  shouldNotify(user, notificationType) {
    const preferences = user.preferences || {};
    const syncPreferences = preferences.syncNotifications || {};
    
    // Default notification preferences
    const defaults = {
      syncFailure: true,
      credentialExpiry: true,
      portalDowntime: false,
      syncSuccess: false,
      manualOverride: true
    };
    
    return syncPreferences[notificationType] !== undefined 
      ? syncPreferences[notificationType] 
      : defaults[notificationType];
  }

  /**
   * Check if user should receive email notifications
   * @param {Object} user - User object
   * @param {string} notificationType - Type of notification
   * @returns {boolean} True if should send email
   * @private
   */
  shouldSendEmail(user, notificationType) {
    const preferences = user.preferences || {};
    const emailPreferences = preferences.emailNotifications || {};
    
    // Only send emails for high priority notifications by default
    const emailDefaults = {
      syncFailure: true,
      credentialExpiry: true,
      portalDowntime: false,
      syncSuccess: false,
      manualOverride: false
    };
    
    return emailPreferences[notificationType] !== undefined 
      ? emailPreferences[notificationType] 
      : emailDefaults[notificationType];
  }

  /**
   * Start the notification queue processor
   * @private
   */
  startQueueProcessor() {
    setInterval(async () => {
      try {
        await this.processNotificationQueue();
      } catch (error) {
        console.error('Error processing notification queue:', error.message);
      }
    }, this.processingInterval);
    
    console.log('EPF notification queue processor started');
  }

  /**
   * Get notification queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStatistics() {
    return {
      queueSize: this.notificationQueue.length,
      maxQueueSize: this.maxQueueSize,
      batchSize: this.batchSize,
      processingInterval: this.processingInterval
    };
  }

  /**
   * Clear notification queue (for testing or maintenance)
   */
  clearQueue() {
    this.notificationQueue = [];
    console.log('Notification queue cleared');
  }
}

module.exports = EPFNotificationService;