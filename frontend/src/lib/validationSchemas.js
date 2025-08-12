import { z } from 'zod'
import { validatePFNumber, validateUAN, validateStockSymbol } from './indianMarketContext'

// Common validation schemas
export const commonSchemas = {
  // Financial amount validation - must be positive
  financialAmount: z
    .number({ 
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .positive('Amount must be positive')
    .max(999999999, 'Amount is too large'),

  // Non-negative financial amount (for current values)
  nonNegativeAmount: z
    .number({ 
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number'
    })
    .nonnegative('Amount cannot be negative')
    .max(999999999, 'Amount is too large'),

  // Percentage validation (0-100)
  percentage: z
    .number({ 
      required_error: 'Percentage is required',
      invalid_type_error: 'Percentage must be a number'
    })
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100%'),

  // Interest rate validation (0-50%)
  interestRate: z
    .number({ 
      required_error: 'Interest rate is required',
      invalid_type_error: 'Interest rate must be a number'
    })
    .min(0, 'Interest rate cannot be negative')
    .max(50, 'Interest rate seems unrealistic (max 50%)'),

  // Rating validation (1-5 stars)
  rating: z
    .number({ 
      required_error: 'Rating is required',
      invalid_type_error: 'Rating must be a number'
    })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),

  // Date validation
  dateString: z
    .string({ required_error: 'Date is required' })
    .min(1, 'Date is required')
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, 'Invalid date format'),

  // Future date validation
  futureDateString: z
    .string({ required_error: 'Date is required' })
    .min(1, 'Date is required')
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, 'Invalid date format')
    .refine((date) => {
      const parsedDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return parsedDate >= today
    }, 'Date must be today or in the future'),

  // Past or present date validation
  pastOrPresentDateString: z
    .string({ required_error: 'Date is required' })
    .min(1, 'Date is required')
    .refine((date) => {
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, 'Invalid date format')
    .refine((date) => {
      const parsedDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return parsedDate <= today
    }, 'Date cannot be in the future'),

  // Positive integer validation
  positiveInteger: z
    .number({ 
      required_error: 'Value is required',
      invalid_type_error: 'Value must be a number'
    })
    .int('Value must be a whole number')
    .positive('Value must be positive'),

  // Non-empty string validation
  nonEmptyString: z
    .string({ required_error: 'This field is required' })
    .min(1, 'This field is required')
    .trim(),

  // Name validation
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name is too long (max 100 characters)')
    .trim()
}

// Mutual Fund validation schema
export const mutualFundSchema = z.object({
  name: commonSchemas.name,
  category: z.enum([
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
  ], { 
    required_error: 'Category is required',
    invalid_type_error: 'Please select a valid category'
  }),
  riskLevel: z.enum(['Low', 'Moderate', 'High'], { 
    required_error: 'Risk level is required',
    invalid_type_error: 'Please select a valid risk level'
  }),
  rating: commonSchemas.rating,
  investedAmount: commonSchemas.financialAmount,
  currentValue: commonSchemas.nonNegativeAmount,
  // Sync-related fields
  isin: z
    .string()
    .optional()
    .refine((isin) => {
      if (!isin || isin.trim() === '') return true
      // ISIN format: 2 letters + 10 alphanumeric characters
      return /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin.trim().toUpperCase())
    }, 'Invalid ISIN format. Expected format: INF123456789'),
  schemeCode: z
    .string()
    .optional()
    .refine((code) => {
      if (!code || code.trim() === '') return true
      // Scheme code should be numeric and up to 10 digits
      return /^\d{1,10}$/.test(code.trim())
    }, 'Scheme code should be numeric (up to 10 digits)'),
  enableAutoSync: z.boolean().optional().default(false),
  manualOverride: z.boolean().optional().default(false),
  // Existing optional fields
  amc: z
    .string()
    .optional()
    .refine((amc) => {
      if (!amc || amc.trim() === '') return true
      return amc.trim().length <= 100
    }, 'AMC name is too long (max 100 characters)'),
  nav: z
    .number()
    .positive('NAV must be positive')
    .optional(),
  expenseRatio: z
    .number()
    .min(0, 'Expense ratio cannot be negative')
    .max(5, 'Expense ratio seems too high (max 5%)')
    .optional()
})

