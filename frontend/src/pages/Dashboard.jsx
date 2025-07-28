import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCard } from '@/components/common/SummaryCard'
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart'
import { TopPerformers } from '@/components/dashboard/TopPerformers'
import { usePortfolioStore } from '@/stores/StoreContext'
import { formatPercentage } from '@/lib/utils'

export const Dashboard = observer(() => {
  const portfolioStore = usePortfolioStore()

  useEffect(() => {
    // Fetch dashboard data when component mounts
    portfolioStore.fetchDashboardData()
  }, [portfolioStore])

  const summaryData = [
    { 
      title: 'Total Portfolio Value', 
      value: portfolioStore.totalPortfolioValue,
      change: formatPercentage(portfolioStore.totalReturnsPercentage, true)
    },
    { 
      title: 'Total Invested', 
      value: portfolioStore.totalInvested,
      change: '+0.00%' // Base investment doesn't change
    },
    { 
      title: 'Monthly Growth', 
      value: portfolioStore.monthlyGrowth.value,
      change: formatPercentage(portfolioStore.monthlyGrowth.percentage, true)
    },
    { 
      title: 'Total Returns', 
      value: portfolioStore.totalReturns,
      change: formatPercentage(portfolioStore.totalReturnsPercentage, true)
    },
  ]



  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
        <h2 className="text-xl font-semibold text-primary-900 mb-2">
          Welcome back! 👋
        </h2>
        <p className="text-primary-700">
          Here's an overview of your investment portfolio performance.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryData.map((item, index) => (
          <SummaryCard
            key={index}
            title={item.title}
            value={item.value}
            change={item.change}
            loading={portfolioStore.loading.dashboard}
            error={portfolioStore.error.dashboard}
          />
        ))}
      </div>

      {/* Asset allocation and top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetAllocationChart 
              assetAllocation={portfolioStore.assetAllocation}
              loading={portfolioStore.loading.dashboard}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPerformers 
              topPerformers={portfolioStore.topPerformers}
              loading={portfolioStore.loading.dashboard}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
})