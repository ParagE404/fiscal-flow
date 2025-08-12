const axios = require('axios');
const DataProvider = require('../interfaces/DataProvider');

/**
 * AMFI Data Provider for fetching daily NAV data from AMFI CSV feed
 * Fetches and parses NAV data from the official AMFI website
 */
class AMFIDataProvider extends DataProvider {
  constructor() {
    super();
    this.NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
    this.requestTimeout = 30000; // 30 seconds
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get the name of this data provider
   * @returns {string} Provider name
   */
  get name() {
    return 'AMFI';
  }

  /**
   * Check if AMFI service is currently available
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    try {
      const response = await axios.head(this.NAV_URL, { 
        timeout: 5000,
        headers: {
          'User-Agent': 'FinVista-Sync/1.0'
        }
      });
      return response.status === 200;
    } catch (error) {
      console.warn('AMFI service availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Fetch NAV data for the given ISIN codes
   * @param {string[]} identifiers - Array of ISIN codes
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of NAV records
   */
  async fetchData(identifiers, options = {}) {
    try {
      // Check cache first
      const cacheKey = 'amfi_nav_data';
      const cached = this.getFromCache(cacheKey);
      
      let allNavData;
      if (cached) {
        allNavData = cached;
      } else {
        // Fetch fresh data from AMFI
        const response = await axios.get(this.NAV_URL, {
          timeout: this.requestTimeout,
          responseType: 'text',
          headers: {
            'User-Agent': 'FinVista-Sync/1.0',
            'Accept': 'text/plain, text/csv'
          }
        });

        allNavData = this.parseNAVData(response.data);
        
        // Cache the parsed data
        this.setCache(cacheKey, allNavData);
      }

      // Filter data for requested identifiers
      const filteredData = allNavData.filter(record => 
        identifiers.includes(record.isin) || identifiers.includes(record.schemeCode)
      );

      return this.transformData(filteredData);
    } catch (error) {
      console.error('Failed to fetch AMFI NAV data:', error.message);
      throw new Error(`AMFI data fetch failed: ${error.message}`);
    }
  }

  /**
   * Parse NAV data from AMFI CSV format
   * @param {string} csvData - Raw CSV data from AMFI
   * @returns {Array} Parsed NAV records
   */
  parseNAVData(csvData) {
    const records = [];
    const lines = csvData.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and header lines
      if (!line || line.startsWith('Scheme Code') || line.startsWith('Open Ended Schemes')) {
        continue;
      }

      try {
        // AMFI CSV format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
        const parts = line.split(';');
        
        if (parts.length >= 6) {
          const schemeCode = parts[0]?.trim();
          const isinDivPayout = parts[1]?.trim();
          const isinDivReinvestment = parts[2]?.trim();
          const schemeName = parts[3]?.trim();
          const navValue = parts[4]?.trim();
          const dateStr = parts[5]?.trim();

          // Parse NAV value
          const nav = parseFloat(navValue);
          if (isNaN(nav) || nav <= 0) {
            continue; // Skip invalid NAV values
          }

          // Parse date
          const navDate = this.parseDate(dateStr);
          if (!navDate) {
            continue; // Skip invalid dates
          }

          // Create records for both ISIN types if they exist
          const isins = [isinDivPayout, isinDivReinvestment].filter(isin => 
            isin && isin !== 'N.A.' && isin.length > 0
          );

          for (const isin of isins) {
            records.push({
              schemeCode,
              isin,
              schemeName,
              nav,
              date: navDate,
              source: this.name
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to parse NAV line ${i + 1}: ${line}`, error.message);
        continue; // Skip problematic lines
      }
    }

    console.log(`Parsed ${records.length} NAV records from AMFI data`);
    return records;
  }

  /**
   * Parse date string from AMFI format
   * @param {string} dateStr - Date string in DD-MMM-YYYY format
   * @returns {Date|null} Parsed date or null if invalid
   */
  parseDate(dateStr) {
    try {
      if (!dateStr || dateStr.trim() === '') {
        return null;
      }

      // AMFI date format is typically DD-MMM-YYYY (e.g., "08-Jan-2024")
      const parts = dateStr.split('-');
      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);

      // Month mapping
      const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };

      const month = months[monthStr];
      if (month === undefined || isNaN(day) || isNaN(year)) {
        return null;
      }

      const date = new Date(year, month, day);
      
      // Validate the date
      if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
      }

      return date;
    } catch (error) {
      console.warn('Failed to parse date:', dateStr, error.message);
      return null;
    }
  }

  /**
   * Validate the fetched NAV data
   * @param {Array} data - NAV data to validate
   * @returns {boolean} True if data is valid
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(record => {
      // Check required fields
      if (!record.isin || !record.schemeName || !record.schemeCode) {
        return false;
      }

      // Check NAV value
      if (typeof record.nav !== 'number' || record.nav <= 0 || isNaN(record.nav)) {
        return false;
      }

      // Check date
      if (!(record.date instanceof Date) || isNaN(record.date.getTime())) {
        return false;
      }

      // Check if date is not too old (more than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (record.date < thirtyDaysAgo) {
        console.warn(`NAV data is older than 30 days for ${record.isin}: ${record.date}`);
      }

      return true;
    });
  }

  /**
   * Transform raw NAV data into standardized format
   * @param {Array} data - Raw NAV data
   * @returns {Array} Transformed data in standard format
   */
  transformData(data) {
    return data.map(record => ({
      identifier: record.isin,
      alternateIdentifier: record.schemeCode,
      name: record.schemeName,
      value: record.nav,
      date: record.date,
      source: this.name,
      metadata: {
        schemeCode: record.schemeCode,
        isin: record.isin,
        schemeName: record.schemeName
      }
    }));
  }

  /**
   * Get rate limit information for AMFI provider
   * @returns {Object} Rate limit info
   */
  getRateLimits() {
    return {
      requestsPerMinute: 10,  // Conservative limit for AMFI
      requestsPerHour: 100,
      requestsPerDay: 1000
    };
  }

  /**
   * Cache management methods
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = AMFIDataProvider;