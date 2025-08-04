const { PrismaClient } = require('@prisma/client')
const { formatIndianCurrency, formatDisplayDate, formatDuration } = require('../utils/formatting')

const prisma = new PrismaClient()


/**
 * Calculate next due date based on frequency
 * @param {Date} currentDate - Current due date
 * @param {string} frequency - SIP frequency
 * @returns {Date} Next due date
 */
const calculateNextDueDate = (currentDate, frequency) => {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'Monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'Quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'Yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      date.setMonth(date.getMonth() + 1) // Default to monthly
  }
  
  return date
}

/**
 * Get all SIPs with summary calculations
 */
const getAllSIPs = async (req, res, next) => {
  try {
    const sips = await prisma.sIP.findMany({
      where: { userId: req.user.id },
      include: {
        mutualFund: {
          select: {
            id: true,
            name: true,
            category: true,
            riskLevel: true,
            rating: true
          }
        }
      },
      orderBy: { nextDueDate: 'asc' }
    })

    // Calculate summary
    const activeSIPs = sips.filter(sip => sip.status === 'Active')
    const totalSIPAmount = activeSIPs.reduce((sum, sip) => sum + sip.amount, 0)
    const totalInvested = sips.reduce((sum, sip) => sum + (sip.completedInstallments * sip.amount), 0)
    
    // Calculate upcoming SIPs (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const upcomingSIPs = activeSIPs.filter(sip => 
      new Date(sip.nextDueDate) <= thirtyDaysFromNow
    ).length

    const summary = {
      totalSIPs: sips.length,
      activeSIPs: activeSIPs.length,
      totalSIPAmount,
      totalInvested,
      upcomingSIPs
    }

    // Add calculated fields to each SIP
    const sipsWithCalculations = sips.map(sip => {
      const nextDueDate = new Date(sip.nextDueDate)
      const now = new Date()
      const daysUntilDue = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24))
      const totalInvestedInSIP = sip.completedInstallments * sip.amount
      const remainingInstallments = sip.totalInstallments - sip.completedInstallments
      const remainingAmount = remainingInstallments * sip.amount
      
      return {
        ...sip,
        daysUntilDue,
        totalInvestedInSIP,
        remainingInstallments,
        remainingAmount,
        progressPercentage: (sip.completedInstallments / sip.totalInstallments) * 100
      }
    })

    res.json({
      success: true,
      data: {
        sips: sipsWithCalculations,
        summary
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific SIP by ID
 */
const getSIPById = async (req, res, next) => {
  try {
    const { id } = req.params

    const sip = await prisma.sIP.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!sip) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'SIP not found',
        timestamp: new Date().toISOString()
      })
    }

    // Add calculated fields
    const nextDueDate = new Date(sip.nextDueDate)
    const now = new Date()
    const daysUntilDue = Math.ceil((nextDueDate - now) / (1000 * 60 * 60 * 24))
    const totalInvestedInSIP = sip.completedInstallments * sip.amount
    const remainingInstallments = sip.totalInstallments - sip.completedInstallments
    const remainingAmount = remainingInstallments * sip.amount

    const sipWithCalculations = {
      ...sip,
      daysUntilDue,
      totalInvestedInSIP,
      remainingInstallments,
      remainingAmount,
      progressPercentage: (sip.completedInstallments / sip.totalInstallments) * 100
    }

    res.json({
      success: true,
      data: sipWithCalculations,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new SIP
 */
const createSIP = async (req, res, next) => {
  try {
    const sipData = {
      ...req.body,
      userId: req.user.id
    }

    let mutualFundId = sipData.mutualFundId

    // If mutualFundId is provided, verify it exists and belongs to user
    if (mutualFundId) {
      const mutualFund = await prisma.mutualFund.findFirst({
        where: {
          id: mutualFundId,
          userId: req.user.id
        }
      })

      if (!mutualFund) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Mutual Fund',
          message: 'Selected mutual fund not found or does not belong to user',
          timestamp: new Date().toISOString()
        })
      }

      // Use the mutual fund name if not provided
      if (!sipData.fundName) {
        sipData.fundName = mutualFund.name
      }
    } else {
      // If no mutualFundId provided, create a new mutual fund entry
      if (sipData.fundName) {
        // Check if a mutual fund with the same name already exists
        const existingFund = await prisma.mutualFund.findFirst({
          where: {
            userId: req.user.id,
            name: {
              equals: sipData.fundName,
              mode: 'insensitive'
            }
          }
        })

        if (existingFund) {
          // Link to existing fund
          mutualFundId = existingFund.id
          sipData.mutualFundId = existingFund.id
          console.log(`Linked SIP to existing mutual fund: ${existingFund.name} (${existingFund.id})`)
        } else {
          // Create new mutual fund entry
          const newMutualFund = await prisma.mutualFund.create({
            data: {
              userId: req.user.id,
              name: sipData.fundName,
              category: 'Equity', // Default category
              riskLevel: 'Medium', // Default risk level
              rating: 3, // Default rating
              investedAmount: 0, // No lump sum investment initially
              currentValue: 0, // Will be updated later
              cagr: 0, // Will be calculated later
              sipInvestment: 0, // Will be calculated after SIP creation
              totalInvestment: 0 // Will be calculated after SIP creation
            }
          })

          mutualFundId = newMutualFund.id
          sipData.mutualFundId = newMutualFund.id
          console.log(`Created new mutual fund: ${newMutualFund.name} (${newMutualFund.id})`)
        }
      }
    }

    const sip = await prisma.sIP.create({
      data: sipData,
      include: {
        mutualFund: {
          select: {
            id: true,
            name: true,
            category: true,
            riskLevel: true,
            rating: true
          }
        }
      }
    })

    // Update mutual fund's SIP investment amount
    if (sip.mutualFundId) {
      await updateMutualFundSIPInvestment(sip.mutualFundId)
    }

    res.status(201).json({
      success: true,
      data: sip,
      message: 'SIP created successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update SIP
 */
const updateSIP = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if SIP exists and belongs to user
    const existingSIP = await prisma.sIP.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingSIP) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'SIP not found',
        timestamp: new Date().toISOString()
      })
    }

    // If frequency is updated, recalculate next due date
    if (updateData.frequency && updateData.frequency !== existingSIP.frequency) {
      updateData.nextDueDate = calculateNextDueDate(existingSIP.nextDueDate, updateData.frequency)
    }

    const sip = await prisma.sIP.update({
      where: { id },
      data: updateData
    })

    res.json({
      success: true,
      data: sip,
      message: 'SIP updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update SIP status with proper state transitions
 */
const updateSIPStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, completedInstallments } = req.body

    // Check if SIP exists and belongs to user
    const existingSIP = await prisma.sIP.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingSIP) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'SIP not found',
        timestamp: new Date().toISOString()
      })
    }

    // Validate state transitions
    const validTransitions = {
      'Active': ['Paused', 'Completed'],
      'Paused': ['Active', 'Completed'],
      'Completed': [] // Cannot transition from completed
    }

    if (existingSIP.status === 'Completed' && status !== 'Completed') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Transition',
        message: 'Cannot change status of completed SIP',
        timestamp: new Date().toISOString()
      })
    }

    if (status && !validTransitions[existingSIP.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Transition',
        message: `Cannot transition from ${existingSIP.status} to ${status}`,
        timestamp: new Date().toISOString()
      })
    }

    const updateData = {}
    
    if (status) {
      updateData.status = status
      
      // If marking as completed, set completed installments to total
      if (status === 'Completed') {
        updateData.completedInstallments = existingSIP.totalInstallments
      }
    }

    if (completedInstallments !== undefined) {
      updateData.completedInstallments = completedInstallments
      
      // Auto-complete if all installments are done
      if (completedInstallments >= existingSIP.totalInstallments) {
        updateData.status = 'Completed'
        updateData.completedInstallments = existingSIP.totalInstallments
      }
      
      // Calculate next due date if SIP is still active
      if (updateData.status !== 'Completed' && existingSIP.status === 'Active') {
        updateData.nextDueDate = calculateNextDueDate(existingSIP.nextDueDate, existingSIP.frequency)
      }
    }

    const sip = await prisma.sIP.update({
      where: { id },
      data: updateData,
      include: {
        mutualFund: {
          select: {
            id: true,
            name: true,
            category: true,
            riskLevel: true,
            rating: true
          }
        }
      }
    })

    // Update mutual fund's SIP investment amount if linked
    if (sip.mutualFundId) {
      await updateMutualFundSIPInvestment(sip.mutualFundId)
    }

    res.json({
      success: true,
      data: sip,
      message: 'SIP status updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete SIP
 */
const deleteSIP = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if SIP exists and belongs to user
    const existingSIP = await prisma.sIP.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingSIP) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'SIP not found',
        timestamp: new Date().toISOString()
      })
    }

    await prisma.sIP.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'SIP deleted successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update mutual fund's SIP investment amount based on linked SIPs
 */
const updateMutualFundSIPInvestment = async (mutualFundId) => {
  try {
    // Calculate total SIP investment for this mutual fund
    const sips = await prisma.sIP.findMany({
      where: { mutualFundId }
    })

    const sipInvestment = sips.reduce((total, sip) => {
      return total + (sip.completedInstallments * sip.amount)
    }, 0)

    // Get current mutual fund data
    const mutualFund = await prisma.mutualFund.findUnique({
      where: { id: mutualFundId }
    })

    if (mutualFund) {
      const totalInvestment = mutualFund.investedAmount + sipInvestment

      await prisma.mutualFund.update({
        where: { id: mutualFundId },
        data: {
          sipInvestment,
          totalInvestment
        }
      })
    }
  } catch (error) {
    console.error('Error updating mutual fund SIP investment:', error)
  }
}

module.exports = {
  getAllSIPs,
  getSIPById,
  createSIP,
  updateSIP,
  updateSIPStatus,
  deleteSIP
}