// Fixed Deposit validation schema
export const fixedDepositSchema = z.object({
  bankName: z
    .string({ required_error: 'Bank name is required' })
    .min(1, 'Bank name is required')
    .max(100, 'Bank name is too long (max 100 characters)')
    .trim(),
  interestRate: commonSchemas.interestRate,
  type: z.enum(['Simple', 'Cumulative'], { 
    required_error: 'FD type is required',
    invalid_type_error: 'Please select a valid FD type'
  }),
  investedAmount: commonSchemas.financialAmount,
  maturityAmount: commonSchemas.financialAmount,
  startDate: commonSchemas.pastOrPresentDateString,
  maturityDate: commonSchemas.futureDateString,
  tenure: z
    .number({ 
      required_error: 'Tenure is required',
      invalid_type_error: 'Tenure must be a number'
    })
    .int('Tenure must be a whole number')
    .positive('Tenure must be positive')
    .max(120, 'Tenure cannot exceed 120 months')
}).refine((data) => {
  const startDate = new Date(data.startDate)
  const maturityDate = new Date(data.maturityDate)
  return maturityDate > startDate
}, {
  message: 'Maturity date must be after start date',
  path: ['maturityDate']
}).refine((data) => {
  return data.maturityAmount >= data.investedAmount
}, {
  message: 'Maturity amount should be greater than or equal to invested amount',
  path: ['maturityAmount']
})

// EPF Account validation schema
export const epfAccountSchema = z.object({
  employerName: z
    .string({ required_error: 'Employer name is required' })
    .min(1, 'Employer name is required')
    .max(100, 'Employer name is too long (max 100 characters)')
    .trim(),
  pfNumber: z
    .string({ required_error: 'PF number is required' })
    .min(1, 'PF number is required')
    .max(50, 'PF number is too long (max 50 characters)')
    .trim()
    .refine((pfNumber) => {
      // Enhanced PF number validation using Indian market context
      const patterns = [
        /^[A-Z]{2}\/[A-Z]{3}\/\d{7}\/\d{3}\/\d{7}$/, // New format
        /^[A-Z]{2}\/[A-Z]{3}\/\d{5,7}\/\d{3}\/\d{5,7}$/, // Old format 1
        /^[A-Z]{2}\/[A-Z0-9]{3}\/\d{5,7}\/\d{3}\/\d{5,7}$/ // Old format 2
      ]
      const cleanPF = pfNumber.trim().toUpperCase()
      return patterns.some(pattern => pattern.test(cleanPF))
    }, 'Invalid PF number format. Expected format: XX/XXX/0000000/000/0000000'),
  uan: z
    .string()
    .optional()
    .refine((uan) => {
      if (!uan || uan.trim() === '') return true
      return /^\d{12}$/.test(uan.trim())
    }, 'UAN must be a 12-digit number'),
  status: z.enum(['Active', 'Transferred', 'Settled', 'Inoperative'], { 
    required_error: 'Status is required',
    invalid_type_error: 'Please select a valid status'
  }),
  totalBalance: commonSchemas.financialAmount,
  employeeContribution: commonSchemas.financialAmount,
  employerContribution: commonSchemas.financialAmount,
  pensionFund: commonSchemas.nonNegativeAmount,
  monthlyContribution: commonSchemas.nonNegativeAmount,
  contributionRate: z
    .number()
    .min(8, 'Contribution rate cannot be less than 8%')
    .max(15, 'Contribution rate cannot exceed 15%')
    .optional()
    .default(12),
  startDate: commonSchemas.pastOrPresentDateString,
  endDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }, 'Invalid date format'),
  // Sync-related fields
  enableAutoSync: z.boolean().optional().default(false),
  manualOverride: z.boolean().optional().default(false),
  syncFrequency: z.enum(['monthly', 'quarterly']).optional().default('monthly')
}).refine((data) => {
  if (data.endDate) {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    return endDate >= startDate
  }
  return true
}, {
  message: 'End date must be after or equal to start date',
  path: ['endDate']
}).refine((data) => {
  // More flexible validation for EPF balance calculation
  const total = data.employeeContribution + data.employerContribution + data.pensionFund
  const tolerance = Math.max(total * 0.01, 1) // 1% tolerance or minimum ₹1
  return Math.abs(total - data.totalBalance) <= tolerance
}, {
  message: 'Total balance should approximately equal the sum of all contributions',
  path: ['totalBalance']
}).refine((data) => {
  // If auto-sync is enabled, UAN should be provided
  if (data.enableAutoSync && (!data.uan || data.uan.trim() === '')) {
    return false
  }
  return true
}, {
  message: 'UAN is required when auto-sync is enabled',
  path: ['uan']
})

