/**
 * Profit and Loss calculation utilities for stock investments
 * Provides comprehensive P&L calculations with various metrics
 */
class PnLCalculator {
  /**
   * Calculate current value of stock holding
   * @param {number} quantity - Number of shares held
   * @param {number} currentPrice - Current price per share
   * @returns {number} Current total value of holding
   */
  static calculateCurrentValue(quantity, currentPrice) {
    if (!quantity || !currentPrice || quantity < 0 || currentPrice < 0) {
      return 0;
    }
    
    return parseFloat((quantity * currentPrice).toFixed(2));
  }

  /**
   * Calculate absolute profit/loss amount
   * @param {number} investedAmount - Total amount invested
   * @param {number} currentValue - Current value of holding
   * @returns {number} P&L amount (positive for profit, negative for loss)
   */
  static calculatePnL(investedAmount, currentValue) {
    if (!investedAmount || !currentValue) {
      return 0;
    }
    
    return parseFloat((currentValue - investedAmount).toFixed(2));
  }

  /**
   * Calculate profit/loss percentage
   * @param {number} investedAmount - Total amount invested
   * @param {number} currentValue - Current value of holding
   * @returns {number} P&L percentage (positive for profit, negative for loss)
   */
  static calculatePnLPercentage(investedAmount, currentValue) {
    if (!investedAmount || investedAmount <= 0) {
      return 0;
    }
    
    const pnl = currentValue - investedAmount;
    return parseFloat((pnl / investedAmount * 100).toFixed(2));
  }

  /**
   * Calculate day's change in value
   * @param {number} quantity - Number of shares
   * @param {number} currentPrice - Current price per share
   * @param {number} previousPrice - Previous day's closing price
   * @returns {Object} Day change information
   */
  static calculateDayChange(quantity, currentPrice, previousPrice) {
    if (!quantity || !currentPrice || !previousPrice) {
      return {
        dayChangeAmount: 0,
        dayChangePercentage: 0,
        dayChangeValue: 0
      };
    }

    const dayChangeAmount = parseFloat((currentPrice - previousPrice).toFixed(2));
    const dayChangePercentage = parseFloat(((dayChangeAmount / previousPrice) * 100).toFixed(2));
    const dayChangeValue = parseFloat((quantity * dayChangeAmount).toFixed(2));

    return {
      dayChangeAmount,
      dayChangePercentage,
      dayChangeValue
    };
  }

  /**
   * Calculate average price per share
   * @param {number} totalInvestedAmount - Total amount invested across all purchases
   * @param {number} totalQuantity - Total quantity of shares held
   * @returns {number} Average price per share
   */
  static calculateAveragePrice(totalInvestedAmount, totalQuantity) {
    if (!totalQuantity || totalQuantity <= 0) {
      return 0;
    }
    
    return parseFloat((totalInvestedAmount / totalQuantity).toFixed(2));
  }

  /**
   * Calculate portfolio weight of a stock
   * @param {number} stockValue - Current value of this stock
   * @param {number} totalPortfolioValue - Total portfolio value
   * @returns {number} Weight as percentage
   */
  static calculatePortfolioWeight(stockValue, totalPortfolioValue) {
    if (!totalPortfolioValue || totalPortfolioValue <= 0) {
      return 0;
    }
    
    return parseFloat((stockValue / totalPortfolioValue * 100).toFixed(2));
  }

  /**
   * Calculate annualized return (CAGR) for a stock investment
   * @param {number} investedAmount - Initial invested amount
   * @param {number} currentValue - Current value
   * @param {Date} investmentDate - Date of investment
   * @param {Date} currentDate - Current date (optional, defaults to now)
   * @returns {number} Annualized return percentage
   */
  static calculateAnnualizedReturn(investedAmount, currentValue, investmentDate, currentDate = new Date()) {
    if (!investedAmount || investedAmount <= 0 || !investmentDate) {
      return 0;
    }

    const timeDiffMs = currentDate.getTime() - investmentDate.getTime();
    const timeDiffYears = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);
    
    if (timeDiffYears <= 0) {
      return 0;
    }

    const totalReturn = currentValue / investedAmount;
    const annualizedReturn = Math.pow(totalReturn, 1 / timeDiffYears) - 1;
    
