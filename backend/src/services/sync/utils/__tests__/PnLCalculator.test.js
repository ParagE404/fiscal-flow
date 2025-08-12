const PnLCalculator = require('../PnLCalculator');

describe('PnLCalculator', () => {
  describe('calculateCurrentValue', () => {
    it('should calculate current value correctly', () => {
      expect(PnLCalculator.calculateCurrentValue(100, 50.25)).toBe(5025);
      expect(PnLCalculator.calculateCurrentValue(50, 100.50)).toBe(5025);
      expect(PnLCalculator.calculateCurrentValue(0, 100)).toBe(0);
    });

    it('should handle invalid inputs', () => {
      expect(PnLCalculator.calculateCurrentValue(null, 50)).toBe(0);
      expect(PnLCalculator.calculateCurrentValue(100, null)).toBe(0);
      expect(PnLCalculator.calculateCurrentValue(-10, 50)).toBe(0);
      expect(PnLCalculator.calculateCurrentValue(100, -50)).toBe(0);
    });
  });

  describe('calculatePnL', () => {
    it('should calculate profit correctly', () => {
      expect(PnLCalculator.calculatePnL(5000, 6000)).toBe(1000);
    });

    it('should calculate loss correctly', () => {
      expect(PnLCalculator.calculatePnL(6000, 5000)).toBe(-1000);
    });

    it('should handle breakeven', () => {
      expect(PnLCalculator.calculatePnL(5000, 5000)).toBe(0);
    });

    it('should handle invalid inputs', () => {
      expect(PnLCalculator.calculatePnL(null, 5000)).toBe(0);
      expect(PnLCalculator.calculatePnL(5000, null)).toBe(0);
    });
  });

  describe('calculatePnLPercentage', () => {
    it('should calculate profit percentage correctly', () => {
      expect(PnLCalculator.calculatePnLPercentage(5000, 6000)).toBe(20);
      expect(PnLCalculator.calculatePnLPercentage(1000, 1500)).toBe(50);
    });

    it('should calculate loss percentage correctly', () => {
      expect(PnLCalculator.calculatePnLPercentage(6000, 5000)).toBe(-16.67);
      expect(PnLCalculator.calculatePnLPercentage(1000, 800)).toBe(-20);
    });

    it('should handle zero invested amount', () => {
      expect(PnLCalculator.calculatePnLPercentage(0, 1000)).toBe(0);
      expect(PnLCalculator.calculatePnLPercentage(null, 1000)).toBe(0);
    });
  });

  describe('calculateDayChange', () => {
    it('should calculate day change correctly', () => {
      const result = PnLCalculator.calculateDayChange(100, 52, 50);
      expect(result.dayChangeAmount).toBe(2);
      expect(result.dayChangePercentage).toBe(4);
      expect(result.dayChangeValue).toBe(200);
    });

    it('should handle negative day change', () => {
      const result = PnLCalculator.calculateDayChange(100, 48, 50);
      expect(result.dayChangeAmount).toBe(-2);
      expect(result.dayChangePercentage).toBe(-4);
      expect(result.dayChangeValue).toBe(-200);
    });

    it('should handle invalid inputs', () => {
      const result = PnLCalculator.calculateDayChange(null, 52, 50);
      expect(result.dayChangeAmount).toBe(0);
      expect(result.dayChangePercentage).toBe(0);
      expect(result.dayChangeValue).toBe(0);
    });
  });

  describe('calculateAveragePrice', () => {
    it('should calculate average price correctly', () => {
      expect(PnLCalculator.calculateAveragePrice(5000, 100)).toBe(50);
      expect(PnLCalculator.calculateAveragePrice(7500, 150)).toBe(50);
    });

    it('should handle zero quantity', () => {
      expect(PnLCalculator.calculateAveragePrice(5000, 0)).toBe(0);
      expect(PnLCalculator.calculateAveragePrice(5000, null)).toBe(0);
    });
  });

  describe('calculatePortfolioWeight', () => {
    it('should calculate portfolio weight correctly', () => {
      expect(PnLCalculator.calculatePortfolioWeight(5000, 20000)).toBe(25);
      expect(PnLCalculator.calculatePortfolioWeight(7500, 30000)).toBe(25);
    });

    it('should handle zero portfolio value', () => {
      expect(PnLCalculator.calculatePortfolioWeight(5000, 0)).toBe(0);
      expect(PnLCalculator.calculatePortfolioWeight(5000, null)).toBe(0);
    });
  });

  describe('calculateAnnualizedReturn', () => {
    it('should calculate annualized return correctly', () => {
      const investmentDate = new Date('2023-01-01');
      const currentDate = new Date('2024-01-01'); // Exactly 1 year
      
      // 20% return over 1 year should be 20% annualized
      const result = PnLCalculator.calculateAnnualizedReturn(10000, 12000, investmentDate, currentDate);
      expect(result).toBeCloseTo(20, 1);
    });

    it('should handle less than 1 year investment', () => {
      const investmentDate = new Date('2023-07-01');
      const currentDate = new Date('2024-01-01'); // 6 months
      
      // 20% return over 6 months should be higher annualized
      const result = PnLCalculator.calculateAnnualizedReturn(10000, 12000, investmentDate, currentDate);
      expect(result).toBeGreaterThan(20);
    });

    it('should handle invalid dates', () => {
      expect(PnLCalculator.calculateAnnualizedReturn(10000, 12000, null)).toBe(0);
      expect(PnLCalculator.calculateAnnualizedReturn(10000, 12000, new Date(), new Date('2020-01-01'))).toBe(0);
    });
  });

  describe('calculateComprehensiveMetrics', () => {
    const sampleStockData = {
      quantity: 100,
      averagePrice: 50,
      investedAmount: 5000,
      currentPrice: 60,
      previousClose: 58,
      investmentDate: new Date('2023-01-01')
    };

    it('should calculate all metrics correctly', () => {
      const metrics = PnLCalculator.calculateComprehensiveMetrics(sampleStockData);
      
      expect(metrics.currentValue).toBe(6000);
      expect(metrics.pnl).toBe(1000);
      expect(metrics.pnlPercentage).toBe(20);
      expect(metrics.dayChangeAmount).toBe(2);
      expect(metrics.dayChangePercentage).toBeCloseTo(3.45, 1);
      expect(metrics.dayChangeValue).toBe(200);
      expect(metrics.isProfit).toBe(true);
      expect(metrics.isDayGainer).toBe(true);
    });

    it('should handle loss scenarios', () => {
      const lossStockData = {
        ...sampleStockData,
        currentPrice: 40,
        previousClose: 42
      };
      
      const metrics = PnLCalculator.calculateComprehensiveMetrics(lossStockData);
      
      expect(metrics.currentValue).toBe(4000);
      expect(metrics.pnl).toBe(-1000);
      expect(metrics.pnlPercentage).toBe(-20);
      expect(metrics.isLoss).toBe(true);
      expect(metrics.isDayLoser).toBe(true);
    });
  });

  describe('calculatePortfolioMetrics', () => {
    const sampleStocks = [
      {
        quantity: 100,
        averagePrice: 50,
        investedAmount: 5000,
        currentPrice: 60,
        previousClose: 58
      },
      {
        quantity: 50,
        averagePrice: 100,
        investedAmount: 5000,
        currentPrice: 90,
        previousClose: 95
      }
    ];

    it('should calculate portfolio metrics correctly', () => {
      const metrics = PnLCalculator.calculatePortfolioMetrics(sampleStocks);
      
      expect(metrics.totalInvestedAmount).toBe(10000);
      expect(metrics.totalCurrentValue).toBe(10500); // 6000 + 4500
      expect(metrics.totalPnL).toBe(500);
      expect(metrics.totalPnLPercentage).toBe(5);
      expect(metrics.profitableStocks).toBe(1);
      expect(metrics.losingStocks).toBe(1);
      expect(metrics.totalStocks).toBe(2);
    });

    it('should handle empty portfolio', () => {
      const metrics = PnLCalculator.calculatePortfolioMetrics([]);
      
      expect(metrics.totalInvestedAmount).toBe(0);
      expect(metrics.totalCurrentValue).toBe(0);
      expect(metrics.totalPnL).toBe(0);
      expect(metrics.totalStocks).toBe(0);
    });
  });

  describe('formatting methods', () => {
    describe('formatPnLAmount', () => {
      it('should format positive amounts correctly', () => {
        expect(PnLCalculator.formatPnLAmount(1000)).toBe('+₹1,000.00');
        expect(PnLCalculator.formatPnLAmount(1234.56)).toBe('+₹1,234.56');
      });

      it('should format negative amounts correctly', () => {
        expect(PnLCalculator.formatPnLAmount(-1000)).toBe('₹1,000.00');
        expect(PnLCalculator.formatPnLAmount(-1234.56)).toBe('₹1,234.56');
      });

      it('should handle zero', () => {
        expect(PnLCalculator.formatPnLAmount(0)).toBe('₹0.00');
        expect(PnLCalculator.formatPnLAmount(null)).toBe('₹0.00');
      });

      it('should support custom currency', () => {
        expect(PnLCalculator.formatPnLAmount(1000, '$')).toBe('+$1,000.00');
      });
    });

    describe('formatPnLPercentage', () => {
      it('should format positive percentages correctly', () => {
        expect(PnLCalculator.formatPnLPercentage(20.5)).toBe('+20.50%');
        expect(PnLCalculator.formatPnLPercentage(5)).toBe('+5.00%');
      });

      it('should format negative percentages correctly', () => {
        expect(PnLCalculator.formatPnLPercentage(-15.75)).toBe('-15.75%');
      });

      it('should handle zero', () => {
        expect(PnLCalculator.formatPnLPercentage(0)).toBe('0.00%');
        expect(PnLCalculator.formatPnLPercentage(null)).toBe('0.00%');
      });
    });

    describe('getPnLColorClass', () => {
      it('should return correct color classes', () => {
        expect(PnLCalculator.getPnLColorClass(100)).toBe('text-green-600');
        expect(PnLCalculator.getPnLColorClass(-100)).toBe('text-red-600');
        expect(PnLCalculator.getPnLColorClass(0)).toBe('text-gray-600');
        expect(PnLCalculator.getPnLColorClass(null)).toBe('text-gray-600');
      });
    });
  });

  describe('validateStockData', () => {
    it('should validate correct stock data', () => {
      const stockData = {
        quantity: 100,
        currentPrice: 50,
        investedAmount: 5000,
        averagePrice: 50
      };
      
      const result = PnLCalculator.validateStockData(stockData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const stockData = {
        quantity: 100
        // Missing currentPrice and investedAmount
      };
      
      const result = PnLCalculator.validateStockData(stockData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('currentPrice is required');
      expect(result.errors).toContain('investedAmount is required');
    });

    it('should detect invalid numeric values', () => {
      const stockData = {
        quantity: -100,
        currentPrice: 0,
        investedAmount: -5000
      };
      
      const result = PnLCalculator.validateStockData(stockData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be a positive number');
      expect(result.errors).toContain('Current price must be a positive number');
      expect(result.errors).toContain('Invested amount must be a positive number');
    });

    it('should detect logical inconsistencies', () => {
      const stockData = {
        quantity: 100,
        currentPrice: 50,
        investedAmount: 4000, // Should be 5000 (100 * 50)
        averagePrice: 50
      };
      
      const result = PnLCalculator.validateStockData(stockData);
      expect(result.isValid).toBe(true); // Still valid, but has warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      const result = PnLCalculator.validateStockData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stock data is required');
    });
  });
});