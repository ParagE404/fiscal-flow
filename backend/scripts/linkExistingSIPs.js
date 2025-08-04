const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Script to link existing SIPs to mutual funds based on fund name matching
 */
async function linkExistingSIPs() {
  try {
    console.log('Starting to link existing SIPs to mutual funds...')

    // Get all SIPs that don't have a mutualFundId
    const unlinkedSIPs = await prisma.sIP.findMany({
      where: {
        mutualFundId: null
      }
    })

    console.log(`Found ${unlinkedSIPs.length} unlinked SIPs`)

    let linkedCount = 0
    let updatedFunds = new Set()

    for (const sip of unlinkedSIPs) {
      // Try to find a matching mutual fund by name (case-insensitive)
      const matchingFund = await prisma.mutualFund.findFirst({
        where: {
          userId: sip.userId,
          name: {
            equals: sip.fundName,
            mode: 'insensitive'
          }
        }
      })

      if (matchingFund) {
        // Link the SIP to the mutual fund
        await prisma.sIP.update({
          where: { id: sip.id },
          data: { mutualFundId: matchingFund.id }
        })

        linkedCount++
        updatedFunds.add(matchingFund.id)
        console.log(`✓ Linked SIP "${sip.fundName}" to mutual fund "${matchingFund.name}"`)
      } else {
        console.log(`⚠ No matching mutual fund found for SIP "${sip.fundName}"`)
      }
    }

    // Update SIP investment amounts for affected mutual funds
    console.log('\nUpdating mutual fund SIP investment amounts...')
    
    for (const fundId of updatedFunds) {
      await updateMutualFundSIPInvestment(fundId)
    }

    console.log(`\n✅ Successfully linked ${linkedCount} SIPs to mutual funds`)
    console.log(`📊 Updated SIP investment amounts for ${updatedFunds.size} mutual funds`)

  } catch (error) {
    console.error('❌ Error linking SIPs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Update mutual fund's SIP investment amount based on linked SIPs
 */
async function updateMutualFundSIPInvestment(mutualFundId) {
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

      console.log(`📊 Updated fund "${mutualFund.name}": SIP investment = ₹${sipInvestment.toLocaleString('en-IN')}`)
    }
  } catch (error) {
    console.error(`Error updating mutual fund ${mutualFundId}:`, error)
  }
}

// Run the script
if (require.main === module) {
  linkExistingSIPs()
}

module.exports = { linkExistingSIPs, updateMutualFundSIPInvestment }