    return parseFloat((annualizedReturn * 100).toFixed(2));
  }

  /**
   * Calculate comprehensive P&L metrics for a stock
   * @param {Object} stockData - Stock data object
   * @returns {Object} Comprehensive P&L metrics
   */
  static calculateComprehensiveMetrics(stockData) {
    const {
      quantity,
      averagePrice,
      investedAmount,
      currentPrice,
      previousClose,
      investmentDate
    } = stockData;

    // Basic calculations
    const currentValue = this.calculateCurrentValue(quantity, currentPrice);
    const pnl = this.calculatePnL(investedAmount, currentValue);
    const pnlPercentage = this.calculatePnLPercentage(investedAmount, currentValue);

    // Day change calculations
    const dayChange = this.calculateDayChange(quantity, currentPrice, previousClose);

    // Annualized return
    const annualizedReturn = investmentDate 
      ? this.calculateAnnualizedReturn(investedAmount, currentValue, new Date(investmentDate))
      : 0;

    // Price metrics
    const priceChange = currentPrice - averagePrice;
    const priceChangePercentage = averagePrice > 0 
      ? parseFloat(((priceChange / averagePrice) * 100).toFixed(2))
      : 0;

    return {
      // Current position
      currentValue,
      currentPrice,
      quantity,
      averagePrice,
      investedAmount,

      // P&L metrics
      pnl,
      pnlPercentage,
      annualizedReturn,

      // Price metrics
      priceChange,
      priceChangePercentage,

      // Day change metrics
      dayChangeAmount: dayChange.dayChangeAmount,
      dayChangePercentage: dayChange.dayChangePercentage,
      dayChangeValue: dayChange.dayChangeValue,

      // Status indicators
      isProfit: pnl > 0,
      isLoss: pnl < 0,
      isBreakeven: Math.abs(pnl) < 0.01,
      isDayGainer: dayChange.dayChangeAmount > 0,
      isDayLoser: dayChange.dayChangeAmount < 0
    };
  }

  /**
   * Calculate portfolio-level P&L metrics
   * @param {Array} stocks - Array of stock objects with P&L data
   * @returns {Object} Portfolio-level metrics
   */
  static calculatePortfolioMetrics(stocks) {
    if (!Array.isArray(stocks) || stocks.length === 0) {
      return {
        totalInvestedAmount: 0,
        totalCurrentValue: 0,
        totalPnL: 0,
        totalPnLPercentage: 0,
        totalDayChange: 0,
        totalDayChangePercentage: 0,
        profitableStocks: 0,
        losingStocks: 0,
        breakEvenStocks: 0,
        totalStocks: 0
      };
    }

    let totalInvestedAmount = 0;
    let totalCurrentValue = 0;
    let totalDayChange = 0;
    let profitableStocks = 0;
    let losingStocks = 0;
    let breakEvenStocks = 0;

    for (const stock of stocks) {
      const metrics = this.calculateComprehensiveMetrics(stock);
      
      totalInvestedAmount += metrics.investedAmount || 0;
      totalCurrentValue += metrics.currentValue || 0;
      totalDayChange += metrics.dayChangeValue || 0;

      if (metrics.isProfit) profitableStocks++;
      else if (metrics.isLoss) losingStocks++;
      else breakEvenStocks++;
    }

    const totalPnL = this.calculatePnL(totalInvestedAmount, totalCurrentValue);
    const totalPnLPercentage = this.calculatePnLPercentage(totalInvestedAmount, totalCurrentValue);
    const totalDayChangePercentage = totalInvestedAmount > 0 
      ? parseFloat((totalDayChange / totalInvestedAmount * 100).toFixed(2))
      : 0;

    return {
      totalInvestedAmount: parseFloat(totalInvestedAmount.toFixed(2)),
      totalCurrentValue: parseFloat(totalCurrentValue.toFixed(2)),
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      totalPnLPercentage: parseFloat(totalPnLPercentage.toFixed(2)),
      totalDayChange: parseFloat(totalDayChange.toFixed(2)),
      totalDayChangePercentage,
      profitableStocks,
      losingStocks,
      breakEvenStocks,
      totalStocks: stocks.length
    };
  }

  /**
   * Format P&L amount for display
   * @param {number} amount - P&L amount
   * @param {string} currency - Currency symbol (default: ₹)
   * @returns {string} Formatted P&L string
   */
  static formatPnLAmount(amount, currency = '₹') {
    if (!amount || amount === 0) {
      return `${currency}0.00`;
    }

    const sign = amount > 0 ? '+' : '';
    const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${sign}${currency}${formattedAmount}`;
  }

  /**
   * Format P&L percentage for display
   * @param {number} percentage - P&L percentage
   * @returns {string} Formatted percentage string
   */
  static formatPnLPercentage(percentage) {
    if (!percentage || percentage === 0) {
      return '0.00%';
    }

    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  /**
   * Get P&L color class for UI display
   * @param {number} value - P&L value (amount or percentage)
   * @returns {string} CSS class name for color
   */
  static getPnLColorClass(value) {
    if (!value || value === 0) {
      return 'text-gray-600';
    }
    
    return value > 0 ? 'text-green-600' : 'text-red-600';
  }

  /**
   * Validate stock data for P&L calculations
   * @param {Object} stockData - Stock data to validate
   * @returns {Object} Validation result
   */
  static validateStockData(stockData) {
    const errors = [];
    const warnings = [];

    if (!stockData) {
      errors.push('Stock data is required');
      return { isValid: false, errors, warnings };
    }

    // Required fields
    const requiredFields = ['quantity', 'currentPrice', 'investedAmount'];
    for (const field of requiredFields) {
      if (stockData[field] === undefined || stockData[field] === null) {
        errors.push(`${field} is required`);
      }
    }

    // Numeric validations
    if (stockData.quantity !== undefined && (stockData.quantity < 0 || !Number.isFinite(stockData.quantity))) {
      errors.push('Quantity must be a positive number');
    }

    if (stockData.currentPrice !== undefined && (stockData.currentPrice <= 0 || !Number.isFinite(stockData.currentPrice))) {
      errors.push('Current price must be a positive number');
    }

    if (stockData.investedAmount !== undefined && (stockData.investedAmount <= 0 || !Number.isFinite(stockData.investedAmount))) {
      errors.push('Invested amount must be a positive number');
    }

    if (stockData.averagePrice !== undefined && (stockData.averagePrice <= 0 || !Number.isFinite(stockData.averagePrice))) {
      errors.push('Average price must be a positive number');
    }

    // Logical validations
    if (stockData.quantity && stockData.averagePrice && stockData.investedAmount) {
      const expectedInvestedAmount = stockData.quantity * stockData.averagePrice;
      const difference = Math.abs(expectedInvestedAmount - stockData.investedAmount);
      
      if (difference > 0.01) { // Allow for small rounding differences
        warnings.push(`Invested amount (${stockData.investedAmount}) doesn't match quantity × average price (${expectedInvestedAmount})`);
      }
    }

    // Date validations
    if (stockData.investmentDate) {
      const investmentDate = new Date(stockData.investmentDate);
      if (isNaN(investmentDate.getTime())) {
        errors.push('Investment date is invalid');
      } else if (investmentDate > new Date()) {
        errors.push('Investment date cannot be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = PnLCalculator;