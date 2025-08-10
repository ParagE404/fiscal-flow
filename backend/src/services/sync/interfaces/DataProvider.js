/**
 * Interface for data providers that fetch external financial data
 * All data providers must implement these methods for consistent behavior
 */
class DataProvider {
  constructor() {
    if (this.constructor === DataProvider) {
      throw new Error('DataProvider is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Get the name of this data provider
   * @returns {string} Provider name
   */
  get name() {
    throw new Error('name getter must be implemented by subclass');
  }

  /**
   * Check if the data provider service is currently available
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    throw new Error('isAvailable method must be implemented by subclass');
  }

  /**
   * Authenticate with the external service (optional for some providers)
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<boolean>} True if authentication successful
   */
  async authenticate(credentials) {
    // Default implementation - not all providers need authentication
    return true;
  }

  /**
   * Fetch data for the given identifiers
   * @param {string[]} identifiers - Array of identifiers (ISIN, symbols, etc.)
   * @param {Object} options - Additional options for data fetching
   * @returns {Promise<Array>} Array of data records
   */
  async fetchData(identifiers, options = {}) {
    throw new Error('fetchData method must be implemented by subclass');
  }

  /**
   * Validate the fetched data for correctness
   * @param {Array} data - Data to validate
   * @returns {boolean} True if data is valid
   */
  validateData(data) {
    throw new Error('validateData method must be implemented by subclass');
  }

  /**
   * Transform raw data into standardized format
   * @param {Array} data - Raw data from external source
   * @returns {Array} Transformed data in standard format
   */
  transformData(data) {
    throw new Error('transformData method must be implemented by subclass');
  }

  /**
   * Get rate limit information for this provider
   * @returns {Object} Rate limit info with requestsPerMinute, requestsPerHour, etc.
   */
  getRateLimits() {
    return {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };
  }

  /**
   * Handle rate limiting by implementing delays or queuing
   * @param {number} requestCount - Current request count
   * @returns {Promise<void>}
   */
  async handleRateLimit(requestCount) {
    // Default implementation - can be overridden by subclasses
    if (requestCount > this.getRateLimits().requestsPerMinute) {
      const delay = Math.ceil(60000 / this.getRateLimits().requestsPerMinute);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = DataProvider;