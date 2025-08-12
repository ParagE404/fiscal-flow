const SyncService = require('./interfaces/SyncService');
const AMFIDataProvider = require('./providers/AMFIDataProvider');
const { PrismaClient } = require('@prisma/client');
const {
  createSyncResult,
  createSyncError,
  createSyncWarning,
  SyncErrorTypes,
  SyncStatus,
  InvestmentTypes,
  DataSources,
  RecoveryActions,
  createRecoveryAction
} = require('./types/SyncTypes');

// Initialize Prisma client - will be mocked in tests
let prisma;
if (process.env.NODE_ENV === 'test') {
  // In test environment, prisma will be injected via constructor or mocked
  prisma = null;
} else {
  prisma = new PrismaClient();
}

/**
 * Mutual Fund Sync Service for automated NAV updates
 * Handles synchronization of mutual fund data with AMFI NAV feed
 */
class MutualFundSyncService extends SyncService {
  constructor(prismaClient = null) {
    super();
    this.amfiProvider = new AMFIDataProvider();
    this.mfCentralProvider = null; // Future implementation
    this.prisma = prismaClient || prisma || new PrismaClient();
  }

  /**
   * Get the sync type identifier for this service
   * @returns {string} Sync type
   */
  get syncType() {
    return InvestmentTypes.MUTUAL_FUNDS;
  }

  /**
   * Synchronize all mutual funds for a user
   * @param {string} userId - User ID to sync data for
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async sync(userId, options = {}) {
    const startTime = new Date();
    const result = createSyncResult({
      startTime,
      source: options.source || DataSources.AMFI
    });

    try {
      // Check if sync is enabled for this user
      if (!options.force && !(await this.isSyncEnabled(userId))) {
        result.warnings.push(createSyncWarning({
          type: 'sync_disabled',
          message: 'Mutual fund sync is disabled for this user'
        }));
        result.success = true;
        return this.finalizeSyncResult(result, startTime);
      }

      // Get user's mutual funds with ISIN codes
      const userFunds = await this.getUserMutualFunds(userId);
      const fundsWithISIN = userFunds.filter(fund => fund.isin && !fund.manualOverride);
      
      if (fundsWithISIN.length === 0) {
        result.warnings.push(createSyncWarning({
          type: 'no_syncable_funds',
          message: 'No mutual funds found with ISIN codes for synchronization'
        }));
        result.success = true;
        return this.finalizeSyncResult(result, startTime);
      }

      // Extract ISINs for data fetching
      const isins = fundsWithISIN.map(fund => fund.isin);
      console.log(`Syncing ${fundsWithISIN.length} mutual funds for user ${userId}`);

      // Fetch NAV data from provider with fallback handling
      const navData = await this.fetchNAVDataWithFallback(isins, options);

      if (!navData || navData.length === 0) {
        result.warnings.push(createSyncWarning({
          type: 'no_nav_data',
          message: 'No NAV data available from any data source'
        }));
        result.success = true;
        return this.finalizeSyncResult(result, startTime);
      }

      // Process each fund with enhanced error handling
      for (const fund of fundsWithISIN) {
        try {
          const syncResult = await this.processFundSync(fund, navData, options);
          
          if (syncResult.updated) {
            result.recordsUpdated++;
          }
          
          if (syncResult.warnings.length > 0) {
            result.warnings.push(...syncResult.warnings);
          }
          
          if (syncResult.errors.length > 0) {
            result.errors.push(...syncResult.errors);
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.errors.push(createSyncError({
            type: SyncErrorTypes.DATA_VALIDATION_FAILED,
            message: `Failed to process fund ${fund.name}: ${error.message}`,
            investmentId: fund.id,
            source: result.source,
            details: { isin: fund.isin, error: error.message }
          }));
          
          if (!options.dryRun) {
            await this.updateSyncMetadata(userId, fund.id, 'failed', result.source, error.message);
          }
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      console.error('Mutual fund sync failed:', error);
      result.errors.push(createSyncError({
        type: this.classifyError(error),
        message: error.message,
        source: result.source,
        details: { stack: error.stack }
      }));
      result.success = false;
    }

    return this.finalizeSyncResult(result, startTime);
  }

  /**
   * Synchronize a single mutual fund for a user
   * @param {string} userId - User ID
   * @param {string} investmentId - Specific mutual fund ID to sync
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} SyncResult object
   */
  async syncSingle(userId, investmentId, options = {}) {
    const startTime = new Date();
    const result = createSyncResult({
      startTime,
      source: options.source || DataSources.AMFI
    });

    try {
      // Get the specific mutual fund
      const fund = await this.prisma.mutualFund.findFirst({
        where: {
          id: investmentId,
          userId: userId
        }
      });

      if (!fund) {
        throw new Error(`Mutual fund not found: ${investmentId}`);
      }

      if (!fund.isin) {
        throw new Error(`Mutual fund ${fund.name} does not have ISIN code for sync`);
      }

      if (fund.manualOverride && !options.force) {
        result.warnings.push(createSyncWarning({
          type: 'manual_override',
          message: `Fund ${fund.name} has manual override enabled`,
          investmentId: fund.id
        }));
        result.success = true;
        return this.finalizeSyncResult(result, startTime);
      }

      // Fetch NAV data
      const provider = this.getProvider(options.source);
      const navData = await provider.fetchData([fund.isin], options);

      if (!provider.validateData(navData)) {
        throw new Error('Invalid NAV data received from provider');
      }

      const navRecord = navData.find(nav => nav.identifier === fund.isin);
      
      if (navRecord) {
        if (!options.dryRun) {
          await this.updateFundValue(fund, navRecord);
          await this.updateSyncMetadata(userId, fund.id, 'success', provider.name);
        }
        result.recordsUpdated = 1;
        result.success = true;
      } else {
        throw new Error(`NAV data not found for ISIN: ${fund.isin}`);
      }

      result.recordsProcessed = 1;

    } catch (error) {
      console.error(`Single mutual fund sync failed for ${investmentId}:`, error);
      result.errors.push(createSyncError({
        type: this.classifyError(error),
        message: error.message,
        investmentId: investmentId,
        source: result.source,
        details: { error: error.message }
      }));
      
      if (!options.dryRun) {
        await this.updateSyncMetadata(userId, investmentId, 'failed', result.source, error.message);
      }
      
      result.success = false;
    }

    return this.finalizeSyncResult(result, startTime);
  }

