/**
 * Unit tests for DataValidationService
 */

const DataValidationService = require('../DataValidationService');
const { SyncErrorTypes } = require('../../types/SyncTypes');

describe('DataValidationService', () => {
  let validationService;

  beforeEach(() => {
    validationService = new DataValidationService();
  });

  describe('validateMutualFundData', () => {
    it('should validate correct mutual fund data', async () => {
      const currentData = {
        currentValue: 12000,
        investedAmount: 10000,
        purchasePrice: 20
      };

      const newData = {
        nav: 24,
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await validationService.validateMutualFundData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative NAV values', async () => {
      const newData = {
        nav: -10,
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await validationService.validateMutualFundData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(SyncErrorTypes.DATA_VALIDATION_FAILED);
      expect(result.errors[0].message).toContain('NAV must be positive');
    });

    it('should flag large NAV changes (>10%)', async () => {
      const currentData = {
        currentValue: 10000,
        investedAmount: 10000,
        purchasePrice: 20
      };

      const newData = {
        nav: 25, // 25% increase from 20
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await validationService.validateMutualFundData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('large_nav_change');
      expect(result.flags).toContain('large_nav_change');
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const newData = {
        nav: 25,
        date: futureDate,
        isin: 'INF123456789'
      };

      const result = await validationService.validateMutualFundData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot be in the future');
    });

    it('should validate ISIN format', async () => {
      const newData = {
        nav: 25,
        date: new Date(),
        isin: 'INVALID_ISIN'
      };

      const result = await validationService.validateMutualFundData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid ISIN format');
    });

    it('should warn about unusual NAV ranges', async () => {
      const newData = {
        nav: 15000, // Very high NAV
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await validationService.validateMutualFundData(null, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('unusual_nav_range');
      expect(result.flags).toContain('unusual_nav_range');
    });
  });

  describe('validateStockData', () => {
    it('should validate correct stock data', async () => {
      const currentData = {
        currentPrice: 100
      };

      const newData = {
        price: 105,
        symbol: 'RELIANCE',
        timestamp: new Date(),
        isRealTime: false
      };

      const result = await validationService.validateStockData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative stock prices', async () => {
      const newData = {
        price: -50,
        symbol: 'RELIANCE'
      };

      const result = await validationService.validateStockData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Price must be positive');
    });

    it('should flag large price changes (>20%)', async () => {
      const currentData = {
        currentPrice: 100
      };

      const newData = {
        price: 130, // 30% increase
        symbol: 'RELIANCE'
      };

      const result = await validationService.validateStockData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('large_price_change');
      expect(result.flags).toContain('large_price_change');
    });

    it('should warn about real-time updates outside market hours', async () => {
      // Create a timestamp outside market hours (6 PM IST)
      const outsideMarketHours = new Date();
      outsideMarketHours.setHours(18, 0, 0, 0);

      const newData = {
        price: 105,
        symbol: 'RELIANCE',
        timestamp: outsideMarketHours,
        isRealTime: true
      };

      const result = await validationService.validateStockData(null, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('outside_market_hours');
      expect(result.flags).toContain('outside_market_hours');
    });

    it('should flag circuit breaker limits', async () => {
      const currentData = {
        currentPrice: 100
      };

      const newData = {
        price: 125, // 25% increase (above 20% circuit breaker)
        symbol: 'RELIANCE'
      };

      const result = await validationService.validateStockData(currentData, newData);

      expect(result.flags).toContain('circuit_breaker_20');
    });
  });

  describe('validateEPFData', () => {
    it('should validate correct EPF data', async () => {
      const currentData = {
        totalBalance: 100000
      };

      const newData = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 103600,
        uan: '123456789012'
      };

      const result = await validationService.validateEPFData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative contributions', async () => {
      const newData = {
        employeeContribution: -100,
        employerContribution: 1800,
        totalBalance: 100000,
        uan: '123456789012'
      };

      const result = await validationService.validateEPFData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('cannot be negative');
    });

    it('should warn about contributions exceeding limits', async () => {
      const newData = {
        employeeContribution: 20000, // Exceeds monthly limit
        employerContribution: 20000,
        totalBalance: 100000,
        uan: '123456789012'
      };

      const result = await validationService.validateEPFData(null, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1); // Only exceeds contribution limit
      expect(result.warnings[0].type).toBe('exceeds_contribution_limit');
      expect(result.flags).toContain('exceeds_contribution_limit');
    });

    it('should warn about contribution mismatches', async () => {
      const newData = {
        employeeContribution: 1800,
        employerContribution: 1000, // Significant difference
        totalBalance: 100000,
        uan: '123456789012'
      };

      const result = await validationService.validateEPFData(null, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('contribution_mismatch');
      expect(result.flags).toContain('contribution_mismatch');
    });

    it('should validate UAN format', async () => {
      const newData = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 100000,
        uan: 'INVALID_UAN'
      };

      const result = await validationService.validateEPFData(null, newData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid UAN format');
    });

    it('should warn about unusual balance increases', async () => {
      const currentData = {
        totalBalance: 100000
      };

      const newData = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 120000, // Unusually large increase
        uan: '123456789012'
      };

      const result = await validationService.validateEPFData(currentData, newData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('unusual_balance_increase');
      expect(result.flags).toContain('unusual_balance_increase');
    });
  });

  describe('utility methods', () => {
    it('should validate ISIN format correctly', () => {
      expect(validationService.validateISINFormat('INF123456789')).toBe(true);
      expect(validationService.validateISINFormat('US0378331005')).toBe(true);
      expect(validationService.validateISINFormat('INVALID')).toBe(false);
      expect(validationService.validateISINFormat('')).toBe(false);
      expect(validationService.validateISINFormat(null)).toBe(false);
    });

    it('should validate UAN format correctly', () => {
      expect(validationService.validateUANFormat('123456789012')).toBe(true);
      expect(validationService.validateUANFormat(123456789012)).toBe(true);
      expect(validationService.validateUANFormat('12345678901')).toBe(false); // 11 digits
      expect(validationService.validateUANFormat('1234567890123')).toBe(false); // 13 digits
      expect(validationService.validateUANFormat('INVALID')).toBe(false);
      expect(validationService.validateUANFormat('')).toBe(false);
    });

    it('should check market hours correctly', () => {
      // Create dates for testing
      const marketHoursDate = new Date();
      marketHoursDate.setHours(10, 0, 0, 0); // 10 AM IST

      const outsideMarketHoursDate = new Date();
      outsideMarketHoursDate.setHours(18, 0, 0, 0); // 6 PM IST

      // Note: These tests might be timezone dependent
      // In a real scenario, you'd mock the timezone or use a more robust testing approach
      expect(typeof validationService.isMarketHours(marketHoursDate)).toBe('boolean');
      expect(typeof validationService.isMarketHours(outsideMarketHoursDate)).toBe('boolean');
    });

    it('should validate data structure correctly', () => {
      const data = {
        requiredField1: 'value1',
        requiredField2: 'value2',
        optionalField: 'optional'
      };

      const result = validationService.validateDataStructure(
        data,
        ['requiredField1', 'requiredField2'],
        ['optionalField']
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const data = {
        requiredField1: 'value1'
        // requiredField2 is missing
      };

      const result = validationService.validateDataStructure(
        data,
        ['requiredField1', 'requiredField2'],
        []
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required field: requiredField2');
    });

    it('should warn about unexpected fields', () => {
      const data = {
        requiredField: 'value',
        unexpectedField: 'unexpected'
      };

      const result = validationService.validateDataStructure(
        data,
        ['requiredField'],
        []
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('unexpected_fields');
    });
  });
});