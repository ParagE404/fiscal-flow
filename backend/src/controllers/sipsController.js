const { PrismaClient } = require('@prisma/client')
const { formatIndianCurrency, formatDisplayDate, formatDuration } = require('../utils/formatting')

const prisma = new PrismaClient()

// For MVP, we'll use a default user ID since authentication is not implemented yet
const DEFAULT_USER_ID = 'default-user'

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
    // Ensure default user exists
    await ensureDefaultUser()

    const sips = await prisma.sIP.findMany({
      where: { userId: DEFAULT_USER_ID },
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
        userId: DEFAULT_USER_ID 
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
    // Ensure default user exists
    await ensureDefaultUser()

    const sipData = {
      ...req.body,
      userId: DEFAULT_USER_ID
    }

    const sip = await prisma.sIP.create({
      data: sipData
    })

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
        userId: DEFAULT_USER_ID 
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
        userId: DEFAULT_USER_ID 
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
      data: updateData
    })

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
        userId: DEFAULT_USER_ID 
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
  getAllSIPs,
  getSIPById,
  createSIP,
  updateSIP,
  updateSIPStatus,
  deleteSIP
}