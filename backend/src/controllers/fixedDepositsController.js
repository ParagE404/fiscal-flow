const { PrismaClient } = require('@prisma/client')
const { 
  calculateFDCurrentValue, 
  calculateDaysRemaining, 
  calculateSimpleInterest, 
  calculateCompoundInterest 
} = require('../utils/calculations')
const { formatIndianCurrency, formatDisplayDate, formatDuration } = require('../utils/formatting')

const prisma = new PrismaClient()


/**
 * Get all fixed deposits with summary calculations
 */
const getAllFixedDeposits = async (req, res, next) => {
  try {
    // Ensure default user exists
    

    const fixedDeposits = await prisma.fixedDeposit.findMany({
      where: { userId: req.user.id },
      orderBy: { maturityDate: 'asc' }
    })

    // Calculate summary
    const totalInvested = fixedDeposits.reduce((sum, fd) => sum + fd.investedAmount, 0)
    const totalCurrentValue = fixedDeposits.reduce((sum, fd) => sum + calculateFDCurrentValue(fd), 0)
    const totalMaturityValue = fixedDeposits.reduce((sum, fd) => sum + fd.maturityAmount, 0)
    
    // Calculate average interest rate
    const avgInterestRate = fixedDeposits.length > 0 
      ? fixedDeposits.reduce((sum, fd) => sum + fd.interestRate, 0) / fixedDeposits.length 
      : 0

    // Calculate total interest earned (current value - invested amount)
    const totalInterestEarned = totalCurrentValue - totalInvested

    // Count maturing FDs (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const maturingSoon = fixedDeposits.filter(fd => 
      new Date(fd.maturityDate) <= thirtyDaysFromNow && new Date(fd.maturityDate) >= new Date()
    ).length

    const summary = {
      totalInvested,
      totalCurrentValue,
      totalMaturityValue,
      avgInterestRate,
      totalInterestEarned,
      totalFDs: fixedDeposits.length,
      maturingSoon
    }

    // Add calculated fields to each FD
    const fdsWithCalculations = fixedDeposits.map(fd => {
      const currentValue = calculateFDCurrentValue(fd)
      const daysRemaining = calculateDaysRemaining(fd.maturityDate)
      const totalDays = Math.ceil((new Date(fd.maturityDate) - new Date(fd.startDate)) / (1000 * 60 * 60 * 24))
      const elapsedDays = totalDays - Math.max(daysRemaining, 0)
      const progressPercentage = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0
      const interestEarned = currentValue - fd.investedAmount
      
      return {
        ...fd,
        currentValue,
        daysRemaining: Math.max(daysRemaining, 0),
        progressPercentage: Math.min(progressPercentage, 100),
        interestEarned,
        isMatured: daysRemaining <= 0,
        isMaturingSoon: daysRemaining > 0 && daysRemaining <= 30
      }
    })

    res.json({
      success: true,
      data: {
        fixedDeposits: fdsWithCalculations,
        summary
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific fixed deposit by ID
 */
const getFixedDepositById = async (req, res, next) => {
  try {
    const { id } = req.params

    const fixedDeposit = await prisma.fixedDeposit.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!fixedDeposit) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Fixed deposit not found',
        timestamp: new Date().toISOString()
      })
    }

    // Add calculated fields
    const currentValue = calculateFDCurrentValue(fixedDeposit)
    const daysRemaining = calculateDaysRemaining(fixedDeposit.maturityDate)
    const totalDays = Math.ceil((new Date(fixedDeposit.maturityDate) - new Date(fixedDeposit.startDate)) / (1000 * 60 * 60 * 24))
    const elapsedDays = totalDays - Math.max(daysRemaining, 0)
    const progressPercentage = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0
    const interestEarned = currentValue - fixedDeposit.investedAmount

    const fdWithCalculations = {
      ...fixedDeposit,
      currentValue,
      daysRemaining: Math.max(daysRemaining, 0),
      progressPercentage: Math.min(progressPercentage, 100),
      interestEarned,
      isMatured: daysRemaining <= 0,
      isMaturingSoon: daysRemaining > 0 && daysRemaining <= 30
    }

    res.json({
      success: true,
      data: fdWithCalculations,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create new fixed deposit
 */
const createFixedDeposit = async (req, res, next) => {
  try {
    // Ensure default user exists
    

    const fdData = {
      ...req.body,
      userId: req.user.id
    }

    // Check for duplicate custom ID if provided
    if (fdData.customId) {
      const existingFD = await prisma.fixedDeposit.findFirst({
        where: {
          userId: req.user.id,
          customId: fdData.customId
        }
      })

      if (existingFD) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'A fixed deposit with this custom ID already exists',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Calculate current value based on type and elapsed time
    fdData.currentValue = calculateFDCurrentValue(fdData)

    const fixedDeposit = await prisma.fixedDeposit.create({
      data: fdData
    })

    res.status(201).json({
      success: true,
      data: fixedDeposit,
      message: 'Fixed deposit created successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update fixed deposit
 */
const updateFixedDeposit = async (req, res, next) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if FD exists and belongs to user
    const existingFD = await prisma.fixedDeposit.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingFD) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Fixed deposit not found',
        timestamp: new Date().toISOString()
      })
    }

    // Check for duplicate custom ID if being updated
    if (updateData.customId && updateData.customId !== existingFD.customId) {
      const duplicateFD = await prisma.fixedDeposit.findFirst({
        where: {
          userId: req.user.id,
          customId: updateData.customId,
          id: { not: id } // Exclude current FD
        }
      })

      if (duplicateFD) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'A fixed deposit with this custom ID already exists',
          timestamp: new Date().toISOString()
        })
      }
    }

    // Recalculate tenure if dates are updated
    if (updateData.startDate || updateData.maturityDate) {
      const startDate = new Date(updateData.startDate || existingFD.startDate)
      const maturityDate = new Date(updateData.maturityDate || existingFD.maturityDate)
      
      if (maturityDate <= startDate) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Maturity date must be after start date',
          timestamp: new Date().toISOString()
        })
      }
      
      // Calculate tenure in months
      const diffTime = maturityDate - startDate
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      updateData.tenure = Math.ceil(diffDays / 30) // Convert to months
    }

    // Recalculate maturity amount if investment amount or interest rate changed
    if (updateData.investedAmount || updateData.interestRate || updateData.tenure) {
      const investedAmount = updateData.investedAmount || existingFD.investedAmount
      const interestRate = updateData.interestRate || existingFD.interestRate
      const tenure = updateData.tenure || existingFD.tenure
      const type = updateData.type || existingFD.type
      
      const years = tenure / 12
      
      if (type === 'Simple') {
        const interest = calculateSimpleInterest(investedAmount, interestRate, years)
        updateData.maturityAmount = investedAmount + interest
      } else {
        // Cumulative (compound interest) - quarterly compounding
        updateData.maturityAmount = calculateCompoundInterest(investedAmount, interestRate, years, 4)
      }
    }

    // Recalculate current value
    const updatedFDData = { ...existingFD, ...updateData }
    updateData.currentValue = calculateFDCurrentValue(updatedFDData)

    const fixedDeposit = await prisma.fixedDeposit.update({
      where: { id },
      data: updateData
    })

    res.json({
      success: true,
      data: fixedDeposit,
      message: 'Fixed deposit updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete fixed deposit
 */
const deleteFixedDeposit = async (req, res, next) => {
  try {
    const { id } = req.params

    // Check if FD exists and belongs to user
    const existingFD = await prisma.fixedDeposit.findFirst({
      where: { 
        id,
        userId: req.user.id 
      }
    })

    if (!existingFD) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Fixed deposit not found',
        timestamp: new Date().toISOString()
      })
    }

    await prisma.fixedDeposit.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Fixed deposit deleted successfully',
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
  getAllFixedDeposits,
  getFixedDepositById,
  createFixedDeposit,
  updateFixedDeposit,
  deleteFixedDeposit
}