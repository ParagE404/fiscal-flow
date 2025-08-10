/**
 * Audit Trail Service for Sync Operations
 * Provides comprehensive logging and tracking of all sync operations and data changes
 */

const { createSyncError, SyncErrorTypes } = require('../types/SyncTypes');

class AuditTrailService {
  constructor(prisma) {
    this.prisma = prisma;
    this.auditTypes = {
      SYNC_STARTED: 'sync_started',
      SYNC_COMPLETED: 'sync_completed',
      SYNC_FAILED: 'sync_failed',
      DATA_UPDATED: 'data_updated',
      DATA_VALIDATED: 'data_validated',
      DATA_QUARANTINED: 'data_quarantined',
      ANOMALY_DETECTED: 'anomaly_detected',
      MANUAL_OVERRIDE: 'manual_override',
      CONFIGURATION_CHANGED: 'configuration_changed',
      CREDENTIAL_UPDATED: 'credential_updated'
    };
  }

  /**
   * Log sync operation start
   * @param {Object} params - Sync operation parameters
   * @returns {Object} Audit log entry
   */
  async logSyncStart(params) {
    const {
      userId,
      investmentType,
      source,
      options = {},
      metadata = {}
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.SYNC_STARTED,
      investmentType,
      source,
      timestamp: new Date(),
      details: {
        options,
        metadata,
        sessionId: this.generateSessionId()
      },
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log sync start:', error);
      return auditEntry;
    }
  }

  /**
   * Log sync operation completion
   * @param {Object} params - Sync completion parameters
   * @returns {Object} Audit log entry
   */
  async logSyncCompletion(params) {
    const {
      userId,
      investmentType,
      source,
      result,
      duration,
      sessionId,
      metadata = {}
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.SYNC_COMPLETED,
      investmentType,
      source,
      timestamp: new Date(),
      details: {
        result: {
          success: result.success,
          recordsProcessed: result.recordsProcessed,
          recordsUpdated: result.recordsUpdated,
          recordsSkipped: result.recordsSkipped,
          errorCount: result.errors?.length || 0,
          warningCount: result.warnings?.length || 0
        },
        duration,
        sessionId,
        metadata
      }
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      
      // Also log individual data updates
      if (result.updatedRecords && result.updatedRecords.length > 0) {
        await this.logDataUpdates(userId, investmentType, result.updatedRecords, sessionId);
      }

      return savedEntry;
    } catch (error) {
      console.error('Failed to log sync completion:', error);
      return auditEntry;
    }
  }

  /**
   * Log sync operation failure
   * @param {Object} params - Sync failure parameters
   * @returns {Object} Audit log entry
   */
  async logSyncFailure(params) {
    const {
      userId,
      investmentType,
      source,
      error,
      duration,
      sessionId,
      metadata = {}
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.SYNC_FAILED,
      investmentType,
      source,
      timestamp: new Date(),
      details: {
        error: {
          type: error.type || 'unknown_error',
          message: error.message,
          code: error.code || null,
          stack: error.stack || null
        },
        duration,
        sessionId,
        metadata
      }
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log sync failure:', error);
      return auditEntry;
    }
  }

  /**
   * Log data updates for individual investments
   * @param {string} userId - User ID
   * @param {string} investmentType - Type of investment
   * @param {Array} updatedRecords - Array of updated records
   * @param {string} sessionId - Sync session ID
   * @returns {Array} Array of audit log entries
   */
  async logDataUpdates(userId, investmentType, updatedRecords, sessionId) {
    const auditEntries = [];

    for (const record of updatedRecords) {
      const auditEntry = {
        userId,
        auditType: this.auditTypes.DATA_UPDATED,
        investmentType,
        investmentId: record.id,
        timestamp: new Date(),
        details: {
          previousValues: record.previousValues || {},
          newValues: record.newValues || {},
          changes: this.calculateChanges(record.previousValues, record.newValues),
          sessionId,
          source: record.source || 'unknown'
        }
      };

      try {
        const savedEntry = await this.saveAuditEntry(auditEntry);
        auditEntries.push(savedEntry);
      } catch (error) {
        console.error('Failed to log data update:', error);
        auditEntries.push(auditEntry);
      }
    }

    return auditEntries;
  }

