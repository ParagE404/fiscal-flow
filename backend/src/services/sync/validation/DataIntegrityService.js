/**
 * Data Integrity Service
 * Integrates validation, anomaly detection, and audit trail services
 * for comprehensive data integrity checks during sync operations
 */

const DataValidationService = require('./DataValidationService');
const AnomalyDetectionService = require('./AnomalyDetectionService');
const AuditTrailService = require('../audit/AuditTrailService');
const { createSyncError, createSyncWarning, SyncErrorTypes } = require('../types/SyncTypes');

class DataIntegrityService {
  constructor(prisma) {
    this.validationService = new DataValidationService();
    this.anomalyService = new AnomalyDetectionService();
    this.auditService = new AuditTrailService(prisma);
    this.prisma = prisma;
  }

  /**
   * Perform comprehensive data integrity check
   * @param {Object} params - Integrity check parameters
   * @returns {Object} Comprehensive integrity check result
   */
  async performIntegrityCheck(params) {
    const {
      userId,
      investmentType,
      investmentId,
      currentData,
      newData,
      historicalData = [],
      sessionId,
      metadata = {}
    } = params;

    const integrityResult = {
      isValid: true,
      canProceed: true,
      quarantine: false,
      validationResult: null,
      anomalyResult: null,
      auditEntries: [],
      recommendations: [],
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Data Validation
      console.log(`Performing data validation for ${investmentType} ${investmentId}`);
      
      let validationResult;
      switch (investmentType) {
        case 'mutual_funds':
          validationResult = await this.validationService.validateMutualFundData(currentData, newData);
          break;
        case 'stocks':
          validationResult = await this.validationService.validateStockData(currentData, newData);
          break;
        case 'epf':
          validationResult = await this.validationService.validateEPFData(currentData, newData);
          break;
        default:
          throw new Error(`Unsupported investment type: ${investmentType}`);
      }

      integrityResult.validationResult = validationResult;
      integrityResult.isValid = validationResult.isValid;
      integrityResult.errors.push(...validationResult.errors);
      integrityResult.warnings.push(...validationResult.warnings);

      // Log validation results
      const validationAudit = await this.auditService.logDataValidation({
        userId,
        investmentType,
        investmentId,
        validationResult,
        data: newData,
        sessionId
      });
      integrityResult.auditEntries.push(validationAudit);

      // Step 2: Anomaly Detection (only if validation passes)
      if (validationResult.isValid) {
        console.log(`Performing anomaly detection for ${investmentType} ${investmentId}`);
        
        let anomalyResult;
        switch (investmentType) {
          case 'mutual_funds':
            anomalyResult = await this.anomalyService.detectMutualFundAnomalies(currentData, newData, historicalData);
            break;
          case 'stocks':
            anomalyResult = await this.anomalyService.detectStockAnomalies(currentData, newData, historicalData);
            break;
          case 'epf':
            anomalyResult = await this.anomalyService.detectEPFAnomalies(currentData, newData, historicalData);
            break;
        }

        integrityResult.anomalyResult = anomalyResult;
        integrityResult.quarantine = anomalyResult.quarantine;
        integrityResult.recommendations.push(...anomalyResult.recommendations);

        // Log anomaly detection results
        if (anomalyResult.hasAnomalies) {
          const anomalyAudit = await this.auditService.logAnomalyDetection({
            userId,
            investmentType,
            investmentId,
            anomalyResult,
            data: newData,
            sessionId
          });
          integrityResult.auditEntries.push(anomalyAudit);

          // Quarantine data if necessary
          if (anomalyResult.quarantine) {
            const quarantineRecord = await this.anomalyService.quarantineData(
              { ...newData, userId, investmentType, investmentId },
              anomalyResult.quarantineReason,
              anomalyResult
            );

            const quarantineAudit = await this.auditService.logDataQuarantine({
              userId,
              investmentType,
              investmentId,
              quarantineRecord,
              sessionId
            });
            integrityResult.auditEntries.push(quarantineAudit);

            // Send admin notification for high severity anomalies
            if (anomalyResult.severity === 'high') {
              await this.anomalyService.sendAdminNotification(anomalyResult, {
                userId,
                investmentType,
                investmentId,
                sessionId
              });
            }
          }
        }
      }

      // Step 3: Determine if processing can proceed
      integrityResult.canProceed = integrityResult.isValid && !integrityResult.quarantine;

      // Step 4: Generate recommendations
      if (!integrityResult.canProceed) {
        if (!integrityResult.isValid) {
          integrityResult.recommendations.push('Fix validation errors before proceeding');
        }
        if (integrityResult.quarantine) {
          integrityResult.recommendations.push('Data has been quarantined for manual review');
        }
      }

      console.log(`Integrity check completed for ${investmentType} ${investmentId}: ${integrityResult.canProceed ? 'PASS' : 'FAIL'}`);

    } catch (error) {
      console.error('Integrity check failed:', error);
      
      integrityResult.isValid = false;
      integrityResult.canProceed = false;
      integrityResult.errors.push(createSyncError({
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: `Integrity check failed: ${error.message}`,
        details: { originalError: error.message }
      }));

      // Log the error
      try {
        await this.auditService.logSyncFailure({
          userId,
          investmentType,
          source: metadata.source || 'unknown',
          error,
          duration: 0,
          sessionId
        });
      } catch (auditError) {
        console.error('Failed to log integrity check error:', auditError);
      }
    }

    return integrityResult;
  }

