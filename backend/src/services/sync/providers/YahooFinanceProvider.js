const axios = require('axios');
const DataProvider = require('../interfaces/DataProvider');

/**
 * Yahoo Finance data provider for fetching stock prices
 * Supports NSE and BSE listed stocks with proper symbol formatting
 */
class YahooFinanceProvider extends DataProvider {
  constructor() {
    super();
    this.baseURL = 'https://query1.finance.yahoo.com/v8/finance/chart';
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }

  get name() {
    return 'Yahoo Finance';
  }

  /**
   * Check if Yahoo Finance API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const testSymbol = 'RELIANCE.NS'; // Test with a popular NSE stock
      const response = await axios.get(`${this.baseURL}/${testSymbol}`, {
        timeout: 5000,
        params: {
          interval: '1d',
          range: '1d'
        }
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Yahoo Finance availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Format stock symbol for Yahoo Finance API based on exchange
   * @param {string} symbol - Stock symbol
   * @param {string} exchange - Exchange (NSE, BSE)
   * @returns {string} Formatted symbol for Yahoo Finance
   */
  formatSymbol(symbol, exchange) {
    if (!symbol || !exchange) {
      throw new Error('Symbol and exchange are required');
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    
    switch (exchange.toUpperCase()) {
      case 'NSE':
        return `${cleanSymbol}.NS`;
      case 'BSE':
        return `${cleanSymbol}.BO`;
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
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

    await this.handleRateLimit(this.requestCount);

    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the API

    for (let i = 0; i < identifiers.length; i += batchSize) {
      const batch = identifiers.slice(i, i + batchSize);
      const batchResults = await this.fetchBatch(batch, options);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < identifiers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
        const yahooSymbol = this.formatSymbol(identifier.symbol, identifier.exchange);
        const priceData = await this.fetchSinglePrice(yahooSymbol, identifier);
        
        if (priceData) {
          results.push(priceData);
        }
        
        this.requestCount++;
      } catch (error) {
        console.error(`Failed to fetch price for ${identifier.symbol}:`, error.message);
        // Continue with other symbols even if one fails
      }
    }

    return results;
  }

  /**
   * Fetch price for a single stock
   * @param {string} yahooSymbol - Yahoo formatted symbol
   * @param {Object} originalIdentifier - Original identifier object
   * @returns {Promise<Object|null>}
   */
  async fetchSinglePrice(yahooSymbol, originalIdentifier) {
    try {
      const response = await axios.get(`${this.baseURL}/${yahooSymbol}`, {
        timeout: 10000,
        params: {
          interval: '1d',
          range: '1d'
        }
      });

      const data = response.data;
      
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      if (!quote || !quote.close || quote.close.length === 0) {
        throw new Error('No price data available');
      }

      // Get the latest close price
      const prices = quote.close.filter(price => price !== null);
      const latestPrice = prices[prices.length - 1];

      if (!latestPrice || latestPrice <= 0) {
        throw new Error('Invalid price data');
      }

      return {
        symbol: originalIdentifier.symbol,
        exchange: originalIdentifier.exchange,
        yahooSymbol,
        price: parseFloat(latestPrice.toFixed(2)),
        currency: meta.currency || 'INR',
        timestamp: new Date(meta.regularMarketTime * 1000),
        marketState: meta.marketState,
        previousClose: meta.previousClose,
        change: latestPrice - meta.previousClose,
        changePercent: ((latestPrice - meta.previousClose) / meta.previousClose) * 100,
        source: this.name
      };
    } catch (error) {
      console.error(`Error fetching price for ${yahooSymbol}:`, error.message);
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
        marketState: item.marketState
      },
      source: this.name
    }));
  }

  /**
   * Get rate limits for Yahoo Finance
   * @returns {Object}
   */
  getRateLimits() {
    return {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };
  }

  /**
   * Handle rate limiting with more sophisticated logic
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
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
  }
}

module.exports = YahooFinanceProvider;