/**
 * Anomaly Detection Service for Sync Operations
 * Detects unusual patterns and data inconsistencies in investment data
 */

const { createSyncError, createSyncWarning, SyncErrorTypes } = require('../types/SyncTypes');

class AnomalyDetectionService {
  constructor() {
    this.anomalyThresholds = {
      mutualFunds: {
        extremeNavChange: 25, // % change that triggers extreme anomaly
        volumeSpike: 500, // % increase in volume
        consecutiveFailures: 3, // Number of consecutive sync failures
        dataAge: 7 // Days after which data is considered stale
      },
      stocks: {
        extremePriceChange: 30, // % change that triggers extreme anomaly
        volumeSpike: 1000, // % increase in volume
        priceVolatility: 50, // Standard deviation threshold
        consecutiveFailures: 3
      },
      epf: {
        balanceDecrease: 5, // % decrease that's unusual
        contributionSpike: 200, // % increase in contributions
        interestRateAnomaly: 2, // % deviation from expected rate
        consecutiveFailures: 2
      }
    };

    this.quarantineReasons = {
      EXTREME_PRICE_CHANGE: 'extreme_price_change',
      DATA_INCONSISTENCY: 'data_inconsistency',
      SUSPICIOUS_PATTERN: 'suspicious_pattern',
      VALIDATION_FAILURE: 'validation_failure',
      CONSECUTIVE_ERRORS: 'consecutive_errors',
      STALE_DATA: 'stale_data'
    };
  }

