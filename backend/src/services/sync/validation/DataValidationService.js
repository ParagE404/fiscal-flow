/**
 * Data Validation Service for Sync Operations
 * Implements validation rules for synced investment data
 */

const { createSyncError, createSyncWarning, SyncErrorTypes } = require('../types/SyncTypes');

class DataValidationService {
  constructor() {
    this.validationRules = {
      mutualFunds: this.getMutualFundValidationRules(),
      stocks: this.getStockValidationRules(),
      epf: this.getEPFValidationRules()
    };
  }

  /**
   * Validate mutual fund NAV data
   * @param {Object} currentData - Current fund data
   * @param {Object} newData - New NAV data to validate
   * @returns {Object} Validation result
   */
  async validateMutualFundData(currentData, newData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      flags: []
    };

    try {
      // Rule 1: NAV must be positive
      if (newData.nav <= 0) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Invalid NAV value: ${newData.nav}. NAV must be positive.`,
          details: { nav: newData.nav, isin: newData.isin }
        }));
        result.isValid = false;
      }

      // Rule 2: Flag NAV changes > 10% in single day
      if (currentData && currentData.currentValue && currentData.investedAmount) {
        const currentNAV = currentData.currentValue / (currentData.investedAmount / currentData.purchasePrice || 1);
        const navChangePercent = Math.abs((newData.nav - currentNAV) / currentNAV) * 100;

        if (navChangePercent > 10) {
          result.warnings.push(createSyncWarning({
            type: 'large_nav_change',
            message: `Large NAV change detected: ${navChangePercent.toFixed(2)}% change from ${currentNAV.toFixed(2)} to ${newData.nav}`,
            details: { 
              previousNAV: currentNAV, 
              newNAV: newData.nav, 
              changePercent: navChangePercent,
              isin: newData.isin
            }
          }));
          result.flags.push('large_nav_change');
        }
      }

      // Rule 3: Validate date is not in future
      const navDate = new Date(newData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (navDate > today) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `NAV date cannot be in the future: ${navDate.toISOString()}`,
          details: { navDate: navDate.toISOString(), isin: newData.isin }
        }));
        result.isValid = false;
      }

      // Rule 4: Validate ISIN format
      if (newData.isin && !this.validateISINFormat(newData.isin)) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Invalid ISIN format: ${newData.isin}`,
          details: { isin: newData.isin }
        }));
        result.isValid = false;
      }

      // Rule 5: Check for reasonable NAV range (typically between 1 and 10000)
      if (newData.nav < 1 || newData.nav > 10000) {
        result.warnings.push(createSyncWarning({
          type: 'unusual_nav_range',
          message: `NAV value outside typical range: ${newData.nav}`,
          details: { nav: newData.nav, isin: newData.isin }
        }));
        result.flags.push('unusual_nav_range');
      }

    } catch (error) {
      result.errors.push(createSyncError({
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: `Validation error: ${error.message}`,
        details: { originalError: error.message }
      }));
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate stock price data
   * @param {Object} currentData - Current stock data
   * @param {Object} newData - New price data to validate
   * @returns {Object} Validation result
   */
  async validateStockData(currentData, newData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      flags: []
    };

    try {
      // Rule 1: Price must be positive
      if (newData.price <= 0) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Invalid stock price: ${newData.price}. Price must be positive.`,
          details: { price: newData.price, symbol: newData.symbol }
        }));
        result.isValid = false;
      }

      // Rule 2: Validate against market hours for real-time updates
      if (newData.isRealTime && !this.isMarketHours(newData.timestamp)) {
        result.warnings.push(createSyncWarning({
          type: 'outside_market_hours',
          message: `Real-time price update outside market hours`,
          details: { 
            timestamp: newData.timestamp, 
            symbol: newData.symbol,
            marketHours: this.getMarketHours()
          }
        }));
        result.flags.push('outside_market_hours');
      }

      // Rule 3: Flag large price movements (> 20% in single day)
      if (currentData && currentData.currentPrice) {
        const priceChangePercent = Math.abs((newData.price - currentData.currentPrice) / currentData.currentPrice) * 100;

        if (priceChangePercent > 20) {
          result.warnings.push(createSyncWarning({
            type: 'large_price_change',
            message: `Large price change detected: ${priceChangePercent.toFixed(2)}% change from ₹${currentData.currentPrice} to ₹${newData.price}`,
            details: { 
              previousPrice: currentData.currentPrice, 
              newPrice: newData.price, 
              changePercent: priceChangePercent,
              symbol: newData.symbol
            }
          }));
          result.flags.push('large_price_change');
        }
      }

      // Rule 4: Validate trading status
      if (newData.tradingStatus && !['ACTIVE', 'SUSPENDED', 'DELISTED'].includes(newData.tradingStatus)) {
        result.warnings.push(createSyncWarning({
          type: 'invalid_trading_status',
          message: `Unknown trading status: ${newData.tradingStatus}`,
          details: { tradingStatus: newData.tradingStatus, symbol: newData.symbol }
        }));
      }

      // Rule 5: Check for circuit breaker limits (typically 5%, 10%, 20%)
      if (currentData && currentData.currentPrice) {
        const priceChangePercent = ((newData.price - currentData.currentPrice) / currentData.currentPrice) * 100;
        
        if (Math.abs(priceChangePercent) >= 20) {
          result.flags.push('circuit_breaker_20');
        } else if (Math.abs(priceChangePercent) >= 10) {
          result.flags.push('circuit_breaker_10');
        } else if (Math.abs(priceChangePercent) >= 5) {
          result.flags.push('circuit_breaker_5');
        }
      }

    } catch (error) {
      result.errors.push(createSyncError({
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: `Stock validation error: ${error.message}`,
        details: { originalError: error.message }
      }));
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate EPF contribution data
   * @param {Object} currentData - Current EPF data
   * @param {Object} newData - New contribution data to validate
   * @returns {Object} Validation result
   */
  async validateEPFData(currentData, newData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      flags: []
    };

    try {
      // Rule 1: Contribution amounts must be non-negative
      if (newData.employeeContribution < 0 || newData.employerContribution < 0) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `EPF contributions cannot be negative`,
          details: { 
            employeeContribution: newData.employeeContribution,
            employerContribution: newData.employerContribution,
            uan: newData.uan
          }
        }));
        result.isValid = false;
      }

      // Rule 2: Validate against salary limits (EPF contribution limit for 2024: ₹1,80,000 annually)
      const annualLimit = 180000;
      const monthlyLimit = annualLimit / 12;

      if (newData.employeeContribution > monthlyLimit) {
        result.warnings.push(createSyncWarning({
          type: 'exceeds_contribution_limit',
          message: `Employee contribution exceeds monthly limit: ₹${newData.employeeContribution} > ₹${monthlyLimit}`,
          details: { 
            contribution: newData.employeeContribution,
            monthlyLimit,
            annualLimit,
            uan: newData.uan
          }
        }));
        result.flags.push('exceeds_contribution_limit');
      }

      // Rule 3: Employer contribution should typically match employee contribution (12% each)
      const contributionDifference = Math.abs(newData.employerContribution - newData.employeeContribution);
      const tolerancePercent = 5; // 5% tolerance

      if (newData.employeeContribution > 0) {
        const differencePercent = (contributionDifference / newData.employeeContribution) * 100;
        
        if (differencePercent > tolerancePercent) {
          result.warnings.push(createSyncWarning({
            type: 'contribution_mismatch',
            message: `Employer and employee contributions differ significantly: ₹${newData.employerContribution} vs ₹${newData.employeeContribution}`,
            details: { 
              employerContribution: newData.employerContribution,
              employeeContribution: newData.employeeContribution,
              differencePercent,
              uan: newData.uan
            }
          }));
          result.flags.push('contribution_mismatch');
        }
      }

      // Rule 4: Validate UAN format (12 digits)
      if (newData.uan && !this.validateUANFormat(newData.uan)) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Invalid UAN format: ${newData.uan}`,
          details: { uan: newData.uan }
        }));
        result.isValid = false;
      }

      // Rule 5: Check for reasonable balance increase
      if (currentData && currentData.totalBalance) {
        const balanceIncrease = newData.totalBalance - currentData.totalBalance;
        const expectedMonthlyIncrease = (newData.employeeContribution + newData.employerContribution) * 1.1; // 10% buffer for interest

        if (balanceIncrease > expectedMonthlyIncrease * 2) {
          result.warnings.push(createSyncWarning({
            type: 'unusual_balance_increase',
            message: `Unusually large balance increase: ₹${balanceIncrease}`,
            details: { 
              balanceIncrease,
              expectedIncrease: expectedMonthlyIncrease,
              uan: newData.uan
            }
          }));
          result.flags.push('unusual_balance_increase');
        }
      }

    } catch (error) {
      result.errors.push(createSyncError({
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: `EPF validation error: ${error.message}`,
        details: { originalError: error.message }
      }));
      result.isValid = false;
    }

    return result;
  }

  /**
   * Get mutual fund validation rules configuration
   * @returns {Object} Validation rules
   */
  getMutualFundValidationRules() {
    return {
      maxNavChangePercent: 10,
      minNavValue: 0.01,
      maxNavValue: 10000,
      requiredFields: ['nav', 'date', 'isin'],
      optionalFields: ['schemeName', 'schemeCode']
    };
  }

  /**
   * Get stock validation rules configuration
   * @returns {Object} Validation rules
   */
  getStockValidationRules() {
    return {
      maxPriceChangePercent: 20,
      circuitBreakerLimits: [5, 10, 20],
      marketHours: {
        start: '09:15',
        end: '15:30',
        timezone: 'Asia/Kolkata'
      },
      requiredFields: ['price', 'symbol'],
      optionalFields: ['volume', 'tradingStatus', 'exchange']
    };
  }

  /**
   * Get EPF validation rules configuration
   * @returns {Object} Validation rules
   */
  getEPFValidationRules() {
    return {
      annualContributionLimit: 180000,
      contributionTolerancePercent: 5,
      requiredFields: ['employeeContribution', 'employerContribution', 'totalBalance'],
      optionalFields: ['interestRate', 'pensionContribution']
    };
  }

  /**
   * Validate ISIN format (12 characters: 2 country code + 9 alphanumeric + 1 check digit)
   * @param {string} isin - ISIN to validate
   * @returns {boolean} True if valid
   */
  validateISINFormat(isin) {
    if (!isin || typeof isin !== 'string') return false;
    
    // ISIN format: 2 letters (country) + 9 alphanumeric + 1 check digit
    const isinRegex = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
    return isinRegex.test(isin);
  }

  /**
   * Validate UAN format (12 digits)
   * @param {string} uan - UAN to validate
   * @returns {boolean} True if valid
   */
  validateUANFormat(uan) {
    if (!uan) return false;
    
    // UAN format: 12 digits
    const uanRegex = /^\d{12}$/;
    return uanRegex.test(uan.toString());
  }

  /**
   * Check if current time is within market hours
   * @param {Date} timestamp - Timestamp to check (optional, defaults to now)
   * @returns {boolean} True if within market hours
   */
  isMarketHours(timestamp = new Date()) {
    const istTime = new Date(timestamp.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours: 9:15 AM to 3:30 PM IST
    const marketStart = 9 * 60 + 15; // 9:15 AM
    const marketEnd = 15 * 60 + 30;  // 3:30 PM
    
    return timeInMinutes >= marketStart && timeInMinutes <= marketEnd;
  }

  /**
   * Get market hours information
   * @returns {Object} Market hours details
   */
  getMarketHours() {
    return {
      start: '09:15',
      end: '15:30',
      timezone: 'Asia/Kolkata',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    };
  }

  /**
   * Validate generic data structure
   * @param {Object} data - Data to validate
   * @param {Array} requiredFields - Required field names
   * @param {Array} optionalFields - Optional field names
   * @returns {Object} Validation result
   */
  validateDataStructure(data, requiredFields = [], optionalFields = []) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    for (const field of requiredFields) {
      if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATA_VALIDATION_FAILED,
          message: `Missing required field: ${field}`,
          details: { field, data }
        }));
        result.isValid = false;
      }
    }

    // Check for unexpected fields
    const allowedFields = [...requiredFields, ...optionalFields];
    const unexpectedFields = Object.keys(data).filter(field => !allowedFields.includes(field));
    
    if (unexpectedFields.length > 0) {
      result.warnings.push(createSyncWarning({
        type: 'unexpected_fields',
        message: `Unexpected fields found: ${unexpectedFields.join(', ')}`,
        details: { unexpectedFields, data }
      }));
    }

    return result;
  }
}

module.exports = DataValidationService;