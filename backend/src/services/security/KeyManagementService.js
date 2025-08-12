const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Secure key management service with rotation policies and environment-based storage
 * Handles encryption keys, API keys, and credential rotation
 */
class KeyManagementService {
  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY;
    this.keyRotationInterval = parseInt(process.env.KEY_ROTATION_INTERVAL_DAYS) || 90;
    
    if (!this.masterKey) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
    }
    
    // Validate master key strength
    if (this.masterKey.length < 32) {
      throw new Error('MASTER_ENCRYPTION_KEY must be at least 32 characters long');
    }
  }

  /**
   * Generate a new encryption key with specified length
   * @param {number} length - Key length in bytes (default: 32 for AES-256)
   * @returns {string} Base64 encoded key
   */
  generateKey(length = 32) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * Derive a key from the master key using PBKDF2
   * @param {string} salt - Salt for key derivation
   * @param {string} purpose - Purpose identifier for the key
   * @returns {Buffer} Derived key
   */
  deriveKey(salt, purpose) {
    const info = `${purpose}:${salt}`;
    return crypto.pbkdf2Sync(this.masterKey, info, 100000, 32, 'sha256');
  }

  /**
   * Store an encrypted key in the database with metadata
   * @param {string} keyId - Unique identifier for the key
   * @param {string} keyData - Key data to encrypt and store
   * @param {string} purpose - Purpose of the key
   * @param {Date} expiresAt - Expiration date
   * @returns {Promise<Object>} Stored key record
   */
  async storeKey(keyId, keyData, purpose, expiresAt = null) {
    const salt = crypto.randomBytes(16).toString('base64');
    const derivedKey = this.deriveKey(salt, purpose);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', derivedKey);
    
    let encrypted = cipher.update(keyData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    const encryptedData = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    
    return await prisma.keyStore.create({
      data: {
        keyId,
        encryptedData,
        salt,
        purpose,
        version: 1,
        createdAt: new Date(),
        expiresAt,
        isActive: true
      }
    });
  }

  /**
   * Retrieve and decrypt a key from storage
   * @param {string} keyId - Key identifier
   * @returns {Promise<string|null>} Decrypted key data or null if not found
   */
  async retrieveKey(keyId) {
    const keyRecord = await prisma.keyStore.findFirst({
      where: {
        keyId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { version: 'desc' }
    });

    if (!keyRecord) {
      return null;
    }

    try {
      const derivedKey = this.deriveKey(keyRecord.salt, keyRecord.purpose);
      const [ivHex, authTagHex, encrypted] = keyRecord.encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-gcm', derivedKey);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      return null;
    }
  }

  /**
   * Rotate a key by creating a new version and marking old ones inactive
   * @param {string} keyId - Key identifier to rotate
   * @param {string} newKeyData - New key data
   * @param {string} purpose - Key purpose
   * @returns {Promise<Object>} New key record
   */
  async rotateKey(keyId, newKeyData, purpose) {
    // Mark existing keys as inactive
    await prisma.keyStore.updateMany({
      where: { keyId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() }
    });

    // Get the highest version number
    const latestKey = await prisma.keyStore.findFirst({
      where: { keyId },
      orderBy: { version: 'desc' }
    });

    const newVersion = latestKey ? latestKey.version + 1 : 1;
    
    // Create new key version
    const salt = crypto.randomBytes(16).toString('base64');
    const derivedKey = this.deriveKey(salt, purpose);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', derivedKey);
    
    let encrypted = cipher.update(newKeyData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    const encryptedData = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    return await prisma.keyStore.create({
      data: {
        keyId,
        encryptedData,
        salt,
        purpose,
        version: newVersion,
        createdAt: new Date(),
        isActive: true
      }
    });
  }

  /**
   * Check if keys need rotation based on age
   * @returns {Promise<Array>} Array of keys that need rotation
   */
  async getKeysNeedingRotation() {
    const rotationThreshold = new Date();
    rotationThreshold.setDate(rotationThreshold.getDate() - this.keyRotationInterval);

    return await prisma.keyStore.findMany({
      where: {
        isActive: true,
        createdAt: { lt: rotationThreshold },
        purpose: { not: 'master' } // Don't auto-rotate master keys
      },
      select: {
        keyId: true,
        purpose: true,
        createdAt: true,
        version: true
      }
    });
  }

  /**
   * Clean up expired and rotated keys
   * @param {number} retentionDays - Days to retain old keys (default: 30)
   * @returns {Promise<number>} Number of keys cleaned up
   */
  async cleanupExpiredKeys(retentionDays = 30) {
    const cleanupThreshold = new Date();
    cleanupThreshold.setDate(cleanupThreshold.getDate() - retentionDays);

    const result = await prisma.keyStore.deleteMany({
      where: {
        isActive: false,
        OR: [
          { expiresAt: { lt: new Date() } },
          { rotatedAt: { lt: cleanupThreshold } }
        ]
      }
    });

    return result.count;
  }

  /**
   * Validate key strength and compliance
   * @param {string} key - Key to validate
   * @param {string} type - Key type (api, encryption, signing)
   * @returns {Object} Validation result
   */
  validateKeyStrength(key, type) {
    const result = {
      isValid: false,
      score: 0,
      issues: []
    };

    // Minimum length requirements
    const minLengths = {
      api: 32,
      encryption: 32,
      signing: 32
    };

    if (key.length < minLengths[type]) {
      result.issues.push(`Key too short. Minimum length: ${minLengths[type]}`);
      return result;
    }

    // Check entropy
    const entropy = this.calculateEntropy(key);
    if (entropy < 4.0) {
      result.issues.push('Key has low entropy. Use a more random key.');
    }

    // Check for common patterns
    if (/(.)\1{3,}/.test(key)) {
      result.issues.push('Key contains repeated characters');
    }

    if (/^[a-zA-Z]+$/.test(key) || /^[0-9]+$/.test(key)) {
      result.issues.push('Key should contain mixed character types');
    }

    result.score = Math.min(100, entropy * 20);
    result.isValid = result.issues.length === 0 && result.score >= 80;

    return result;
  }

  /**
   * Calculate Shannon entropy of a string
   * @param {string} str - String to analyze
   * @returns {number} Entropy value
   */
  calculateEntropy(str) {
    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    
    for (let char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}

module.exports = KeyManagementService;