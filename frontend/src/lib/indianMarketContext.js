/**
 * Indian Market Context - Constants and utilities for Indian financial markets
 */

// Indian Stock Exchanges
export const INDIAN_EXCHANGES = {
  NSE: 'National Stock Exchange',
  BSE: 'Bombay Stock Exchange'
}

// Indian Stock Market Sectors (as per NSE/BSE classification)
export const INDIAN_SECTORS = [
  'Banking & Financial Services',
  'Information Technology',
  'Oil & Gas',
  'Fast Moving Consumer Goods',
  'Automobile & Auto Components',
  'Metals & Mining',
  'Pharmaceuticals',
  'Telecommunications',
  'Power',
  'Chemicals',
  'Construction & Infrastructure',
  'Textiles',
  'Media & Entertainment',
  'Real Estate',
  'Healthcare',
  'Consumer Durables',
  'Capital Goods',
  'Fertilizers & Pesticides',
  'Paper & Forest Products',
  'Shipping',
  'Sugar',
  'Cement',
  'Hotels & Tourism',
  'Diversified',
  'Others'
]

// Market Cap Categories (Indian market standards)
export const MARKET_CAP_CATEGORIES = {
  LARGE_CAP: {
    label: 'Large Cap',
    description: 'Top 100 companies by market capitalization',
    minRank: 1,
    maxRank: 100,
    color: '#2563eb'
  },
  MID_CAP: {
    label: 'Mid Cap',
    description: 'Companies ranked 101-250 by market capitalization',
    minRank: 101,
    maxRank: 250,
    color: '#f59e0b'
  },
  SMALL_CAP: {
    label: 'Small Cap',
    description: 'Companies ranked 251 and beyond by market capitalization',
    minRank: 251,
    maxRank: null,
    color: '#10b981'
  }
}

// EPF-specific constants
export const EPF_CONSTANTS = {
  // Current EPF contribution rates (as of 2024)
  EMPLOYEE_CONTRIBUTION_RATE: 12, // 12% of basic salary
  EMPLOYER_CONTRIBUTION_RATE: 12, // 12% of basic salary (split between EPF and EPS)
  EPF_PORTION: 8.33, // 8.33% goes to EPF
  EPS_PORTION: 3.67, // 3.67% goes to EPS (Employee Pension Scheme)
  
  // EPF account status
  STATUS: {
    ACTIVE: 'Active',
    TRANSFERRED: 'Transferred',
    SETTLED: 'Settled',
    INOPERATIVE: 'Inoperative'
  },
  
  // EPF interest rates (historical - for reference)
  INTEREST_RATES: {
    '2024': 8.25,
    '2023': 8.15,
    '2022': 8.10,
    '2021': 8.50
  }
}

// PF Number validation patterns
export const PF_NUMBER_PATTERNS = {
  // New UAN-based format: XX/XXX/0000000/000/0000000
  NEW_FORMAT: /^[A-Z]{2}\/[A-Z]{3}\/\d{7}\/\d{3}\/\d{7}$/,
  
  // Old format variations
  OLD_FORMAT_1: /^[A-Z]{2}\/[A-Z]{3}\/\d{5,7}\/\d{3}\/\d{5,7}$/,
  OLD_FORMAT_2: /^[A-Z]{2}\/[A-Z0-9]{3}\/\d{5,7}\/\d{3}\/\d{5,7}$/,
  
  // UAN (Universal Account Number) - 12 digit number
  UAN: /^\d{12}$/
}

// Major Indian Banks (for Fixed Deposits)
export const INDIAN_BANKS = [
  // Public Sector Banks
  'State Bank of India',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Central Bank of India',
  'Indian Overseas Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  'Indian Bank',
  
  // Private Sector Banks
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Yes Bank',
  'IDFC First Bank',
  'Federal Bank',
  'South Indian Bank',
  'Karur Vysya Bank',
  'City Union Bank',
  'Dhanlaxmi Bank',
  'Tamilnad Mercantile Bank',
  'Lakshmi Vilas Bank',
  'Nainital Bank',
  'Catholic Syrian Bank',
  
  // Small Finance Banks
  'AU Small Finance Bank',
  'Equitas Small Finance Bank',
  'Ujjivan Small Finance Bank',
  'Jana Small Finance Bank',
  'Suryoday Small Finance Bank',
  'North East Small Finance Bank',
  'Capital Small Finance Bank',
  'Fincare Small Finance Bank',
  
  // Payment Banks
  'Paytm Payments Bank',
  'Airtel Payments Bank',
  'India Post Payments Bank',
  'Fino Payments Bank',
  'Jio Payments Bank',
  
  // Others
  'Others'
]

// Mutual Fund Categories (Indian market)
export const MUTUAL_FUND_CATEGORIES = [
  // Equity Funds
  'Large Cap',
  'Mid Cap',
  'Small Cap',
  'Multi Cap',
  'Flexi Cap',
  'Large & Mid Cap',
  'Focused',
  'Dividend Yield',
  'Value',
  'Contra',
  'ELSS (Tax Saving)',
  
  // Sectoral/Thematic
  'Banking & Financial Services',
  'Technology',
  'Pharma & Healthcare',
  'Infrastructure',
  'FMCG',
  'Energy',
  'Commodities',
  'International',
  
  // Hybrid Funds
  'Conservative Hybrid',
  'Balanced Hybrid',
  'Aggressive Hybrid',
  'Dynamic Asset Allocation',
  'Multi Asset Allocation',
  'Arbitrage',
  'Equity Savings',
  
  // Debt Funds
  'Overnight',
  'Liquid',
  'Ultra Short Duration',
  'Low Duration',
  'Money Market',
  'Short Duration',
  'Medium Duration',
  'Medium to Long Duration',
  'Long Duration',
  'Dynamic Bond',
  'Corporate Bond',
  'Credit Risk',
  'Banking & PSU',
  'Gilt',
  'Floater',
  
  // Index Funds
  'Index Fund',
  'ETF',
  
  // Solution Oriented
  'Retirement Fund',
  'Children\'s Fund',
  
  // Others
  'Fund of Funds',
  'Others'
]

