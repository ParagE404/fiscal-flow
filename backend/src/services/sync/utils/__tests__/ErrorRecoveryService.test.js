const { ErrorRecoveryService, getInstance } = require('../ErrorRecoveryService');
const { SyncErrorTypes, RecoveryActions } = require('../../interfaces');
const { getInstance: getDataSourceManager } = require('../DataSourceManager');

// Mock DataSourceManager
jest.mock('../DataSourceManager');

describe('ErrorRecoveryService', () => {
  let errorRecoveryService;
  let mockDataSourceManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    errorRecoveryService = new ErrorRecoveryService();
    
    // Mock DataSourceManager
    mockDataSourceManager = {
      getBestAvailableSource: jest.fn(),
      getAllHealthStatus: jest.fn().mockReturnValue({
        source1: { isHealthy: true },
        source2: { isHealthy: true }
      })
    };
    getDataSourceManager.mockReturnValue(mockDataSourceManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with recovery strategies and escalation rules', () => {
      expect(errorRecoveryService.recoveryStrategies.size).toBeGreaterThan(0);
      expect(errorRecoveryService.escalationRules.size).toBeGreaterThan(0);
      expect(errorRecoveryService.interventionQueue.size).toBe(0);
    });
  });

  describe('handleSyncError', () => {
    it('should handle network error with retry strategy', async () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNREFUSED';
      
      const context = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        source: 'amfi',
        attempt: 1
      };

      const recoveryAction = await errorRecoveryService.handleSyncError(error, context);
      
      expect(recoveryAction.action).toBe(RecoveryActions.RETRY);
      expect(recoveryAction.delay).toBeGreaterThan(0);
      expect(recoveryAction.reason).toContain('Retrying after');
    });

    it('should handle authentication error with manual intervention', async () => {
      const error = new Error('Authentication failed');
      error.response = { status: 401 };
      
      const context = {
        userId: 'user123',
        investmentType: 'epf',
        source: 'epfo',
        attempt: 1
      };

      const recoveryAction = await errorRecoveryService.handleSyncError(error, context);
      
      expect(recoveryAction.action).toBe(RecoveryActions.MANUAL_INTERVENTION);
      expect(recoveryAction.reason).toContain('credential_update');
      
      // Check that intervention was queued
      const interventions = errorRecoveryService.getPendingInterventions('user123');
      expect(interventions).toHaveLength(1);
      expect(interventions[0].interventionType).toBe('credential_update');
    });

    it('should handle rate limit error with delay strategy', async () => {
      const error = new Error('Rate limit exceeded');
      error.response = { 
        status: 429,
        headers: { 'retry-after': '60' }
      };
      
      const context = {
        userId: 'user123',
        investmentType: 'stocks',
        source: 'yahoo_finance',
        attempt: 1
      };

      const recoveryAction = await errorRecoveryService.handleSyncError(error, context);
      
      expect(recoveryAction.action).toBe(RecoveryActions.DELAY);
      expect(recoveryAction.delay).toBe(60000); // 60 seconds in milliseconds
      expect(recoveryAction.reason).toContain('Rate limited');
    });

    it('should escalate after max attempts', async () => {
      const error = new Error('Network timeout');
      error.code = 'ETIMEDOUT';
      
      const context = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        source: 'amfi',
        attempt: 5 // Exceeds escalation threshold
      };

      const recoveryAction = await errorRecoveryService.handleSyncError(error, context);
      
      expect(recoveryAction.action).toBe(RecoveryActions.MANUAL_INTERVENTION);
      expect(recoveryAction.reason).toContain('escalated');
      
      // Check that escalated intervention was queued
      const interventions = errorRecoveryService.getPendingInterventions('user123');
      expect(interventions).toHaveLength(1);
      expect(interventions[0].escalated).toBe(true);
    });
  });

  describe('applyRecoveryStrategy', () => {
    it('should apply retry with backoff strategy', async () => {
      const syncError = {
        type: SyncErrorTypes.NETWORK_ERROR,
        message: 'Network error'
      };
      
      const context = { attempt: 2 };
      const strategy = {
        strategy: 'retry_with_backoff',
        maxAttempts: 3,
        baseDelay: 1000
      };

      const recoveryAction = await errorRecoveryService.applyRecoveryStrategy(
        syncError, context, strategy
      );
      
      expect(recoveryAction.action).toBe(RecoveryActions.RETRY);
      expect(recoveryAction.delay).toBe(2000); // baseDelay * 2^(attempt-1)
    });

    it('should apply fallback strategy when available', async () => {
      mockDataSourceManager.getBestAvailableSource.mockResolvedValue('fallback_source');
      
      const syncError = {
        type: SyncErrorTypes.SERVICE_UNAVAILABLE,
        message: 'Service unavailable'
      };
      
      const context = { source: 'primary_source' };
      const strategy = {
        strategy: 'fallback_with_retry',
        maxAttempts: 1
      };

      const recoveryAction = await errorRecoveryService.applyRecoveryStrategy(
        syncError, context, strategy
      );
      
      expect(recoveryAction.action).toBe(RecoveryActions.FALLBACK_SOURCE);
      expect(recoveryAction.source).toBe('fallback_source');
    });

    it('should apply skip strategy for validation errors', async () => {
      const syncError = {
        type: SyncErrorTypes.DATA_VALIDATION_FAILED,
        message: 'Invalid data'
      };
      
      const context = {};
      const strategy = {
        strategy: 'skip_and_continue',
        maxAttempts: 1
      };

      const recoveryAction = await errorRecoveryService.applyRecoveryStrategy(
        syncError, context, strategy
      );
      
      expect(recoveryAction.action).toBe(RecoveryActions.SKIP_RECORD);
      expect(recoveryAction.reason).toContain('Skipping invalid record');
    });
  });

  describe('shouldEscalate', () => {
    it('should escalate when attempt exceeds threshold', async () => {
      const syncError = { type: SyncErrorTypes.NETWORK_ERROR };
      const context = { userId: 'user123', investmentType: 'mutual_funds', attempt: 5 };
      const strategy = { escalateAfter: 3 };

      const shouldEscalate = await errorRecoveryService.shouldEscalate(
        syncError, context, strategy
      );
      
      expect(shouldEscalate).toBe(true);
    });

    it('should escalate for critical investment types', async () => {
      const syncError = { type: SyncErrorTypes.NETWORK_ERROR };
      const context = { 
        userId: 'user123', 
        investmentType: 'epf', // Critical investment type
        attempt: 2 
      };
      const strategy = { escalateAfter: 5 };

      const shouldEscalate = await errorRecoveryService.shouldEscalate(
        syncError, context, strategy
      );
      
      expect(shouldEscalate).toBe(true);
    });

    it('should escalate when data sources are unhealthy', async () => {
      mockDataSourceManager.getAllHealthStatus.mockReturnValue({
        source1: { isHealthy: false },
        source2: { isHealthy: false },
        source3: { isHealthy: false },
        source4: { isHealthy: true }
      });

      const syncError = { type: SyncErrorTypes.NETWORK_ERROR };
      const context = { userId: 'user123', investmentType: 'mutual_funds', attempt: 1 };
      const strategy = { escalateAfter: 5 };

      const shouldEscalate = await errorRecoveryService.shouldEscalate(
        syncError, context, strategy
      );
      
      expect(shouldEscalate).toBe(true);
    });

    it('should not escalate under normal conditions', async () => {
      mockDataSourceManager.getAllHealthStatus.mockReturnValue({
        source1: { isHealthy: true },
        source2: { isHealthy: true }
      });

      const syncError = { type: SyncErrorTypes.NETWORK_ERROR };
      const context = { userId: 'user123', investmentType: 'mutual_funds', attempt: 1 };
      const strategy = { escalateAfter: 3 };

      const shouldEscalate = await errorRecoveryService.shouldEscalate(
        syncError, context, strategy
      );
      
      expect(shouldEscalate).toBe(false);
    });
  });

  describe('manual intervention management', () => {
    it('should queue manual intervention', async () => {
      await errorRecoveryService.queueManualIntervention('user123', {
        errorType: SyncErrorTypes.AUTHENTICATION_FAILED,
        interventionType: 'credential_update',
        investmentType: 'epf'
      });

      const interventions = errorRecoveryService.getPendingInterventions('user123');
      expect(interventions).toHaveLength(1);
      expect(interventions[0].interventionType).toBe('credential_update');
      expect(interventions[0].status).toBe('pending');
    });

    it('should resolve intervention', () => {
      const intervention = {
        errorType: SyncErrorTypes.AUTHENTICATION_FAILED,
        interventionType: 'credential_update'
      };
      
      errorRecoveryService.queueManualIntervention('user123', intervention);
      const interventions = errorRecoveryService.getAllInterventions('user123');
      const interventionId = interventions[0].id;

      const resolved = errorRecoveryService.resolveIntervention(
        'user123', 
        interventionId, 
        'Credentials updated'
      );
      
      expect(resolved).toBe(true);
      
      const updatedInterventions = errorRecoveryService.getAllInterventions('user123');
      expect(updatedInterventions[0].status).toBe('resolved');
      expect(updatedInterventions[0].resolution).toBe('Credentials updated');
    });

    it('should return false when resolving non-existent intervention', () => {
      const resolved = errorRecoveryService.resolveIntervention(
        'user123', 
        'non-existent-id', 
        'Test resolution'
      );
      
      expect(resolved).toBe(false);
    });

    it('should clear all interventions for user', () => {
      errorRecoveryService.queueManualIntervention('user123', {
        interventionType: 'test1'
      });
      errorRecoveryService.queueManualIntervention('user123', {
        interventionType: 'test2'
      });

      expect(errorRecoveryService.getAllInterventions('user123')).toHaveLength(2);
      
      errorRecoveryService.clearInterventions('user123');
      expect(errorRecoveryService.getAllInterventions('user123')).toHaveLength(0);
    });

    it('should limit interventions per user', async () => {
      // Queue 55 interventions (more than the 50 limit)
      for (let i = 0; i < 55; i++) {
        await errorRecoveryService.queueManualIntervention('user123', {
          interventionType: `test${i}`
        });
      }

      const interventions = errorRecoveryService.getAllInterventions('user123');
      expect(interventions).toHaveLength(50);
      
      // Should keep the most recent ones
      expect(interventions[0].interventionType).toBe('test5'); // First 5 should be removed
      expect(interventions[49].interventionType).toBe('test54');
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return suggestions for credential update', () => {
      const suggestions = errorRecoveryService.getRecoverySuggestions('credential_update');
      
      expect(suggestions.title).toBe('Update Credentials');
      expect(suggestions.urgency).toBe('high');
      expect(suggestions.steps).toContain('Go to Sync Settings');
    });

    it('should return suggestions for configuration fix', () => {
      const suggestions = errorRecoveryService.getRecoverySuggestions('configuration_fix');
      
      expect(suggestions.title).toBe('Fix Configuration');
      expect(suggestions.urgency).toBe('medium');
      expect(suggestions.steps).toContain('Review sync settings for errors');
    });

    it('should return default suggestions for unknown intervention type', () => {
      const suggestions = errorRecoveryService.getRecoverySuggestions('unknown_type');
      
      expect(suggestions.title).toBe('Manual Review Required');
      expect(suggestions.urgency).toBe('medium');
      expect(suggestions.steps).toContain('Review the error details');
    });
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      
      const syncError = errorRecoveryService.categorizeError(error);
      
      expect(syncError.type).toBe(SyncErrorTypes.NETWORK_ERROR);
      expect(syncError.code).toBe('ECONNREFUSED');
    });

    it('should categorize timeout errors', () => {
      const error = new Error('Request timeout');
      error.code = 'ETIMEDOUT';
      
      const syncError = errorRecoveryService.categorizeError(error);
      
      expect(syncError.type).toBe(SyncErrorTypes.NETWORK_TIMEOUT);
    });

    it('should categorize HTTP status errors', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      
      const syncError = errorRecoveryService.categorizeError(error);
      
      expect(syncError.type).toBe(SyncErrorTypes.AUTHENTICATION_FAILED);
    });

    it('should categorize validation errors', () => {
      const error = new Error('Data validation failed');
      
      const syncError = errorRecoveryService.categorizeError(error);
      
      expect(syncError.type).toBe(SyncErrorTypes.DATA_VALIDATION_FAILED);
    });

    it('should default to unknown error type', () => {
      const error = new Error('Some unknown error');
      
      const syncError = errorRecoveryService.categorizeError(error);
      
      expect(syncError.type).toBe(SyncErrorTypes.UNKNOWN_ERROR);
    });
  });

  describe('utility methods', () => {
    it('should calculate backoff delay correctly', () => {
      const delay1 = errorRecoveryService.calculateBackoffDelay(1, 1000);
      const delay2 = errorRecoveryService.calculateBackoffDelay(2, 1000);
      const delay3 = errorRecoveryService.calculateBackoffDelay(3, 1000);
      
      expect(delay1).toBe(1000);  // 1000 * 2^0
      expect(delay2).toBe(2000);  // 1000 * 2^1
      expect(delay3).toBe(4000);  // 1000 * 2^2
    });

    it('should cap backoff delay at maximum', () => {
      const delay = errorRecoveryService.calculateBackoffDelay(20, 1000);
      expect(delay).toBe(300000); // 5 minutes max
    });

    it('should extract retry-after from error', () => {
      const syncError = { retryAfter: '120' };
      const delay = errorRecoveryService.extractRetryAfter(syncError);
      
      expect(delay).toBe(120000); // 120 seconds in milliseconds
    });

    it('should return null when no retry-after', () => {
      const syncError = {};
      const delay = errorRecoveryService.extractRetryAfter(syncError);
      
      expect(delay).toBeNull();
    });

    it('should generate unique intervention IDs', () => {
      const id1 = errorRecoveryService.generateInterventionId();
      const id2 = errorRecoveryService.generateInterventionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^intervention_\d+_[a-z0-9]+$/);
    });
  });

  describe('recovery history tracking', () => {
    it('should update recovery history on success', () => {
      errorRecoveryService.updateRecoveryHistory('user123', 'mutual_funds', true);
      
      const consecutiveFailures = errorRecoveryService.getConsecutiveFailures('user123', 'mutual_funds');
      expect(consecutiveFailures).resolves.toBe(0);
    });

    it('should update recovery history on failure', () => {
      errorRecoveryService.updateRecoveryHistory('user123', 'mutual_funds', false);
      errorRecoveryService.updateRecoveryHistory('user123', 'mutual_funds', false);
      
      const consecutiveFailures = errorRecoveryService.getConsecutiveFailures('user123', 'mutual_funds');
      expect(consecutiveFailures).resolves.toBe(2);
    });
  });

  describe('recovery statistics', () => {
    it('should return recovery statistics', async () => {
      await errorRecoveryService.queueManualIntervention('user1', {
        interventionType: 'test1'
      });
      await errorRecoveryService.queueManualIntervention('user2', {
        interventionType: 'test2'
      });

      const stats = errorRecoveryService.getRecoveryStatistics();
      
      expect(stats.totalInterventions).toBe(2);
      expect(stats.pendingInterventions).toBe(2);
      expect(stats.resolvedInterventions).toBe(0);
      expect(stats.activeUsers).toBe(2);
      expect(stats.recoveryStrategies).toBeGreaterThan(0);
      expect(stats.escalationRules).toBeGreaterThan(0);
    });
  });

  describe('singleton getInstance', () => {
    it('should return same instance', () => {
      const instance1 = getInstance();
      const instance2 = getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ErrorRecoveryService);
    });
  });
});