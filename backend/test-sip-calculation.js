// Comprehensive test for mutual fund and SIP calculation logic

console.log('=== COMPREHENSIVE MUTUAL FUND + SIP CALCULATION TEST ===\n')

// Test scenario: A mutual fund with both lump sum and SIP investments
const testScenario = {
  mutualFund: {
    id: 'fund-1',
    name: 'Test Equity Fund',
    investedAmount: 100000,  // Lump sum investment
    currentValue: 120000,    // Lump sum current value (20% growth)
    sipInvestment: 0,        // Will be calculated
    totalInvestment: 0,      // Will be calculated
  },
  sips: [
    {
      id: 'sip-1',
      amount: 5000,
      completedInstallments: 10,  // ₹50,000 invested via SIP
      totalInstallments: 12
    },
    {
      id: 'sip-2', 
      amount: 3000,
      completedInstallments: 6,   // ₹18,000 invested via SIP
      totalInstallments: 24
    }
  ]
}

// Function to calculate comprehensive mutual fund current value
const calculateMutualFundTotalCurrentValue = (mutualFund, sips) => {
  // Calculate total SIP investment
  const totalSIPInvestment = sips.reduce((total, sip) => {
    return total + (sip.completedInstallments * sip.amount)
  }, 0)

  // Calculate growth rate from lump sum performance
  let growthRate = 1 // Default to no growth
  if (mutualFund.investedAmount > 0) {
    growthRate = mutualFund.currentValue / mutualFund.investedAmount
  }

  // Apply same growth rate to SIP investments
  const sipCurrentValue = totalSIPInvestment * growthRate

  // Calculate total current value
  const totalCurrentValue = mutualFund.currentValue + sipCurrentValue
  const totalInvestment = mutualFund.investedAmount + totalSIPInvestment

  return {
    lumpSumInvested: mutualFund.investedAmount,
    lumpSumCurrentValue: mutualFund.currentValue,
    sipInvestment: totalSIPInvestment,
    sipCurrentValue,
    totalInvestment,
    totalCurrentValue,
    growthRate,
    totalReturns: totalCurrentValue - totalInvestment,
    totalReturnsPercentage: totalInvestment > 0 ? ((totalCurrentValue - totalInvestment) / totalInvestment) * 100 : 0
  }
}

// Function to calculate individual SIP current value
const calculateSIPCurrentValue = (sip, growthRate) => {
  const investedAmount = sip.completedInstallments * sip.amount
  const currentValue = investedAmount * growthRate
  const returns = currentValue - investedAmount
  const returnsPercentage = investedAmount > 0 ? (returns / investedAmount) * 100 : 0

  return {
    sipId: sip.id,
    investedAmount,
    currentValue,
    returns,
    returnsPercentage
  }
}

// Run the test
console.log('📊 TEST SCENARIO:')
console.log('Mutual Fund:', testScenario.mutualFund.name)
console.log('Lump Sum Investment: ₹', testScenario.mutualFund.investedAmount.toLocaleString())
console.log('Lump Sum Current Value: ₹', testScenario.mutualFund.currentValue.toLocaleString())
console.log('Number of SIPs:', testScenario.sips.length)
console.log()

// Calculate comprehensive mutual fund values
const fundCalculations = calculateMutualFundTotalCurrentValue(testScenario.mutualFund, testScenario.sips)

console.log('🔢 MUTUAL FUND CALCULATIONS:')
console.log('Growth Rate:', (fundCalculations.growthRate * 100).toFixed(1) + '%')
console.log('Lump Sum Invested: ₹', fundCalculations.lumpSumInvested.toLocaleString())
console.log('Lump Sum Current Value: ₹', fundCalculations.lumpSumCurrentValue.toLocaleString())
console.log('Total SIP Investment: ₹', fundCalculations.sipInvestment.toLocaleString())
console.log('SIP Current Value: ₹', fundCalculations.sipCurrentValue.toLocaleString())
console.log('Total Investment: ₹', fundCalculations.totalInvestment.toLocaleString())
console.log('Total Current Value: ₹', fundCalculations.totalCurrentValue.toLocaleString())
console.log('Total Returns: ₹', fundCalculations.totalReturns.toLocaleString())
console.log('Total Returns %:', fundCalculations.totalReturnsPercentage.toFixed(2) + '%')
console.log()

// Calculate individual SIP values
console.log('💰 INDIVIDUAL SIP CALCULATIONS:')
testScenario.sips.forEach((sip, index) => {
  const sipCalc = calculateSIPCurrentValue(sip, fundCalculations.growthRate)
  console.log(`SIP ${index + 1} (${sip.id}):`)
  console.log('  Amount per installment: ₹', sip.amount.toLocaleString())
  console.log('  Completed installments:', sip.completedInstallments)
  console.log('  Invested Amount: ₹', sipCalc.investedAmount.toLocaleString())
  console.log('  Current Value: ₹', sipCalc.currentValue.toLocaleString())
  console.log('  Returns: ₹', sipCalc.returns.toLocaleString(), `(${sipCalc.returnsPercentage.toFixed(2)}%)`)
  console.log()
})

// Verification
console.log('✅ VERIFICATION:')
const expectedSIPInvestment = (10 * 5000) + (6 * 3000) // 50000 + 18000 = 68000
const expectedSIPCurrentValue = expectedSIPInvestment * 1.2 // 68000 * 1.2 = 81600
const expectedTotalCurrentValue = 120000 + expectedSIPCurrentValue // 120000 + 81600 = 201600
const expectedTotalInvestment = 100000 + expectedSIPInvestment // 100000 + 68000 = 168000
const expectedTotalReturns = expectedTotalCurrentValue - expectedTotalInvestment // 201600 - 168000 = 33600

console.log('Expected SIP Investment: ₹', expectedSIPInvestment.toLocaleString(), '| Actual: ₹', fundCalculations.sipInvestment.toLocaleString())
console.log('Expected SIP Current Value: ₹', expectedSIPCurrentValue.toLocaleString(), '| Actual: ₹', fundCalculations.sipCurrentValue.toLocaleString())
console.log('Expected Total Current Value: ₹', expectedTotalCurrentValue.toLocaleString(), '| Actual: ₹', fundCalculations.totalCurrentValue.toLocaleString())
console.log('Expected Total Investment: ₹', expectedTotalInvestment.toLocaleString(), '| Actual: ₹', fundCalculations.totalInvestment.toLocaleString())
console.log('Expected Total Returns: ₹', expectedTotalReturns.toLocaleString(), '| Actual: ₹', fundCalculations.totalReturns.toLocaleString())

const allMatch = 
  fundCalculations.sipInvestment === expectedSIPInvestment &&
  Math.abs(fundCalculations.sipCurrentValue - expectedSIPCurrentValue) < 0.01 &&
  Math.abs(fundCalculations.totalCurrentValue - expectedTotalCurrentValue) < 0.01 &&
  fundCalculations.totalInvestment === expectedTotalInvestment &&
  Math.abs(fundCalculations.totalReturns - expectedTotalReturns) < 0.01

console.log('\n🎯 TEST RESULT:', allMatch ? '✅ PASSED' : '❌ FAILED')

if (allMatch) {
  console.log('\n🎉 All calculations are correct!')
  console.log('The mutual fund now properly shows the combined current value of both lump sum and SIP investments.')
} else {
  console.log('\n❌ Some calculations are incorrect. Please check the implementation.')
}