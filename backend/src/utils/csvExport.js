// CSV export utilities for FiscalFlow

const { 
  formatIndianCurrency, 
  formatIndianDate, 
  formatPercentage, 
  sanitizeForCSV 
} = require('./formatting')

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header objects with key and label
 * @returns {string} CSV string
 */
const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.map(h => sanitizeForCSV(h.label)).join(',') + '\n'
  }

  // Create header row
  const headerRow = headers.map(h => sanitizeForCSV(h.label)).join(',')
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header.key]
      return sanitizeForCSV(formatValueForCSV(value, header.type))
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Format value based on type for CSV export
 * @param {any} value - Value to format
 * @param {string} type - Type of formatting (currency, percentage, date, etc.)
 * @returns {string} Formatted value
 */
const formatValueForCSV = (value, type) => {
  if (value === null || value === undefined) return ''
  
  switch (type) {
    case 'currency':
      return formatIndianCurrency(value, false) // Without ₹ symbol for CSV
    case 'currency_with_symbol':
      return formatIndianCurrency(value, true)
    case 'percentage':
      return formatPercentage(value)
    case 'date':
      return formatIndianDate(value)
    case 'number':
      return typeof value === 'number' ? value.toString() : value
    case 'boolean':
      return value ? 'Yes' : 'No'
    default:
      return String(value)
  }
}

/**
 * Generate CSV for mutual funds data
 * @param {Array} mutualFunds - Array of mutual fund objects
 * @returns {string} CSV string
 */
const generateMutualFundsCSV = (mutualFunds) => {
  const headers = [
    { key: 'name', label: 'Fund Name', type: 'string' },
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'riskLevel', label: 'Risk Level', type: 'string' },
    { key: 'rating', label: 'Rating', type: 'number' },
    { key: 'investedAmount', label: 'Invested Amount (₹)', type: 'currency' },
    { key: 'currentValue', label: 'Current Value (₹)', type: 'currency' },
    { key: 'returns', label: 'Returns (₹)', type: 'currency' },
    { key: 'returnsPercentage', label: 'Returns (%)', type: 'percentage' },
    { key: 'cagr', label: 'CAGR (%)', type: 'percentage' },
    { key: 'createdAt', label: 'Added On', type: 'date' }
  ]

  const processedData = mutualFunds.map(fund => ({
    ...fund,
    returns: fund.currentValue - fund.investedAmount,
    returnsPercentage: fund.investedAmount > 0 ? ((fund.currentValue - fund.investedAmount) / fund.investedAmount) * 100 : 0
  }))

  return arrayToCSV(processedData, headers)
}

/**
 * Generate CSV for SIPs data
 * @param {Array} sips - Array of SIP objects
 * @returns {string} CSV string
 */
const generateSIPsCSV = (sips) => {
  const headers = [
    { key: 'fundName', label: 'Fund Name', type: 'string' },
    { key: 'amount', label: 'SIP Amount (₹)', type: 'currency' },
    { key: 'frequency', label: 'Frequency', type: 'string' },
    { key: 'nextDueDate', label: 'Next Due Date', type: 'date' },
    { key: 'totalInstallments', label: 'Total Installments', type: 'number' },
    { key: 'completedInstallments', label: 'Completed Installments', type: 'number' },
    { key: 'remainingInstallments', label: 'Remaining Installments', type: 'number' },
    { key: 'totalInvested', label: 'Total Invested (₹)', type: 'currency' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'createdAt', label: 'Started On', type: 'date' }
  ]

  const processedData = sips.map(sip => ({
    ...sip,
    remainingInstallments: sip.totalInstallments - sip.completedInstallments,
    totalInvested: sip.amount * sip.completedInstallments
  }))

  return arrayToCSV(processedData, headers)
}

/**
 * Generate CSV for fixed deposits data
 * @param {Array} fixedDeposits - Array of fixed deposit objects
 * @returns {string} CSV string
 */
