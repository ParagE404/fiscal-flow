/**
 * Unit tests for AnomalyDetectionService
 */

const AnomalyDetectionService = require('../AnomalyDetectionService');

describe('AnomalyDetectionService', () => {
  let anomalyService;

  beforeEach(() => {
    anomalyService = new AnomalyDetectionService();
  });

  describe('detectMutualFundAnomalies', () => {
    it('should detect extreme NAV changes', async () => {
      const currentData = {
        currentValue: 10000,
        investedAmount: 10000,
        purchasePrice: 20
      };

      const newData = {
        nav: 30, // 50% increase
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await anomalyService.detectMutualFundAnomalies(currentData, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.quarantine).toBe(true);
      expect(result.quarantineReason).toBe('extreme_price_change');
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('extreme_nav_change');
    });

    it('should detect stale data', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days old

      const newData = {
        nav: 25,
        date: oldDate,
        isin: 'INF123456789'
      };

      const result = await anomalyService.detectMutualFundAnomalies(null, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'stale_data')).toBe(true);
    });

    it('should analyze historical patterns', async () => {
      const currentData = {
        currentValue: 10000,
        investedAmount: 10000,
        purchasePrice: 20
      };

      const newData = {
        nav: 50, // Extreme outlier
        date: new Date(),
        isin: 'INF123456789'
      };

      const historicalData = [
        { nav: 20 }, { nav: 21 }, { nav: 19 }, { nav: 22 }, { nav: 20 }
      ];

      const result = await anomalyService.detectMutualFundAnomalies(currentData, newData, historicalData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'pattern_deviation')).toBe(true);
    });

    it('should not flag normal NAV changes', async () => {
      const currentData = {
        currentValue: 10000,
        investedAmount: 10000,
        purchasePrice: 20
      };

      const newData = {
        nav: 21, // 5% increase - normal
        date: new Date(),
        isin: 'INF123456789'
      };

      const result = await anomalyService.detectMutualFundAnomalies(currentData, newData);

      expect(result.hasAnomalies).toBe(false);
      expect(result.quarantine).toBe(false);
    });
  });

  describe('detectStockAnomalies', () => {
    it('should detect extreme price changes', async () => {
      const currentData = {
        currentPrice: 100
      };

      const newData = {
        price: 140, // 40% increase
        symbol: 'RELIANCE'
      };

      const result = await anomalyService.detectStockAnomalies(currentData, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.quarantine).toBe(true);
      expect(result.anomalies[0].type).toBe('extreme_price_change');
    });

    it('should detect volume spikes', async () => {
      const currentData = {
        currentPrice: 100,
        volume: 1000
      };

      const newData = {
        price: 105,
        symbol: 'RELIANCE',
        volume: 12000 // 1100% increase
      };

      const result = await anomalyService.detectStockAnomalies(currentData, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'volume_spike')).toBe(true);
    });

    it('should detect trading halts', async () => {
      const newData = {
        price: 100,
        symbol: 'RELIANCE',
        tradingStatus: 'SUSPENDED',
        volume: 0
      };

      const result = await anomalyService.detectStockAnomalies(null, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'trading_halt')).toBe(true);
    });

    it('should analyze volatility patterns', async () => {
      const newData = {
        price: 300, // Very high volatility scenario
        symbol: 'RELIANCE'
      };

      const historicalData = [
        { price: 100 }, { price: 150 }, { price: 50 }, { price: 200 }, 
        { price: 25 }, { price: 175 }, { price: 75 }, { price: 225 },
        { price: 10 }, { price: 250 }
      ];

      const result = await anomalyService.detectStockAnomalies(null, newData, historicalData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'high_volatility')).toBe(true);
    });
  });

  describe('detectEPFAnomalies', () => {
    it('should detect balance decreases', async () => {
      const currentData = {
        totalBalance: 100000
      };

      const newData = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 90000, // 10% decrease
        uan: '123456789012'
      };

      const result = await anomalyService.detectEPFAnomalies(currentData, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.quarantine).toBe(true);
      expect(result.anomalies[0].type).toBe('balance_decrease');
    });

    it('should detect contribution spikes', async () => {
      const newData = {
        employeeContribution: 10000, // Very high contribution
        employerContribution: 10000,
        totalBalance: 120000,
        uan: '123456789012'
      };

      const historicalData = [
        { employeeContribution: 1800, employerContribution: 1800 },
        { employeeContribution: 1900, employerContribution: 1900 },
        { employeeContribution: 1750, employerContribution: 1750 }
      ];

      const result = await anomalyService.detectEPFAnomalies(null, newData, historicalData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'contribution_spike')).toBe(true);
    });

    it('should detect interest rate anomalies', async () => {
      const newData = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 100000,
        interestRate: 15, // Very high interest rate
        uan: '123456789012'
      };

      const result = await anomalyService.detectEPFAnomalies(null, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'interest_rate_anomaly')).toBe(true);
    });

    it('should detect EPF rule violations', async () => {
      const newData = {
        employeeContribution: 5000, // Exceeds limit
        employerContribution: 1000, // Doesn't match employee contribution
        totalBalance: 100000,
        uan: '123456789012'
      };

      const result = await anomalyService.detectEPFAnomalies(null, newData);

      expect(result.hasAnomalies).toBe(true);
      expect(result.anomalies.some(a => a.type === 'epf_rule_violation')).toBe(true);
    });
  });

  describe('analyzeHistoricalPattern', () => {
    it('should detect outliers using z-score', () => {
      const historicalData = [
        { nav: 20 }, { nav: 21 }, { nav: 19 }, { nav: 22 }, { nav: 20 }
      ];

      const result = anomalyService.analyzeHistoricalPattern(historicalData, 50, 'nav');

      expect(result.isAnomalous).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.details.zScore).toBeGreaterThan(3);
    });

    it('should not flag normal variations', () => {
      const historicalData = [
        { nav: 20 }, { nav: 21 }, { nav: 19 }, { nav: 22 }, { nav: 20 }
      ];

      const result = anomalyService.analyzeHistoricalPattern(historicalData, 21.5, 'nav');

      expect(result.isAnomalous).toBe(false);
    });

    it('should handle insufficient data', () => {
      const historicalData = [{ nav: 20 }];

      const result = anomalyService.analyzeHistoricalPattern(historicalData, 25, 'nav');

      expect(result.isAnomalous).toBe(false);
      expect(result.severity).toBe('low');
    });
  });

  describe('analyzeVolatility', () => {
    it('should detect high volatility', () => {
      const historicalData = [
        { price: 100 }, { price: 120 }, { price: 80 }, { price: 140 }, 
        { price: 60 }, { price: 160 }, { price: 40 }
      ];

      const result = anomalyService.analyzeVolatility(historicalData, 200);

      expect(result.isAnomalous).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should handle normal volatility', () => {
      const historicalData = [
        { price: 100 }, { price: 102 }, { price: 98 }, { price: 105 }, 
        { price: 95 }, { price: 103 }
      ];

      const result = anomalyService.analyzeVolatility(historicalData, 104);

      expect(result.isAnomalous).toBe(false);
    });
  });

  describe('checkDataConsistency', () => {
    it('should detect mutual fund data inconsistencies', () => {
      const data = {
        nav: -10, // Invalid
        date: new Date(Date.now() + 86400000) // Future date
      };

      const result = anomalyService.checkDataConsistency(data, 'mutualFund');

      expect(result.isConsistent).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should detect stock data inconsistencies', () => {
      const data = {
        price: -50, // Invalid
        volume: -100 // Invalid
      };

      const result = anomalyService.checkDataConsistency(data, 'stock');

      expect(result.isConsistent).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should detect EPF data inconsistencies', () => {
      const data = {
        totalBalance: -1000, // Invalid
        employeeContribution: -100, // Invalid
        employerContribution: -200 // Invalid
      };

      const result = anomalyService.checkDataConsistency(data, 'epf');

      expect(result.isConsistent).toBe(false);
      expect(result.issues).toHaveLength(2);
    });
  });

  describe('checkEPFConsistency', () => {
    it('should detect contribution limit violations', () => {
      const data = {
        employeeContribution: 5000, // Exceeds limit
        employerContribution: 1000,
        totalBalance: 100000
      };

      const result = anomalyService.checkEPFConsistency(data);

      expect(result.isConsistent).toBe(false);
      expect(result.violations.some(v => v.includes('exceeds regulatory limit'))).toBe(true);
    });

    it('should detect contribution mismatches', () => {
      const data = {
        employeeContribution: 1800,
        employerContribution: 1000, // Should match employee contribution
        totalBalance: 100000
      };

      const result = anomalyService.checkEPFConsistency(data);

      expect(result.isConsistent).toBe(false);
      expect(result.violations.some(v => v.includes('should match employee contribution'))).toBe(true);
    });

    it('should pass valid EPF data', () => {
      const data = {
        employeeContribution: 1800,
        employerContribution: 1800,
        totalBalance: 100000
      };

      const result = anomalyService.checkEPFConsistency(data);

      expect(result.isConsistent).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('utility methods', () => {
    it('should calculate average contribution correctly', () => {
      const historicalData = [
        { employeeContribution: 1800, employerContribution: 1800 },
        { employeeContribution: 1900, employerContribution: 1900 },
        { employeeContribution: 1700, employerContribution: 1700 }
      ];

      const average = anomalyService.calculateAverageContribution(historicalData);

      expect(average).toBe(3600); // (3600 + 3800 + 3400) / 3
    });

    it('should calculate data age correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const age = anomalyService.calculateDataAge(yesterday);

      expect(age).toBe(1);
    });

    it('should generate unique quarantine IDs', () => {
      const id1 = anomalyService.generateQuarantineId();
      const id2 = anomalyService.generateQuarantineId();

      expect(id1).toMatch(/^QTN_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^QTN_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should get and update anomaly thresholds', () => {
      const originalThresholds = anomalyService.getAnomalyThresholds('stocks');
      expect(originalThresholds.extremePriceChange).toBe(30);

      anomalyService.updateAnomalyThresholds('stocks', { extremePriceChange: 25 });
      
      const updatedThresholds = anomalyService.getAnomalyThresholds('stocks');
      expect(updatedThresholds.extremePriceChange).toBe(25);
    });
  });

  describe('quarantineData', () => {
    it('should create quarantine record', async () => {
      const data = {
        nav: 50,
        isin: 'INF123456789',
        source: 'amfi'
      };

      const anomalyResult = {
        hasAnomalies: true,
        anomalies: [{ type: 'extreme_nav_change', severity: 'high' }],
        severity: 'high'
      };

      const quarantineRecord = await anomalyService.quarantineData(
        data, 
        'extreme_price_change', 
        anomalyResult
      );

      expect(quarantineRecord.id).toMatch(/^QTN_/);
      expect(quarantineRecord.data).toBe(data);
      expect(quarantineRecord.reason).toBe('extreme_price_change');
      expect(quarantineRecord.status).toBe('quarantined');
      expect(quarantineRecord.reviewRequired).toBe(true);
    });
  });

  describe('sendAdminNotification', () => {
    it('should create admin notification', async () => {
      const anomalyResult = {
        hasAnomalies: true,
        anomalies: [{ type: 'extreme_nav_change', severity: 'high' }],
        severity: 'high',
        quarantine: true,
        recommendations: ['Manual verification required']
      };

      const context = {
        investmentType: 'mutual_funds',
        userId: 'user123'
      };

      const notification = await anomalyService.sendAdminNotification(anomalyResult, context);

      expect(notification.type).toBe('anomaly_detected');
      expect(notification.severity).toBe('high');
      expect(notification.message).toContain('1 anomalies detected');
      expect(notification.details.context).toBe(context);
    });
  });
});