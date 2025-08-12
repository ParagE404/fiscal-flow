const axios = require('axios');
const DataProvider = require('../interfaces/DataProvider');
const { createSyncError, SyncErrorTypes } = require('../types/SyncTypes');

/**
 * EPFO Data Provider for fetching EPF balance and contribution data
 * Connects to EPFO Member Passbook portal to retrieve account information
 */
class EPFODataProvider extends DataProvider {
  constructor() {
    super();
    this.baseURL = 'https://passbook.epfindia.gov.in';
    this.loginURL = `${this.baseURL}/MemberPassBook/Login`;
    this.passBookURL = `${this.baseURL}/MemberPassBook/PassBook`;
    this.balanceURL = `${this.baseURL}/MemberPassBook/Balance`;
    this.timeout = 30000; // 30 seconds
    this.maxRetries = 3;
    
    // Session management
    this.sessionCookies = new Map();
    this.sessionExpiry = new Map();
  }

  /**
   * Get the name of this data provider
   * @returns {string} Provider name
   */
  get name() {
    return 'EPFO';
  }

  /**
   * Check if the EPFO portal is currently available
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    try {
      const response = await axios.head(this.baseURL, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept any status < 500
      });
      return response.status < 500;
    } catch (error) {
      console.warn('EPFO portal availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Authenticate with the EPFO portal using user credentials
   * @param {Object} credentials - Authentication credentials
   * @param {string} credentials.uan - Universal Account Number
   * @param {string} credentials.password - EPFO portal password
   * @param {string} credentials.captcha - Captcha solution (if required)
   * @returns {Promise<boolean>} True if authentication successful
   */
  async authenticate(credentials) {
    try {
      if (!credentials || !credentials.uan || !credentials.password) {
        throw new Error('UAN and password are required for EPFO authentication');
      }

      // Check if we have a valid session
      const sessionKey = `${credentials.uan}`;
      if (this.isSessionValid(sessionKey)) {
        return true;
      }

      // Create axios instance with session management
      const client = axios.create({
        timeout: this.timeout,
        withCredentials: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // Step 1: Get login page to establish session
      const loginPageResponse = await client.get(this.loginURL);
      const cookies = this.extractCookies(loginPageResponse.headers['set-cookie'] || []);
      
      // Step 2: Extract any required form tokens or CSRF tokens
      const formTokens = this.extractFormTokens(loginPageResponse.data);
      
      // Step 3: Prepare login data
      const loginData = {
        uan: credentials.uan,
        password: credentials.password,
        ...formTokens
      };

      // Add captcha if provided
      if (credentials.captcha) {
        loginData.captcha = credentials.captcha;
      }

      // Step 4: Submit login form
      const loginResponse = await client.post(this.loginURL, loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.formatCookies(cookies),
          'Referer': this.loginURL
        }
      });

      // Step 5: Check if login was successful
      const isLoginSuccessful = this.validateLoginResponse(loginResponse);
      
      if (isLoginSuccessful) {
        // Store session cookies
        const sessionCookies = this.extractCookies(loginResponse.headers['set-cookie'] || []);
        this.sessionCookies.set(sessionKey, { ...cookies, ...sessionCookies });
        this.sessionExpiry.set(sessionKey, Date.now() + (30 * 60 * 1000)); // 30 minutes
        
        return true;
      } else {
        throw new Error('EPFO login failed - invalid credentials or captcha required');
      }
    } catch (error) {
      console.error('EPFO authentication failed:', error.message);
      
      if (error.response?.status === 401) {
        throw createSyncError({
          type: SyncErrorTypes.AUTHENTICATION_FAILED,
          message: 'Invalid EPFO credentials',
          code: 401
        });
      }
      
      if (error.response?.status === 429) {
        throw createSyncError({
          type: SyncErrorTypes.RATE_LIMIT_EXCEEDED,
          message: 'Too many login attempts - please try again later',
          code: 429,
          retryAfter: 300 // 5 minutes
        });
      }
      
      throw createSyncError({
        type: SyncErrorTypes.NETWORK_ERROR,
        message: `EPFO authentication error: ${error.message}`,
        details: { originalError: error.message }
      });
    }
  }

