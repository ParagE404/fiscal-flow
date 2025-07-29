const { PrismaClient } = require('@prisma/client')
const { formatIndianCurrency, formatDisplayDate, formatPercentage } = require('../utils/formatting')

const prisma = new PrismaClient()


/**
 * Calculate EPF interest earned (simplified calculation)
 * @param {Object} epfAccount - EPF account object
 * @returns {number} Estimated interest earned
 */
const calculateEPFInterest = (epfAccount) => {
  // Simplified calculation - in reality, EPF interest is calculated monthly
  // and rates change yearly. For MVP, we'll use a basic calculation.
  const totalContributions = epfAccount.employeeContribution + epfAccount.employerContribution
  const interestEarned = epfAccount.totalBalance - totalContributions
  return Math.max(interestEarned, 0)
}

/**
 * Calculate monthly contribution rate as percentage of salary
 * @param {number} monthlyContribution - Monthly contribution amount
 * @param {number} estimatedSalary - Estimated monthly salary (contribution / 0.12)
 * @returns {number} Contribution rate percentage
 */
const calculateContributionRate = (monthlyContribution, estimatedSalary = null) => {
  // EPF contribution is typically 12% of basic salary
  // If we don't have salary info, we'll estimate it
  if (!estimatedSalary) {
    estimatedSalary = monthlyContribution / 0.12 // Assuming 12% contribution rate
  }
  return estimatedSalary > 0 ? (monthlyContribution / estimatedSalary) * 100 : 12
}

/**
 * Get all EPF accounts with summary calculations
 */
const getAllEPFAccounts = async (req, res, next) => {
  try {
    // Ensure default user exists
    

    const epfAccounts = await prisma.ePFAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate summary
    const totalBalance = epfAccounts.reduce((sum, epf) => sum + epf.totalBalance, 0)
    const totalEmployeeContribution = epfAccounts.reduce((sum, epf) => sum + epf.employeeContribution, 0)
    const totalEmployerContribution = epfAccounts.reduce((sum, epf) => sum + epf.employerContribution, 0)
    const totalPensionFund = epfAccounts.reduce((sum, epf) => sum + epf.pensionFund, 0)
    const totalMonthlyContribution = epfAccounts
      .filter(epf => epf.status === 'Active')
      .reduce((sum, epf) => sum + epf.monthlyContribution, 0)

    // Calculate total interest earned
    const totalInterestEarned = epfAccounts.reduce((sum, epf) => sum + calculateEPFInterest(epf), 0)

    // Count active and transferred accounts
    const activeAccounts = epfAccounts.filter(epf => epf.status === 'Active').length
    const transferredAccounts = epfAccounts.filter(epf => epf.status === 'Transferred').length

    const summary = {
      totalBalance,
      totalEmployeeContribution,
      totalEmployerContribution,
      totalPensionFund,
      totalInterestEarned,
      totalMonthlyContribution,
      totalAccounts: epfAccounts.length,
      activeAccounts,
      transferredAccounts
    }

    // Add calculated fields to each EPF account
    const epfAccountsWithCalculations = epfAccounts.map(epf => {
      const interestEarned = calculateEPFInterest(epf)
      const contributionRate = calculateContributionRate(epf.monthlyContribution)
      
      // Calculate service duration
      const startDate = new Date(epf.startDate)
      const endDate = epf.endDate ? new Date(epf.endDate) : new Date()
      const serviceDurationMonths = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30))
      const serviceDurationYears = Math.floor(serviceDurationMonths / 12)
      const remainingMonths = serviceDurationMonths % 12
      
      return {
        ...epf,
        interestEarned,
        contributionRate,
        serviceDurationMonths,
        serviceDurationDisplay: serviceDurationYears > 0 
          ? `${serviceDurationYears}y ${remainingMonths}m`
          : `${remainingMonths}m`,
        isActive: epf.status === 'Active'
      }
    })

    res.json({
      success: true,
      data: {
        epfAccounts: epfAccountsWithCalculations,
        summary
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific EPF account by ID
 */
const getEPFAccountById = async (req, res, next) => {
  try {
    const { id } = req.params

    const epfAccount = await prisma.ePFAccount.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!epfAccount) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'EPF account not found',
        timestamp: new Date().toISOString()
      })
    }

    // Add calculated fields
    const interestEarned = calculateEPFInterest(epfAccount)
    const contributionRate = calculateContributionRate(epfAccount.monthlyContribution)
    
    // Calculate service duration
    const startDate = new Date(epfAccount.startDate)
    const endDate = epfAccount.endDate ? new Date(epfAccount.endDate) : new Date()
    const serviceDurationMonths = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30))
    const serviceDurationYears = Math.floor(serviceDurationMonths / 12)
    const remainingMonths = serviceDurationMonths % 12

    const epfWithCalculations = {
      ...epfAccount,
      interestEarned,
      contributionRate,
      serviceDurationMonths,
      serviceDurationDisplay: serviceDurationYears > 0 
        ? `${serviceDurationYears}y ${remainingMonths}m`
        : `${remainingMonths}m`,
      isActive: epfAccount.status === 'Active'
    }

    res.json({
      success: true,
      data: epfWithCalculations,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new EPF account
 */
const createEPFAccount = async (req, res, next) => {
  try {
    // Ensure default user exists
    

    const epfData = {
      ...req.body,
      userId: req.user.id
    }

    // Validate PF number uniqueness for the user
    const existingPF = await prisma.ePFAccount.findFirst({
      where: {
        userId: req.user.id,
        pfNumber: epfData.pfNumber
      }
    })

    if (existingPF) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'PF number already exists',
        timestamp: new Date().toISOString()
      })
    }

    // Validate date logic
    if (epfData.endDate && new Date(epfData.endDate) <= new Date(epfData.startDate)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'End date must be after start date',
        timestamp: new Date().toISOString()
      })
    }

    // If status is 'Transferred', endDate is required
    if (epfData.status === 'Transferred' && !epfData.endDate) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'End date is required for transferred accounts',
        timestamp: new Date().toISOString()
      })
    }

    const epfAccount = await prisma.ePFAccount.create({
      data: epfData
    })

    res.status(201).json({
      success: true,
      data: epfAccount,
      message: 'EPF account created successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update EPF account
 */
const updateEPFAccount = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if EPF account exists and belongs to user
    const existingEPF = await prisma.ePFAccount.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingEPF) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'EPF account not found',
        timestamp: new Date().toISOString()
      })
    }

    // Validate PF number uniqueness if being updated
    if (updateData.pfNumber && updateData.pfNumber !== existingEPF.pfNumber) {
      const existingPF = await prisma.ePFAccount.findFirst({
        where: {
          userId: req.user.id,
          pfNumber: updateData.pfNumber,
          id: { not: id }
        }
      })

      if (existingPF) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'PF number already exists',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Validate date logic
    const startDate = updateData.startDate || existingEPF.startDate
    const endDate = updateData.endDate || existingEPF.endDate

    if (endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'End date must be after start date',
        timestamp: new Date().toISOString()
      })
    }

    // If status is being changed to 'Transferred', endDate is required
    const newStatus = updateData.status || existingEPF.status
    if (newStatus === 'Transferred' && !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'End date is required for transferred accounts',
        timestamp: new Date().toISOString()
      })
    }

    // If status is being changed to 'Active', remove endDate
    if (newStatus === 'Active' && updateData.status === 'Active') {
      updateData.endDate = null
    }

    const epfAccount = await prisma.ePFAccount.update({
      where: { id },
      data: updateData
    })

    res.json({
      success: true,
      data: epfAccount,
      message: 'EPF account updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete EPF account
 */
const deleteEPFAccount = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if EPF account exists and belongs to user
    const existingEPF = await prisma.ePFAccount.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingEPF) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'EPF account not found',
        timestamp: new Date().toISOString()
      })
    }

    await prisma.ePFAccount.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'EPF account deleted successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Ensure default user exists for MVP
 */
const ensureDefaultUser = async () => {
  const existingUser = await prisma.user.findUnique({
    where: { id: req.user.id }
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: req.user.id,
        email: 'default@fiscalflow.com',
        name: 'Default User'
      }
    })
  }
}

module.exports = {
  getAllEPFAccounts,
  getEPFAccountById,
  createEPFAccount,
  updateEPFAccount,
  deleteEPFAccount
}