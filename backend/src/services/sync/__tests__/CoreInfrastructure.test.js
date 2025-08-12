/**
 * Tests for Core Sync Service Infrastructure
 */

const {
  DataProvider,
  SyncService,
  BaseSyncService,
  CredentialService,
  createSyncResult,
  createSyncOptions,
  createSyncError,
  SyncErrorTypes,
  SyncStatus
} = require('../index');

describe('Core Sync Infrastructure', () => {
  describe('Type Factories', () => {
    test('createSyncResult creates valid sync result', () => {
      const result = createSyncResult({
        success: true,
        recordsProcessed: 10,
        recordsUpdated: 8,
        source: 'test_source'
      });

      expect(result).toMatchObject({
        success: true,
        recordsProcessed: 10,
        recordsUpdated: 8,
        recordsSkipped: 0,
        errors: [],
        warnings: [],
        duration: 0,
        source: 'test_source'
      });
    });

    test('createSyncOptions creates valid sync options', () => {
      const options = createSyncOptions({
        force: true,
        dryRun: false,
        timeout: 5000
      });

      expect(options).toMatchObject({
        force: true,
        dryRun: false,
        source: null,
        timeout: 5000,
        retryAttempts: 3,
        skipValidation: false
      });
    });

    test('createSyncError creates valid sync error', () => {
      const error = createSyncError({
        type: SyncErrorTypes.NETWORK_ERROR,
        message: 'Connection failed',
        investmentId: 'test-123'
      });

      expect(error).toMatchObject({
        type: 'network_error',
        message: 'Connection failed',
        investmentId: 'test-123',
        recoverable: true
      });
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Abstract Classes', () => {
    test('DataProvider cannot be instantiated directly', () => {
      expect(() => new DataProvider()).toThrow('DataProvider is an abstract class');
    });

    test('SyncService cannot be instantiated directly', () => {
      expect(() => new SyncService()).toThrow('SyncService is an abstract class');
    });

    test('DataProvider subclass must implement required methods', () => {
      class TestProvider extends DataProvider {
        get name() { return 'test'; }
      }

      const provider = new TestProvider();
      
      expect(() => provider.isAvailable()).rejects.toThrow('isAvailable method must be implemented');
      expect(() => provider.fetchData([])).rejects.toThrow('fetchData method must be implemented');
      expect(() => provider.validateData([])).toThrow('validateData method must be implemented');
      expect(() => provider.transformData([])).toThrow('transformData method must be implemented');
    });
  });

  describe('BaseSyncService', () => {
    class TestSyncService extends BaseSyncService {
      get syncType() { return 'test_sync'; }
      
      async sync(userId, options = {}) {
        return createSyncResult({ success: true, source: 'test' });
      }
      
      async syncSingle(userId, investmentId, options = {}) {
        return createSyncResult({ success: true, source: 'test' });
      }
      
      validateConfiguration(config) {
        return true;
      }
    }

    test('can create concrete implementation of BaseSyncService', () => {
      const service = new TestSyncService();
      expect(service.syncType).toBe('test_sync');
      expect(service.credentialService).toBeInstanceOf(CredentialService);
    });

    test('provides default configuration', () => {
      const service = new TestSyncService();
      const defaultConfig = service.getDefaultConfiguration();
      
      expect(defaultConfig).toMatchObject({
        isEnabled: false,
        syncFrequency: 'daily',
        preferredSource: null,
        fallbackSource: null,
        notifyOnSuccess: false,
        notifyOnFailure: true
      });
    });

    test('categorizes errors correctly', () => {
      const service = new TestSyncService();
      
      // Network error
      const networkError = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';
      const categorized = service.categorizeError(networkError);
      expect(categorized.type).toBe(SyncErrorTypes.NETWORK_ERROR);
      
      // Timeout error
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      const categorizedTimeout = service.categorizeError(timeoutError);
      expect(categorizedTimeout.type).toBe(SyncErrorTypes.NETWORK_TIMEOUT);
    });

    test('calculates retry delay with exponential backoff', () => {
      const service = new TestSyncService();
      
      const delay1 = service.calculateRetryDelay(1);
      const delay2 = service.calculateRetryDelay(2);
      const delay3 = service.calculateRetryDelay(3);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(service.maxRetryDelay);
    });
  });

  describe('Constants', () => {
    test('SyncErrorTypes contains expected error types', () => {
      expect(SyncErrorTypes.NETWORK_ERROR).toBe('network_error');
      expect(SyncErrorTypes.AUTHENTICATION_FAILED).toBe('authentication_failed');
      expect(SyncErrorTypes.RATE_LIMIT_EXCEEDED).toBe('rate_limit_exceeded');
    });

    test('SyncStatus contains expected status values', () => {
      expect(SyncStatus.MANUAL).toBe('manual');
      expect(SyncStatus.SYNCED).toBe('synced');
      expect(SyncStatus.FAILED).toBe('failed');
      expect(SyncStatus.IN_PROGRESS).toBe('in_progress');
    });
  });
});