  /**
   * Validate and process data update
   * @param {Object} params - Data update parameters
   * @returns {Object} Processing result
   */
  async validateAndProcessUpdate(params) {
    const {
      userId,
      investmentType,
      investmentId,
      currentData,
      newData,
      sessionId,
      metadata = {}
    } = params;

    // Get historical data for pattern analysis
    const historicalData = await this.getHistoricalData(userId, investmentType, investmentId);

    // Perform integrity check
    const integrityResult = await this.performIntegrityCheck({
      userId,
      investmentType,
      investmentId,
      currentData,
      newData,
      historicalData,
      sessionId,
      metadata
    });

    const result = {
      success: integrityResult.canProceed,
      processed: false,
      quarantined: integrityResult.quarantine,
      integrityResult,
      updatedData: null
    };

    if (integrityResult.canProceed) {
      try {
        // Process the update
        const updatedData = await this.processDataUpdate({
          userId,
          investmentType,
          investmentId,
          currentData,
          newData,
          sessionId
        });

        result.processed = true;
        result.updatedData = updatedData;

        console.log(`Data update processed successfully for ${investmentType} ${investmentId}`);

      } catch (error) {
        console.error('Failed to process data update:', error);
        result.success = false;
        integrityResult.errors.push(createSyncError({
          type: SyncErrorTypes.DATABASE_ERROR,
          message: `Failed to process update: ${error.message}`,
          details: { originalError: error.message }
        }));
      }
    }

    return result;
  }

  /**
   * Process data update after validation
   * @param {Object} params - Update parameters
   * @returns {Object} Updated data
   */
  async processDataUpdate(params) {
    const {
      userId,
      investmentType,
      investmentId,
      currentData,
      newData,
      sessionId
    } = params;

    let updatedData;

    try {
      switch (investmentType) {
        case 'mutual_funds':
          updatedData = await this.updateMutualFundData(investmentId, currentData, newData);
          break;
        case 'stocks':
          updatedData = await this.updateStockData(investmentId, currentData, newData);
          break;
        case 'epf':
          updatedData = await this.updateEPFData(investmentId, currentData, newData);
          break;
        default:
          throw new Error(`Unsupported investment type: ${investmentType}`);
      }

      // Log the data update
      await this.auditService.logDataUpdates(
        userId,
        investmentType,
        [{
          id: investmentId,
          previousValues: currentData,
          newValues: updatedData,
          source: newData.source || 'unknown'
        }],
        sessionId
      );

      return updatedData;

    } catch (error) {
      console.error('Failed to update data:', error);
      throw error;
    }
  }