// Risk levels for investments
export const RISK_LEVELS = {
  LOW: {
    label: 'Low',
    description: 'Conservative investments with stable returns',
    color: '#10b981',
    examples: ['Fixed Deposits', 'Debt Funds', 'Government Securities']
  },
  MODERATE: {
    label: 'Moderate',
    description: 'Balanced risk-return profile',
    color: '#f59e0b',
    examples: ['Hybrid Funds', 'Large Cap Funds', 'Balanced Portfolios']
  },
  HIGH: {
    label: 'High',
    description: 'Higher risk with potential for higher returns',
    color: '#ef4444',
    examples: ['Small Cap Funds', 'Sectoral Funds', 'Individual Stocks']
  }
}

// Utility functions for Indian market context

/**
 * Validate PF Number format
 * @param {string} pfNumber - PF number to validate
 * @returns {boolean} - Whether the PF number is valid
 */
export function validatePFNumber(pfNumber) {
  if (!pfNumber || typeof pfNumber !== 'string') return false
  
  const cleanPF = pfNumber.trim().toUpperCase()
  
  return (
    PF_NUMBER_PATTERNS.NEW_FORMAT.test(cleanPF) ||
    PF_NUMBER_PATTERNS.OLD_FORMAT_1.test(cleanPF) ||
    PF_NUMBER_PATTERNS.OLD_FORMAT_2.test(cleanPF)
  )
}

/**
 * Validate UAN (Universal Account Number)
 * @param {string} uan - UAN to validate
 * @returns {boolean} - Whether the UAN is valid
 */
export function validateUAN(uan) {
  if (!uan || typeof uan !== 'string') return false
  return PF_NUMBER_PATTERNS.UAN.test(uan.trim())
}

/**
 * Get market cap category based on rank or market cap value
 * @param {number} rank - Market cap rank (1-based)
 * @returns {object} - Market cap category info
 */
export function getMarketCapCategory(rank) {
  if (rank <= 100) return MARKET_CAP_CATEGORIES.LARGE_CAP
  if (rank <= 250) return MARKET_CAP_CATEGORIES.MID_CAP
  return MARKET_CAP_CATEGORIES.SMALL_CAP
}

/**
 * Format PF Number for display
 * @param {string} pfNumber - Raw PF number
 * @returns {string} - Formatted PF number
 */
export function formatPFNumber(pfNumber) {
  if (!pfNumber) return ''
  return pfNumber.trim().toUpperCase()
}

/**
 * Get sector color for visualization
 * @param {string} sector - Sector name
 * @returns {string} - Hex color code
 */
export function getSectorColor(sector) {
  const colors = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
  ]
  
  const index = INDIAN_SECTORS.indexOf(sector)
  return index >= 0 ? colors[index % colors.length] : '#6b7280'
}

/**
 * Get risk level info
 * @param {string} riskLevel - Risk level (Low, Moderate, High)
 * @returns {object} - Risk level info
 */
export function getRiskLevelInfo(riskLevel) {
  return RISK_LEVELS[riskLevel.toUpperCase()] || RISK_LEVELS.MODERATE
}

/**
 * Calculate EPF contributions based on basic salary
 * @param {number} basicSalary - Monthly basic salary
 * @returns {object} - Contribution breakdown
 */
export function calculateEPFContributions(basicSalary) {
  const employeeContribution = (basicSalary * EPF_CONSTANTS.EMPLOYEE_CONTRIBUTION_RATE) / 100
  const employerEPFContribution = (basicSalary * EPF_CONSTANTS.EPF_PORTION) / 100
  const employerEPSContribution = (basicSalary * EPF_CONSTANTS.EPS_PORTION) / 100
  
  return {
    employee: employeeContribution,
    employerEPF: employerEPFContribution,
    employerEPS: employerEPSContribution,
    total: employeeContribution + employerEPFContribution,
    totalWithEPS: employeeContribution + employerEPFContribution + employerEPSContribution
  }
}

/**
 * Get current EPF interest rate
 * @param {number} year - Year (defaults to current year)
 * @returns {number} - Interest rate percentage
 */
export function getEPFInterestRate(year = new Date().getFullYear()) {
  return EPF_CONSTANTS.INTEREST_RATES[year.toString()] || 8.25
}

/**
 * Validate stock symbol format (Indian market)
 * @param {string} symbol - Stock symbol
 * @returns {boolean} - Whether the symbol is valid
 */
export function validateStockSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false
  
  const cleanSymbol = symbol.trim().toUpperCase()
  
  // Indian stock symbols are typically 1-20 characters, alphanumeric
  return /^[A-Z0-9]{1,20}$/.test(cleanSymbol)
}

/**
 * Get exchange suffix for stock symbol
 * @param {string} exchange - Exchange name (NSE/BSE)
 * @returns {string} - Exchange suffix
 */
export function getExchangeSuffix(exchange) {
  const suffixes = {
    NSE: '.NS',
    BSE: '.BO'
  }
  return suffixes[exchange] || '.NS'
}