const YahooFinanceProvider = require('../providers/YahooFinanceProvider');
const NSEDataProvider = require('../providers/NSEDataProvider');
const PnLCalculator = require('../utils/PnLCalculator');

describe('Stock Sync Integration Tests', () => {
  describe('Yahoo Finance Provider', () => {
    let provider;

    beforeEach(() => {
      provider = new YahooFinanceProvider();
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('Yahoo Finance');
    });

    it('should format NSE symbols correctly', () => {
      expect(provider.formatSymbol('RELIANCE', 'NSE')).toBe('RELIANCE.NS');
      expect(provider.formatSymbol('tcs', 'nse')).toBe('TCS.NS');
    });

    it('should format BSE symbols correctly', () => {
      expect(provider.formatSymbol('RELIANCE', 'BSE')).toBe('RELIANCE.BO');
      expect(provider.formatSymbol('tcs', 'bse')).toBe('TCS.BO');
    });

    it('should throw error for unsupported exchange', () => {
      expect(() => provider.formatSymbol('RELIANCE', 'NASDAQ')).toThrow('Unsupported exchange: NASDAQ');
    });

    it('should have appropriate rate limits', () => {
      const limits = provider.getRateLimits();
      expect(limits.requestsPerMinute).toBe(100);
      expect(limits.requestsPerHour).toBe(1000);
      expect(limits.requestsPerDay).toBe(10000);
    });
  });

  describe('NSE Data Provider', () => {
    let provider;

    beforeEach(() => {
      provider = new NSEDataProvider();
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('NSE India');
    });

    it('should format symbols correctly', () => {
      expect(provider.formatSymbol('reliance', 'NSE')).toBe('RELIANCE');
      expect(provider.formatSymbol('TCS', 'NSE')).toBe('TCS');
    });

    it('should have appropriate rate limits', () => {
      const limits = provider.getRateLimits();
      expect(limits.requestsPerMinute).toBe(30);
      expect(limits.requestsPerHour).toBe(500);
      expect(limits.requestsPerDay).toBe(5000);
    });

    it('should generate correct headers', () => {
      const headers = provider.getHeaders();
      expect(headers['User-Agent']).toContain('Mozilla');
      expect(headers['Accept']).toBe('application/json, text/plain, */*');
      expect(headers['Referer']).toBe('https://www.nseindia.com/');
    });
  });

  describe('P&L Calculator Integration', () => {
    it('should calculate comprehensive stock metrics', () => {
      const stockData = {
        quantity: 100,
        averagePrice: 2000,
        investedAmount: 200000,
        currentPrice: 2500,
        previousClose: 2400,
        investmentDate: new Date('2023-01-01')
      };

      const metrics = PnLCalculator.calculateComprehensiveMetrics(stockData);

      expect(metrics.currentValue).toBe(250000);
      expect(metrics.pnl).toBe(50000);
      expect(metrics.pnlPercentage).toBe(25);
      expect(metrics.dayChangeAmount).toBe(100);
      expect(metrics.dayChangePercentage).toBeCloseTo(4.17, 1);
      expect(metrics.dayChangeValue).toBe(10000);
      expect(metrics.isProfit).toBe(true);
      expect(metrics.isDayGainer).toBe(true);
    });

    it('should validate stock data correctly', () => {
      const validStock = {
        quantity: 100,
        currentPrice: 2500,
        investedAmount: 200000,
        averagePrice: 2000
      };

      const validation = PnLCalculator.validateStockData(validStock);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should format P&L values for display', () => {
      expect(PnLCalculator.formatPnLAmount(50000)).toBe('+₹50,000.00');
      expect(PnLCalculator.formatPnLAmount(-25000)).toBe('₹25,000.00');
      expect(PnLCalculator.formatPnLPercentage(25.5)).toBe('+25.50%');
      expect(PnLCalculator.formatPnLPercentage(-15.75)).toBe('-15.75%');
    });

    it('should provide correct color classes', () => {
      expect(PnLCalculator.getPnLColorClass(1000)).toBe('text-green-600');
      expect(PnLCalculator.getPnLColorClass(-1000)).toBe('text-red-600');
      expect(PnLCalculator.getPnLColorClass(0)).toBe('text-gray-600');
    });
  });

  describe('Data Provider Validation', () => {
    it('should validate Yahoo Finance price data', () => {
      const yahooProvider = new YahooFinanceProvider();
      
      const validData = [
        {
          symbol: 'RELIANCE',
          exchange: 'NSE',
          price: 2500,
          timestamp: new Date(),
          source: 'Yahoo Finance'
        }
      ];

      expect(yahooProvider.validateData(validData)).toBe(true);
    });

    it('should reject invalid price data', () => {
      const yahooProvider = new YahooFinanceProvider();
      
      const invalidData = [
        {
          symbol: 'RELIANCE',
          exchange: 'NSE',
          price: -100, // Invalid negative price
          timestamp: new Date(),
          source: 'Yahoo Finance'
        }
      ];

      expect(yahooProvider.validateData(invalidData)).toBe(false);
    });

    it('should transform data to standard format', () => {
      const yahooProvider = new YahooFinanceProvider();
      
      const rawData = [
        {
          symbol: 'RELIANCE',
          exchange: 'NSE',
          price: 2500,
          currency: 'INR',
          timestamp: new Date(),
          previousClose: 2400,
          change: 100,
          changePercent: 4.17,
          source: 'Yahoo Finance'
        }
      ];

      const transformed = yahooProvider.transformData(rawData);
      
      expect(transformed[0]).toMatchObject({
        identifier: 'RELIANCE:NSE',
        symbol: 'RELIANCE',
        exchange: 'NSE',
        value: 2500,
        currency: 'INR',
        source: 'Yahoo Finance'
      });
      
      expect(transformed[0].metadata).toMatchObject({
        previousClose: 2400,
        change: 100,
        changePercent: 4.17
      });
    });
  });

  describe('Portfolio Calculations', () => {
    it('should calculate portfolio-level metrics', () => {
      const stocks = [
        {
          quantity: 100,
          averagePrice: 2000,
          investedAmount: 200000,
          currentPrice: 2500,
          previousClose: 2400
        },
        {
          quantity: 50,
          averagePrice: 1000,
          investedAmount: 50000,
          currentPrice: 900,
          previousClose: 950
        }
      ];

      const portfolioMetrics = PnLCalculator.calculatePortfolioMetrics(stocks);

      expect(portfolioMetrics.totalInvestedAmount).toBe(250000);
      expect(portfolioMetrics.totalCurrentValue).toBe(295000); // (100*2500) + (50*900)
      expect(portfolioMetrics.totalPnL).toBe(45000);
      expect(portfolioMetrics.totalPnLPercentage).toBe(18);
      expect(portfolioMetrics.profitableStocks).toBe(1);
      expect(portfolioMetrics.losingStocks).toBe(1);
      expect(portfolioMetrics.totalStocks).toBe(2);
    });
  });
});