// Stock validation schema
export const stockSchema = z.object({
  symbol: z
    .string({ required_error: 'Stock symbol is required' })
    .min(1, 'Stock symbol is required')
    .max(20, 'Stock symbol is too long (max 20 characters)')
    .trim()
    .toUpperCase()
    .refine((symbol) => {
      // Indian stock symbol validation
      return /^[A-Z0-9]{1,20}$/.test(symbol)
    }, 'Stock symbol should contain only letters and numbers'),
  companyName: commonSchemas.name,
  sector: z.enum([
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
  ], { 
    required_error: 'Sector is required',
    invalid_type_error: 'Please select a valid sector'
  }),
  exchange: z.enum(['NSE', 'BSE'], {
    required_error: 'Exchange is required',
    invalid_type_error: 'Please select a valid exchange'
  }).default('NSE'),
  marketCap: z.enum(['Large Cap', 'Mid Cap', 'Small Cap'], { 
    required_error: 'Market cap is required',
    invalid_type_error: 'Please select a valid market cap'
  }),
  marketCapRank: z
    .number()
    .int('Market cap rank must be a whole number')
    .positive('Market cap rank must be positive')
    .optional(),
  quantity: commonSchemas.positiveInteger,
  buyPrice: z
    .number({ 
      required_error: 'Buy price is required',
      invalid_type_error: 'Buy price must be a number'
    })
    .positive('Buy price must be positive')
    .max(999999, 'Buy price is too high'),
  currentPrice: z
    .number({ 
      required_error: 'Current price is required',
      invalid_type_error: 'Current price must be a number'
    })
    .positive('Current price must be positive')
    .max(999999, 'Current price is too high'),
  // Sync-related fields
  isin: z
    .string()
    .optional()
    .refine((isin) => {
      if (!isin || isin.trim() === '') return true
      // ISIN format: 2 letters + 10 alphanumeric characters
      return /^[A-Z]{2}[A-Z0-9]{10}$/.test(isin.trim().toUpperCase())
    }, 'Invalid ISIN format. Expected format: IN1234567890'),
  enableAutoSync: z.boolean().optional().default(false),
  manualOverride: z.boolean().optional().default(false),
  syncFrequency: z.enum(['hourly', 'daily']).optional().default('hourly')
}).refine((data) => {
  // Validate market cap category based on rank if provided
  if (data.marketCapRank) {
    if (data.marketCap === 'Large Cap' && data.marketCapRank > 100) {
      return false
    }
    if (data.marketCap === 'Mid Cap' && (data.marketCapRank <= 100 || data.marketCapRank > 250)) {
      return false
    }
    if (data.marketCap === 'Small Cap' && data.marketCapRank <= 250) {
      return false
    }
  }
  return true
}, {
  message: 'Market cap category does not match the provided rank',
  path: ['marketCap']
})

// SIP validation schema
export const sipSchema = z.object({
  fundName: commonSchemas.name,
  amount: commonSchemas.financialAmount,
  frequency: z.enum(['Monthly', 'Quarterly', 'Yearly'], { 
    required_error: 'Frequency is required',
    invalid_type_error: 'Please select a valid frequency'
  }),
  nextDueDate: commonSchemas.futureDateString,
  totalInstallments: z
    .number({ 
      required_error: 'Total installments is required',
      invalid_type_error: 'Total installments must be a number'
    })
    .int('Total installments must be a whole number')
    .positive('Total installments must be positive')
    .max(1200, 'Total installments cannot exceed 1200 (100 years)'),
  completedInstallments: z
    .number({ 
      invalid_type_error: 'Completed installments must be a number'
    })
    .int('Completed installments must be a whole number')
    .nonnegative('Completed installments cannot be negative')
    .optional()
    .default(0),
  status: z.enum(['Active', 'Paused', 'Completed'], { 
    invalid_type_error: 'Please select a valid status'
  }).optional().default('Active')
}).refine((data) => {
  return data.completedInstallments <= data.totalInstallments
}, {
  message: 'Completed installments cannot exceed total installments',
  path: ['completedInstallments']
})

// Form data transformation helpers
export const transformFormData = {
  // Transform string inputs to numbers for financial fields
  toNumber: (value) => {
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? undefined : num
    }
    return value
  },

  // Transform empty strings to undefined for optional fields
  emptyStringToUndefined: (value) => {
    return value === '' ? undefined : value
  }
}

// Form validation helpers
export const validationHelpers = {
  // Check if a date is in the past
  isPastDate: (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  },

  // Check if a date is in the future
  isFutureDate: (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return date > today
  },

  // Validate PF number format using Indian market context
  isValidPFNumber: validatePFNumber,
  
  // Validate UAN format
  isValidUAN: validateUAN,
  
  // Validate stock symbol format
  isValidStockSymbol: validateStockSymbol,

  // Calculate tenure in months between two dates
  calculateTenureInMonths: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    return Math.max(0, months)
  }
}