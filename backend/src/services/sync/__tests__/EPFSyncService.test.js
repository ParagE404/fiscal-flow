const EPFSyncService = require('../EPFSyncService');
const EPFODataProvider = require('../providers/EPFODataProvider');
const { SyncStatus, SyncErrorTypes } = require('../types/SyncTypes');

// Mock the prisma client at the module level
const mockPrismaInstance = {
  ePFAccount: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  syncConfiguration: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  syncMetadata: {
    upsert: jest.fn(),
    findMany: jest.fn()
  },
  encryptedCredentials: {
    findUnique: jest.fn()
  }
};

// Mock dependencies
jest.mock('../providers/EPFODataProvider');
jest.mock('../EPFErrorRecoveryService');
jest.mock('../EPFNotificationService');
jest.mock('../security/CredentialService');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance)
}));

// Set environment variable for tests
process.env.CREDENTIAL_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('EPFSyncService', () => {
  let epfSyncService;
  let mockEPFOProvider;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    epfSyncService = new EPFSyncService();
    mockEPFOProvider = epfSyncService.epfoProvider;
    
    // Mock credential service
    epfSyncService.credentialService = {
      getCredentials: jest.fn()
    };
  });

  describe('sync', () => {
    it('should successfully sync EPF accounts', async () => {
      const userId = 'test-user-id';
      const mockEPFAccounts = [
        {
          id: 'epf-1',
          userId,
          uan: '123456789012',
          pfNumber: 'PF123',
          employerName: 'Test Company',
          totalBalance: 100000,
          manualOverride: false
        }
      ];

      const mockCredentials = {
        uan: '123456789012',
        password: 'testpassword'
      };

      const mockEPFData = [
        {
          uan: '123456789012',
          accountNumber: 'PF123',
          currentBalance: 110000,
          employeeShare: 50000,
          employerShare: 50000,
          pensionShare: 10000,
          employeeName: 'Test User',
          employerName: 'Test Company',
          lastUpdated: new Date(),
          source: 'EPFO'
        }
      ];

      // Setup mocks
      epfSyncService.isSyncEnabled = jest.fn().mockResolvedValue(true);
      mockPrismaInstance.ePFAccount.findMany.mockResolvedValue(mockEPFAccounts);
      epfSyncService.credentialService.getCredentials.mockResolvedValue(mockCredentials);
      mockEPFOProvider.isAvailable.mockResolvedValue(true);
      mockEPFOProvider.fetchData.mockResolvedValue(mockEPFData);
      mockPrismaInstance.ePFAccount.update.mockResolvedValue({});
      mockPrismaInstance.user.update.mockResolvedValue({});
      epfSyncService.updateSyncMetadata = jest.fn().mockResolvedValue();

      // Execute sync
      const result = await epfSyncService.sync(userId);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);
      
      // Verify EPF account was updated
      expect(mockPrismaInstance.ePFAccount.update).toHaveBeenCalledWith({
        where: { id: 'epf-1' },
        data: expect.objectContaining({
          totalBalance: 110000,
          employeeContribution: 50000,
          employerContribution: 50000,
          pensionFund: 10000,
          syncStatus: SyncStatus.SYNCED
        })
      });
    });

    it('should handle missing credentials', async () => {
      const userId = 'test-user-id';
      const mockEPFAccounts = [{ id: 'epf-1', uan: '123456789012' }];

      epfSyncService.isSyncEnabled = jest.fn().mockResolvedValue(true);
      mockPrismaInstance.ePFAccount.findMany.mockResolvedValue(mockEPFAccounts);
      epfSyncService.credentialService.getCredentials.mockResolvedValue(null);
      epfSyncService.updateSyncMetadata = jest.fn().mockResolvedValue();

      const result = await epfSyncService.sync(userId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(SyncErrorTypes.CREDENTIAL_ERROR);
    });

    it('should skip sync when disabled', async () => {
      const userId = 'test-user-id';

      epfSyncService.isSyncEnabled = jest.fn().mockResolvedValue(false);

      const result = await epfSyncService.sync(userId, { force: false });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(0);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should handle EPFO portal unavailability', async () => {
      const userId = 'test-user-id';
      const mockEPFAccounts = [{ id: 'epf-1', uan: '123456789012' }];
      const mockCredentials = { uan: '123456789012', password: 'test' };

      epfSyncService.isSyncEnabled = jest.fn().mockResolvedValue(true);
      mockPrismaInstance.ePFAccount.findMany.mockResolvedValue(mockEPFAccounts);
      epfSyncService.credentialService.getCredentials.mockResolvedValue(mockCredentials);
      mockEPFOProvider.isAvailable.mockResolvedValue(false);
      epfSyncService.updateSyncMetadata = jest.fn().mockResolvedValue();

      const result = await epfSyncService.sync(userId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(SyncErrorTypes.SERVICE_UNAVAILABLE);
    });
  });

  describe('syncSingle', () => {
    it('should sync a single EPF account', async () => {
      const userId = 'test-user-id';
      const accountId = 'epf-1';
      const mockAccount = {
        id: accountId,
        userId,
        uan: '123456789012',
        manualOverride: false
      };
      const mockCredentials = { uan: '123456789012', password: 'test' };
      const mockAccountData = {
        uan: '123456789012',
        currentBalance: 110000,
        employeeShare: 50000,
        employerShare: 50000
      };

      mockPrismaInstance.ePFAccount.findFirst.mockResolvedValue(mockAccount);
      epfSyncService.credentialService.getCredentials.mockResolvedValue(mockCredentials);
      mockEPFOProvider.fetchAccountData.mockResolvedValue(mockAccountData);
      mockPrismaInstance.ePFAccount.update.mockResolvedValue({});
      epfSyncService.updateSyncMetadata = jest.fn().mockResolvedValue();

      const result = await epfSyncService.syncSingle(userId, accountId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(1);
    });

    it('should skip sync for manual override accounts', async () => {
      const userId = 'test-user-id';
      const accountId = 'epf-1';
      const mockAccount = {
        id: accountId,
        userId,
        uan: '123456789012',
        manualOverride: true
      };

      mockPrismaInstance.ePFAccount.findFirst.mockResolvedValue(mockAccount);

      const result = await epfSyncService.syncSingle(userId, accountId);

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.recordsUpdated).toBe(0);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      const config = {
        isEnabled: true,
        syncFrequency: 'monthly',
        preferredSource: 'epfo',
        notifyOnFailure: true
      };

      const isValid = epfSyncService.validateConfiguration(config);
      expect(isValid).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const config = {
        isEnabled: 'not-boolean',
        syncFrequency: 'invalid-frequency'
      };

      const isValid = epfSyncService.validateConfiguration(config);
      expect(isValid).toBe(false);
    });
  });

  describe('enableManualOverride', () => {
    it('should enable manual override for an account', async () => {
      const userId = 'test-user-id';
      const accountId = 'epf-1';
      const reason = 'User requested';
      const mockAccount = {
        id: accountId,
        employerName: 'Test Company'
      };

      mockPrismaInstance.ePFAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrismaInstance.ePFAccount.update.mockResolvedValue({});
      epfSyncService.notificationService.notifyManualOverride = jest.fn().mockResolvedValue();

      await epfSyncService.enableManualOverride(userId, accountId, reason);

      expect(mockPrisma.ePFAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: expect.objectContaining({
          manualOverride: true,
          syncStatus: SyncStatus.MANUAL
        })
      });

      expect(epfSyncService.notificationService.notifyManualOverride).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          accountId,
          accountName: 'Test Company',
          reason
        })
      );
    });
  });

  describe('data validation', () => {
    it('should validate EPF data correctly', () => {
      const validData = [
        {
          identifier: '123456789012',
          balance: 100000,
          employeeContribution: 50000,
          employerContribution: 50000,
          pensionContribution: 10000
        }
      ];

      const result = epfSyncService.validateData(validData, {
        maxBalance: 50000000,
        maxContribution: 1000000
      });

      expect(result.validData).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should flag invalid UAN format', () => {
      const invalidData = [
        {
          identifier: '12345', // Invalid UAN - too short
          balance: 100000,
          employeeContribution: 50000,
          employerContribution: 50000
        }
      ];

      const result = epfSyncService.validateData(invalidData, {
        maxBalance: 50000000,
        maxContribution: 1000000
      });

      expect(result.validData).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });

    it('should flag negative balances', () => {
      const invalidData = [
        {
          identifier: '123456789012',
          balance: -1000, // Negative balance
          employeeContribution: 50000,
          employerContribution: 50000
        }
      ];

      const result = epfSyncService.validateData(invalidData, {
        maxBalance: 50000000,
        maxContribution: 1000000
      });

      expect(result.validData).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});