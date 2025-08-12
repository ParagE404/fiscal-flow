const crypto = require('crypto');

/**
 * Service for signing and verifying API requests to external services
 * Implements HMAC-SHA256 signing for secure API communications
 */
class ApiSigningService {
  constructor() {
    this.signingKey = process.env.API_SIGNING_KEY;
    if (!this.signingKey) {
      throw new Error('API_SIGNING_KEY environment variable is required');
    }
  }

  /**
   * Sign an API request with HMAC-SHA256
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} url - Request URL
   * @param {string} body - Request body (empty string for GET requests)
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Base64 encoded signature
   */
  signRequest(method, url, body = '', timestamp = Date.now()) {
    const payload = `${method.toUpperCase()}\n${url}\n${body}\n${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(payload, 'utf8')
      .digest('base64');
    
    return signature;
  }

  /**
   * Verify an API request signature
   * @param {string} signature - Signature to verify
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} body - Request body
   * @param {number} timestamp - Request timestamp
   * @returns {boolean} True if signature is valid
   */
  verifyRequest(signature, method, url, body = '', timestamp) {
    const expectedSignature = this.signRequest(method, url, body, timestamp);
    
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  }

  /**
   * Generate signed headers for external API requests
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} body - Request body
   * @returns {Object} Headers object with signature and timestamp
   */
  generateSignedHeaders(method, url, body = '') {
    const timestamp = Date.now();
    const signature = this.signRequest(method, url, body, timestamp);
    
    return {
      'X-API-Timestamp': timestamp.toString(),
      'X-API-Signature': signature,
      'X-API-Version': '1.0'
    };
  }

  /**
   * Validate request timestamp to prevent replay attacks
   * @param {number} timestamp - Request timestamp
   * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
   * @returns {boolean} True if timestamp is valid
   */
  validateTimestamp(timestamp, maxAge = 5 * 60 * 1000) {
    const now = Date.now();
    const age = now - timestamp;
    
    return age >= 0 && age <= maxAge;
  }

  /**
   * Create a secure nonce for request uniqueness
   * @returns {string} Random nonce
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }
}

module.exports = ApiSigningService;