  /**
   * Log data validation results
   * @param {Object} params - Validation parameters
   * @returns {Object} Audit log entry
   */
  async logDataValidation(params) {
    const {
      userId,
      investmentType,
      investmentId,
      validationResult,
      data,
      sessionId
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.DATA_VALIDATED,
      investmentType,
      investmentId,
      timestamp: new Date(),
      details: {
        validationResult: {
          isValid: validationResult.isValid,
          errorCount: validationResult.errors?.length || 0,
          warningCount: validationResult.warnings?.length || 0,
          flagCount: validationResult.flags?.length || 0
        },
        errors: validationResult.errors || [],
        warnings: validationResult.warnings || [],
        flags: validationResult.flags || [],
        dataHash: this.calculateDataHash(data),
        sessionId
      }
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log data validation:', error);
      return auditEntry;
    }
  }

  /**
   * Log anomaly detection results
   * @param {Object} params - Anomaly detection parameters
   * @returns {Object} Audit log entry
   */
  async logAnomalyDetection(params) {
    const {
      userId,
      investmentType,
      investmentId,
      anomalyResult,
      data,
      sessionId
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.ANOMALY_DETECTED,
      investmentType,
      investmentId,
      timestamp: new Date(),
      details: {
        anomalyResult: {
          hasAnomalies: anomalyResult.hasAnomalies,
          severity: anomalyResult.severity,
          quarantine: anomalyResult.quarantine,
          quarantineReason: anomalyResult.quarantineReason,
          anomalyCount: anomalyResult.anomalies?.length || 0
        },
        anomalies: anomalyResult.anomalies || [],
        recommendations: anomalyResult.recommendations || [],
        dataHash: this.calculateDataHash(data),
        sessionId
      }
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log anomaly detection:', error);
      return auditEntry;
    }
  }

  /**
   * Log data quarantine action
   * @param {Object} params - Quarantine parameters
   * @returns {Object} Audit log entry
   */
  async logDataQuarantine(params) {
    const {
      userId,
      investmentType,
      investmentId,
      quarantineRecord,
      sessionId
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.DATA_QUARANTINED,
      investmentType,
      investmentId,
      timestamp: new Date(),
      details: {
        quarantineId: quarantineRecord.id,
        reason: quarantineRecord.reason,
        severity: quarantineRecord.severity,
        reviewRequired: quarantineRecord.reviewRequired,
        autoRelease: quarantineRecord.autoRelease,
        sessionId
      }
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log data quarantine:', error);
      return auditEntry;
    }
  }

  /**
   * Log manual override actions
   * @param {Object} params - Manual override parameters
   * @returns {Object} Audit log entry
   */
  async logManualOverride(params) {
    const {
      userId,
      investmentType,
      investmentId,
      previousValues,
      newValues,
      reason,
      metadata = {}
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.MANUAL_OVERRIDE,
      investmentType,
      investmentId,
      timestamp: new Date(),
      details: {
        previousValues,
        newValues,
        changes: this.calculateChanges(previousValues, newValues),
        reason,
        metadata
      },
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log manual override:', error);
      return auditEntry;
    }
  }

  /**
   * Log configuration changes
   * @param {Object} params - Configuration change parameters
   * @returns {Object} Audit log entry
   */
  async logConfigurationChange(params) {
    const {
      userId,
      configurationType,
      previousConfig,
      newConfig,
      metadata = {}
    } = params;

    const auditEntry = {
      userId,
      auditType: this.auditTypes.CONFIGURATION_CHANGED,
      timestamp: new Date(),
      details: {
        configurationType,
        previousConfig,
        newConfig,
        changes: this.calculateChanges(previousConfig, newConfig),
        metadata
      },
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null
    };

    try {
      const savedEntry = await this.saveAuditEntry(auditEntry);
      return savedEntry;
    } catch (error) {
      console.error('Failed to log configuration change:', error);
      return auditEntry;
    }
  }

