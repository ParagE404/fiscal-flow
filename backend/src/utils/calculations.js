// Financial calculation utilities

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * @param {number} initialValue - Initial investment amount
 * @param {number} finalValue - Final/current value
 * @param {number} years - Number of years
 * @returns {number} CAGR percentage
 */
const calculateCAGR = (initialValue, finalValue, years) => {
  if (initialValue <= 0 || finalValue <= 0 || years <= 0) return 0
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100
}

/**
 * Calculate simple interest
 * @param {number} principal - Principal amount
 * @param {number} rate - Interest rate (percentage)
 * @param {number} time - Time in years
 * @returns {number} Interest amount
 */
const calculateSimpleInterest = (principal, rate, time) => {
  return (principal * rate * time) / 100
}

/**
 * Calculate compound interest
 * @param {number} principal - Principal amount
 * @param {number} rate - Interest rate (percentage)
 * @param {number} time - Time in years
 * @param {number} frequency - Compounding frequency per year (default: 1)
 * @returns {number} Final amount
 */
const calculateCompoundInterest = (principal, rate, time, frequency = 1) => {
  return principal * Math.pow(1 + (rate / 100) / frequency, frequency * time)
}

/**
 * Calculate current value of Fixed Deposit
 * @param {Object} fd - Fixed deposit object
 * @returns {number} Current value
 */
const calculateFDCurrentValue = (fd) => {
  const now = new Date()
  const startDate = new Date(fd.startDate)
  const maturityDate = new Date(fd.maturityDate)
  
  if (now <= startDate) return fd.investedAmount
  if (now >= maturityDate) return fd.maturityAmount
  
  const totalDays = (maturityDate - startDate) / (1000 * 60 * 60 * 24)
  const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24)
  const timeElapsed = elapsedDays / 365 // Convert to years
  
  if (fd.type === 'Simple') {
    const interest = calculateSimpleInterest(fd.investedAmount, fd.interestRate, timeElapsed)
    return fd.investedAmount + interest
  } else {
    // Cumulative (compound interest)
    return calculateCompoundInterest(fd.investedAmount, fd.interestRate, timeElapsed, 4) // Quarterly compounding
  }
}

/**
 * Calculate days remaining until maturity
 * @param {Date} maturityDate - Maturity date
 * @returns {number} Days remaining
 */
const calculateDaysRemaining = (maturityDate) => {
  const now = new Date()
  const maturity = new Date(maturityDate)
  const diffTime = maturity - now
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate stock P&L
 * @param {number} quantity - Number of shares
 * @param {number} buyPrice - Buy price per share
 * @param {number} currentPrice - Current price per share
 * @returns {Object} P&L details
 */
const calculateStockPnL = (quantity, buyPrice, currentPrice) => {
  const investedAmount = quantity * buyPrice
  const currentValue = quantity * currentPrice
  const pnl = currentValue - investedAmount
  const pnlPercentage = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0
  
  return {
    investedAmount,
    currentValue,
    pnl,
    pnlPercentage
  }
}

/**
 * Calculate portfolio summary
 * @param {Object} portfolioData - Portfolio data with all investments
 * @returns {Object} Portfolio summary
 */
const calculatePortfolioSummary = (portfolioData) => {
  const { mutualFunds = [], fixedDeposits = [], epfAccounts = [], stocks = [] } = portfolioData
  
  let totalInvested = 0
  let totalCurrentValue = 0
  
  // Mutual Funds
  mutualFunds.forEach(fund => {
    totalInvested += fund.investedAmount
    totalCurrentValue += fund.currentValue
  })
  
  // Fixed Deposits
  fixedDeposits.forEach(fd => {
    totalInvested += fd.investedAmount
    totalCurrentValue += calculateFDCurrentValue(fd)
  })
  
  // EPF Accounts
  epfAccounts.forEach(epf => {
    totalInvested += epf.employeeContribution + epf.employerContribution
    totalCurrentValue += epf.totalBalance
  })
  
  // Stocks
  stocks.forEach(stock => {
    totalInvested += stock.investedAmount
    totalCurrentValue += stock.currentValue
  })
  
  const totalReturns = totalCurrentValue - totalInvested
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0
  
  return {
    totalInvested,
    totalCurrentValue,
    totalReturns,
    returnsPercentage
  }
}

/**
 * Calculate asset allocation
 * @param {Object} portfolioData - Portfolio data
 * @returns {Object} Asset allocation percentages
 */
const calculateAssetAllocation = (portfolioData) => {
  const summary = calculatePortfolioSummary(portfolioData)
  const { totalCurrentValue } = summary
  
  if (totalCurrentValue === 0) {
    return {
      mutualFunds: { value: 0, percentage: 0 },
      fixedDeposits: { value: 0, percentage: 0 },
      epf: { value: 0, percentage: 0 },
      stocks: { value: 0, percentage: 0 }
    }
  }
  
  const { mutualFunds = [], fixedDeposits = [], epfAccounts = [], stocks = [] } = portfolioData
  
  const mfValue = mutualFunds.reduce((sum, fund) => sum + fund.currentValue, 0)
  const fdValue = fixedDeposits.reduce((sum, fd) => sum + calculateFDCurrentValue(fd), 0)
  const epfValue = epfAccounts.reduce((sum, epf) => sum + epf.totalBalance, 0)
  const stockValue = stocks.reduce((sum, stock) => sum + stock.currentValue, 0)
  
  return {
    mutualFunds: {
      value: mfValue,
      percentage: (mfValue / totalCurrentValue) * 100
    },
    fixedDeposits: {
      value: fdValue,
      percentage: (fdValue / totalCurrentValue) * 100
    },
    epf: {
      value: epfValue,
      percentage: (epfValue / totalCurrentValue) * 100
    },
    stocks: {
      value: stockValue,
      percentage: (stockValue / totalCurrentValue) * 100
    }
  }
}

module.exports = {
  calculateCAGR,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateFDCurrentValue,
  calculateDaysRemaining,
  calculateStockPnL,
  calculatePortfolioSummary,
  calculateAssetAllocation
}