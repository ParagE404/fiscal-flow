const { PrismaClient } = require('@prisma/client')
const { 
  calculatePortfolioSummary, 
  calculateAssetAllocation, 
  calculateFDCurrentValue 
} = require('../utils/calculations')
const { formatIndianCurrency, formatPercentage } = require('../utils/formatting')

const prisma = new PrismaClient()

// Authentication is now implemented - use req.user.id

/**
 * Get complete dashboard overview
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    // Fetch all portfolio data
    const portfolioData = await fetchAllPortfolioData(req.user.id)

    // Calculate portfolio summary
    const portfolioSummary = calculatePortfolioSummary(portfolioData)

    // Calculate monthly growth (simplified - comparing with last month's data)
    const monthlyGrowth = await calculateMonthlyGrowth(portfolioData)

    // Calculate asset allocation
    const assetAllocation = calculateAssetAllocation(portfolioData)

    // Get top performers
    const topPerformers = calculateTopPerformers(portfolioData)

    const dashboardData = {
      portfolioSummary: {
        ...portfolioSummary,
        monthlyGrowth
      },
      assetAllocation,
      topPerformers,
      lastUpdated: new Date().toISOString()
    }

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get portfolio summary only
 */
const getPortfolioSummary = async (req, res, next) => {
  try {
    const portfolioData = await fetchAllPortfolioData(req.user.id)
    const portfolioSummary = calculatePortfolioSummary(portfolioData)
    const monthlyGrowth = await calculateMonthlyGrowth(portfolioData)

    res.json({
      success: true,
      data: {
        ...portfolioSummary,
        monthlyGrowth
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get asset allocation only
 */
const getAssetAllocation = async (req, res, next) => {
  try {
    const portfolioData = await fetchAllPortfolioData(req.user.id)
    const assetAllocation = calculateAssetAllocation(portfolioData)

    res.json({
      success: true,
      data: assetAllocation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get top performers only
 */
const getTopPerformers = async (req, res, next) => {
  try {
    const portfolioData = await fetchAllPortfolioData(req.user.id)
    const topPerformers = calculateTopPerformers(portfolioData)

    res.json({
      success: true,
      data: topPerformers,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch all portfolio data from database
 */
const fetchAllPortfolioData = async (userId) => {
  const [mutualFunds, fixedDeposits, epfAccounts, stocks, sips] = await Promise.all([
    prisma.mutualFund.findMany({ where: { userId } }),
    prisma.fixedDeposit.findMany({ where: { userId } }),
    prisma.ePFAccount.findMany({ where: { userId } }),
    prisma.stock.findMany({ where: { userId } }),
    prisma.sIP.findMany({ where: { userId } })
  ])

  // Update fixed deposits with current values
  const fixedDepositsWithCurrentValue = fixedDeposits.map(fd => ({
    ...fd,
    currentValue: calculateFDCurrentValue(fd)
  }))

  return {
    mutualFunds,
    fixedDeposits: fixedDepositsWithCurrentValue,
    epfAccounts,
    stocks,
    sips
  }
}

/**
 * Calculate monthly growth (simplified calculation for MVP)
 */
const calculateMonthlyGrowth = async (portfolioData) => {
  // For MVP, we'll calculate a simplified monthly growth
  // In a real app, this would compare with historical data
  
  const currentValue = calculatePortfolioSummary(portfolioData).totalCurrentValue
  const totalInvested = calculatePortfolioSummary(portfolioData).totalInvested
  
  // Simplified calculation: assume even distribution over time
  // This is a placeholder - real implementation would use historical data
  const estimatedMonthlyGrowth = currentValue > totalInvested 
    ? ((currentValue - totalInvested) / totalInvested) * 100 / 12 // Annualized growth divided by 12
    : 0

  return Math.min(Math.max(estimatedMonthlyGrowth, -10), 10) // Cap between -10% and 10%
}

/**
 * Calculate top performers across all investment types
 */
const calculateTopPerformers = (portfolioData) => {
  const performers = []

  // Add mutual funds
  portfolioData.mutualFunds.forEach(fund => {
    const returns = fund.currentValue - fund.investedAmount
    const returnsPercentage = fund.investedAmount > 0 ? (returns / fund.investedAmount) * 100 : 0
    
    performers.push({
      name: fund.name,
      type: 'Mutual Fund',
      category: fund.category,
      investedAmount: fund.investedAmount,
      currentValue: fund.currentValue,
      returns,
      returnsPercentage,
      cagr: fund.cagr
    })
  })

  // Add stocks
  portfolioData.stocks.forEach(stock => {
    performers.push({
      name: stock.companyName,
      type: 'Stock',
      category: stock.sector,
      investedAmount: stock.investedAmount,
      currentValue: stock.currentValue,
      returns: stock.pnl,
      returnsPercentage: stock.pnlPercentage,
      symbol: stock.symbol
    })
  })

  // Add fixed deposits
  portfolioData.fixedDeposits.forEach(fd => {
    const returns = fd.currentValue - fd.investedAmount
    const returnsPercentage = fd.investedAmount > 0 ? (returns / fd.investedAmount) * 100 : 0
    
    performers.push({
      name: `${fd.bankName} FD`,
      type: 'Fixed Deposit',
      category: fd.type,
      investedAmount: fd.investedAmount,
      currentValue: fd.currentValue,
      returns,
      returnsPercentage,
      interestRate: fd.interestRate
    })
  })

  // Add EPF accounts
  portfolioData.epfAccounts.forEach(epf => {
    const totalContributions = epf.employeeContribution + epf.employerContribution
    const returns = epf.totalBalance - totalContributions
    const returnsPercentage = totalContributions > 0 ? (returns / totalContributions) * 100 : 0
    
    performers.push({
      name: `${epf.employerName} EPF`,
      type: 'EPF',
      category: epf.status,
      investedAmount: totalContributions,
      currentValue: epf.totalBalance,
      returns,
      returnsPercentage,
      pfNumber: epf.pfNumber
    })
  })

  // Sort by returns percentage and take top 10
  const topPerformers = performers
    .sort((a, b) => b.returnsPercentage - a.returnsPercentage)
    .slice(0, 10)
    .map(performer => ({
      ...performer,
      isProfit: performer.returns >= 0,
      returnsDisplay: formatIndianCurrency(Math.abs(performer.returns)),
      returnsPercentageDisplay: formatPercentage(performer.returnsPercentage)
    }))

  // Also get worst performers (bottom 5)
  const worstPerformers = performers
    .sort((a, b) => a.returnsPercentage - b.returnsPercentage)
    .slice(0, 5)
    .map(performer => ({
      ...performer,
      isProfit: performer.returns >= 0,
      returnsDisplay: formatIndianCurrency(Math.abs(performer.returns)),
      returnsPercentageDisplay: formatPercentage(performer.returnsPercentage)
    }))

  return {
    topPerformers,
    worstPerformers,
    totalInvestments: performers.length
  }
}

// ensureDefaultUser function removed - authentication now handles user context

module.exports = {
  getDashboardOverview,
  getPortfolioSummary,
  getAssetAllocation,
  getTopPerformers
}