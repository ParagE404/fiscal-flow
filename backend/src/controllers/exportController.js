const { PrismaClient } = require('@prisma/client')
const {
  generateCompletePortfolioCSV,
  generateMutualFundsCSV,
  generateSIPsCSV,
  generateFixedDepositsCSV,
  generateEPFAccountsCSV,
  generateStocksCSV
} = require('../utils/csvExport')

const prisma = new PrismaClient()

/**
 * Export complete portfolio data as CSV
 */
const exportCompletePortfolio = async (req, res) => {
  try {
    console.log('Exporting complete portfolio data...')

    // For now, we'll get the first user since authentication isn't implemented
    // In a real app, this would come from authenticated user
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    // Fetch all investment data
    const [mutualFunds, sips, fixedDeposits, epfAccounts, stocks] = await Promise.all([
      prisma.mutualFund.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sIP.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.fixedDeposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.ePFAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stock.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
    ])

    const portfolioData = {
      mutualFunds,
      sips,
      fixedDeposits,
      epfAccounts,
      stocks
    }

    // Generate CSV
    const csvData = generateCompletePortfolioCSV(portfolioData)

    // Set response headers for CSV download
    const filename = `portfolio_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`Complete portfolio export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting complete portfolio:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export complete portfolio data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Export mutual funds data as CSV
 */
const exportMutualFunds = async (req, res) => {
  try {
    console.log('Exporting mutual funds data...')

    // Get the first user since authentication isn't implemented
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    const mutualFunds = await prisma.mutualFund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const csvData = generateMutualFundsCSV(mutualFunds)

    const filename = `mutual_funds_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`Mutual funds export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting mutual funds:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export mutual funds data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Export SIPs data as CSV
 */
const exportSIPs = async (req, res) => {
  try {
    console.log('Exporting SIPs data...')

    // Get the first user since authentication isn't implemented
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    const sips = await prisma.sIP.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const csvData = generateSIPsCSV(sips)

    const filename = `sips_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`SIPs export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting SIPs:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export SIPs data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Export fixed deposits data as CSV
 */
const exportFixedDeposits = async (req, res) => {
  try {
    console.log('Exporting fixed deposits data...')

    // Get the first user since authentication isn't implemented
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    const fixedDeposits = await prisma.fixedDeposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const csvData = generateFixedDepositsCSV(fixedDeposits)

    const filename = `fixed_deposits_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`Fixed deposits export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting fixed deposits:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export fixed deposits data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Export EPF accounts data as CSV
 */
const exportEPF = async (req, res) => {
  try {
    console.log('Exporting EPF accounts data...')

    // Get the first user since authentication isn't implemented
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    const epfAccounts = await prisma.ePFAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const csvData = generateEPFAccountsCSV(epfAccounts)

    const filename = `epf_accounts_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`EPF accounts export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting EPF accounts:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export EPF accounts data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Export stocks data as CSV
 */
const exportStocks = async (req, res) => {
  try {
    console.log('Exporting stocks data...')

    // Get the first user since authentication isn't implemented
    const user = await prisma.user.findFirst()
    if (!user) {
      return res.status(404).json({
        error: 'No User Found',
        message: 'No user data available for export'
      })
    }
    const userId = user.id

    const stocks = await prisma.stock.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const csvData = generateStocksCSV(stocks)

    const filename = `stocks_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`Stocks export generated: ${filename}`)
    res.send(csvData)

  } catch (error) {
    console.error('Error exporting stocks:', error)
    res.status(500).json({
      error: 'Export Failed',
      message: 'Failed to export stocks data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

module.exports = {
  exportCompletePortfolio,
  exportMutualFunds,
  exportSIPs,
  exportFixedDeposits,
  exportEPF,
  exportStocks
}