  /**
   * Update mutual fund value based on NAV data
   * @param {Object} fund - Mutual fund record
   * @param {Object} navRecord - NAV data record
   */
  async updateFundValue(fund, navRecord) {
    const nav = navRecord.value;
    const navDate = navRecord.date;

    // Calculate current value based on invested amount and NAV
    const currentValue = this.calculateCurrentValue(fund, nav);
    
    // Calculate CAGR (Compound Annual Growth Rate)
    const cagr = this.calculateCAGR(fund, currentValue);

    // Update the fund record
    await this.prisma.mutualFund.update({
      where: { id: fund.id },
      data: {
        currentValue: currentValue,
        cagr: cagr,
        lastSyncAt: new Date(),
        syncStatus: SyncStatus.SYNCED,
        updatedAt: new Date()
      }
    });

    console.log(`Updated fund ${fund.name}: NAV=${nav}, Current Value=${currentValue}, CAGR=${cagr}%`);
  }

  /**
   * Calculate current value of mutual fund investment
   * @param {Object} fund - Mutual fund record
   * @param {number} nav - Current NAV value
   * @returns {number} Current value of investment
   */
  calculateCurrentValue(fund, nav) {
    // For mutual funds, we need to calculate based on units held
    // Current value = (Total Investment / Average NAV) * Current NAV
    // Since we don't store average NAV, we'll use a simplified calculation
    // This assumes the fund was purchased at different times with different NAVs
    
    const totalInvestment = fund.totalInvestment || fund.investedAmount;
    
    // If we have historical data, we could be more precise
    // For now, we'll use a simplified approach assuming average purchase NAV
    // This is a limitation that could be improved with transaction history
    
    // Simple calculation: assume current NAV represents the growth
    // This is not perfectly accurate but provides a reasonable estimate
    const estimatedUnits = totalInvestment / (nav * 0.8); // Assume average purchase was 20% lower
    const currentValue = estimatedUnits * nav;
    
    return Math.round(currentValue * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   * @param {Object} fund - Mutual fund record
   * @param {number} currentValue - Current value of investment
   * @returns {number} CAGR percentage
   */
  calculateCAGR(fund, currentValue) {
    try {
      const totalInvestment = fund.totalInvestment || fund.investedAmount;
      
      if (totalInvestment <= 0 || currentValue <= 0) {
        return 0;
      }

      // Calculate time period in years
      const startDate = fund.createdAt;
      const currentDate = new Date();
      const timeDiffMs = currentDate - startDate;
      const yearsElapsed = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);

      // Minimum time period for CAGR calculation
      if (yearsElapsed < 0.1) { // Less than ~36 days
        return 0;
      }

      // CAGR formula: ((Current Value / Initial Investment) ^ (1/years)) - 1
      const cagr = (Math.pow(currentValue / totalInvestment, 1 / yearsElapsed) - 1) * 100;
      
      // Cap CAGR at reasonable limits (-100% to 1000%)
      const cappedCAGR = Math.max(-100, Math.min(1000, cagr));
      
      return Math.round(cappedCAGR * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.warn(`CAGR calculation failed for fund ${fund.id}:`, error.message);
      return 0;
    }
  }

  /**
   * Get user's mutual funds
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of mutual fund records
   */
  async getUserMutualFunds(userId) {
    return await this.prisma.mutualFund.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Fetch NAV data with fallback handling for missing data
   * @param {string[]} isins - Array of ISIN codes
   * @param {Object} options - Sync options
   * @returns {Promise<Array>} NAV data array
   */
  async fetchNAVDataWithFallback(isins, options = {}) {
    const primaryProvider = this.getProvider(options.source);
    let navData = [];

    try {
      // Try primary data source
      navData = await primaryProvider.fetchData(isins, options);
      
      if (primaryProvider.validateData(navData) && navData.length > 0) {
        return navData;
      }
    } catch (error) {
      console.warn(`Primary provider ${primaryProvider.name} failed:`, error.message);
    }

    // Try fallback data source if primary fails
    const fallbackSource = this.getFallbackSource(options.source);
    if (fallbackSource && fallbackSource !== options.source) {
      try {
        const fallbackProvider = this.getProvider(fallbackSource);
        navData = await fallbackProvider.fetchData(isins, options);
        
        if (fallbackProvider.validateData(navData) && navData.length > 0) {
          console.log(`Using fallback provider ${fallbackProvider.name}`);
          return navData;
        }
      } catch (error) {
        console.warn(`Fallback provider failed:`, error.message);
      }
    }

    // If both sources fail, try to use cached/historical data
    return await this.getHistoricalNAVData(isins);
  }

  /**
   * Process individual fund synchronization with enhanced error handling
   * @param {Object} fund - Mutual fund record
   * @param {Array} navData - Available NAV data
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Processing result
   */
  async processFundSync(fund, navData, options = {}) {
    const result = {
      updated: false,
      warnings: [],
      errors: []
    };

    // Try to find NAV data by ISIN
    let navRecord = navData.find(nav => nav.identifier === fund.isin);
    
    // If not found by ISIN, try alternative identifiers
    if (!navRecord && fund.schemeCode) {
      navRecord = navData.find(nav => nav.alternateIdentifier === fund.schemeCode);
      
      if (navRecord) {
        result.warnings.push(createSyncWarning({
          type: 'isin_mismatch',
          message: `NAV found using scheme code instead of ISIN for fund: ${fund.name}`,
          investmentId: fund.id,
          details: { 
            originalISIN: fund.isin, 
            schemeCode: fund.schemeCode,
            foundISIN: navRecord.identifier 
          }
        }));
      }
    }

    // Handle missing NAV data
    if (!navRecord) {
      return await this.handleMissingNAVData(fund, result, options);
    }

    // Validate NAV data quality
    const validationResult = this.validateNAVData(navRecord, fund);
    if (!validationResult.isValid) {
      result.warnings.push(createSyncWarning({
        type: 'nav_validation_warning',
        message: validationResult.message,
        investmentId: fund.id,
        details: validationResult.details
      }));
      
      // Skip update if validation fails critically
      if (validationResult.critical) {
        return result;
      }
    }

    // Update fund value if not in dry run mode
    if (!options.dryRun) {
      try {
        await this.updateFundValue(fund, navRecord);
        await this.updateSyncMetadata(fund.userId, fund.id, 'success', navRecord.source);
        result.updated = true;
      } catch (error) {
        result.errors.push(createSyncError({
          type: SyncErrorTypes.DATABASE_ERROR,
          message: `Failed to update fund value: ${error.message}`,
          investmentId: fund.id,
          details: { error: error.message }
        }));
      }
    } else {
      result.updated = true; // Mark as updated for dry run
    }

    return result;
  }

  /**
   * Handle missing NAV data scenarios
   * @param {Object} fund - Mutual fund record
   * @param {Object} result - Processing result object
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Updated result object
   */
  async handleMissingNAVData(fund, result, options = {}) {
    // Check if it's a weekend or holiday (common reason for missing NAV)
    const isWeekendOrHoliday = this.isWeekendOrHoliday(new Date());
    
    if (isWeekendOrHoliday) {
      result.warnings.push(createSyncWarning({
        type: 'weekend_holiday_nav',
        message: `NAV not available for ${fund.name} - likely weekend/holiday`,
        investmentId: fund.id,
        details: { isin: fund.isin, reason: 'weekend_or_holiday' }
      }));
      return result;
    }

    // Check for potential scheme merger or ISIN change
    const mergerInfo = await this.checkForSchemeMerger(fund);
    if (mergerInfo.found) {
      result.warnings.push(createSyncWarning({
        type: 'scheme_merger_detected',
        message: `Potential scheme merger detected for ${fund.name}`,
        investmentId: fund.id,
        details: mergerInfo
      }));
      
      // Suggest manual intervention
      if (!options.dryRun) {
        await this.flagForManualReview(fund, 'scheme_merger', mergerInfo);
      }
      
      return result;
    }

    // Check if fund has been discontinued
    const discontinuedInfo = await this.checkIfFundDiscontinued(fund);
    if (discontinuedInfo.discontinued) {
      result.warnings.push(createSyncWarning({
        type: 'fund_discontinued',
        message: `Fund ${fund.name} appears to be discontinued`,
        investmentId: fund.id,
        details: discontinuedInfo
      }));
      
      if (!options.dryRun) {
        await this.flagForManualReview(fund, 'fund_discontinued', discontinuedInfo);
      }
      
      return result;
    }

    // Default case - NAV simply not found
    result.warnings.push(createSyncWarning({
      type: 'nav_not_found',
      message: `NAV data not found for fund: ${fund.name}`,
      investmentId: fund.id,
      details: { isin: fund.isin, schemeCode: fund.schemeCode }
    }));

    return result;
  }

  /**
   * Validate NAV data quality and detect anomalies
   * @param {Object} navRecord - NAV data record
   * @param {Object} fund - Mutual fund record
   * @returns {Object} Validation result
   */
  validateNAVData(navRecord, fund) {
    const result = {
      isValid: true,
      critical: false,
      message: '',
      details: {}
    };

    // Check if NAV is reasonable (not zero or negative)
    if (navRecord.value <= 0) {
      result.isValid = false;
      result.critical = true;
      result.message = `Invalid NAV value: ${navRecord.value}`;
      result.details.navValue = navRecord.value;
      return result;
    }

    // Check if NAV date is too old (more than 7 days)
    const navDate = new Date(navRecord.date);
    const daysDiff = (new Date() - navDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
      result.isValid = false;
      result.message = `NAV data is ${Math.floor(daysDiff)} days old`;
      result.details.daysDiff = Math.floor(daysDiff);
      result.details.navDate = navDate;
    }

    // Check for unusual NAV changes (more than 20% in a day)
    if (fund.currentValue > 0) {
      const currentNav = this.estimateCurrentNAV(fund);
      if (currentNav > 0) {
        const changePercent = Math.abs((navRecord.value - currentNav) / currentNav) * 100;
        
        if (changePercent > 20) {
          result.isValid = false;
          result.message = `Unusual NAV change detected: ${changePercent.toFixed(2)}%`;
          result.details.changePercent = changePercent;
          result.details.previousNav = currentNav;
          result.details.newNav = navRecord.value;
        }
      }
    }

    return result;
  }

  /**
   * Get historical NAV data as fallback
   * @param {string[]} isins - Array of ISIN codes
   * @returns {Promise<Array>} Historical NAV data
   */
  async getHistoricalNAVData(isins) {
    try {
      // Query sync metadata for last known good NAV values
      const historicalData = await this.prisma.syncMetadata.findMany({
        where: {
          investmentType: this.syncType,
          syncStatus: 'success',
          lastSyncAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          user: {
            include: {
              mutualFunds: {
                where: {
                  isin: { in: isins }
                }
              }
            }
          }
        }
      });

      // Transform to NAV data format
      const navData = [];
      for (const metadata of historicalData) {
        const fund = metadata.user.mutualFunds.find(f => f.isin && isins.includes(f.isin));
        if (fund && fund.currentValue > 0) {
          const estimatedNav = this.estimateCurrentNAV(fund);
          if (estimatedNav > 0) {
            navData.push({
              identifier: fund.isin,
              alternateIdentifier: fund.schemeCode,
              name: fund.name,
              value: estimatedNav,
              date: metadata.lastSyncAt,
              source: 'historical',
              metadata: {
                isHistorical: true,
                originalSource: metadata.syncSource
              }
            });
          }
        }
      }

      if (navData.length > 0) {
        console.log(`Using historical NAV data for ${navData.length} funds`);
      }

      return navData;
    } catch (error) {
      console.error('Failed to fetch historical NAV data:', error);
      return [];
    }
  }

  /**
   * Check if current date is weekend or holiday
   * @param {Date} date - Date to check
   * @returns {boolean} True if weekend or holiday
   */
  isWeekendOrHoliday(date) {
    const day = date.getDay();
    
    // Weekend check (Saturday = 6, Sunday = 0)
    if (day === 0 || day === 6) {
      return true;
    }

    // Basic Indian market holidays (this could be enhanced with a proper holiday calendar)
    const holidays = [
      '01-01', // New Year
      '01-26', // Republic Day
      '08-15', // Independence Day
      '10-02', // Gandhi Jayanti
    ];

    const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.includes(dateStr);
  }

  /**
   * Check for potential scheme merger
   * @param {Object} fund - Mutual fund record
   * @returns {Promise<Object>} Merger information
   */
  async checkForSchemeMerger(fund) {
    // This is a simplified implementation
    // In a real system, this would check against a database of scheme mergers
    // or use external APIs to detect mergers
    
    try {
      // Check if there are similar funds with recent activity
      const similarFunds = await this.prisma.mutualFund.findMany({
        where: {
          name: {
            contains: fund.name.split(' ')[0], // First word of fund name
            mode: 'insensitive'
          },
          isin: {
            not: fund.isin
          },
          lastSyncAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        take: 5
      });

      if (similarFunds.length > 0) {
        return {
          found: true,
          reason: 'similar_funds_active',
          details: {
            similarFunds: similarFunds.map(f => ({
              id: f.id,
              name: f.name,
              isin: f.isin,
              lastSyncAt: f.lastSyncAt
            }))
          }
        };
      }

      return { found: false };
    } catch (error) {
      console.error('Error checking for scheme merger:', error);
      return { found: false };
    }
  }

  /**
   * Check if fund has been discontinued
   * @param {Object} fund - Mutual fund record
   * @returns {Promise<Object>} Discontinuation information
   */
  async checkIfFundDiscontinued(fund) {
    try {
      // Check if fund hasn't been synced for a long time
      const daysSinceLastSync = fund.lastSyncAt 
        ? (new Date() - new Date(fund.lastSyncAt)) / (1000 * 60 * 60 * 24)
        : Infinity;

      if (daysSinceLastSync > 90) { // 3 months
        return {
          discontinued: true,
          reason: 'no_sync_for_long_period',
          details: {
            daysSinceLastSync: Math.floor(daysSinceLastSync),
            lastSyncAt: fund.lastSyncAt
          }
        };
      }

      return { discontinued: false };
    } catch (error) {
      console.error('Error checking if fund discontinued:', error);
      return { discontinued: false };
    }
  }

  /**
   * Flag fund for manual review
   * @param {Object} fund - Mutual fund record
   * @param {string} reason - Reason for manual review
   * @param {Object} details - Additional details
   */
  async flagForManualReview(fund, reason, details = {}) {
    try {
      await this.updateSyncMetadata(
        fund.userId, 
        fund.id, 
        'manual_review_required', 
        'system', 
        `Manual review required: ${reason}`,
        JSON.stringify(details)
      );
      
      console.log(`Fund ${fund.name} flagged for manual review: ${reason}`);
    } catch (error) {
      console.error('Failed to flag fund for manual review:', error);
    }
  }

  /**
   * Estimate current NAV based on fund's current value and investment
   * @param {Object} fund - Mutual fund record
   * @returns {number} Estimated NAV
   */
  estimateCurrentNAV(fund) {
    try {
      if (!fund.currentValue || !fund.totalInvestment || fund.totalInvestment <= 0) {
        return 0;
      }

      // This is a simplified estimation
      // In reality, you'd need the number of units to calculate exact NAV
      const growthRatio = fund.currentValue / fund.totalInvestment;
      const estimatedBaseNAV = 10; // Assume base NAV of 10 (common starting point)
      
      return estimatedBaseNAV * growthRatio;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get fallback data source
   * @param {string} primarySource - Primary data source
   * @returns {string} Fallback data source
   */
  getFallbackSource(primarySource) {
    switch (primarySource) {
      case DataSources.AMFI:
        return DataSources.MF_CENTRAL;
      case DataSources.MF_CENTRAL:
        return DataSources.AMFI;
      default:
        return DataSources.AMFI;
    }
  }

  /**
   * Get appropriate data provider based on source
   * @param {string} source - Data source identifier
   * @returns {Object} Data provider instance
   */
  getProvider(source) {
    switch (source) {
      case DataSources.AMFI:
        return this.amfiProvider;
      case DataSources.MF_CENTRAL:
        if (this.mfCentralProvider) {
          return this.mfCentralProvider;
        }
        console.warn('MF Central provider not available, falling back to AMFI');
        return this.amfiProvider;
      default:
        return this.amfiProvider;
    }
  }

  /**
   * Update sync metadata for a mutual fund
   * @param {string} userId - User ID
   * @param {string} fundId - Mutual fund ID
   * @param {string} status - Sync status
   * @param {string} source - Data source
   * @param {string} errorMessage - Error message if any
   * @param {string} additionalData - Additional data as JSON string
   */
  async updateSyncMetadata(userId, fundId, status, source, errorMessage = null, additionalData = null) {
    try {
      const updateData = {
        lastSyncAt: new Date(),
        syncStatus: status,
        syncSource: source,
        errorMessage: errorMessage,
        updatedAt: new Date()
      };

      // Add additional data if provided
      if (additionalData) {
        updateData.dataHash = additionalData;
      }

      await this.prisma.syncMetadata.upsert({
        where: {
          userId_investmentType_investmentId: {
            userId: userId,
            investmentType: this.syncType,
            investmentId: fundId
          }
        },
        update: updateData,
        create: {
          userId: userId,
          investmentType: this.syncType,
          investmentId: fundId,
          ...updateData
        }
      });
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
    }
  }

  /**
   * Check if sync is enabled for a user
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} True if sync is enabled
   */
  async isSyncEnabled(userId) {
    try {
      const config = await this.prisma.syncConfiguration.findUnique({
        where: {
          userId_investmentType: {
            userId: userId,
            investmentType: this.syncType
          }
        }
      });

      return config ? config.isEnabled : false;
    } catch (error) {
      console.error('Failed to check sync status:', error);
      return false;
    }
  }

  /**
   * Get sync status for a user's mutual funds
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sync status information
   */
  async getSyncStatus(userId) {
    try {
      const funds = await this.getUserMutualFunds(userId);
      const syncMetadata = await this.prisma.syncMetadata.findMany({
        where: {
          userId: userId,
          investmentType: this.syncType
        }
      });

      const status = {
        totalFunds: funds.length,
        syncableFunds: funds.filter(f => f.isin && !f.manualOverride).length,
        lastSyncAt: null,
        syncStatus: 'manual',
        errors: [],
        fundsStatus: []
      };

      // Get overall status
      const latestSync = syncMetadata
        .filter(m => m.lastSyncAt)
        .sort((a, b) => b.lastSyncAt - a.lastSyncAt)[0];

      if (latestSync) {
        status.lastSyncAt = latestSync.lastSyncAt;
        status.syncStatus = latestSync.syncStatus;
      }

      // Get individual fund status
      status.fundsStatus = funds.map(fund => {
        const metadata = syncMetadata.find(m => m.investmentId === fund.id);
        return {
          id: fund.id,
          name: fund.name,
          isin: fund.isin,
          syncStatus: fund.syncStatus,
          lastSyncAt: fund.lastSyncAt,
          manualOverride: fund.manualOverride,
          error: metadata?.errorMessage
        };
      });

      return status;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Validate sync configuration for mutual funds
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
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'custom'];
    if (!validFrequencies.includes(config.syncFrequency)) {
      return false;
    }

    // Validate data sources
    const validSources = [DataSources.AMFI, DataSources.MF_CENTRAL];
    if (config.preferredSource && !validSources.includes(config.preferredSource)) {
      return false;
    }

    if (config.fallbackSource && !validSources.includes(config.fallbackSource)) {
      return false;
    }

    return true;
  }

  /**
   * Handle sync errors and determine recovery actions
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the sync operation
   * @returns {Promise<Object>} Recovery action to take
   */
  async handleSyncError(error, context) {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case SyncErrorTypes.NETWORK_TIMEOUT:
      case SyncErrorTypes.NETWORK_ERROR:
        return createRecoveryAction({
          action: RecoveryActions.RETRY,
          delay: 5000,
          reason: 'Network connectivity issue',
          maxRetries: 3
        });

      case SyncErrorTypes.RATE_LIMIT_EXCEEDED:
        return createRecoveryAction({
          action: RecoveryActions.DELAY,
          delay: this.calculateRateLimitDelay(error),
          reason: 'Rate limit exceeded'
        });

      case SyncErrorTypes.SERVICE_UNAVAILABLE:
        return createRecoveryAction({
          action: RecoveryActions.FALLBACK_SOURCE,
          source: DataSources.MF_CENTRAL,
          reason: 'Primary data source unavailable'
        });

      case SyncErrorTypes.DATA_VALIDATION_FAILED:
        return createRecoveryAction({
          action: RecoveryActions.SKIP_RECORD,
          reason: 'Invalid data format'
        });

      default:
        return createRecoveryAction({
          action: RecoveryActions.MANUAL_INTERVENTION,
          reason: error.message
        });
    }
  }

  /**
   * Classify error type for appropriate handling
   * @param {Error} error - Error to classify
   * @returns {string} Error type
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return SyncErrorTypes.NETWORK_TIMEOUT;
    }
    if (message.includes('network') || message.includes('connection')) {
      return SyncErrorTypes.NETWORK_ERROR;
    }
    if (message.includes('rate limit')) {
      return SyncErrorTypes.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('service unavailable') || message.includes('503')) {
      return SyncErrorTypes.SERVICE_UNAVAILABLE;
    }
    if (message.includes('validation') || message.includes('invalid data')) {
      return SyncErrorTypes.DATA_VALIDATION_FAILED;
    }

    return SyncErrorTypes.UNKNOWN_ERROR;
  }

  /**
   * Calculate delay for rate limit recovery
   * @param {Error} error - Rate limit error
   * @returns {number} Delay in milliseconds
   */
  calculateRateLimitDelay(error) {
    // Extract retry-after header or use exponential backoff
    const retryAfter = error.retryAfter;
    return retryAfter ? retryAfter * 1000 : 60000; // Default 1 minute
  }

  /**
   * Finalize sync result with duration and end time
   * @param {Object} result - Sync result object
   * @param {Date} startTime - Start time of sync operation
   * @returns {Object} Finalized sync result
   */
  finalizeSyncResult(result, startTime) {
    const endTime = new Date();
    result.endTime = endTime;
    result.duration = endTime - startTime;
    
    console.log(`Mutual fund sync completed: ${result.success ? 'SUCCESS' : 'FAILED'}, ` +
                `Processed: ${result.recordsProcessed}, Updated: ${result.recordsUpdated}, ` +
                `Errors: ${result.errors.length}, Duration: ${result.duration}ms`);
    
    return result;
  }

  /**
   * Enable or disable manual override for a mutual fund
   * @param {string} userId - User ID
   * @param {string} fundId - Mutual fund ID
   * @param {boolean} enabled - Whether to enable manual override
   * @param {string} reason - Reason for enabling/disabling override
   * @returns {Promise<boolean>} Success status
   */
  async setManualOverride(userId, fundId, enabled, reason = null) {
    try {
      const fund = await this.prisma.mutualFund.findFirst({
        where: {
          id: fundId,
          userId: userId
        }
      });

      if (!fund) {
        throw new Error(`Mutual fund not found: ${fundId}`);
      }

      await this.prisma.mutualFund.update({
        where: { id: fundId },
        data: {
          manualOverride: enabled,
          updatedAt: new Date()
        }
      });

      // Log the override change
      await this.updateSyncMetadata(
        userId,
        fundId,
        enabled ? 'manual_override_enabled' : 'manual_override_disabled',
        'user_action',
        reason || `Manual override ${enabled ? 'enabled' : 'disabled'} by user`
      );

      console.log(`Manual override ${enabled ? 'enabled' : 'disabled'} for fund ${fund.name}`);
      return true;
    } catch (error) {
      console.error('Failed to set manual override:', error);
      return false;
    }
  }

  /**
   * Get funds that require manual intervention
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Funds requiring manual review
   */
  async getFundsRequiringManualReview(userId) {
    try {
      const metadata = await this.prisma.syncMetadata.findMany({
        where: {
          userId: userId,
          investmentType: this.syncType,
          syncStatus: 'manual_review_required'
        },
        include: {
          user: {
            include: {
              mutualFunds: {
                where: {
                  userId: userId
                }
              }
            }
          }
        }
      });

      return metadata.map(m => {
        const fund = m.user.mutualFunds.find(f => f.id === m.investmentId);
        return {
          fund: fund,
          metadata: {
            lastSyncAt: m.lastSyncAt,
            syncStatus: m.syncStatus,
            errorMessage: m.errorMessage,
            details: m.dataHash ? JSON.parse(m.dataHash) : null
          }
        };
      }).filter(item => item.fund); // Filter out any missing funds
    } catch (error) {
      console.error('Failed to get funds requiring manual review:', error);
      return [];
    }
  }

  /**
   * Resolve manual review for a fund
   * @param {string} userId - User ID
   * @param {string} fundId - Mutual fund ID
   * @param {string} resolution - Resolution action ('ignore', 'update_isin', 'disable_sync', etc.)
   * @param {Object} resolutionData - Additional data for resolution
   * @returns {Promise<boolean>} Success status
   */
  async resolveManualReview(userId, fundId, resolution, resolutionData = {}) {
    try {
      const fund = await this.prisma.mutualFund.findFirst({
        where: {
          id: fundId,
          userId: userId
        }
      });

      if (!fund) {
        throw new Error(`Mutual fund not found: ${fundId}`);
      }

      switch (resolution) {
        case 'ignore':
          // Mark as resolved but keep current data
          await this.updateSyncMetadata(
            userId,
            fundId,
            'manual_review_resolved',
            'user_action',
            'User chose to ignore the issue'
          );
          break;

        case 'update_isin':
          // Update ISIN code
          if (resolutionData.newISIN) {
            await this.prisma.mutualFund.update({
              where: { id: fundId },
              data: {
                isin: resolutionData.newISIN,
                updatedAt: new Date()
              }
            });
            
            await this.updateSyncMetadata(
              userId,
              fundId,
              'isin_updated',
              'user_action',
              `ISIN updated from ${fund.isin} to ${resolutionData.newISIN}`
            );
          }
          break;

        case 'disable_sync':
          // Disable sync for this fund
          await this.setManualOverride(userId, fundId, true, 'Sync disabled due to manual review');
          break;

        case 'mark_discontinued':
          // Mark fund as discontinued
          await this.prisma.mutualFund.update({
            where: { id: fundId },
            data: {
              manualOverride: true,
              updatedAt: new Date()
            }
          });
          
          await this.updateSyncMetadata(
            userId,
            fundId,
            'fund_discontinued',
            'user_action',
            'Fund marked as discontinued by user'
          );
          break;

        default:
          throw new Error(`Unknown resolution action: ${resolution}`);
      }

      console.log(`Manual review resolved for fund ${fund.name}: ${resolution}`);
      return true;
    } catch (error) {
      console.error('Failed to resolve manual review:', error);
      return false;
    }
  }

  /**
   * Get the default sync configuration for mutual funds
   * @returns {Object} Default configuration object
   */
  getDefaultConfiguration() {
    return {
      isEnabled: false,
      syncFrequency: 'daily',
      preferredSource: DataSources.AMFI,
      fallbackSource: DataSources.MF_CENTRAL,
      notifyOnSuccess: false,
      notifyOnFailure: true
    };
  }
}

module.exports = MutualFundSyncService;