  /**
   * Get audit trail for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Array} Array of audit entries
   */
  async getAuditTrail(userId, filters = {}) {
    const {
      investmentType,
      investmentId,
      auditType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    try {
      const whereClause = { userId };

      if (investmentType) whereClause.investmentType = investmentType;
      if (investmentId) whereClause.investmentId = investmentId;
      if (auditType) whereClause.auditType = auditType;
      if (startDate) whereClause.timestamp = { ...whereClause.timestamp, gte: startDate };
      if (endDate) whereClause.timestamp = { ...whereClause.timestamp, lte: endDate };

      const auditEntries = await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      return auditEntries;
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get data change history for an investment
   * @param {string} userId - User ID
   * @param {string} investmentType - Investment type
   * @param {string} investmentId - Investment ID
   * @param {Object} options - Query options
   * @returns {Array} Array of data changes
   */
  async getDataChangeHistory(userId, investmentType, investmentId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    try {
      const auditEntries = await this.prisma.auditLog.findMany({
        where: {
          userId,
          investmentType,
          investmentId,
          auditType: this.auditTypes.DATA_UPDATED
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      return auditEntries.map(entry => ({
        timestamp: entry.timestamp,
        previousValues: entry.details.previousValues,
        newValues: entry.details.newValues,
        changes: entry.details.changes,
        source: entry.details.source,
        sessionId: entry.details.sessionId
      }));
    } catch (error) {
      console.error('Failed to get data change history:', error);
      return [];
    }
  }

  /**
   * Export audit trail data
   * @param {string} userId - User ID
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {Object} Export result
   */
  async exportAuditTrail(userId, filters = {}, format = 'json') {
    try {
      const auditEntries = await this.getAuditTrail(userId, { ...filters, limit: 10000 });

      if (format === 'csv') {
        return this.convertToCSV(auditEntries);
      }

      return {
        format: 'json',
        data: auditEntries,
        exportedAt: new Date(),
        totalRecords: auditEntries.length,
        filters
      };
    } catch (error) {
      console.error('Failed to export audit trail:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Get sync operation statistics
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Statistics
   */
  async getSyncStatistics(userId, filters = {}) {
    const { investmentType, startDate, endDate } = filters;

    try {
      const whereClause = {
        userId,
        auditType: { in: [this.auditTypes.SYNC_COMPLETED, this.auditTypes.SYNC_FAILED] }
      };

      if (investmentType) whereClause.investmentType = investmentType;
      if (startDate) whereClause.timestamp = { ...whereClause.timestamp, gte: startDate };
      if (endDate) whereClause.timestamp = { ...whereClause.timestamp, lte: endDate };

      const syncEntries = await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      });

      const stats = {
        totalSyncs: syncEntries.length,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalRecordsProcessed: 0,
        totalRecordsUpdated: 0,
        averageDuration: 0,
        syncsByType: {},
        syncsBySource: {},
        recentSyncs: syncEntries.slice(0, 10)
      };

      let totalDuration = 0;

      syncEntries.forEach(entry => {
        const isSuccess = entry.auditType === this.auditTypes.SYNC_COMPLETED;
        
        if (isSuccess) {
          stats.successfulSyncs++;
          stats.totalRecordsProcessed += entry.details.result?.recordsProcessed || 0;
          stats.totalRecordsUpdated += entry.details.result?.recordsUpdated || 0;
        } else {
          stats.failedSyncs++;
        }

        totalDuration += entry.details.duration || 0;

        // Group by investment type
        const type = entry.investmentType || 'unknown';
        stats.syncsByType[type] = (stats.syncsByType[type] || 0) + 1;

        // Group by source
        const source = entry.source || 'unknown';
        stats.syncsBySource[source] = (stats.syncsBySource[source] || 0) + 1;
      });

      stats.averageDuration = syncEntries.length > 0 ? totalDuration / syncEntries.length : 0;
      stats.successRate = syncEntries.length > 0 ? (stats.successfulSyncs / syncEntries.length) * 100 : 0;

      return stats;
    } catch (error) {
      console.error('Failed to get sync statistics:', error);
      return null;
    }
  }

  /**
   * Save audit entry to database
   * @param {Object} auditEntry - Audit entry to save
   * @returns {Object} Saved audit entry
   */
  async saveAuditEntry(auditEntry) {
    try {
      const savedEntry = await this.prisma.auditLog.create({
        data: {
          userId: auditEntry.userId,
          auditType: auditEntry.auditType,
          investmentType: auditEntry.investmentType || null,
          investmentId: auditEntry.investmentId || null,
          source: auditEntry.source || null,
          timestamp: auditEntry.timestamp,
          details: auditEntry.details,
          ipAddress: auditEntry.ipAddress || null,
          userAgent: auditEntry.userAgent || null
        }
      });

      return savedEntry;
    } catch (error) {
      console.error('Failed to save audit entry:', error);
      throw error;
    }
  }

  /**
   * Calculate changes between old and new values
   * @param {Object} oldValues - Previous values
   * @param {Object} newValues - New values
   * @returns {Object} Changes object
   */
  calculateChanges(oldValues = {}, newValues = {}) {
    const changes = {};

    // Find added/modified fields
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          from: oldValues[key],
          to: newValues[key],
          type: oldValues.hasOwnProperty(key) ? 'modified' : 'added'
        };
      }
    });

    // Find removed fields
    Object.keys(oldValues).forEach(key => {
      if (!newValues.hasOwnProperty(key)) {
        changes[key] = {
          from: oldValues[key],
          to: null,
          type: 'removed'
        };
      }
    });

    return changes;
  }

  /**
   * Calculate hash of data for integrity checking
   * @param {Object} data - Data to hash
   * @returns {string} Data hash
   */
  calculateDataHash(data) {
    try {
      const crypto = require('crypto');
      const dataString = JSON.stringify(data, Object.keys(data).sort());
      return crypto.createHash('sha256').update(dataString).digest('hex');
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `SYNC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert audit entries to CSV format
   * @param {Array} auditEntries - Audit entries
   * @returns {Object} CSV export result
   */
  convertToCSV(auditEntries) {
    try {
      const headers = [
        'Timestamp',
        'Audit Type',
        'Investment Type',
        'Investment ID',
        'Source',
        'Details',
        'IP Address',
        'User Agent'
      ];

      const csvRows = [headers.join(',')];

      auditEntries.forEach(entry => {
        const row = [
          entry.timestamp.toISOString(),
          entry.auditType,
          entry.investmentType || '',
          entry.investmentId || '',
          entry.source || '',
          JSON.stringify(entry.details).replace(/"/g, '""'),
          entry.ipAddress || '',
          entry.userAgent || ''
        ];

        csvRows.push(row.map(field => `"${field}"`).join(','));
      });

      return {
        format: 'csv',
        data: csvRows.join('\n'),
        exportedAt: new Date(),
        totalRecords: auditEntries.length
      };
    } catch (error) {
      throw new Error(`CSV conversion failed: ${error.message}`);
    }
  }

  /**
   * Clean up old audit entries
   * @param {number} retentionDays - Number of days to retain
   * @returns {Object} Cleanup result
   */
  async cleanupOldEntries(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      return {
        deletedCount: result.count,
        cutoffDate,
        retentionDays
      };
    } catch (error) {
      console.error('Failed to cleanup old audit entries:', error);
      throw error;
    }
  }
}

module.exports = AuditTrailService;