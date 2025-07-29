const { PrismaClient } = require('@prisma/client')
const { calculateCAGR } = require('../utils/calculations')
const { formatIndianCurrency, formatPercentage } = require('../utils/formatting')

const prisma = new PrismaClient()

// Authentication is now implemented - use req.user.id

/**
 * Get all mutual funds with summary calculations
 */
const getAllMutualFunds = async (req, res, next) => {
  try {
    const mutualFunds = await prisma.mutualFund.findMany({
      where: { userId: req.user.id },
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
        userId: req.user.id 
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
    const mutualFundData = {
      ...req.body,
      userId: req.user.id
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
        userId: req.user.id 
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
        userId: req.user.id 
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

// ensureDefaultUser function removed - authentication now handles user context

module.exports = {
  getAllMutualFunds,
  getMutualFundById,
  createMutualFund,
  updateMutualFund,
  deleteMutualFund
}