const generateFixedDepositsCSV = (fixedDeposits) => {
  const headers = [
    { key: 'bankName', label: 'Bank Name', type: 'string' },
    { key: 'type', label: 'FD Type', type: 'string' },
    { key: 'investedAmount', label: 'Invested Amount (₹)', type: 'currency' },
    { key: 'currentValue', label: 'Current Value (₹)', type: 'currency' },
    { key: 'maturityAmount', label: 'Maturity Amount (₹)', type: 'currency' },
    { key: 'interestRate', label: 'Interest Rate (%)', type: 'percentage' },
    { key: 'interestEarned', label: 'Interest Earned (₹)', type: 'currency' },
    { key: 'tenure', label: 'Tenure (Months)', type: 'number' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'maturityDate', label: 'Maturity Date', type: 'date' },
    { key: 'daysRemaining', label: 'Days Remaining', type: 'number' },
    { key: 'createdAt', label: 'Added On', type: 'date' }
  ]

  const processedData = fixedDeposits.map(fd => {
    const today = new Date()
    const maturityDate = new Date(fd.maturityDate)
    const daysRemaining = Math.max(0, Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24)))
    
    return {
      ...fd,
      interestEarned: fd.currentValue - fd.investedAmount,
      daysRemaining
    }
  })

  return arrayToCSV(processedData, headers)
}

/**
 * Generate CSV for EPF accounts data
 * @param {Array} epfAccounts - Array of EPF account objects
 * @returns {string} CSV string
 */
const generateEPFAccountsCSV = (epfAccounts) => {
  const headers = [
    { key: 'employerName', label: 'Employer Name', type: 'string' },
    { key: 'pfNumber', label: 'PF Number', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'totalBalance', label: 'Total Balance (₹)', type: 'currency' },
    { key: 'employeeContribution', label: 'Employee Contribution (₹)', type: 'currency' },
    { key: 'employerContribution', label: 'Employer Contribution (₹)', type: 'currency' },
    { key: 'pensionFund', label: 'Pension Fund (₹)', type: 'currency' },
    { key: 'totalContributions', label: 'Total Contributions (₹)', type: 'currency' },
    { key: 'interestEarned', label: 'Interest Earned (₹)', type: 'currency' },
    { key: 'monthlyContribution', label: 'Monthly Contribution (₹)', type: 'currency' },
    { key: 'contributionRate', label: 'Contribution Rate (%)', type: 'percentage' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'createdAt', label: 'Added On', type: 'date' }
  ]

  const processedData = epfAccounts.map(epf => {
    const totalContributions = epf.employeeContribution + epf.employerContribution
    const interestEarned = epf.totalBalance - totalContributions
    // Assuming 12% contribution rate as standard EPF rate
    const contributionRate = 12
    
    return {
      ...epf,
      totalContributions,
      interestEarned,
      contributionRate
    }
  })

  return arrayToCSV(processedData, headers)
}

/**
 * Generate CSV for stocks data
 * @param {Array} stocks - Array of stock objects
 * @returns {string} CSV string
 */
const generateStocksCSV = (stocks) => {
  const headers = [
    { key: 'companyName', label: 'Company Name', type: 'string' },
    { key: 'symbol', label: 'Symbol', type: 'string' },
    { key: 'sector', label: 'Sector', type: 'string' },
    { key: 'marketCap', label: 'Market Cap', type: 'string' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'buyPrice', label: 'Buy Price (₹)', type: 'currency' },
    { key: 'currentPrice', label: 'Current Price (₹)', type: 'currency' },
    { key: 'investedAmount', label: 'Invested Amount (₹)', type: 'currency' },
    { key: 'currentValue', label: 'Current Value (₹)', type: 'currency' },
    { key: 'pnl', label: 'P&L (₹)', type: 'currency' },
    { key: 'pnlPercentage', label: 'P&L (%)', type: 'percentage' },
    { key: 'createdAt', label: 'Added On', type: 'date' }
  ]

  return arrayToCSV(stocks, headers)
}

/**
 * Generate comprehensive portfolio CSV with all investment types
 * @param {Object} portfolioData - Object containing all investment data
 * @returns {string} CSV string with all portfolio data
 */