  /**
   * Fetch EPF account data for the given UAN/PF numbers
   * @param {string[]} identifiers - Array of UAN or PF numbers
   * @param {Object} options - Additional options
   * @param {Object} options.credentials - User credentials for authentication
   * @returns {Promise<Array>} Array of EPF account data
   */
  async fetchData(identifiers, options = {}) {
    try {
      if (!options.credentials) {
        throw new Error('Credentials are required for EPFO data fetching');
      }

      // Authenticate first
      await this.authenticate(options.credentials);
      
      const results = [];
      
      for (const identifier of identifiers) {
        try {
          const accountData = await this.fetchAccountData(identifier, options.credentials);
          if (accountData) {
            results.push(accountData);
          }
        } catch (error) {
          console.warn(`Failed to fetch data for ${identifier}:`, error.message);
          // Continue with other accounts even if one fails
        }
      }
      
      return results;
    } catch (error) {
      console.error('EPFO data fetch failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch account data for a specific UAN
   * @param {string} uan - Universal Account Number
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Account data
   */
  async fetchAccountData(uan, credentials) {
    try {
      const sessionKey = `${credentials.uan}`;
      const cookies = this.sessionCookies.get(sessionKey);
      
      if (!cookies) {
        throw new Error('No valid session found - authentication required');
      }

      const client = axios.create({
        timeout: this.timeout,
        headers: {
          'Cookie': this.formatCookies(cookies),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.loginURL
        }
      });

      // Fetch passbook data
      const passbookResponse = await client.get(this.passBookURL);
      const passbookData = this.parsePassbookData(passbookResponse.data);
      
      // Fetch current balance
      const balanceResponse = await client.get(this.balanceURL);
      const balanceData = this.parseBalanceData(balanceResponse.data);
      
      return {
        uan: uan,
        accountNumber: passbookData.accountNumber,
        employeeName: passbookData.employeeName,
        employerName: passbookData.employerName,
        currentBalance: balanceData.totalBalance,
        employeeShare: balanceData.employeeShare,
        employerShare: balanceData.employerShare,
        pensionShare: balanceData.pensionShare,
        interestEarned: balanceData.interestEarned,
        lastContribution: passbookData.lastContribution,
        contributionHistory: passbookData.contributions,
        lastUpdated: new Date(),
        source: this.name
      };
    } catch (error) {
      console.error(`Failed to fetch account data for UAN ${uan}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate the fetched EPF data
   * @param {Array} data - Data to validate
   * @returns {boolean} True if data is valid
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(record => {
      // Check required fields
      if (!record.uan || !record.currentBalance) {
        return false;
      }

      // Validate UAN format (12 digits)
      if (!/^\d{12}$/.test(record.uan)) {
        return false;
      }

      // Validate balance is a positive number
      if (typeof record.currentBalance !== 'number' || record.currentBalance < 0) {
        return false;
      }

      // Validate share amounts if present
      if (record.employeeShare && (typeof record.employeeShare !== 'number' || record.employeeShare < 0)) {
        return false;
      }

      if (record.employerShare && (typeof record.employerShare !== 'number' || record.employerShare < 0)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Transform raw EPFO data into standardized format
   * @param {Array} data - Raw data from EPFO portal
   * @returns {Array} Transformed data in standard format
   */
  transformData(data) {
    return data.map(record => ({
      identifier: record.uan,
      accountNumber: record.accountNumber,
      balance: record.currentBalance,
      employeeContribution: record.employeeShare || 0,
      employerContribution: record.employerShare || 0,
      pensionContribution: record.pensionShare || 0,
      totalContribution: (record.employeeShare || 0) + (record.employerShare || 0) + (record.pensionShare || 0),
      interestEarned: record.interestEarned || 0,
      employeeName: record.employeeName,
      employerName: record.employerName,
      lastContributionDate: record.lastContribution?.date,
      lastContributionAmount: record.lastContribution?.amount,
      contributionHistory: record.contributionHistory || [],
      lastUpdated: record.lastUpdated,
      source: this.name
    }));
  }

  /**
   * Get rate limit information for EPFO portal
   * @returns {Object} Rate limit info
   */
  getRateLimits() {
    return {
      requestsPerMinute: 10, // Conservative limit for EPFO portal
      requestsPerHour: 100,
      requestsPerDay: 500,
      concurrentRequests: 1 // Only one request at a time
    };
  }

  // Private helper methods

  /**
   * Check if session is still valid
   * @param {string} sessionKey - Session identifier
   * @returns {boolean} True if session is valid
   * @private
   */
  isSessionValid(sessionKey) {
    const expiry = this.sessionExpiry.get(sessionKey);
    return expiry && Date.now() < expiry;
  }

  /**
   * Extract cookies from response headers
   * @param {Array} setCookieHeaders - Set-Cookie headers
   * @returns {Object} Cookie key-value pairs
   * @private
   */
  extractCookies(setCookieHeaders) {
    const cookies = {};
    
    setCookieHeaders.forEach(cookieHeader => {
      const [cookiePair] = cookieHeader.split(';');
      const [name, value] = cookiePair.split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });
    
    return cookies;
  }

  /**
   * Format cookies for request headers
   * @param {Object} cookies - Cookie key-value pairs
   * @returns {string} Formatted cookie string
   * @private
   */
  formatCookies(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Extract form tokens from HTML response
   * @param {string} html - HTML response
   * @returns {Object} Form tokens
   * @private
   */
  extractFormTokens(html) {
    const tokens = {};
    
    // Extract CSRF token if present
    const csrfMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
    if (csrfMatch) {
      tokens.__RequestVerificationToken = csrfMatch[1];
    }
    
    // Extract ViewState if present (ASP.NET)
    const viewStateMatch = html.match(/name="__VIEWSTATE"[^>]*value="([^"]+)"/);
    if (viewStateMatch) {
      tokens.__VIEWSTATE = viewStateMatch[1];
    }
    
    // Extract EventValidation if present (ASP.NET)
    const eventValidationMatch = html.match(/name="__EVENTVALIDATION"[^>]*value="([^"]+)"/);
    if (eventValidationMatch) {
      tokens.__EVENTVALIDATION = eventValidationMatch[1];
    }
    
    return tokens;
  }

  /**
   * Validate login response to check if authentication was successful
   * @param {Object} response - Axios response object
   * @returns {boolean} True if login was successful
   * @private
   */
  validateLoginResponse(response) {
    // Check for redirect to dashboard or success page
    if (response.status === 302 || response.status === 200) {
      const responseText = response.data || '';
      
      // Look for success indicators
      if (responseText.includes('dashboard') || 
          responseText.includes('passbook') || 
          responseText.includes('welcome') ||
          response.request.res.responseUrl?.includes('dashboard')) {
        return true;
      }
      
      // Look for error indicators
      if (responseText.includes('invalid') || 
          responseText.includes('error') || 
          responseText.includes('captcha') ||
          responseText.includes('login')) {
        return false;
      }
    }
    
    return response.status === 200;
  }

  /**
   * Parse passbook data from HTML response
   * @param {string} html - HTML response from passbook page
   * @returns {Object} Parsed passbook data
   * @private
   */
  parsePassbookData(html) {
    // This is a simplified parser - actual implementation would need
    // to handle the specific HTML structure of EPFO passbook page
    const data = {
      accountNumber: null,
      employeeName: null,
      employerName: null,
      lastContribution: null,
      contributions: []
    };
    
    try {
      // Extract account number
      const accountMatch = html.match(/Account\s*Number[:\s]*([A-Z]{2}\/\d+\/\d+)/i);
      if (accountMatch) {
        data.accountNumber = accountMatch[1];
      }
      
      // Extract employee name
      const nameMatch = html.match(/Employee\s*Name[:\s]*([^<\n]+)/i);
      if (nameMatch) {
        data.employeeName = nameMatch[1].trim();
      }
      
      // Extract employer name
      const employerMatch = html.match(/Employer\s*Name[:\s]*([^<\n]+)/i);
      if (employerMatch) {
        data.employerName = employerMatch[1].trim();
      }
      
      // Parse contribution table (simplified)
      const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
      if (tableMatch) {
        // This would need more sophisticated parsing for actual contribution data
        data.contributions = this.parseContributionTable(tableMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse passbook data:', error.message);
    }
    
    return data;
  }

  /**
   * Parse balance data from HTML response
   * @param {string} html - HTML response from balance page
   * @returns {Object} Parsed balance data
   * @private
   */
  parseBalanceData(html) {
    const data = {
      totalBalance: 0,
      employeeShare: 0,
      employerShare: 0,
      pensionShare: 0,
      interestEarned: 0
    };
    
    try {
      // Extract total balance
      const totalMatch = html.match(/Total\s*Balance[:\s]*₹?\s*([\d,]+\.?\d*)/i);
      if (totalMatch) {
        data.totalBalance = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
      
      // Extract employee share
      const empMatch = html.match(/Employee\s*Share[:\s]*₹?\s*([\d,]+\.?\d*)/i);
      if (empMatch) {
        data.employeeShare = parseFloat(empMatch[1].replace(/,/g, ''));
      }
      
      // Extract employer share
      const erMatch = html.match(/Employer\s*Share[:\s]*₹?\s*([\d,]+\.?\d*)/i);
      if (erMatch) {
        data.employerShare = parseFloat(erMatch[1].replace(/,/g, ''));
      }
      
      // Extract pension share
      const pensionMatch = html.match(/Pension\s*Share[:\s]*₹?\s*([\d,]+\.?\d*)/i);
      if (pensionMatch) {
        data.pensionShare = parseFloat(pensionMatch[1].replace(/,/g, ''));
      }
    } catch (error) {
      console.warn('Failed to parse balance data:', error.message);
    }
    
    return data;
  }

  /**
   * Parse contribution table from HTML
   * @param {string} tableHtml - HTML table content
   * @returns {Array} Array of contribution records
   * @private
   */
  parseContributionTable(tableHtml) {
    const contributions = [];
    
    try {
      // This is a simplified implementation
      // Actual implementation would need to handle the specific table structure
      const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
      
      if (rowMatches) {
        for (const row of rowMatches.slice(1)) { // Skip header row
          const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          
          if (cellMatches && cellMatches.length >= 4) {
            const contribution = {
              date: this.extractTextContent(cellMatches[0]),
              employeeShare: parseFloat(this.extractTextContent(cellMatches[1]).replace(/[₹,]/g, '')) || 0,
              employerShare: parseFloat(this.extractTextContent(cellMatches[2]).replace(/[₹,]/g, '')) || 0,
              pensionShare: parseFloat(this.extractTextContent(cellMatches[3]).replace(/[₹,]/g, '')) || 0
            };
            
            contributions.push(contribution);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse contribution table:', error.message);
    }
    
    return contributions;
  }

  /**
   * Extract text content from HTML element
   * @param {string} html - HTML element
   * @returns {string} Text content
   * @private
   */
  extractTextContent(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Clear session data for a user
   * @param {string} sessionKey - Session identifier
   */
  clearSession(sessionKey) {
    this.sessionCookies.delete(sessionKey);
    this.sessionExpiry.delete(sessionKey);
  }

  /**
   * Clear all sessions (for cleanup)
   */
  clearAllSessions() {
    this.sessionCookies.clear();
    this.sessionExpiry.clear();
  }
}

module.exports = EPFODataProvider;