  /**
   * Detect anomalies in mutual fund data
   * @param {Object} currentData - Current fund data
   * @param {Object} newData - New NAV data
   * @param {Array} historicalData - Historical NAV data for pattern analysis
   * @returns {Object} Anomaly detection result
   */
  async detectMutualFundAnomalies(currentData, newData, historicalData = []) {
    const result = {
      hasAnomalies: false,
      anomalies: [],
      severity: 'low',
      quarantine: false,
      quarantineReason: null,
      recommendations: []
    };

    try {
      // 1. Extreme NAV change detection
      if (currentData && currentData.currentValue && currentData.investedAmount) {
        const currentNAV = currentData.currentValue / (currentData.investedAmount / currentData.purchasePrice || 1);
        const navChangePercent = Math.abs((newData.nav - currentNAV) / currentNAV) * 100;

        if (navChangePercent > this.anomalyThresholds.mutualFunds.extremeNavChange) {
          result.hasAnomalies = true;
          result.severity = 'high';
          result.quarantine = true;
          result.quarantineReason = this.quarantineReasons.EXTREME_PRICE_CHANGE;

          result.anomalies.push({
            type: 'extreme_nav_change',
            severity: 'high',
            message: `Extreme NAV change detected: ${navChangePercent.toFixed(2)}%`,
            details: {
              previousNAV: currentNAV,
              newNAV: newData.nav,
              changePercent: navChangePercent,
              threshold: this.anomalyThresholds.mutualFunds.extremeNavChange
            },
            timestamp: new Date()
          });

          result.recommendations.push('Manual verification required before applying NAV update');
        }
      }

      // 2. Historical pattern analysis
      if (historicalData.length >= 5) {
        const patternAnomaly = this.analyzeHistoricalPattern(historicalData, newData.nav, 'nav');
        if (patternAnomaly.isAnomalous) {
          result.hasAnomalies = true;
          result.severity = Math.max(result.severity, patternAnomaly.severity);

          result.anomalies.push({
            type: 'pattern_deviation',
            severity: patternAnomaly.severity,
            message: `NAV deviates significantly from historical pattern`,
            details: patternAnomaly.details,
            timestamp: new Date()
          });

          if (patternAnomaly.severity === 'high') {
            result.quarantine = true;
            result.quarantineReason = this.quarantineReasons.SUSPICIOUS_PATTERN;
          }
        }
      }

      // 3. Data consistency checks
      const consistencyCheck = this.checkDataConsistency(newData, 'mutualFund');
      if (!consistencyCheck.isConsistent) {
        result.hasAnomalies = true;
        result.severity = 'medium';
        result.quarantine = true;
        result.quarantineReason = this.quarantineReasons.DATA_INCONSISTENCY;

        result.anomalies.push({
          type: 'data_inconsistency',
          severity: 'medium',
          message: 'Data consistency issues detected',
          details: consistencyCheck.issues,
          timestamp: new Date()
        });

        result.recommendations.push('Verify data source integrity');
      }

      // 4. Stale data detection
      const dataAge = this.calculateDataAge(newData.date);
      if (dataAge > this.anomalyThresholds.mutualFunds.dataAge) {
        result.hasAnomalies = true;
        result.severity = Math.max(result.severity, 'medium');

        result.anomalies.push({
          type: 'stale_data',
          severity: 'medium',
          message: `Data is ${dataAge} days old`,
          details: { dataAge, threshold: this.anomalyThresholds.mutualFunds.dataAge },
          timestamp: new Date()
        });

        result.recommendations.push('Check data source for recent updates');
      }

    } catch (error) {
      result.anomalies.push({
        type: 'detection_error',
        severity: 'low',
        message: `Anomaly detection failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Detect anomalies in stock price data
   * @param {Object} currentData - Current stock data
   * @param {Object} newData - New price data
   * @param {Array} historicalData - Historical price data
   * @returns {Object} Anomaly detection result
   */
  async detectStockAnomalies(currentData, newData, historicalData = []) {
    const result = {
      hasAnomalies: false,
      anomalies: [],
      severity: 'low',
      quarantine: false,
      quarantineReason: null,
      recommendations: []
    };

    try {
      // 1. Extreme price change detection
      if (currentData && currentData.currentPrice) {
        const priceChangePercent = Math.abs((newData.price - currentData.currentPrice) / currentData.currentPrice) * 100;

        if (priceChangePercent > this.anomalyThresholds.stocks.extremePriceChange) {
          result.hasAnomalies = true;
          result.severity = 'high';
          result.quarantine = true;
          result.quarantineReason = this.quarantineReasons.EXTREME_PRICE_CHANGE;

          result.anomalies.push({
            type: 'extreme_price_change',
            severity: 'high',
            message: `Extreme price change detected: ${priceChangePercent.toFixed(2)}%`,
            details: {
              previousPrice: currentData.currentPrice,
              newPrice: newData.price,
              changePercent: priceChangePercent,
              threshold: this.anomalyThresholds.stocks.extremePriceChange
            },
            timestamp: new Date()
          });

          result.recommendations.push('Verify price with multiple data sources');
        }
      }

      // 2. Volume spike detection
      if (currentData && currentData.volume && newData.volume) {
        const volumeChangePercent = ((newData.volume - currentData.volume) / currentData.volume) * 100;

        if (volumeChangePercent > this.anomalyThresholds.stocks.volumeSpike) {
          result.hasAnomalies = true;
          result.severity = Math.max(result.severity, 'medium');

          result.anomalies.push({
            type: 'volume_spike',
            severity: 'medium',
            message: `Unusual volume spike: ${volumeChangePercent.toFixed(2)}% increase`,
            details: {
              previousVolume: currentData.volume,
              newVolume: newData.volume,
              changePercent: volumeChangePercent
            },
            timestamp: new Date()
          });

          result.recommendations.push('Check for corporate actions or news events');
        }
      }

      // 3. Price volatility analysis
      if (historicalData.length >= 10) {
        const volatilityAnomaly = this.analyzeVolatility(historicalData, newData.price);
        if (volatilityAnomaly.isAnomalous) {
          result.hasAnomalies = true;
          result.severity = Math.max(result.severity, volatilityAnomaly.severity);

          result.anomalies.push({
            type: 'high_volatility',
            severity: volatilityAnomaly.severity,
            message: 'Price shows unusual volatility pattern',
            details: volatilityAnomaly.details,
            timestamp: new Date()
          });

          if (volatilityAnomaly.severity === 'high') {
            result.quarantine = true;
            result.quarantineReason = this.quarantineReasons.SUSPICIOUS_PATTERN;
          }
        }
      }

      // 4. Trading halt detection
      if (newData.tradingStatus === 'SUSPENDED' || newData.volume === 0) {
        result.hasAnomalies = true;
        result.severity = Math.max(result.severity, 'medium');

        result.anomalies.push({
          type: 'trading_halt',
          severity: 'medium',
          message: 'Stock appears to be halted or suspended',
          details: {
            tradingStatus: newData.tradingStatus,
            volume: newData.volume
          },
          timestamp: new Date()
        });

        result.recommendations.push('Check exchange announcements for trading halt reasons');
      }

    } catch (error) {
      result.anomalies.push({
        type: 'detection_error',
        severity: 'low',
        message: `Stock anomaly detection failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Detect anomalies in EPF data
   * @param {Object} currentData - Current EPF data
   * @param {Object} newData - New EPF data
   * @param {Array} historicalData - Historical EPF data
   * @returns {Object} Anomaly detection result
   */
  async detectEPFAnomalies(currentData, newData, historicalData = []) {
    const result = {
      hasAnomalies: false,
      anomalies: [],
      severity: 'low',
      quarantine: false,
      quarantineReason: null,
      recommendations: []
    };

    try {
      // 1. Balance decrease detection (unusual for EPF)
      if (currentData && currentData.totalBalance && newData.totalBalance < currentData.totalBalance) {
        const decreasePercent = ((currentData.totalBalance - newData.totalBalance) / currentData.totalBalance) * 100;

        if (decreasePercent > this.anomalyThresholds.epf.balanceDecrease) {
          result.hasAnomalies = true;
          result.severity = 'high';
          result.quarantine = true;
          result.quarantineReason = this.quarantineReasons.SUSPICIOUS_PATTERN;

          result.anomalies.push({
            type: 'balance_decrease',
            severity: 'high',
            message: `Unusual EPF balance decrease: ${decreasePercent.toFixed(2)}%`,
            details: {
              previousBalance: currentData.totalBalance,
              newBalance: newData.totalBalance,
              decreaseAmount: currentData.totalBalance - newData.totalBalance
            },
            timestamp: new Date()
          });

          result.recommendations.push('Verify with EPFO portal directly - balance should not decrease');
        }
      }

      // 2. Contribution spike detection
      if (historicalData.length >= 3) {
        const avgContribution = this.calculateAverageContribution(historicalData);
        const totalNewContribution = newData.employeeContribution + newData.employerContribution;
        
        if (avgContribution > 0) {
          const contributionSpike = ((totalNewContribution - avgContribution) / avgContribution) * 100;

          if (contributionSpike > this.anomalyThresholds.epf.contributionSpike) {
            result.hasAnomalies = true;
            result.severity = 'medium';

            result.anomalies.push({
              type: 'contribution_spike',
              severity: 'medium',
              message: `Unusual contribution increase: ${contributionSpike.toFixed(2)}%`,
              details: {
                averageContribution: avgContribution,
                newContribution: totalNewContribution,
                spikePercent: contributionSpike
              },
              timestamp: new Date()
            });

            result.recommendations.push('Check for salary increase or bonus payments');
          }
        }
      }

      // 3. Interest rate anomaly detection
      if (newData.interestRate && (newData.interestRate < 6 || newData.interestRate > 12)) {
        result.hasAnomalies = true;
        result.severity = 'medium';

        result.anomalies.push({
          type: 'interest_rate_anomaly',
          severity: 'medium',
          message: `Unusual EPF interest rate: ${newData.interestRate}%`,
          details: {
            interestRate: newData.interestRate,
            expectedRange: '6% - 12%'
          },
          timestamp: new Date()
        });

        result.recommendations.push('Verify current EPF interest rate with official sources');
      }

      // 4. Data consistency for EPF rules
      const consistencyCheck = this.checkEPFConsistency(newData);
      if (!consistencyCheck.isConsistent) {
        result.hasAnomalies = true;
        result.severity = Math.max(result.severity, 'medium');
        result.quarantine = true;
        result.quarantineReason = this.quarantineReasons.DATA_INCONSISTENCY;

        result.anomalies.push({
          type: 'epf_rule_violation',
          severity: 'medium',
          message: 'EPF data violates regulatory rules',
          details: consistencyCheck.violations,
          timestamp: new Date()
        });

        result.recommendations.push('Review EPF contribution rules and limits');
      }

    } catch (error) {
      result.anomalies.push({
        type: 'detection_error',
        severity: 'low',
        message: `EPF anomaly detection failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date()
      });
    }

    return result;
  }

  /**
   * Quarantine suspicious data
   * @param {Object} data - Data to quarantine
   * @param {string} reason - Reason for quarantine
   * @param {Object} anomalyResult - Anomaly detection result
   * @returns {Object} Quarantine record
   */
  async quarantineData(data, reason, anomalyResult) {
    const quarantineRecord = {
      id: this.generateQuarantineId(),
      data,
      reason,
      anomalies: anomalyResult.anomalies,
      severity: anomalyResult.severity,
      timestamp: new Date(),
      status: 'quarantined',
      reviewRequired: true,
      autoRelease: false,
      metadata: {
        source: data.source || 'unknown',
        investmentType: data.investmentType || 'unknown',
        userId: data.userId || null
      }
    };

    // In a real implementation, this would save to database
    console.warn('Data quarantined:', quarantineRecord);

    return quarantineRecord;
  }

  /**
   * Send admin notification for suspicious data
   * @param {Object} anomalyResult - Anomaly detection result
   * @param {Object} context - Additional context
   */
  async sendAdminNotification(anomalyResult, context = {}) {
    const notification = {
      type: 'anomaly_detected',
      severity: anomalyResult.severity,
      timestamp: new Date(),
      message: `${anomalyResult.anomalies.length} anomalies detected in ${context.investmentType || 'investment'} data`,
      details: {
        anomalies: anomalyResult.anomalies,
        quarantined: anomalyResult.quarantine,
        recommendations: anomalyResult.recommendations,
        context
      }
    };

    // In a real implementation, this would send email/slack notification
    console.warn('Admin notification:', notification);

    return notification;
  }

  /**
   * Analyze historical pattern for anomalies
   * @param {Array} historicalData - Historical data points
   * @param {number} newValue - New value to compare
   * @param {string} field - Field name being analyzed
   * @returns {Object} Pattern analysis result
   */
  analyzeHistoricalPattern(historicalData, newValue, field) {
    try {
      const values = historicalData.map(item => item[field]).filter(val => val != null);
      
      if (values.length < 3) {
        return { isAnomalous: false, severity: 'low' };
      }

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Z-score calculation
      const zScore = Math.abs((newValue - mean) / stdDev);

      let severity = 'low';
      let isAnomalous = false;

      if (zScore > 3) {
        severity = 'high';
        isAnomalous = true;
      } else if (zScore > 2) {
        severity = 'medium';
        isAnomalous = true;
      }

      return {
        isAnomalous,
        severity,
        details: {
          zScore,
          mean,
          stdDev,
          newValue,
          threshold: 2
        }
      };
    } catch (error) {
      return { isAnomalous: false, severity: 'low', error: error.message };
    }
  }

  /**
   * Analyze price volatility
   * @param {Array} historicalData - Historical price data
   * @param {number} newPrice - New price
   * @returns {Object} Volatility analysis result
   */
  analyzeVolatility(historicalData, newPrice) {
    try {
      const prices = historicalData.map(item => item.price || item.nav).filter(price => price != null);
      
      if (prices.length < 5) {
        return { isAnomalous: false, severity: 'low' };
      }

      // Calculate returns
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      }

      // Calculate volatility (standard deviation of returns)
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // Convert to percentage

      const currentReturn = (newPrice - prices[prices.length - 1]) / prices[prices.length - 1];
      const returnDeviation = Math.abs(currentReturn - meanReturn) / Math.sqrt(variance);

      let severity = 'low';
      let isAnomalous = false;

      if (volatility > this.anomalyThresholds.stocks.priceVolatility || returnDeviation > 3) {
        severity = 'high';
        isAnomalous = true;
      } else if (volatility > this.anomalyThresholds.stocks.priceVolatility * 0.7 || returnDeviation > 2) {
        severity = 'medium';
        isAnomalous = true;
      }

      return {
        isAnomalous,
        severity,
        details: {
          volatility,
          returnDeviation,
          currentReturn: currentReturn * 100,
          threshold: this.anomalyThresholds.stocks.priceVolatility
        }
      };
    } catch (error) {
      return { isAnomalous: false, severity: 'low', error: error.message };
    }
  }

  /**
   * Check data consistency
   * @param {Object} data - Data to check
   * @param {string} type - Data type
   * @returns {Object} Consistency check result
   */
  checkDataConsistency(data, type) {
    const result = {
      isConsistent: true,
      issues: []
    };

    try {
      switch (type) {
        case 'mutualFund':
          if (data.nav && data.nav <= 0) {
            result.isConsistent = false;
            result.issues.push('NAV cannot be zero or negative');
          }
          if (data.date && new Date(data.date) > new Date()) {
            result.isConsistent = false;
            result.issues.push('NAV date cannot be in the future');
          }
          break;

        case 'stock':
          if (data.price && data.price <= 0) {
            result.isConsistent = false;
            result.issues.push('Stock price cannot be zero or negative');
          }
          if (data.volume && data.volume < 0) {
            result.isConsistent = false;
            result.issues.push('Volume cannot be negative');
          }
          break;

        case 'epf':
          if (data.totalBalance && data.totalBalance < 0) {
            result.isConsistent = false;
            result.issues.push('EPF balance cannot be negative');
          }
          if (data.employeeContribution < 0 || data.employerContribution < 0) {
            result.isConsistent = false;
            result.issues.push('Contributions cannot be negative');
          }
          break;
      }
    } catch (error) {
      result.isConsistent = false;
      result.issues.push(`Consistency check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Check EPF-specific consistency rules
   * @param {Object} data - EPF data
   * @returns {Object} Consistency check result
   */
  checkEPFConsistency(data) {
    const result = {
      isConsistent: true,
      violations: []
    };

    try {
      // Rule 1: Employee contribution should not exceed 12% of basic salary (assuming max salary of ₹15,000)
      const maxEmployeeContribution = 1800; // 12% of ₹15,000
      if (data.employeeContribution > maxEmployeeContribution) {
        result.violations.push(`Employee contribution exceeds regulatory limit: ₹${data.employeeContribution} > ₹${maxEmployeeContribution}`);
      }

      // Rule 2: Employer contribution should match employee contribution for salaries <= ₹15,000
      if (data.employeeContribution <= 1800) {
        const contributionDiff = Math.abs(data.employerContribution - data.employeeContribution);
        if (contributionDiff > 10) { // Small tolerance for rounding
          result.violations.push(`Employer contribution should match employee contribution for basic salary <= ₹15,000`);
        }
      }

      // Rule 3: Total balance should increase over time (except for withdrawals)
      if (data.previousBalance && data.totalBalance < data.previousBalance) {
        const decrease = data.previousBalance - data.totalBalance;
        if (decrease > (data.employeeContribution + data.employerContribution) * 0.1) {
          result.violations.push(`Unusual balance decrease detected: ₹${decrease}`);
        }
      }

      if (result.violations.length > 0) {
        result.isConsistent = false;
      }
    } catch (error) {
      result.isConsistent = false;
      result.violations.push(`EPF consistency check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Calculate average contribution from historical data
   * @param {Array} historicalData - Historical EPF data
   * @returns {number} Average contribution
   */
  calculateAverageContribution(historicalData) {
    try {
      const contributions = historicalData
        .map(item => (item.employeeContribution || 0) + (item.employerContribution || 0))
        .filter(contrib => contrib > 0);

      if (contributions.length === 0) return 0;

      return contributions.reduce((sum, contrib) => sum + contrib, 0) / contributions.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate data age in days
   * @param {Date} dataDate - Date of the data
   * @returns {number} Age in days
   */
  calculateDataAge(dataDate) {
    const now = new Date();
    const date = new Date(dataDate);
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate unique quarantine ID
   * @returns {string} Quarantine ID
   */
  generateQuarantineId() {
    return `QTN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get anomaly thresholds for a specific investment type
   * @param {string} investmentType - Type of investment
   * @returns {Object} Thresholds configuration
   */
  getAnomalyThresholds(investmentType) {
    return this.anomalyThresholds[investmentType] || {};
  }

  /**
   * Update anomaly thresholds
   * @param {string} investmentType - Type of investment
   * @param {Object} newThresholds - New threshold values
   */
  updateAnomalyThresholds(investmentType, newThresholds) {
    if (this.anomalyThresholds[investmentType]) {
      this.anomalyThresholds[investmentType] = {
        ...this.anomalyThresholds[investmentType],
        ...newThresholds
      };
    }
  }
}

module.exports = AnomalyDetectionService;