  /**
   * Update mutual fund data
   * @param {string} fundId - Fund ID
   * @param {Object} currentData - Current data
   * @param {Object} newData - New data
   * @returns {Object} Updated data
   */
  async updateMutualFundData(fundId, currentData, newData) {
    const updateData = {
      currentValue: this.calculateMutualFundValue(currentData, newData.nav),
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };

    const updatedFund = await this.prisma.mutualFund.update({
      where: { id: fundId },
      data: updateData
    });

    return updatedFund;
  }

  /**
   * Update stock data
   * @param {string} stockId - Stock ID
   * @param {Object} currentData - Current data
   * @param {Object} newData - New data
   * @returns {Object} Updated data
   */
  async updateStockData(stockId, currentData, newData) {
    const currentValue = newData.price * currentData.quantity;
    const pnl = currentValue - currentData.investedAmount;
    const pnlPercentage = (pnl / currentData.investedAmount) * 100;

    const updateData = {
      currentPrice: newData.price,
      currentValue,
      pnl,
      pnlPercentage,
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };

    const updatedStock = await this.prisma.stock.update({
      where: { id: stockId },
      data: updateData
    });

    return updatedStock;
  }

  /**
   * Update EPF data
   * @param {string} epfId - EPF ID
   * @param {Object} currentData - Current data
   * @param {Object} newData - New data
   * @returns {Object} Updated data
   */
  async updateEPFData(epfId, currentData, newData) {
    const updateData = {
      totalBalance: newData.totalBalance,
      employeeContribution: newData.employeeContribution,
      employerContribution: newData.employerContribution,
      pensionFund: newData.pensionFund || currentData.pensionFund,
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };

    const updatedEPF = await this.prisma.epfAccount.update({
      where: { id: epfId },
      data: updateData
    });

    return updatedEPF;
  }

  /**
   * Get historical data for pattern analysis
   * @param {string} userId - User ID
   * @param {string} investmentType - Investment type
   * @param {string} investmentId - Investment ID
   * @returns {Array} Historical data
   */
  async getHistoricalData(userId, investmentType, investmentId) {
    try {
      const changeHistory = await this.auditService.getDataChangeHistory(
        userId,
        investmentType,
        investmentId,
        { limit: 20 }
      );

      return changeHistory.map(change => ({
        ...change.newValues,
        timestamp: change.timestamp
      }));
    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }

  /**
   * Calculate mutual fund current value
   * @param {Object} currentData - Current fund data
   * @param {number} newNAV - New NAV value
   * @returns {number} Current value
   */
  calculateMutualFundValue(currentData, newNAV) {
    // Simple calculation: (invested amount / purchase price) * new NAV
    const units = currentData.investedAmount / (currentData.purchasePrice || 1);
    return units * newNAV;
  }

  /**
   * Get integrity check statistics
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Statistics
   */
  async getIntegrityStatistics(userId, filters = {}) {
    try {
      const validationStats = await this.auditService.getAuditTrail(userId, {
        ...filters,
        auditType: 'data_validated',
        limit: 1000
      });

      const anomalyStats = await this.auditService.getAuditTrail(userId, {
        ...filters,
        auditType: 'anomaly_detected',
        limit: 1000
      });

      const quarantineStats = await this.auditService.getAuditTrail(userId, {
        ...filters,
        auditType: 'data_quarantined',
        limit: 1000
      });

      return {
        totalValidations: validationStats.length,
        validationFailures: validationStats.filter(v => 
          v.details.validationResult && !v.details.validationResult.isValid
        ).length,
        totalAnomalies: anomalyStats.length,
        highSeverityAnomalies: anomalyStats.filter(a => 
          a.details.anomalyResult && a.details.anomalyResult.severity === 'high'
        ).length,
        totalQuarantined: quarantineStats.length,
        validationSuccessRate: validationStats.length > 0 ? 
          ((validationStats.length - validationStats.filter(v => 
            v.details.validationResult && !v.details.validationResult.isValid
          ).length) / validationStats.length) * 100 : 100,
        anomalyDetectionRate: validationStats.length > 0 ? 
          (anomalyStats.length / validationStats.length) * 100 : 0
      };
    } catch (error) {
      console.error('Failed to get integrity statistics:', error);
      return null;
    }
  }
}

module.exports = DataIntegrityService;