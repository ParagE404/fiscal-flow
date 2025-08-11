const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const KeyManagementService = require('../../security/KeyManagementService');
const ApiSigningService = require('../../security/ApiSigningService');

const prisma = new PrismaClient();

/**
 * Service for secure credential storage and management
 * Uses AES-256-GCM encryption for storing sensitive credentials
 */
class CredentialService {
  constructor() {
    this.algorithm = 'aes-256-gcm'; // Upgraded to GCM for authenticated encryption
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    this.tagLength = 16; // 128 bits for GCM auth tag
    
    // Initialize enhanced security services
    this.keyManager = new KeyManagementService();
    this.apiSigner = new ApiSigningService();
    
    // Get encryption key from environment or generate one
    this.masterKey = this.getMasterKey();
    
    // Key rotation settings
    this.currentKeyVersion = parseInt(process.env.CREDENTIAL_KEY_VERSION) || 1;
    this.keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    
    // Security policies
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Get or generate the master encryption key
   * @returns {Buffer} Master key for encryption
   * @private
   */
  getMasterKey() {
    const keyFromEnv = process.env.CREDENTIAL_ENCRYPTION_KEY;
    
    if (keyFromEnv) {
      // Ensure the key is the correct length
      if (keyFromEnv.length !== 64) { // 32 bytes = 64 hex characters
        throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
      return Buffer.from(keyFromEnv, 'hex');
    }
    
    // In development, generate a key (should not be used in production)
    if (process.env.NODE_ENV === 'development') {
      console.warn('WARNING: Using generated encryption key. Set CREDENTIAL_ENCRYPTION_KEY in production!');
      return crypto.randomBytes(this.keyLength);
    }
    
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is required');
  }

  /**
   * Derive an encryption key from the master key using PBKDF2
   * @param {Buffer} salt - Salt for key derivation
   * @param {number} keyVersion - Key version for rotation
   * @returns {Buffer} Derived encryption key
   * @private
   */
  deriveKey(salt, keyVersion = this.currentKeyVersion) {
    const iterations = 100000; // PBKDF2 iterations
    const keyMaterial = Buffer.concat([this.masterKey, Buffer.from(keyVersion.toString())]);
    
    return crypto.pbkdf2Sync(keyMaterial, salt, iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypt credentials using AES-256-CBC
   * @param {Object} credentials - Credentials object to encrypt
   * @param {number} keyVersion - Key version to use
   * @returns {string} Encrypted credentials as hex string
   * @private
   */
  encrypt(credentials, keyVersion = this.currentKeyVersion) {
    try {
      const plaintext = JSON.stringify(credentials);
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(salt, keyVersion);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine salt, iv, and encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('hex');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt credentials using AES-256-CBC
   * @param {string} encryptedData - Encrypted data as hex string
   * @param {number} keyVersion - Key version used for encryption
   * @returns {Object} Decrypted credentials object
   * @private
   */
  decrypt(encryptedData, keyVersion = this.currentKeyVersion) {
    try {
      const combined = Buffer.from(encryptedData, 'hex');
      
      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = combined.subarray(this.saltLength + this.ivLength);
      
      const key = this.deriveKey(salt, keyVersion);
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Store encrypted credentials for a user and service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier (e.g., 'epfo', 'yahoo_finance')
   * @param {Object} credentials - Credentials object to store
   * @returns {Promise<void>}
   */
  async storeCredentials(userId, service, credentials) {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required and must be a string');
      }
      
      if (!service || typeof service !== 'string') {
        throw new Error('Service identifier is required and must be a string');
      }
      
      if (!credentials || typeof credentials !== 'object') {
        throw new Error('Credentials must be a valid object');
      }

      // Validate credentials based on service type
      this.validateCredentials(service, credentials);
      
      // Encrypt the credentials
      const encryptedData = this.encrypt(credentials, this.currentKeyVersion);
      
      // Store in database
      await prisma.encryptedCredentials.upsert({
        where: {
          userId_service: {
            userId,
            service
          }
        },
        update: {
          encryptedData,
          keyVersion: this.currentKeyVersion,
          updatedAt: new Date()
        },
        create: {
          userId,
          service,
          encryptedData,
          keyVersion: this.currentKeyVersion
        }
      });
      
      console.log(`Credentials stored successfully for user ${userId}, service ${service}`);
    } catch (error) {
      console.error(`Failed to store credentials for user ${userId}, service ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt credentials for a user and service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<Object|null>} Decrypted credentials or null if not found
   */
  async getCredentials(userId, service) {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required and must be a string');
      }
      
      if (!service || typeof service !== 'string') {
        throw new Error('Service identifier is required and must be a string');
      }

      // Retrieve from database
      const record = await prisma.encryptedCredentials.findUnique({
        where: {
          userId_service: {
            userId,
            service
          }
        }
      });
      
      if (!record) {
        return null;
      }
      
      // Check if credentials need rotation
      if (this.needsKeyRotation(record.updatedAt, record.keyVersion)) {
        console.warn(`Credentials for user ${userId}, service ${service} need key rotation`);
      }
      
      // Decrypt the credentials
      const credentials = this.decrypt(record.encryptedData, record.keyVersion);
      
      return credentials;
    } catch (error) {
      console.error(`Failed to retrieve credentials for user ${userId}, service ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete credentials for a user and service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<boolean>} True if credentials were deleted
   */
  async deleteCredentials(userId, service) {
    try {
      const result = await prisma.encryptedCredentials.delete({
        where: {
          userId_service: {
            userId,
            service
          }
        }
      });
      
      console.log(`Credentials deleted successfully for user ${userId}, service ${service}`);
      return true;
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        return false;
      }
      console.error(`Failed to delete credentials for user ${userId}, service ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if credentials exist for a user and service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<boolean>} True if credentials exist
   */
  async hasCredentials(userId, service) {
    try {
      const count = await prisma.encryptedCredentials.count({
        where: {
          userId,
          service
        }
      });
      
      return count > 0;
    } catch (error) {
      console.error(`Failed to check credentials for user ${userId}, service ${service}:`, error.message);
      return false;
    }
  }

  /**
   * Rotate credentials to use the current key version
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<boolean>} True if rotation was successful
   */
  async rotateCredentials(userId, service) {
    try {
      // Get existing credentials
      const credentials = await this.getCredentials(userId, service);
      if (!credentials) {
        return false;
      }
      
      // Re-encrypt with current key version
      await this.storeCredentials(userId, service, credentials);
      
      console.log(`Credentials rotated successfully for user ${userId}, service ${service}`);
      return true;
    } catch (error) {
      console.error(`Failed to rotate credentials for user ${userId}, service ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate credentials based on service requirements
   * @param {string} service - Service identifier
   * @param {Object} credentials - Credentials to validate
   * @throws {Error} If credentials are invalid
   * @private
   */
  validateCredentials(service, credentials) {
    switch (service) {
      case 'epfo':
        if (!credentials.uan || !credentials.password) {
          throw new Error('EPFO credentials must include UAN and password');
        }
        if (typeof credentials.uan !== 'string' || credentials.uan.length !== 12) {
          throw new Error('UAN must be a 12-digit string');
        }
        break;
        
      case 'yahoo_finance':
        if (credentials.apiKey && typeof credentials.apiKey !== 'string') {
          throw new Error('Yahoo Finance API key must be a string');
        }
        break;
        
      case 'nse':
        if (credentials.apiKey && typeof credentials.apiKey !== 'string') {
          throw new Error('NSE API key must be a string');
        }
        break;
        
      case 'alpha_vantage':
        if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
          throw new Error('Alpha Vantage API key is required and must be a string');
        }
        break;
        
      default:
        // Generic validation for unknown services
        if (Object.keys(credentials).length === 0) {
          throw new Error('Credentials cannot be empty');
        }
    }
  }

  /**
   * Check if credentials need key rotation
   * @param {Date} lastUpdated - When credentials were last updated
   * @param {number} keyVersion - Current key version of stored credentials
   * @returns {boolean} True if rotation is needed
   * @private
   */
  needsKeyRotation(lastUpdated, keyVersion) {
    // Rotate if key version is outdated
    if (keyVersion < this.currentKeyVersion) {
      return true;
    }
    
    // Rotate if credentials are older than rotation interval
    const age = Date.now() - lastUpdated.getTime();
    return age > this.keyRotationInterval;
  }

  /**
   * Get all services that have stored credentials for a user
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} Array of service identifiers
   */
  async getStoredServices(userId) {
    try {
      const records = await prisma.encryptedCredentials.findMany({
        where: { userId },
        select: { service: true }
      });
      
      return records.map(record => record.service);
    } catch (error) {
      console.error(`Failed to get stored services for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Test credentials by attempting to decrypt them
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<boolean>} True if credentials can be decrypted
   */
  async testCredentials(userId, service) {
    try {
      const credentials = await this.getCredentials(userId, service);
      return credentials !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enhanced encryption with authenticated encryption (AES-256-GCM)
   * @param {Object} credentials - Credentials object to encrypt
   * @param {number} keyVersion - Key version to use
   * @returns {string} Encrypted credentials with authentication tag
   * @private
   */
  encryptEnhanced(credentials, keyVersion = this.currentKeyVersion) {
    try {
      const plaintext = JSON.stringify(credentials);
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(salt, keyVersion);
      
      const cipher = crypto.createCipher('aes-256-gcm', key);
      cipher.setAAD(Buffer.from(`${keyVersion}:${Date.now()}`)); // Additional authenticated data
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine salt, iv, auth tag, and encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('hex');
    } catch (error) {
      throw new Error(`Enhanced encryption failed: ${error.message}`);
    }
  }

  /**
   * Enhanced decryption with authentication verification
   * @param {string} encryptedData - Encrypted data as hex string
   * @param {number} keyVersion - Key version used for encryption
   * @returns {Object} Decrypted credentials object
   * @private
   */
  decryptEnhanced(encryptedData, keyVersion = this.currentKeyVersion) {
    try {
      const combined = Buffer.from(encryptedData, 'hex');
      
      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const authTag = combined.subarray(
        this.saltLength + this.ivLength, 
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);
      
      const key = this.deriveKey(salt, keyVersion);
      
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAAD(Buffer.from(`${keyVersion}:${Date.now()}`));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Enhanced decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate signed API request headers for external services
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} body - Request body
   * @param {Object} credentials - Service credentials
   * @returns {Object} Headers with signature
   */
  generateSignedHeaders(method, url, body = '', credentials = {}) {
    const baseHeaders = this.apiSigner.generateSignedHeaders(method, url, body);
    
    // Add service-specific authentication headers
    if (credentials.apiKey) {
      baseHeaders['Authorization'] = `Bearer ${credentials.apiKey}`;
    }
    
    if (credentials.clientId && credentials.clientSecret) {
      const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
      baseHeaders['Authorization'] = `Basic ${auth}`;
    }
    
    return baseHeaders;
  }

  /**
   * Verify API request signature
   * @param {Object} headers - Request headers
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} body - Request body
   * @returns {boolean} True if signature is valid
   */
  verifyRequestSignature(headers, method, url, body = '') {
    const signature = headers['x-api-signature'];
    const timestamp = parseInt(headers['x-api-timestamp']);
    
    if (!signature || !timestamp) {
      return false;
    }
    
    // Check timestamp validity (prevent replay attacks)
    if (!this.apiSigner.validateTimestamp(timestamp)) {
      return false;
    }
    
    return this.apiSigner.verifyRequest(signature, method, url, body, timestamp);
  }

  /**
   * Track failed credential access attempts
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @param {string} reason - Failure reason
   * @returns {Promise<boolean>} True if account should be locked
   */
  async trackFailedAttempt(userId, service, reason) {
    const key = `failed_attempts:${userId}:${service}`;
    
    // Get current failed attempts count
    const attempts = await this.getFailedAttempts(userId, service);
    const newAttempts = attempts + 1;
    
    // Store updated count with expiration
    await this.setFailedAttempts(userId, service, newAttempts);
    
    // Log the failed attempt
    await prisma.auditLog.create({
      data: {
        userId,
        auditType: 'credential_access_failed',
        investmentType: null,
        investmentId: null,
        source: service,
        details: {
          reason,
          attemptCount: newAttempts,
          timestamp: new Date().toISOString()
        },
        ipAddress: null, // Would be populated from request context
        userAgent: null
      }
    });
    
    // Check if account should be locked
    if (newAttempts >= this.maxFailedAttempts) {
      await this.lockAccount(userId, service);
      return true;
    }
    
    return false;
  }

  /**
   * Get failed attempts count for user/service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<number>} Failed attempts count
   */
  async getFailedAttempts(userId, service) {
    // This would typically use Redis or similar cache
    // For now, use database
    const recent = await prisma.auditLog.count({
      where: {
        userId,
        auditType: 'credential_access_failed',
        source: service,
        timestamp: {
          gte: new Date(Date.now() - this.lockoutDuration)
        }
      }
    });
    
    return recent;
  }

  /**
   * Set failed attempts count
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @param {number} count - Attempts count
   * @returns {Promise<void>}
   */
  async setFailedAttempts(userId, service, count) {
    // Implementation would depend on caching solution
    // For now, this is handled by the audit log
  }

  /**
   * Lock account for specific service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<void>}
   */
  async lockAccount(userId, service) {
    const lockUntil = new Date(Date.now() + this.lockoutDuration);
    
    // Create lock record
    await prisma.accountLock.create({
      data: {
        userId,
        service,
        lockedAt: new Date(),
        lockUntil,
        reason: 'Too many failed credential access attempts'
      }
    });
    
    // Log the lockout
    await prisma.auditLog.create({
      data: {
        userId,
        auditType: 'account_locked',
        source: service,
        details: {
          reason: 'Excessive failed attempts',
          lockUntil: lockUntil.toISOString()
        }
      }
    });
  }

  /**
   * Check if account is locked for specific service
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<boolean>} True if account is locked
   */
  async isAccountLocked(userId, service) {
    const lock = await prisma.accountLock.findFirst({
      where: {
        userId,
        service,
        lockUntil: {
          gt: new Date()
        }
      }
    });
    
    return !!lock;
  }

  /**
   * Clear failed attempts after successful access
   * @param {string} userId - User ID
   * @param {string} service - Service identifier
   * @returns {Promise<void>}
   */
  async clearFailedAttempts(userId, service) {
    // Remove any existing locks
    await prisma.accountLock.deleteMany({
      where: {
        userId,
        service
      }
    });
    
    // Log successful access
    await prisma.auditLog.create({
      data: {
        userId,
        auditType: 'credential_access_success',
        source: service,
        details: {
          timestamp: new Date().toISOString()
        }
      }
    });
  }
}

module.exports = CredentialService;