const generateCompletePortfolioCSV = (portfolioData) => {
  const headers = [
    { key: 'investmentType', label: 'Investment Type', type: 'string' },
    { key: 'name', label: 'Investment Name', type: 'string' },
    { key: 'category', label: 'Category/Sector', type: 'string' },
    { key: 'investedAmount', label: 'Invested Amount (₹)', type: 'currency' },
    { key: 'currentValue', label: 'Current Value (₹)', type: 'currency' },
    { key: 'returns', label: 'Returns (₹)', type: 'currency' },
    { key: 'returnsPercentage', label: 'Returns (%)', type: 'percentage' },
    { key: 'additionalInfo', label: 'Additional Info', type: 'string' },
    { key: 'createdAt', label: 'Added On', type: 'date' }
  ]

  const allInvestments = []

  // Add mutual funds
  portfolioData.mutualFunds.forEach(fund => {
    const returns = fund.currentValue - fund.investedAmount
    const returnsPercentage = fund.investedAmount > 0 ? (returns / fund.investedAmount) * 100 : 0
    
    allInvestments.push({
      investmentType: 'Mutual Fund',
      name: fund.name,
      category: fund.category,
      investedAmount: fund.investedAmount,
      currentValue: fund.currentValue,
      returns,
      returnsPercentage,
      additionalInfo: `Risk: ${fund.riskLevel}, Rating: ${fund.rating}/5, CAGR: ${fund.cagr}%`,
      createdAt: fund.createdAt
    })
  })

  // Add SIPs
  portfolioData.sips.forEach(sip => {
    const totalInvested = sip.amount * sip.completedInstallments
    
    allInvestments.push({
      investmentType: 'SIP',
      name: sip.fundName,
      category: 'Systematic Investment',
      investedAmount: totalInvested,
      currentValue: totalInvested, // SIPs don't have current value tracking in this model
      returns: 0,
      returnsPercentage: 0,
      additionalInfo: `Amount: ₹${sip.amount}, Frequency: ${sip.frequency}, Status: ${sip.status}`,
      createdAt: sip.createdAt
    })
  })

  // Add fixed deposits
  portfolioData.fixedDeposits.forEach(fd => {
    const returns = fd.currentValue - fd.investedAmount
    const returnsPercentage = fd.investedAmount > 0 ? (returns / fd.investedAmount) * 100 : 0
    
    allInvestments.push({
      investmentType: 'Fixed Deposit',
      name: `${fd.bankName} FD`,
      category: fd.type,
      investedAmount: fd.investedAmount,
      currentValue: fd.currentValue,
      returns,
      returnsPercentage,
      additionalInfo: `Interest: ${fd.interestRate}%, Tenure: ${fd.tenure} months, Maturity: ${formatIndianDate(fd.maturityDate)}`,
      createdAt: fd.createdAt
    })
  })

  // Add EPF accounts
  portfolioData.epfAccounts.forEach(epf => {
    const totalContributions = epf.employeeContribution + epf.employerContribution
    const returns = epf.totalBalance - totalContributions
    const returnsPercentage = totalContributions > 0 ? (returns / totalContributions) * 100 : 0
    
    allInvestments.push({
      investmentType: 'EPF',
      name: `${epf.employerName} EPF`,
      category: epf.status,
      investedAmount: totalContributions,
      currentValue: epf.totalBalance,
      returns,
      returnsPercentage,
      additionalInfo: `PF Number: ${epf.pfNumber}, Monthly: ₹${epf.monthlyContribution}`,
      createdAt: epf.createdAt
    })
  })

  // Add stocks
  portfolioData.stocks.forEach(stock => {
    allInvestments.push({
      investmentType: 'Stock',
      name: stock.companyName,
      category: stock.sector,
      investedAmount: stock.investedAmount,
      currentValue: stock.currentValue,
      returns: stock.pnl,
      returnsPercentage: stock.pnlPercentage,
      additionalInfo: `Symbol: ${stock.symbol}, Quantity: ${stock.quantity}, Market Cap: ${stock.marketCap}`,
      createdAt: stock.createdAt
    })
  })

  // Sort by investment type and then by returns percentage
  allInvestments.sort((a, b) => {
    if (a.investmentType !== b.investmentType) {
      return a.investmentType.localeCompare(b.investmentType)
    }
    return b.returnsPercentage - a.returnsPercentage
  })

  return arrayToCSV(allInvestments, headers)
}

module.exports = {
  arrayToCSV,
  formatValueForCSV,
  generateMutualFundsCSV,
  generateSIPsCSV,
  generateFixedDepositsCSV,
  generateEPFAccountsCSV,
  generateStocksCSV,
  generateCompletePortfolioCSV
}