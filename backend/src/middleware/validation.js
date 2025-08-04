const { z } = require('zod')

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : 
                   source === 'params' ? req.params :
                   source === 'query' ? req.query : req[source]
      
      const validatedData = schema.parse(data)
      
      // Replace the original data with validated data
      if (source === 'body') req.body = validatedData
      else if (source === 'params') req.params = validatedData
      else if (source === 'query') req.query = validatedData
      else req[source] = validatedData
      
      next()
    } catch (error) {
      next(error) // Pass to error handler
    }
  }
}

// Common validation schemas
const commonSchemas = {
  // ID parameter validation
  idParam: z.object({
    id: z.string().cuid('Invalid ID format')
  }),

  // Pagination query validation
  paginationQuery: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  // Financial amount validation
  financialAmount: z.number().positive('Amount must be positive'),

  // Date validation
  dateString: z.string().datetime('Invalid date format'),

  // Percentage validation
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),

  // Rating validation (1-5 stars)
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5')
}

// Mutual Fund validation schemas
const mutualFundSchemas = {
  create: z.object({
    name: z.string().min(1, 'Fund name is required').max(100),
    category: z.enum(['Large Cap', 'Mid Cap', 'Small Cap', 'Hybrid', 'Debt', 'ELSS']),
    riskLevel: z.enum(['Low', 'Moderate', 'High']),
    rating: commonSchemas.rating,
    investedAmount: commonSchemas.financialAmount,
    currentValue: z.number().nonnegative().optional().default(0),
    cagr: z.number().optional().default(0)
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    category: z.enum(['Large Cap', 'Mid Cap', 'Small Cap', 'Hybrid', 'Debt', 'ELSS']).optional(),
    riskLevel: z.enum(['Low', 'Moderate', 'High']).optional(),
    rating: commonSchemas.rating.optional(),
    investedAmount: commonSchemas.financialAmount.optional(),
    currentValue: z.number().nonnegative().optional(),
    cagr: z.number().optional()
  })
}

// Fixed Deposit validation schemas
const fixedDepositSchemas = {
  create: z.object({
    bankName: z.string().min(1, 'Bank name is required').max(50),
    customId: z.string().max(50, 'Custom ID too long').optional().or(z.literal('')),
    interestRate: z.number().positive().max(20, 'Interest rate seems too high'),
    type: z.enum(['Simple', 'Cumulative']),
    payoutType: z.enum(['Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Maturity']).default('Maturity'),
    investedAmount: commonSchemas.financialAmount,
    maturityAmount: commonSchemas.financialAmount,
    startDate: z.string().datetime(),
    maturityDate: z.string().datetime(),
    tenure: z.number().int().positive('Tenure must be positive')
  }).refine(data => new Date(data.maturityDate) > new Date(data.startDate), {
    message: 'Maturity date must be after start date',
    path: ['maturityDate']
  }),

  update: z.object({
    bankName: z.string().min(1).max(50).optional(),
    customId: z.string().max(50, 'Custom ID too long').optional().or(z.literal('')),
    interestRate: z.number().positive().max(20).optional(),
    type: z.enum(['Simple', 'Cumulative']).optional(),
    payoutType: z.enum(['Monthly', 'Quarterly', 'Half-yearly', 'Yearly', 'Maturity']).optional(),
    investedAmount: commonSchemas.financialAmount.optional(),
    maturityAmount: commonSchemas.financialAmount.optional(),
    startDate: z.string().datetime().optional(),
    maturityDate: z.string().datetime().optional(),
    tenure: z.number().int().positive().optional()
  })
}

// EPF Account validation schemas
const epfAccountSchemas = {
  create: z.object({
    employerName: z.string().min(1, 'Employer name is required').max(100),
    pfNumber: z.string().min(1, 'PF number is required').max(50),
    status: z.enum(['Active', 'Transferred']),
    totalBalance: commonSchemas.financialAmount,
    employeeContribution: commonSchemas.financialAmount,
    employerContribution: commonSchemas.financialAmount,
    pensionFund: z.number().nonnegative(),
    monthlyContribution: z.number().nonnegative(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
  }),

  update: z.object({
    employerName: z.string().min(1).max(100).optional(),
    pfNumber: z.string().min(1).max(50).optional(),
    status: z.enum(['Active', 'Transferred']).optional(),
    totalBalance: commonSchemas.financialAmount.optional(),
    employeeContribution: commonSchemas.financialAmount.optional(),
    employerContribution: commonSchemas.financialAmount.optional(),
    pensionFund: z.number().nonnegative().optional(),
    monthlyContribution: z.number().nonnegative().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
}

// Stock validation schemas
const stockSchemas = {
  create: z.object({
    symbol: z.string().min(1, 'Stock symbol is required').max(20),
    companyName: z.string().min(1, 'Company name is required').max(100),
    sector: z.string().min(1, 'Sector is required').max(50),
    marketCap: z.enum(['Large Cap', 'Mid Cap', 'Small Cap']),
    quantity: z.number().int().positive('Quantity must be positive'),
    buyPrice: z.number().positive('Buy price must be positive'),
    currentPrice: z.number().positive().optional(),
    investedAmount: commonSchemas.financialAmount.optional()
  }),

  update: z.object({
    symbol: z.string().min(1).max(20).optional(),
    companyName: z.string().min(1).max(100).optional(),
    sector: z.string().min(1).max(50).optional(),
    marketCap: z.enum(['Large Cap', 'Mid Cap', 'Small Cap']).optional(),
    quantity: z.number().int().positive().optional(),
    buyPrice: z.number().positive().optional(),
    currentPrice: z.number().positive().optional(),
    investedAmount: commonSchemas.financialAmount.optional()
  })
}

// SIP validation schemas
const sipSchemas = {
  create: z.object({
    fundName: z.string().min(1, 'Fund name is required').max(100),
    amount: commonSchemas.financialAmount,
    frequency: z.enum(['Monthly', 'Quarterly', 'Yearly']),
    nextDueDate: z.string().datetime(),
    totalInstallments: z.number().int().positive('Total installments must be positive'),
    completedInstallments: z.number().int().nonnegative().optional().default(0),
    status: z.enum(['Active', 'Paused', 'Completed']).optional().default('Active')
  }),

  update: z.object({
    fundName: z.string().min(1).max(100).optional(),
    amount: commonSchemas.financialAmount.optional(),
    frequency: z.enum(['Monthly', 'Quarterly', 'Yearly']).optional(),
    nextDueDate: z.string().datetime().optional(),
    totalInstallments: z.number().int().positive().optional(),
    completedInstallments: z.number().int().nonnegative().optional(),
    status: z.enum(['Active', 'Paused', 'Completed']).optional()
  }),

  statusUpdate: z.object({
    status: z.enum(['Active', 'Paused', 'Completed']).optional(),
    completedInstallments: z.number().int().nonnegative().optional()
  }).refine(data => data.status || data.completedInstallments !== undefined, {
    message: 'Either status or completedInstallments must be provided'
  })
}

module.exports = {
  validate,
  schemas: {
    common: commonSchemas,
    mutualFund: mutualFundSchemas,
    fixedDeposit: fixedDepositSchemas,
    epfAccount: epfAccountSchemas,
    stock: stockSchemas,
    sip: sipSchemas
  }
}