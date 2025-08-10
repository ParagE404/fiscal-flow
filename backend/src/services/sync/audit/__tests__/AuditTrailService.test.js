/**
 * Unit tests for AuditTrailService
 */

const AuditTrailService = require('../AuditTrailService');

// Mock Prisma client
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn()
  }
};

describe('AuditTrailService', () => {
  let auditService;

  beforeEach(() => {
    auditService = new AuditTrailService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('logSyncStart', () => {
    it('should log sync start successfully', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'sync_started',
        timestamp: new Date()
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        source: 'amfi',
        options: { force: true },
        metadata: { ipAddress: '127.0.0.1' }
      };

      const result = await auditService.logSyncStart(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'sync_started',
          investmentType: 'mutual_funds',
          source: 'amfi'
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        source: 'amfi'
      };

      const result = await auditService.logSyncStart(params);

      expect(result.userId).toBe('user123');
      expect(result.auditType).toBe('sync_started');
    });
  });

  describe('logSyncCompletion', () => {
    it('should log sync completion with results', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'sync_completed'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        source: 'amfi',
        result: {
          success: true,
          recordsProcessed: 10,
          recordsUpdated: 8,
          recordsSkipped: 2,
          errors: [],
          warnings: []
        },
        duration: 5000,
        sessionId: 'session123'
      };

      const result = await auditService.logSyncCompletion(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'sync_completed',
          details: expect.objectContaining({
            result: expect.objectContaining({
              success: true,
              recordsProcessed: 10,
              recordsUpdated: 8,
              recordsSkipped: 2,
              errorCount: 0,
              warningCount: 0
            }),
            duration: 5000,
            sessionId: 'session123'
          })
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });
  });

  describe('logSyncFailure', () => {
    it('should log sync failure with error details', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'sync_failed'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        source: 'yahoo_finance',
        error: {
          type: 'network_error',
          message: 'Connection timeout',
          code: 'TIMEOUT',
          stack: 'Error stack trace'
        },
        duration: 30000,
        sessionId: 'session123'
      };

      const result = await auditService.logSyncFailure(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'sync_failed',
          details: expect.objectContaining({
            error: expect.objectContaining({
              type: 'network_error',
              message: 'Connection timeout',
              code: 'TIMEOUT',
              stack: 'Error stack trace'
            }),
            duration: 30000,
            sessionId: 'session123'
          })
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });
  });

  describe('logDataUpdates', () => {
    it('should log multiple data updates', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'data_updated'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const updatedRecords = [
        {
          id: 'fund1',
          previousValues: { currentValue: 10000, nav: 20 },
          newValues: { currentValue: 12000, nav: 24 },
          source: 'amfi'
        },
        {
          id: 'fund2',
          previousValues: { currentValue: 5000, nav: 15 },
          newValues: { currentValue: 5500, nav: 16.5 },
          source: 'amfi'
        }
      ];

      const result = await auditService.logDataUpdates(
        'user123',
        'mutual_funds',
        updatedRecords,
        'session123'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);

      // Check first record
      expect(mockPrisma.auditLog.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'data_updated',
          investmentType: 'mutual_funds',
          investmentId: 'fund1',
          details: expect.objectContaining({
            previousValues: { currentValue: 10000, nav: 20 },
            newValues: { currentValue: 12000, nav: 24 },
            sessionId: 'session123',
            source: 'amfi'
          })
        })
      });
    });
  });

  describe('logDataValidation', () => {
    it('should log validation results', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'data_validated'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        investmentId: 'fund1',
        validationResult: {
          isValid: false,
          errors: [{ type: 'validation_error', message: 'Invalid NAV' }],
          warnings: [{ type: 'warning', message: 'Large change' }],
          flags: ['large_nav_change']
        },
        data: { nav: 25, isin: 'INF123456789' },
        sessionId: 'session123'
      };

      const result = await auditService.logDataValidation(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'data_validated',
          investmentType: 'mutual_funds',
          investmentId: 'fund1',
          details: expect.objectContaining({
            validationResult: expect.objectContaining({
              isValid: false,
              errorCount: 1,
              warningCount: 1,
              flagCount: 1
            }),
            errors: [{ type: 'validation_error', message: 'Invalid NAV' }],
            warnings: [{ type: 'warning', message: 'Large change' }],
            flags: ['large_nav_change'],
            sessionId: 'session123'
          })
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });
  });

  describe('logAnomalyDetection', () => {
    it('should log anomaly detection results', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'anomaly_detected'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        anomalyResult: {
          hasAnomalies: true,
          severity: 'high',
          quarantine: true,
          quarantineReason: 'extreme_price_change',
          anomalies: [
            {
              type: 'extreme_price_change',
              severity: 'high',
              message: 'Price changed by 40%'
            }
          ],
          recommendations: ['Verify with multiple sources']
        },
        data: { price: 140, symbol: 'RELIANCE' },
        sessionId: 'session123'
      };

      const result = await auditService.logAnomalyDetection(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'anomaly_detected',
          investmentType: 'stocks',
          investmentId: 'stock1',
          details: expect.objectContaining({
            anomalyResult: expect.objectContaining({
              hasAnomalies: true,
              severity: 'high',
              quarantine: true,
              quarantineReason: 'extreme_price_change',
              anomalyCount: 1
            }),
            anomalies: expect.arrayContaining([
              expect.objectContaining({
                type: 'extreme_price_change',
                severity: 'high'
              })
            ]),
            recommendations: ['Verify with multiple sources'],
            sessionId: 'session123'
          })
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });
  });

  describe('logManualOverride', () => {
    it('should log manual override actions', async () => {
      const mockAuditEntry = {
        id: 'audit123',
        userId: 'user123',
        auditType: 'manual_override'
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditEntry);

      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        investmentId: 'fund1',
        previousValues: { currentValue: 10000 },
        newValues: { currentValue: 11000 },
        reason: 'Correcting sync error',
        metadata: { ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0' }
      };

      const result = await auditService.logManualOverride(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          auditType: 'manual_override',
          investmentType: 'mutual_funds',
          investmentId: 'fund1',
          details: expect.objectContaining({
            previousValues: { currentValue: 10000 },
            newValues: { currentValue: 11000 },
            reason: 'Correcting sync error'
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        })
      });

      expect(result).toEqual(mockAuditEntry);
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail with filters', async () => {
      const mockAuditEntries = [
        {
          id: 'audit1',
          userId: 'user123',
          auditType: 'sync_completed',
          timestamp: new Date()
        },
        {
          id: 'audit2',
          userId: 'user123',
          auditType: 'data_updated',
          timestamp: new Date()
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditEntries);

      const filters = {
        investmentType: 'mutual_funds',
        auditType: 'sync_completed',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 50,
        offset: 0
      };

      const result = await auditService.getAuditTrail('user123', filters);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          investmentType: 'mutual_funds',
          auditType: 'sync_completed',
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0
      });

      expect(result).toEqual(mockAuditEntries);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.auditLog.findMany.mockRejectedValue(new Error('Database error'));

      const result = await auditService.getAuditTrail('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getDataChangeHistory', () => {
    it('should retrieve data change history', async () => {
      const mockAuditEntries = [
        {
          id: 'audit1',
          timestamp: new Date(),
          details: {
            previousValues: { currentValue: 10000 },
            newValues: { currentValue: 12000 },
            changes: { currentValue: { from: 10000, to: 12000, type: 'modified' } },
            source: 'amfi',
            sessionId: 'session123'
          }
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditEntries);

      const result = await auditService.getDataChangeHistory(
        'user123',
        'mutual_funds',
        'fund1',
        { limit: 10 }
      );

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          investmentType: 'mutual_funds',
          investmentId: 'fund1',
          auditType: 'data_updated'
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        timestamp: mockAuditEntries[0].timestamp,
        previousValues: { currentValue: 10000 },
        newValues: { currentValue: 12000 },
        changes: { currentValue: { from: 10000, to: 12000, type: 'modified' } },
        source: 'amfi',
        sessionId: 'session123'
      });
    });
  });

  describe('exportAuditTrail', () => {
    it('should export audit trail as JSON', async () => {
      const mockAuditEntries = [
        {
          id: 'audit1',
          userId: 'user123',
          auditType: 'sync_completed',
          timestamp: new Date()
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditEntries);

      const result = await auditService.exportAuditTrail('user123', {}, 'json');

      expect(result.format).toBe('json');
      expect(result.data).toEqual(mockAuditEntries);
      expect(result.totalRecords).toBe(1);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should export audit trail as CSV', async () => {
      const mockAuditEntries = [
        {
          id: 'audit1',
          userId: 'user123',
          auditType: 'sync_completed',
          investmentType: 'mutual_funds',
          investmentId: 'fund1',
          source: 'amfi',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          details: { test: 'data' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditEntries);

      const result = await auditService.exportAuditTrail('user123', {}, 'csv');

      expect(result.format).toBe('csv');
      expect(result.data).toContain('Timestamp,Audit Type,Investment Type');
      expect(result.data).toContain('2024-01-01T10:00:00.000Z');
      expect(result.data).toContain('sync_completed');
      expect(result.totalRecords).toBe(1);
    });
  });

  describe('getSyncStatistics', () => {
    it('should calculate sync statistics', async () => {
      const mockAuditEntries = [
        {
          auditType: 'sync_completed',
          investmentType: 'mutual_funds',
          source: 'amfi',
          details: {
            result: { recordsProcessed: 10, recordsUpdated: 8 },
            duration: 5000
          }
        },
        {
          auditType: 'sync_failed',
          investmentType: 'stocks',
          source: 'yahoo_finance',
          details: { duration: 3000 }
        },
        {
          auditType: 'sync_completed',
          investmentType: 'mutual_funds',
          source: 'amfi',
          details: {
            result: { recordsProcessed: 5, recordsUpdated: 5 },
            duration: 4000
          }
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditEntries);

      const result = await auditService.getSyncStatistics('user123');

      expect(result.totalSyncs).toBe(3);
      expect(result.successfulSyncs).toBe(2);
      expect(result.failedSyncs).toBe(1);
      expect(result.totalRecordsProcessed).toBe(15);
      expect(result.totalRecordsUpdated).toBe(13);
      expect(result.averageDuration).toBe(4000);
      expect(result.successRate).toBe(66.66666666666666);
      expect(result.syncsByType).toEqual({
        mutual_funds: 2,
        stocks: 1
      });
      expect(result.syncsBySource).toEqual({
        amfi: 2,
        yahoo_finance: 1
      });
    });
  });

  describe('utility methods', () => {
    it('should calculate changes between old and new values', () => {
      const oldValues = {
        currentValue: 10000,
        nav: 20,
        removedField: 'old'
      };

      const newValues = {
        currentValue: 12000,
        nav: 20,
        addedField: 'new'
      };

      const changes = auditService.calculateChanges(oldValues, newValues);

      expect(changes).toEqual({
        currentValue: {
          from: 10000,
          to: 12000,
          type: 'modified'
        },
        addedField: {
          from: undefined,
          to: 'new',
          type: 'added'
        },
        removedField: {
          from: 'old',
          to: null,
          type: 'removed'
        }
      });
    });

    it('should calculate data hash', () => {
      const data = { nav: 25, isin: 'INF123456789' };
      const hash = auditService.calculateDataHash(data);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hash length
    });

    it('should generate unique session IDs', () => {
      const id1 = auditService.generateSessionId();
      const id2 = auditService.generateSessionId();

      expect(id1).toMatch(/^SYNC_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^SYNC_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('cleanupOldEntries', () => {
    it('should cleanup old audit entries', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 100 });

      const result = await auditService.cleanupOldEntries(365);

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date)
          }
        }
      });

      expect(result.deletedCount).toBe(100);
      expect(result.retentionDays).toBe(365);
      expect(result.cutoffDate).toBeInstanceOf(Date);
    });

    it('should handle cleanup errors', async () => {
      mockPrisma.auditLog.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(auditService.cleanupOldEntries(365)).rejects.toThrow('Database error');
    });
  });
});