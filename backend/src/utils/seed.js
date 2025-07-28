const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  console.log('👤 Created user:', user.name)

  // Create sample mutual funds
  const mutualFunds = await Promise.all([
    prisma.mutualFund.create({
      data: {
        userId: user.id,
        name: 'HDFC Top 100 Fund',
        category: 'Large Cap',
        riskLevel: 'Moderate',
        rating: 4,
        investedAmount: 50000,
        currentValue: 55000,
        cagr: 12.5,
      },
    }),
    prisma.mutualFund.create({
      data: {
        userId: user.id,
        name: 'Axis Midcap Fund',
        category: 'Mid Cap',
        riskLevel: 'High',
        rating: 3,
        investedAmount: 30000,
        currentValue: 32000,
        cagr: 15.2,
      },
    }),
  ])

  console.log('💰 Created mutual funds:', mutualFunds.length)

  // Create sample fixed deposits
  const fixedDeposits = await Promise.all([
    prisma.fixedDeposit.create({
      data: {
        userId: user.id,
        bankName: 'HDFC Bank',
        interestRate: 6.5,
        type: 'Cumulative',
        investedAmount: 100000,
        currentValue: 106500,
        maturityAmount: 113000,
        startDate: new Date('2024-01-01'),
        maturityDate: new Date('2025-01-01'),
        tenure: 12,
      },
    }),
    prisma.fixedDeposit.create({
      data: {
        userId: user.id,
        bankName: 'SBI',
        interestRate: 6.0,
        type: 'Simple',
        investedAmount: 75000,
        currentValue: 78000,
        maturityAmount: 84000,
        startDate: new Date('2024-03-01'),
        maturityDate: new Date('2026-03-01'),
        tenure: 24,
      },
    }),
  ])

  console.log('🏦 Created fixed deposits:', fixedDeposits.length)  
// Create sample EPF accounts
  const epfAccounts = await Promise.all([
    prisma.ePFAccount.create({
      data: {
        userId: user.id,
        employerName: 'Tech Corp Ltd',
        pfNumber: 'MH/12345/67890',
        status: 'Active',
        totalBalance: 250000,
        employeeContribution: 125000,
        employerContribution: 100000,
        pensionFund: 25000,
        monthlyContribution: 5000,
        startDate: new Date('2022-01-01'),
      },
    }),
    prisma.ePFAccount.create({
      data: {
        userId: user.id,
        employerName: 'Previous Company',
        pfNumber: 'DL/98765/43210',
        status: 'Transferred',
        totalBalance: 150000,
        employeeContribution: 75000,
        employerContribution: 60000,
        pensionFund: 15000,
        monthlyContribution: 0,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2021-12-31'),
      },
    }),
  ])

  console.log('🏢 Created EPF accounts:', epfAccounts.length)

  // Create sample stocks
  const stocks = await Promise.all([
    prisma.stock.create({
      data: {
        userId: user.id,
        symbol: 'RELIANCE',
        companyName: 'Reliance Industries Ltd',
        sector: 'Energy',
        marketCap: 'Large Cap',
        quantity: 50,
        buyPrice: 2400,
        currentPrice: 2500,
        investedAmount: 120000,
        currentValue: 125000,
        pnl: 5000,
        pnlPercentage: 4.17,
      },
    }),
    prisma.stock.create({
      data: {
        userId: user.id,
        symbol: 'TCS',
        companyName: 'Tata Consultancy Services',
        sector: 'IT Services',
        marketCap: 'Large Cap',
        quantity: 25,
        buyPrice: 3200,
        currentPrice: 3400,
        investedAmount: 80000,
        currentValue: 85000,
        pnl: 5000,
        pnlPercentage: 6.25,
      },
    }),
  ])

  console.log('📈 Created stocks:', stocks.length)

  // Create sample SIPs
  const sips = await Promise.all([
    prisma.sIP.create({
      data: {
        userId: user.id,
        fundName: 'HDFC Top 100 Fund',
        amount: 5000,
        frequency: 'Monthly',
        nextDueDate: new Date('2024-02-01'),
        totalInstallments: 120,
        completedInstallments: 12,
        status: 'Active',
      },
    }),
    prisma.sIP.create({
      data: {
        userId: user.id,
        fundName: 'Axis Midcap Fund',
        amount: 3000,
        frequency: 'Monthly',
        nextDueDate: new Date('2024-02-15'),
        totalInstallments: 60,
        completedInstallments: 6,
        status: 'Active',
      },
    }),
  ])

  console.log('🔄 Created SIPs:', sips.length)

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })