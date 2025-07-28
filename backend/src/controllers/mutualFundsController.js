const { PrismaClient } = require('@prisma/client')
const { calculateCAGR } = require('../utils/calculations')
const { formatIndianCurrency, formatPercentage } = require('../utils/formatting')

const prisma = new PrismaClient()

// For MVP, we'll use a default user ID since authentication is not implemented yet
const DEFAULT_USER_ID = 'default-user'

/**
 * Get all mutual funds with summary calculations
 */
const getAllMutualFunds = async (req, res, next) => {
  try {
    // Ensure default user exists
    await ensureDefaultUser()

    const mutualFunds = await prisma.mutualFund.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate summary
    const totalInvested = mutualFunds.reduce((sum, fund) => sum + fund.investedAmount, 0)
    const totalCurrentValue = mutualFunds.reduce((sum, fund) => sum + fund.currentValue, 0)
    
    // Calculate overall CAGR (simplified - assumes all investments started at the same time)
    const avgCAGR = mutualFunds.length > 0 
      ? mutualFunds.reduce((sum, fund) => sum + fund.cagr, 0) / mutualFunds.length 
      : 0

    const summary = {
      totalInvested,
      totalCurrentValue,
      totalReturns: totalCurrentValue - totalInvested,
      avgCAGR,
      totalFunds: mutualFunds.length
    }

    res.json({
      success: true,
      data: {
        funds: mutualFunds,
        summary
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific mutual fund by ID
 */
const getMutualFundById = async (req, res, next) => {
  try {
    const { id } = req.params

    const mutualFund = await prisma.mutualFund.findFirst({
      where: { 
        id,
        userId: DEFAULT_USER_ID 
      }
    })

    if (!mutualFund) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Mutual fund not found',
        timestamp: new Date().toISOString()
      })
    }

    res.json({
      success: true,
      data: mutualFund,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new mutual fund
 */
const createMutualFund = async (req, res, next) => {
  try {
    // Ensure default user exists
    await ensureDefaultUser()

    const mutualFundData = {
      ...req.body,
      userId: DEFAULT_USER_ID
    }

    // Calculate initial CAGR if currentValue is provided and different from investedAmount
    if (mutualFundData.currentValue && mutualFundData.currentValue !== mutualFundData.investedAmount) {
      // For new funds, assume 1 year for CAGR calculation (this would be more sophisticated in real app)
      mutualFundData.cagr = calculateCAGR(mutualFundData.investedAmount, mutualFundData.currentValue, 1)
    }

    const mutualFund = await prisma.mutualFund.create({
      data: mutualFundData
    })

    res.status(201).json({
      success: true,
      data: mutualFund,
      message: 'Mutual fund created successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update mutual fund
 */
const updateMutualFund = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if fund exists and belongs to user
    const existingFund = await prisma.mutualFund.findFirst({
      where: { 
        id,
        userId: DEFAULT_USER_ID 
      }
    })

    if (!existingFund) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Mutual fund not found',
        timestamp: new Date().toISOString()
      })
    }

    // Recalculate CAGR if investment or current value changed
    if (updateData.investedAmount || updateData.currentValue) {
      const investedAmount = updateData.investedAmount || existingFund.investedAmount
      const currentValue = updateData.currentValue || existingFund.currentValue
      
      if (currentValue !== investedAmount) {
        // Calculate time since creation for more accurate CAGR
        const createdAt = new Date(existingFund.createdAt)
        const now = new Date()
        const yearsElapsed = (now - createdAt) / (1000 * 60 * 60 * 24 * 365)
        const years = Math.max(yearsElapsed, 0.1) // Minimum 0.1 years to avoid division issues
        
        updateData.cagr = calculateCAGR(investedAmount, currentValue, years)
      }
    }

    const mutualFund = await prisma.mutualFund.update({
      where: { id },
      data: updateData
    })

    res.json({
      success: true,
      data: mutualFund,
      message: 'Mutual fund updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete mutual fund
 */
const deleteMutualFund = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if fund exists and belongs to user
    const existingFund = await prisma.mutualFund.findFirst({
      where: { 
        id,
        userId: DEFAULT_USER_ID 
      }
    })

    if (!existingFund) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Mutual fund not found',
        timestamp: new Date().toISOString()
      })
    }

    await prisma.mutualFund.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Mutual fund deleted successfully',
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
    where: { id: DEFAULT_USER_ID }
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: DEFAULT_USER_ID,
        email: 'default@fiscalflow.com',
        name: 'Default User'
      }
    })
  }
}

module.exports = {
  getAllMutualFunds,
  getMutualFundById,
  createMutualFund,
  updateMutualFund,
  deleteMutualFund
}