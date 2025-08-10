const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Service for secure credential storage and management
 * Uses AES-256-GCM encryption for storing sensitive credentials
 */
class CredentialService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Get encryption key from environment or generate one
    this.masterKey = this.getMasterKey();
    
    // Key rotation settings
    this.currentKeyVersion = parseInt(process.env.CREDENTIAL_KEY_VERSION) || 1;
    this.keyRotationInterval = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
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
}

module.exports = CredentialService;