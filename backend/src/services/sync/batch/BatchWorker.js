/**
 * Worker thread for batch processing
 * Handles CPU-intensive batch operations in separate thread
 */

const { parentPort, workerData } = require('worker_threads');

// Available processors for different types of batch operations
const processors = {
  /**
   * Process mutual fund NAV updates
   */
  mutualFundNAVUpdate: async (item, metadata) => {
    const { fund, navData } = item;
    
    // Calculate new current value
    const totalUnits = fund.totalInvestment / navData.nav;
    const currentValue = totalUnits * navData.nav;
    
    // Calculate CAGR
    const investmentDate = new Date(fund.createdAt);
    const currentDate = new Date();
    const years = (currentDate - investmentDate) / (365.25 * 24 * 60 * 60 * 1000);
    const cagr = years > 0 ? Math.pow(currentValue / fund.totalInvestment, 1 / years) - 1 : 0;
    
    return {
      fundId: fund.id,
      currentValue: Math.round(currentValue * 100) / 100,
      cagr: Math.round(cagr * 10000) / 100, // Convert to percentage with 2 decimal places
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };
  },

  /**
   * Process stock price updates
   */
  stockPriceUpdate: async (item, metadata) => {
    const { stock, priceData } = item;
    
    const currentValue = stock.quantity * priceData.price;
    const pnl = currentValue - stock.investedAmount;
    const pnlPercentage = stock.investedAmount > 0 ? (pnl / stock.investedAmount) * 100 : 0;
    
    return {
      stockId: stock.id,
      currentPrice: priceData.price,
      currentValue: Math.round(currentValue * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercentage: Math.round(pnlPercentage * 100) / 100,
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };
  },

  /**
   * Process EPF balance updates
   */
  epfBalanceUpdate: async (item, metadata) => {
    const { account, epfData } = item;
    
    return {
      accountId: account.id,
      totalBalance: epfData.totalBalance,
      employeeContribution: epfData.employeeContribution,
      employerContribution: epfData.employerContribution,
      pensionFund: epfData.pensionFund,
      monthlyContribution: epfData.monthlyContribution,
      lastSyncAt: new Date(),
      syncStatus: 'synced'
    };
  },

  /**
   * Process data validation
   */
  dataValidation: async (item, metadata) => {
    const { data, rules } = item;
    const errors = [];
    const warnings = [];
    
    for (const rule of rules) {
      try {
        const result = await validateRule(data, rule);
        if (!result.valid) {
          if (result.severity === 'error') {
            errors.push(result.message);
          } else {
            warnings.push(result.message);
          }
        }
      } catch (error) {
        errors.push(`Validation rule error: ${error.message}`);
      }
    }
    
    return {
      dataId: data.id,
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Process data transformation
   */
  dataTransformation: async (item, metadata) => {
    const { data, transformations } = item;
    let transformedData = { ...data };
    
    for (const transformation of transformations) {
      transformedData = await applyTransformation(transformedData, transformation);
    }
    
    return {
      originalId: data.id,
      transformedData
    };
  },

  /**
   * Process aggregation calculations
   */
  aggregationCalculation: async (item, metadata) => {
    const { dataset, aggregationType } = item;
    
    switch (aggregationType) {
      case 'portfolio_summary':
        return calculatePortfolioSummary(dataset);
      case 'performance_metrics':
        return calculatePerformanceMetrics(dataset);
      case 'risk_analysis':
        return calculateRiskAnalysis(dataset);
      default:
        throw new Error(`Unknown aggregation type: ${aggregationType}`);
    }
  }
};

/**
 * Validate data against a rule
 */
async function validateRule(data, rule) {
  switch (rule.type) {
    case 'range':
      return validateRange(data[rule.field], rule.min, rule.max);
    case 'format':
      return validateFormat(data[rule.field], rule.pattern);
    case 'required':
      return validateRequired(data[rule.field]);
    case 'custom':
      return await rule.validator(data);
    default:
      return { valid: true };
  }
}

/**
 * Validate numeric range
 */
function validateRange(value, min, max) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { valid: false, severity: 'error', message: 'Value is not a number' };
  }
  
  if (min !== undefined && numValue < min) {
    return { valid: false, severity: 'error', message: `Value ${numValue} is below minimum ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { valid: false, severity: 'warning', message: `Value ${numValue} is above maximum ${max}` };
  }
  
  return { valid: true };
}

/**
 * Validate format using regex
 */
function validateFormat(value, pattern) {
  const regex = new RegExp(pattern);
  if (!regex.test(value)) {
    return { valid: false, severity: 'error', message: `Value does not match required format` };
  }
  
  return { valid: true };
}

/**
 * Validate required field
 */
function validateRequired(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, severity: 'error', message: 'Required field is missing' };
  }
  
  return { valid: true };
}

/**
 * Apply transformation to data
 */
async function applyTransformation(data, transformation) {
  switch (transformation.type) {
    case 'normalize':
      return normalizeData(data, transformation.config);
    case 'convert_currency':
      return convertCurrency(data, transformation.config);
    case 'calculate_returns':
      return calculateReturns(data, transformation.config);
    default:
      return data;
  }
}

/**
 * Normalize data values
 */
function normalizeData(data, config) {
  const normalized = { ...data };
  
  for (const field of config.fields) {
    if (normalized[field] !== undefined) {
      const value = parseFloat(normalized[field]);
      if (!isNaN(value)) {
        normalized[field] = Math.round(value * 100) / 100;
      }
    }
  }
  
  return normalized;
}

/**
 * Convert currency values
 */
function convertCurrency(data, config) {
  const converted = { ...data };
  const rate = config.exchangeRate || 1;
  
  for (const field of config.fields) {
    if (converted[field] !== undefined) {
      const value = parseFloat(converted[field]);
      if (!isNaN(value)) {
        converted[field] = Math.round(value * rate * 100) / 100;
      }
    }
  }
  
  return converted;
}

/**
 * Calculate returns for investment data
 */
function calculateReturns(data, config) {
  const withReturns = { ...data };
  
  if (data.investedAmount && data.currentValue) {
    const absoluteReturn = data.currentValue - data.investedAmount;
    const percentageReturn = data.investedAmount > 0 ? 
      (absoluteReturn / data.investedAmount) * 100 : 0;
    
    withReturns.absoluteReturn = Math.round(absoluteReturn * 100) / 100;
    withReturns.percentageReturn = Math.round(percentageReturn * 100) / 100;
  }
  
  return withReturns;
}

/**
 * Calculate portfolio summary
 */
function calculatePortfolioSummary(dataset) {
  const summary = {
    totalInvested: 0,
    totalCurrent: 0,
    totalReturns: 0,
    returnPercentage: 0,
    assetAllocation: {},
    topPerformers: [],
    worstPerformers: []
  };
  
  const investments = dataset.investments || [];
  
  for (const investment of investments) {
    summary.totalInvested += investment.investedAmount || 0;
    summary.totalCurrent += investment.currentValue || 0;
    
    // Asset allocation
    const category = investment.category || 'Other';
    if (!summary.assetAllocation[category]) {
      summary.assetAllocation[category] = 0;
    }
    summary.assetAllocation[category] += investment.currentValue || 0;
  }
  
  summary.totalReturns = summary.totalCurrent - summary.totalInvested;
  summary.returnPercentage = summary.totalInvested > 0 ? 
    (summary.totalReturns / summary.totalInvested) * 100 : 0;
  
  // Calculate percentages for asset allocation
  for (const category in summary.assetAllocation) {
    summary.assetAllocation[category] = summary.totalCurrent > 0 ? 
      (summary.assetAllocation[category] / summary.totalCurrent) * 100 : 0;
  }
  
  return summary;
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(dataset) {
  const investments = dataset.investments || [];
  const metrics = {
    averageReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    winRate: 0
  };
  
  if (investments.length === 0) {
    return metrics;
  }
  
  const returns = investments.map(inv => {
    const invested = inv.investedAmount || 0;
    const current = inv.currentValue || 0;
    return invested > 0 ? ((current - invested) / invested) * 100 : 0;
  });
  
  // Average return
  metrics.averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Volatility (standard deviation)
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - metrics.averageReturn, 2), 0) / returns.length;
  metrics.volatility = Math.sqrt(variance);
  
  // Win rate
  const positiveReturns = returns.filter(ret => ret > 0).length;
  metrics.winRate = (positiveReturns / returns.length) * 100;
  
  return metrics;
}

/**
 * Calculate risk analysis
 */
function calculateRiskAnalysis(dataset) {
  const investments = dataset.investments || [];
  const analysis = {
    riskScore: 0,
    diversificationScore: 0,
    concentrationRisk: 0,
    recommendations: []
  };
  
  if (investments.length === 0) {
    return analysis;
  }
  
  // Calculate concentration risk
  const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  const concentrations = investments.map(inv => 
    totalValue > 0 ? (inv.currentValue || 0) / totalValue : 0
  );
  
  analysis.concentrationRisk = Math.max(...concentrations) * 100;
  
  // Diversification score based on number of different categories
  const categories = new Set(investments.map(inv => inv.category || 'Other'));
  analysis.diversificationScore = Math.min((categories.size / 5) * 100, 100);
  
  // Overall risk score
  analysis.riskScore = (analysis.concentrationRisk + (100 - analysis.diversificationScore)) / 2;
  
  return analysis;
}

/**
 * Main message handler
 */
if (parentPort) {
  parentPort.on('message', async (message) => {
    const { batchId, items, processor, metadata } = message;
    
    try {
      const processorFunction = processors[processor];
      if (!processorFunction) {
        throw new Error(`Unknown processor: ${processor}`);
      }
      
      const results = [];
      const errors = [];
      
      for (const item of items) {
        try {
          const result = await processorFunction(item, metadata);
          results.push(result);
        } catch (error) {
          errors.push({
            item,
            error: error.message,
            stack: error.stack
          });
        }
      }
      
      parentPort.postMessage({
        batchId,
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });
      
    } catch (error) {
      parentPort.postMessage({
        batchId,
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
}

module.exports = { processors };