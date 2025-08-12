const axios = require('axios');
const DataProvider = require('../interfaces/DataProvider');

/**
 * NSE (National Stock Exchange) data provider for fetching stock prices
 * Uses NSE's official API endpoints for real-time price data
 */
class NSEDataProvider extends DataProvider {
  constructor() {
    super();
    this.baseURL = 'https://www.nseindia.com/api';
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.sessionCookies = null;
    this.lastSessionUpdate = 0;
  }

  get name() {
    return 'NSE India';
  }

  /**
   * Check if NSE API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      await this.ensureSession();
      const response = await axios.get(`${this.baseURL}/market-status`, {
        timeout: 5000,
        headers: this.getHeaders()
      });
      return response.status === 200;
    } catch (error) {
      console.warn('NSE availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Ensure we have a valid session with NSE
   * NSE requires session cookies for API access
   */
  async ensureSession() {
    const now = Date.now();
    
    // Refresh session every 30 minutes
    if (!this.sessionCookies || (now - this.lastSessionUpdate) > 30 * 60 * 1000) {
      try {
        const response = await axios.get('https://www.nseindia.com', {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.sessionCookies = cookies.map(cookie => cookie.split(';')[0]).join('; ');
          this.lastSessionUpdate = now;
        }
      } catch (error) {
        console.error('Failed to establish NSE session:', error.message);
        throw new Error('Unable to establish session with NSE');
      }
    }
  }

  /**
   * Get headers for NSE API requests
   * @returns {Object}
   */
  getHeaders() {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://www.nseindia.com/',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (this.sessionCookies) {
      headers['Cookie'] = this.sessionCookies;
    }

    return headers;
  }

  /**
   * Format symbol for NSE API
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (should be NSE for this provider)
   * @returns {string}
   */
  formatSymbol(symbol, exchange) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // NSE API expects uppercase symbols
    return symbol.toUpperCase().trim();
  }

  /**
   * Fetch stock price data for given symbols
   * @param {Array} identifiers - Array of objects with {symbol, exchange}
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of price data
   */
  async fetchData(identifiers, options = {}) {
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      return [];
    }

    // Filter for NSE symbols only
    const nseIdentifiers = identifiers.filter(id => 
      id.exchange && id.exchange.toUpperCase() === 'NSE'
    );

    if (nseIdentifiers.length === 0) {
      return [];
    }

    await this.ensureSession();
    await this.handleRateLimit(this.requestCount);

    const results = [];
    const batchSize = 5; // NSE has stricter rate limits

    for (let i = 0; i < nseIdentifiers.length; i += batchSize) {
      const batch = nseIdentifiers.slice(i, i + batchSize);
      const batchResults = await this.fetchBatch(batch, options);
      results.push(...batchResults);
      
      // Longer delay between batches for NSE
      if (i + batchSize < nseIdentifiers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Fetch a batch of stock prices
   * @param {Array} batch - Batch of identifiers
   * @param {Object} options - Options
   * @returns {Promise<Array>}
   */
  async fetchBatch(batch, options) {
    const results = [];

    for (const identifier of batch) {
      try {
        const symbol = this.formatSymbol(identifier.symbol, identifier.exchange);
        const priceData = await this.fetchSinglePrice(symbol, identifier);
        
        if (priceData) {
          results.push(priceData);
        }
        
        this.requestCount++;
        
        // Small delay between individual requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to fetch NSE price for ${identifier.symbol}:`, error.message);
        // Continue with other symbols even if one fails
      }
    }

    return results;
  }

  /**
   * Fetch price for a single stock from NSE
   * @param {string} symbol - NSE symbol
   * @param {Object} originalIdentifier - Original identifier object
   * @returns {Promise<Object|null>}
   */
  async fetchSinglePrice(symbol, originalIdentifier) {
    try {
      // Try equity quote first
      let response;
      try {
        response = await axios.get(`${this.baseURL}/quote-equity`, {
          timeout: 10000,
          headers: this.getHeaders(),
          params: {
            symbol: symbol
          }
        });
      } catch (error) {
        // If equity quote fails, try derivative quote (for some stocks)
        console.log(`Equity quote failed for ${symbol}, trying derivative quote`);
        response = await axios.get(`${this.baseURL}/quote-derivative`, {
          timeout: 10000,
          headers: this.getHeaders(),
          params: {
            symbol: symbol
          }
        });
      }

      const data = response.data;
      
      if (!data || !data.priceInfo) {
        throw new Error('No price information available');
      }

      const priceInfo = data.priceInfo;
      const lastPrice = parseFloat(priceInfo.lastPrice);
      const previousClose = parseFloat(priceInfo.previousClose || priceInfo.close);

      if (!lastPrice || lastPrice <= 0) {
        throw new Error('Invalid price data');
      }

      const change = lastPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: originalIdentifier.symbol,
        exchange: originalIdentifier.exchange,
        nseSymbol: symbol,
        price: parseFloat(lastPrice.toFixed(2)),
        currency: 'INR',
        timestamp: new Date(),
        previousClose: parseFloat(previousClose.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: parseInt(priceInfo.totalTradedVolume || 0),
        high: parseFloat(priceInfo.intraDayHighLow?.max || priceInfo.dayHigh || 0),
        low: parseFloat(priceInfo.intraDayHighLow?.min || priceInfo.dayLow || 0),
        marketCap: parseFloat(priceInfo.marketCap || 0),
        source: this.name
      };
    } catch (error) {
      console.error(`Error fetching NSE price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Validate the fetched price data
   * @param {Array} data - Price data to validate
   * @returns {boolean}
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(item => {
      return (
        item &&
        typeof item.symbol === 'string' &&
        typeof item.exchange === 'string' &&
        typeof item.price === 'number' &&
        item.price > 0 &&
        item.timestamp instanceof Date &&
        typeof item.source === 'string'
      );
    });
  }

  /**
   * Transform raw data into standardized format
   * @param {Array} data - Raw price data
   * @returns {Array} Transformed data
   */
  transformData(data) {
    return data.map(item => ({
      identifier: `${item.symbol}:${item.exchange}`,
      symbol: item.symbol,
      exchange: item.exchange,
      value: item.price,
      currency: item.currency,
      timestamp: item.timestamp,
      metadata: {
        previousClose: item.previousClose,
        change: item.change,
        changePercent: item.changePercent,
        volume: item.volume,
        high: item.high,
        low: item.low,
        marketCap: item.marketCap
      },
      source: this.name
    }));
  }

  /**
   * Get rate limits for NSE API
   * @returns {Object}
   */
  getRateLimits() {
    return {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000
    };
  }

  /**
   * Handle rate limiting for NSE API
   * @param {number} requestCount
   * @returns {Promise<void>}
   */
  async handleRateLimit(requestCount) {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      return;
    }

    const limits = this.getRateLimits();
    
    if (requestCount >= limits.requestsPerMinute) {
      const waitTime = 60000 - timeSinceReset;
      console.log(`NSE rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
  }
}

module.exports = NSEDataProvider;