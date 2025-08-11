const crypto = require('crypto');

// Mock dependencies first
const mockPrisma = {
  encryptedCredentials: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    count: jest.fn()
  },
  accountLock: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

jest.mock('../../security/KeyManagementService', () => {
  return jest.fn().mockImplementation(() => ({
    generateKey: jest.fn(),
    deriveKey: jest.fn()
  }));
});

jest.mock('../../security/ApiSigningService', () => {
  return jest.fn().mockImplementation(() => ({
    generateSignedHeaders: jest.fn(),
    verifyRequest: jest.fn()
  }));
});

const CredentialService = require('../security/CredentialService');

describe('CredentialService', () => {
  let credentialService;
  const testEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(() => {
    // Set environment variable for tests
    process.env.CREDENTIAL_ENCRYPTION_KEY = testEncryptionKey;
  });

  afterAll(() => {
    // Clean up environment variable
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    credentialService = new CredentialService();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct encryption settings', () => {
      expect(credentialService.algorithm).toBe('aes-256-gcm');
      expect(credentialService.keyLength).toBe(32);
      expect(credentialService.ivLength).toBe(16);
      expect(credentialService.saltLength).toBe(32);
    });

    test('should throw error if encryption key is missing in production', () => {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';
      
      expect(() => new CredentialService()).toThrow('CREDENTIAL_ENCRYPTION_KEY environment variable is required');
      
      // Restore for other tests
      process.env.CREDENTIAL_ENCRYPTION_KEY = testEncryptionKey;
      process.env.NODE_ENV = 'test';
    });

    test('should throw error if encryption key has wrong length', () => {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'short_key';
      
      expect(() => new CredentialService()).toThrow('CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters');
      
      // Restore for other tests
      process.env.CREDENTIAL_ENCRYPTION_KEY = testEncryptionKey;
    });
  });

  describe('Key Derivation', () => {
    test('should derive consistent keys from same salt and version', () => {
      const salt = Buffer.from('test_salt_16_bytes', 'utf8');
      const keyVersion = 1;
      
      const key1 = credentialService.deriveKey(salt, keyVersion);
      const key2 = credentialService.deriveKey(salt, keyVersion);
      
      expect(key1).toEqual(key2);
      expect(key1).toHaveLength(32); // 256 bits
    });

    test('should derive different keys for different versions', () => {
      const salt = Buffer.from('test_salt_16_bytes', 'utf8');
      
      const key1 = credentialService.deriveKey(salt, 1);
      const key2 = credentialService.deriveKey(salt, 2);
      
      expect(key1).not.toEqual(key2);
    });
  });

  describe('Encryption and Decryption', () => {
    test('should encrypt and decrypt credentials correctly', () => {
      const testCredentials = {
        username: 'testuser',
        password: 'testpassword',
        apiKey: 'test-api-key-123'
      };

      const encrypted = credentialService.encrypt(testCredentials);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = credentialService.decrypt(encrypted);
      expect(decrypted).toEqual(testCredentials);
    });

    test('should produce different encrypted output for same input', () => {
      const testCredentials = { username: 'test', password: 'pass' };
      
      const encrypted1 = credentialService.encrypt(testCredentials);
      const encrypted2 = credentialService.encrypt(testCredentials);
      
      expect(encrypted1).not.toBe(encrypted2); // Different due to random salt/IV
      
      // But both should decrypt to same value
      expect(credentialService.decrypt(encrypted1)).toEqual(testCredentials);
      expect(credentialService.decrypt(encrypted2)).toEqual(testCredentials);
    });

    test('should handle encryption errors gracefully', () => {
      // Test with circular reference that can't be JSON.stringify'd
      const circularObj = {};
      circularObj.self = circularObj;
      
      expect(() => credentialService.encrypt(circularObj)).toThrow('Encryption failed');
    });

    test('should handle decryption errors gracefully', () => {
      const invalidEncryptedData = 'invalid_hex_data';
      
      expect(() => credentialService.decrypt(invalidEncryptedData)).toThrow('Decryption failed');
    });
  });

  describe('Credential Validation', () => {
    test('should validate EPFO credentials correctly', () => {
      const validCredentials = {
        uan: '123456789012',
        password: 'validpassword'
      };
      
      expect(() => credentialService.validateCredentials('epfo', validCredentials)).not.toThrow();
    });

    test('should reject invalid EPFO credentials', () => {
      // Missing UAN
      expect(() => credentialService.validateCredentials('epfo', { password: 'test' }))
        .toThrow('EPFO credentials must include UAN and password');
      
      // Invalid UAN length
      expect(() => credentialService.validateCredentials('epfo', { uan: '12345', password: 'test' }))
        .toThrow('UAN must be a 12-digit string');
      
      // Missing password
      expect(() => credentialService.validateCredentials('epfo', { uan: '123456789012' }))
        .toThrow('EPFO credentials must include UAN and password');
    });

    test('should validate API key credentials', () => {
      const validCredentials = { apiKey: 'valid-api-key' };
      
      expect(() => credentialService.validateCredentials('yahoo_finance', validCredentials)).not.toThrow();
      expect(() => credentialService.validateCredentials('nse', validCredentials)).not.toThrow();
    });

    test('should reject invalid API key credentials', () => {
      expect(() => credentialService.validateCredentials('yahoo_finance', { apiKey: 123 }))
        .toThrow('Yahoo Finance API key must be a string');
      
      expect(() => credentialService.validateCredentials('alpha_vantage', {}))
        .toThrow('Alpha Vantage API key is required and must be a string');
    });

    test('should validate generic credentials', () => {
      expect(() => credentialService.validateCredentials('unknown_service', { key: 'value' })).not.toThrow();
      expect(() => credentialService.validateCredentials('unknown_service', {}))
        .toThrow('Credentials cannot be empty');
    });
  });

  describe('Store Credentials', () => {
    test('should store credentials successfully', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const credentials = { uan: '123456789012', password: 'testpass' };

      mockPrisma.encryptedCredentials.upsert.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData: 'encrypted_data',
        keyVersion: 1
      });

      await credentialService.storeCredentials(userId, service, credentials);

      expect(mockPrisma.encryptedCredentials.upsert).toHaveBeenCalledWith({
        where: {
          userId_service: { userId, service }
        },
        update: expect.objectContaining({
          encryptedData: expect.any(String),
          keyVersion: 1,
          updatedAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId,
          service,
          encryptedData: expect.any(String),
          keyVersion: 1
        })
      });
    });

    test('should validate inputs before storing', async () => {
      await expect(credentialService.storeCredentials('', 'service', {}))
        .rejects.toThrow('User ID is required and must be a string');
      
      await expect(credentialService.storeCredentials('user123', '', {}))
        .rejects.toThrow('Service identifier is required and must be a string');
      
      await expect(credentialService.storeCredentials('user123', 'service', null))
        .rejects.toThrow('Credentials must be a valid object');
    });

    test('should handle database errors during storage', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const credentials = { uan: '123456789012', password: 'testpass' };

      mockPrisma.encryptedCredentials.upsert.mockRejectedValue(new Error('Database error'));

      await expect(credentialService.storeCredentials(userId, service, credentials))
        .rejects.toThrow('Database error');
    });
  });

  describe('Get Credentials', () => {
    test('should retrieve and decrypt credentials successfully', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const originalCredentials = { uan: '123456789012', password: 'testpass' };
      
      // Encrypt credentials for mock
      const encryptedData = credentialService.encrypt(originalCredentials);
      
      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData,
        keyVersion: 1,
        updatedAt: new Date()
      });

      const result = await credentialService.getCredentials(userId, service);

      expect(result).toEqual(originalCredentials);
      expect(mockPrisma.encryptedCredentials.findUnique).toHaveBeenCalledWith({
        where: {
          userId_service: { userId, service }
        }
      });
    });

    test('should return null when credentials not found', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue(null);

      const result = await credentialService.getCredentials(userId, service);

      expect(result).toBeNull();
    });

    test('should validate inputs before retrieval', async () => {
      await expect(credentialService.getCredentials('', 'service'))
        .rejects.toThrow('User ID is required and must be a string');
      
      await expect(credentialService.getCredentials('user123', ''))
        .rejects.toThrow('Service identifier is required and must be a string');
    });

    test('should handle decryption errors gracefully', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData: 'invalid_encrypted_data',
        keyVersion: 1,
        updatedAt: new Date()
      });

      await expect(credentialService.getCredentials(userId, service))
        .rejects.toThrow('Decryption failed');
    });
  });

  describe('Delete Credentials', () => {
    test('should delete credentials successfully', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.delete.mockResolvedValue({
        id: 'cred123'
      });

      const result = await credentialService.deleteCredentials(userId, service);

      expect(result).toBe(true);
      expect(mockPrisma.encryptedCredentials.delete).toHaveBeenCalledWith({
        where: {
          userId_service: { userId, service }
        }
      });
    });

    test('should return false when credentials not found', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.delete.mockRejectedValue({
        code: 'P2025' // Prisma "Record not found" error
      });

      const result = await credentialService.deleteCredentials(userId, service);

      expect(result).toBe(false);
    });

    test('should handle other database errors', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.delete.mockRejectedValue(new Error('Database error'));

      await expect(credentialService.deleteCredentials(userId, service))
        .rejects.toThrow('Database error');
    });
  });

  describe('Has Credentials', () => {
    test('should return true when credentials exist', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.count.mockResolvedValue(1);

      const result = await credentialService.hasCredentials(userId, service);

      expect(result).toBe(true);
      expect(mockPrisma.encryptedCredentials.count).toHaveBeenCalledWith({
        where: { userId, service }
      });
    });

    test('should return false when credentials do not exist', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.count.mockResolvedValue(0);

      const result = await credentialService.hasCredentials(userId, service);

      expect(result).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.count.mockRejectedValue(new Error('Database error'));

      const result = await credentialService.hasCredentials(userId, service);

      expect(result).toBe(false);
    });
  });

  describe('Credential Rotation', () => {
    test('should rotate credentials successfully', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const originalCredentials = { uan: '123456789012', password: 'oldpass' };
      
      // Mock existing credentials
      const encryptedData = credentialService.encrypt(originalCredentials);
      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData,
        keyVersion: 1,
        updatedAt: new Date()
      });

      // Mock successful storage of rotated credentials
      mockPrisma.encryptedCredentials.upsert.mockResolvedValue({});

      const result = await credentialService.rotateCredentials(userId, service);

      expect(result).toBe(true);
      expect(mockPrisma.encryptedCredentials.upsert).toHaveBeenCalled();
    });

    test('should return false when no credentials to rotate', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue(null);

      const result = await credentialService.rotateCredentials(userId, service);

      expect(result).toBe(false);
    });
  });

  describe('Key Rotation Detection', () => {
    test('should detect when key rotation is needed', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const oldKeyVersion = 1;
      credentialService.currentKeyVersion = 2;

      const needsRotation = credentialService.needsKeyRotation(oldDate, oldKeyVersion);

      expect(needsRotation).toBe(true);
    });

    test('should detect when credentials are too old', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const currentKeyVersion = credentialService.currentKeyVersion;

      const needsRotation = credentialService.needsKeyRotation(oldDate, currentKeyVersion);

      expect(needsRotation).toBe(true);
    });

    test('should not require rotation for recent credentials', () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const currentKeyVersion = credentialService.currentKeyVersion;

      const needsRotation = credentialService.needsKeyRotation(recentDate, currentKeyVersion);

      expect(needsRotation).toBe(false);
    });
  });

  describe('Get Stored Services', () => {
    test('should return list of services with stored credentials', async () => {
      const userId = 'user123';
      const mockRecords = [
        { service: 'epfo' },
        { service: 'yahoo_finance' },
        { service: 'nse' }
      ];

      mockPrisma.encryptedCredentials.findMany.mockResolvedValue(mockRecords);

      const result = await credentialService.getStoredServices(userId);

      expect(result).toEqual(['epfo', 'yahoo_finance', 'nse']);
      expect(mockPrisma.encryptedCredentials.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { service: true }
      });
    });

    test('should return empty array on database error', async () => {
      const userId = 'user123';

      mockPrisma.encryptedCredentials.findMany.mockRejectedValue(new Error('Database error'));

      const result = await credentialService.getStoredServices(userId);

      expect(result).toEqual([]);
    });
  });

  describe('Test Credentials', () => {
    test('should return true for valid credentials', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const credentials = { uan: '123456789012', password: 'testpass' };
      
      const encryptedData = credentialService.encrypt(credentials);
      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData,
        keyVersion: 1,
        updatedAt: new Date()
      });

      const result = await credentialService.testCredentials(userId, service);

      expect(result).toBe(true);
    });

    test('should return false for invalid credentials', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.encryptedCredentials.findUnique.mockResolvedValue({
        id: 'cred123',
        userId,
        service,
        encryptedData: 'invalid_data',
        keyVersion: 1,
        updatedAt: new Date()
      });

      const result = await credentialService.testCredentials(userId, service);

      expect(result).toBe(false);
    });
  });

  describe('Security Features', () => {
    test('should track failed attempts', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const reason = 'Invalid password';

      mockPrisma.auditLog.count.mockResolvedValue(2); // 2 previous attempts
      mockPrisma.auditLog.create.mockResolvedValue({});

      const shouldLock = await credentialService.trackFailedAttempt(userId, service, reason);

      expect(shouldLock).toBe(false); // Not yet at max attempts
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          auditType: 'credential_access_failed',
          source: service,
          details: expect.objectContaining({
            reason,
            attemptCount: 3
          })
        })
      });
    });

    test('should lock account after max failed attempts', async () => {
      const userId = 'user123';
      const service = 'epfo';
      const reason = 'Invalid password';

      mockPrisma.auditLog.count.mockResolvedValue(4); // 4 previous attempts
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.accountLock.create.mockResolvedValue({});

      const shouldLock = await credentialService.trackFailedAttempt(userId, service, reason);

      expect(shouldLock).toBe(true);
      expect(mockPrisma.accountLock.create).toHaveBeenCalled();
    });

    test('should check if account is locked', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.accountLock.findFirst.mockResolvedValue({
        id: 'lock123',
        userId,
        service,
        lockUntil: new Date(Date.now() + 60000) // 1 minute from now
      });

      const isLocked = await credentialService.isAccountLocked(userId, service);

      expect(isLocked).toBe(true);
    });

    test('should clear failed attempts after successful access', async () => {
      const userId = 'user123';
      const service = 'epfo';

      mockPrisma.accountLock.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await credentialService.clearFailedAttempts(userId, service);

      expect(mockPrisma.accountLock.deleteMany).toHaveBeenCalledWith({
        where: { userId, service }
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          auditType: 'credential_access_success',
          source: service
        })
      });
    });
  });
});