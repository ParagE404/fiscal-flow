/**
 * Unit tests for DataIntegrityService
 */

const DataIntegrityService = require('../DataIntegrityService');
const DataValidationService = require('../DataValidationService');
const AnomalyDetectionService = require('../AnomalyDetectionService');
const AuditTrailService = require('../../audit/AuditTrailService');

// Mock the services
jest.mock('../DataValidationService');
jest.mock('../AnomalyDetectionService');
jest.mock('../../audit/AuditTrailService');

// Mock Prisma client
const mockPrisma = {
  mutualFund: {
    update: jest.fn()
  },
  stock: {
    update: jest.fn()
  },
  epfAccount: {
    update: jest.fn()
  }
};

describe('DataIntegrityService', () => {
  let integrityService;
  let mockValidationService;
  let mockAnomalyService;
  let mockAuditService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockValidationService = new DataValidationService();
    mockAnomalyService = new AnomalyDetectionService();
    mockAuditService = new AuditTrailService();

    // Setup the integrity service
    integrityService = new DataIntegrityService(mockPrisma);
    integrityService.validationService = mockValidationService;
    integrityService.anomalyService = mockAnomalyService;
    integrityService.auditService = mockAuditService;
  });

  describe('performIntegrityCheck', () => {
    it('should perform complete integrity check for mutual funds', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        investmentId: 'fund1',
        currentData: { currentValue: 10000, investedAmount: 10000, purchasePrice: 20 },
        newData: { nav: 22, date: new Date(), isin: 'INF123456789' },
        sessionId: 'session123'
      };

      // Mock validation service
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        flags: []
      };
      mockValidationService.validateMutualFundData.mockResolvedValue(validationResult);

      // Mock anomaly service
      const anomalyResult = {
        hasAnomalies: false,
        quarantine: false,
        recommendations: []
      };
      mockAnomalyService.detectMutualFundAnomalies.mockResolvedValue(anomalyResult);

      // Mock audit service
      mockAuditService.logDataValidation.mockResolvedValue({ id: 'audit1' });

      const result = await integrityService.performIntegrityCheck(params);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.quarantine).toBe(false);
      expect(mockValidationService.validateMutualFundData).toHaveBeenCalledWith(
        params.currentData,
        params.newData
      );
      expect(mockAnomalyService.detectMutualFundAnomalies).toHaveBeenCalledWith(
        params.currentData,
        params.newData,
        []
      );
      expect(mockAuditService.logDataValidation).toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        currentData: { currentPrice: 100 },
        newData: { price: -50, symbol: 'RELIANCE' },
        sessionId: 'session123'
      };

      // Mock validation failure
      const validationResult = {
        isValid: false,
        errors: [{ type: 'validation_error', message: 'Price cannot be negative' }],
        warnings: [],
        flags: []
      };
      mockValidationService.validateStockData.mockResolvedValue(validationResult);
      mockAuditService.logDataValidation.mockResolvedValue({ id: 'audit1' });

      const result = await integrityService.performIntegrityCheck(params);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.recommendations).toContain('Fix validation errors before proceeding');
      expect(mockAnomalyService.detectStockAnomalies).not.toHaveBeenCalled();
    });

    it('should handle anomaly detection and quarantine', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        currentData: { currentPrice: 100 },
        newData: { price: 150, symbol: 'RELIANCE' },
        sessionId: 'session123'
      };

      // Mock validation success
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        flags: []
      };
      mockValidationService.validateStockData.mockResolvedValue(validationResult);

      // Mock anomaly detection with quarantine
      const anomalyResult = {
        hasAnomalies: true,
        quarantine: true,
        quarantineReason: 'extreme_price_change',
        severity: 'high',
        anomalies: [{ type: 'extreme_price_change', severity: 'high' }],
        recommendations: ['Verify with multiple sources']
      };
      mockAnomalyService.detectStockAnomalies.mockResolvedValue(anomalyResult);

      // Mock quarantine and audit services
      const quarantineRecord = { id: 'qtn123', reason: 'extreme_price_change' };
      mockAnomalyService.quarantineData.mockResolvedValue(quarantineRecord);
      mockAnomalyService.sendAdminNotification.mockResolvedValue({});
      mockAuditService.logDataValidation.mockResolvedValue({ id: 'audit1' });
      mockAuditService.logAnomalyDetection.mockResolvedValue({ id: 'audit2' });
      mockAuditService.logDataQuarantine.mockResolvedValue({ id: 'audit3' });

      const result = await integrityService.performIntegrityCheck(params);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.quarantine).toBe(true);
      expect(result.recommendations).toContain('Data has been quarantined for manual review');
      expect(mockAnomalyService.quarantineData).toHaveBeenCalled();
      expect(mockAnomalyService.sendAdminNotification).toHaveBeenCalled();
      expect(result.auditEntries).toHaveLength(3);
    });

    it('should handle EPF data integrity check', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'epf',
        investmentId: 'epf1',
        currentData: { totalBalance: 100000 },
        newData: {
          employeeContribution: 1800,
          employerContribution: 1800,
          totalBalance: 103600,
          uan: '123456789012'
        },
        sessionId: 'session123'
      };

      // Mock validation and anomaly services
      const validationResult = { isValid: true, errors: [], warnings: [], flags: [] };
      const anomalyResult = { hasAnomalies: false, quarantine: false, recommendations: [] };

      mockValidationService.validateEPFData.mockResolvedValue(validationResult);
      mockAnomalyService.detectEPFAnomalies.mockResolvedValue(anomalyResult);
      mockAuditService.logDataValidation.mockResolvedValue({ id: 'audit1' });

      const result = await integrityService.performIntegrityCheck(params);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(mockValidationService.validateEPFData).toHaveBeenCalled();
      expect(mockAnomalyService.detectEPFAnomalies).toHaveBeenCalled();
    });

    it('should handle unsupported investment types', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'unsupported_type',
        investmentId: 'inv1',
        currentData: {},
        newData: {},
        sessionId: 'session123'
      };

      const result = await integrityService.performIntegrityCheck(params);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unsupported investment type');
    });
  });

  describe('validateAndProcessUpdate', () => {
    it('should validate and process successful update', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        investmentId: 'fund1',
        currentData: { currentValue: 10000, investedAmount: 10000, purchasePrice: 20 },
        newData: { nav: 22, date: new Date(), isin: 'INF123456789' },
        sessionId: 'session123'
      };

      // Mock successful integrity check
      const integrityResult = {
        isValid: true,
        canProceed: true,
        quarantine: false,
        validationResult: { isValid: true, errors: [], warnings: [] },
        anomalyResult: { hasAnomalies: false, quarantine: false },
        auditEntries: [],
        recommendations: [],
        errors: [],
        warnings: []
      };

      jest.spyOn(integrityService, 'performIntegrityCheck').mockResolvedValue(integrityResult);
      jest.spyOn(integrityService, 'getHistoricalData').mockResolvedValue([]);

      // Mock successful data update
      const updatedData = { id: 'fund1', currentValue: 11000, syncStatus: 'synced' };
      mockPrisma.mutualFund.update.mockResolvedValue(updatedData);
      mockAuditService.logDataUpdates.mockResolvedValue([{ id: 'audit1' }]);

      const result = await integrityService.validateAndProcessUpdate(params);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
      expect(result.quarantined).toBe(false);
      expect(result.updatedData).toEqual(updatedData);
    });

    it('should not process update when integrity check fails', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        currentData: { currentPrice: 100 },
        newData: { price: -50, symbol: 'RELIANCE' },
        sessionId: 'session123'
      };

      // Mock failed integrity check
      const integrityResult = {
        isValid: false,
        canProceed: false,
        quarantine: false,
        errors: [{ type: 'validation_error', message: 'Price cannot be negative' }]
      };

      jest.spyOn(integrityService, 'performIntegrityCheck').mockResolvedValue(integrityResult);
      jest.spyOn(integrityService, 'getHistoricalData').mockResolvedValue([]);

      const result = await integrityService.validateAndProcessUpdate(params);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(mockPrisma.mutualFund.update).not.toHaveBeenCalled();
      expect(mockPrisma.stock.update).not.toHaveBeenCalled();
      expect(mockPrisma.epfAccount.update).not.toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        currentData: { currentPrice: 100, quantity: 10, investedAmount: 1000 },
        newData: { price: 110, symbol: 'RELIANCE' },
        sessionId: 'session123'
      };

      // Mock successful integrity check
      const integrityResult = {
        isValid: true,
        canProceed: true,
        quarantine: false,
        errors: []
      };

      jest.spyOn(integrityService, 'performIntegrityCheck').mockResolvedValue(integrityResult);
      jest.spyOn(integrityService, 'getHistoricalData').mockResolvedValue([]);

      // Mock database error
      mockPrisma.stock.update.mockRejectedValue(new Error('Database connection failed'));

      const result = await integrityService.validateAndProcessUpdate(params);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(false);
      expect(result.integrityResult.errors).toHaveLength(1);
      expect(result.integrityResult.errors[0].message).toContain('Failed to process update');
    });
  });

  describe('processDataUpdate', () => {
    it('should update mutual fund data correctly', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'mutual_funds',
        investmentId: 'fund1',
        currentData: { investedAmount: 10000, purchasePrice: 20 },
        newData: { nav: 25, source: 'amfi' },
        sessionId: 'session123'
      };

      const updatedData = {
        id: 'fund1',
        currentValue: 12500, // (10000/20) * 25
        lastSyncAt: expect.any(Date),
        syncStatus: 'synced'
      };

      mockPrisma.mutualFund.update.mockResolvedValue(updatedData);
      mockAuditService.logDataUpdates.mockResolvedValue([{ id: 'audit1' }]);

      const result = await integrityService.processDataUpdate(params);

      expect(mockPrisma.mutualFund.update).toHaveBeenCalledWith({
        where: { id: 'fund1' },
        data: expect.objectContaining({
          currentValue: 12500,
          syncStatus: 'synced'
        })
      });

      expect(result).toEqual(updatedData);
      expect(mockAuditService.logDataUpdates).toHaveBeenCalled();
    });

    it('should update stock data correctly', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'stocks',
        investmentId: 'stock1',
        currentData: { quantity: 10, investedAmount: 1000 },
        newData: { price: 120, source: 'yahoo_finance' },
        sessionId: 'session123'
      };

      const updatedData = {
        id: 'stock1',
        currentPrice: 120,
        currentValue: 1200, // 120 * 10
        pnl: 200, // 1200 - 1000
        pnlPercentage: 20, // (200/1000) * 100
        lastSyncAt: expect.any(Date),
        syncStatus: 'synced'
      };

      mockPrisma.stock.update.mockResolvedValue(updatedData);
      mockAuditService.logDataUpdates.mockResolvedValue([{ id: 'audit1' }]);

      const result = await integrityService.processDataUpdate(params);

      expect(mockPrisma.stock.update).toHaveBeenCalledWith({
        where: { id: 'stock1' },
        data: expect.objectContaining({
          currentPrice: 120,
          currentValue: 1200,
          pnl: 200,
          pnlPercentage: 20,
          syncStatus: 'synced'
        })
      });

      expect(result).toEqual(updatedData);
    });

    it('should update EPF data correctly', async () => {
      const params = {
        userId: 'user123',
        investmentType: 'epf',
        investmentId: 'epf1',
        currentData: { pensionFund: 5000 },
        newData: {
          totalBalance: 105000,
          employeeContribution: 1800,
          employerContribution: 1800,
          source: 'epfo'
        },
        sessionId: 'session123'
      };

      const updatedData = {
        id: 'epf1',
        totalBalance: 105000,
        employeeContribution: 1800,
        employerContribution: 1800,
        pensionFund: 5000,
        lastSyncAt: expect.any(Date),
        syncStatus: 'synced'
      };

      mockPrisma.epfAccount.update.mockResolvedValue(updatedData);
      mockAuditService.logDataUpdates.mockResolvedValue([{ id: 'audit1' }]);

      const result = await integrityService.processDataUpdate(params);

      expect(mockPrisma.epfAccount.update).toHaveBeenCalledWith({
        where: { id: 'epf1' },
        data: expect.objectContaining({
          totalBalance: 105000,
          employeeContribution: 1800,
          employerContribution: 1800,
          pensionFund: 5000,
          syncStatus: 'synced'
        })
      });

      expect(result).toEqual(updatedData);
    });
  });

  describe('getHistoricalData', () => {
    it('should retrieve and format historical data', async () => {
      const changeHistory = [
        {
          timestamp: new Date('2024-01-01'),
          newValues: { currentValue: 10000, nav: 20 }
        },
        {
          timestamp: new Date('2024-01-02'),
          newValues: { currentValue: 11000, nav: 22 }
        }
      ];

      mockAuditService.getDataChangeHistory.mockResolvedValue(changeHistory);

      const result = await integrityService.getHistoricalData('user123', 'mutual_funds', 'fund1');

      expect(mockAuditService.getDataChangeHistory).toHaveBeenCalledWith(
        'user123',
        'mutual_funds',
        'fund1',
        { limit: 20 }
      );

      expect(result).toEqual([
        { currentValue: 10000, nav: 20, timestamp: new Date('2024-01-01') },
        { currentValue: 11000, nav: 22, timestamp: new Date('2024-01-02') }
      ]);
    });

    it('should handle errors gracefully', async () => {
      mockAuditService.getDataChangeHistory.mockRejectedValue(new Error('Database error'));

      const result = await integrityService.getHistoricalData('user123', 'mutual_funds', 'fund1');

      expect(result).toEqual([]);
    });
  });

  describe('calculateMutualFundValue', () => {
    it('should calculate current value correctly', () => {
      const currentData = {
        investedAmount: 10000,
        purchasePrice: 20
      };

      const result = integrityService.calculateMutualFundValue(currentData, 25);

      expect(result).toBe(12500); // (10000/20) * 25
    });

    it('should handle missing purchase price', () => {
      const currentData = {
        investedAmount: 10000
      };

      const result = integrityService.calculateMutualFundValue(currentData, 25);

      expect(result).toBe(250000); // (10000/1) * 25
    });
  });

  describe('getIntegrityStatistics', () => {
    it('should calculate integrity statistics', async () => {
      const validationEntries = [
        { details: { validationResult: { isValid: true } } },
        { details: { validationResult: { isValid: false } } },
        { details: { validationResult: { isValid: true } } }
      ];

      const anomalyEntries = [
        { details: { anomalyResult: { severity: 'high' } } },
        { details: { anomalyResult: { severity: 'medium' } } }
      ];

      const quarantineEntries = [
        { id: 'qtn1' },
        { id: 'qtn2' }
      ];

      mockAuditService.getAuditTrail
        .mockResolvedValueOnce(validationEntries)
        .mockResolvedValueOnce(anomalyEntries)
        .mockResolvedValueOnce(quarantineEntries);

      const result = await integrityService.getIntegrityStatistics('user123');

      expect(result.totalValidations).toBe(3);
      expect(result.validationFailures).toBe(1);
      expect(result.totalAnomalies).toBe(2);
      expect(result.highSeverityAnomalies).toBe(1);
      expect(result.totalQuarantined).toBe(2);
      expect(result.validationSuccessRate).toBe(66.66666666666666);
      expect(result.anomalyDetectionRate).toBe(66.66666666666666);
    });

    it('should handle errors gracefully', async () => {
      mockAuditService.getAuditTrail.mockRejectedValue(new Error('Database error'));

      const result = await integrityService.getIntegrityStatistics('user123');

      expect(result).toBeNull();
    });
  });
});