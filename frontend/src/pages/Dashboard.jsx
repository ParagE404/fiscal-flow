import React, { useEffect, Suspense, lazy } from "react";
import { observer } from "mobx-react-lite";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/common/SummaryCard";
import {
  FadeInAnimation,
  StaggeredAnimation,
  ScrollRevealAnimation,
} from "@/components/common/EntranceAnimations";
import {
  LoadingOverlay,
  StaggeredLoadingCards,
} from "@/components/common/LoadingState";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePortfolioStore } from "@/stores/StoreContext";
import { formatPercentage } from "@/lib/utils";

// Lazy load heavy components for better performance
const AssetAllocationChart = lazy(() => 
  import("@/components/dashboard/AssetAllocationChart").then(module => ({
    default: module.AssetAllocationChart
  }))
);

const TopPerformers = lazy(() => 
  import("@/components/dashboard/TopPerformers").then(module => ({
    default: module.TopPerformers
  }))
);

export const Dashboard = observer(() => {
  const portfolioStore = usePortfolioStore();

  useEffect(() => {
    // Fetch dashboard data when component mounts
    portfolioStore.fetchDashboardData();
  }, [portfolioStore]);

  const summaryData = [
    {
      title: "Total Portfolio Value",
      value: portfolioStore.totalPortfolioValue,
      change: formatPercentage(portfolioStore.totalReturnsPercentage, true),
    },
    {
      title: "Total Invested",
      value: portfolioStore.totalInvested,
      change: "+0.00%", // Base investment doesn't change
    },
    {
      title: "Monthly Growth",
      value: portfolioStore.monthlyGrowth.value,
      change: formatPercentage(portfolioStore.monthlyGrowth.percentage, true),
    },
    {
      title: "Total Returns",
      value: portfolioStore.totalReturns,
      change: formatPercentage(portfolioStore.totalReturnsPercentage, true),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 lg:space-y-8">
      {/* Welcome message with entrance animation */}
      <FadeInAnimation delay={0}>
        <div className="bg-gradient-to-r from-primary-blue-50 to-primary-blue-100 rounded-2xl p-4 sm:p-6 lg:p-8 border border-primary-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
          <h2 className="text-h3 font-semibold text-primary-blue-900 mb-3">
            Welcome back! 👋
          </h2>
          <p className="text-body text-primary-blue-700 leading-relaxed">
            Here's an overview of your investment portfolio performance.
          </p>
        </div>
      </FadeInAnimation>

      {/* Summary cards with enhanced spacing and staggered animation */}
      <LoadingOverlay
        isLoading={portfolioStore.loading.dashboard}
        skeleton={<StaggeredLoadingCards count={4} />}
      >
        <div
          data-tour="summary-cards"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {/* <StaggeredAnimation staggerDelay={100} initialDelay={200}> */}
            {summaryData.map((item, index) => (
              <SummaryCard
                key={index}
                title={item.title}
                value={item.value}
                change={item.change}
                loading={false} // Handled by LoadingOverlay
                error={portfolioStore.error.dashboard}
              />
            ))}
          {/* </StaggeredAnimation> */}
        </div>
      </LoadingOverlay>

      {/* Enhanced asset allocation and top performers with improved hierarchy */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        <ScrollRevealAnimation animation="fadeLeft">
          <Card data-tour="asset-allocation" className="modern-card h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-h4 font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-primary-blue-500 to-primary-blue-600 rounded-full"></div>
                Asset Allocation
              </CardTitle>
              <p className="text-body-sm text-muted-foreground mt-1">
                Distribution of your investment portfolio
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Suspense fallback={<LoadingSpinner />}>
                <AssetAllocationChart
                  assetAllocation={portfolioStore.assetAllocation}
                  loading={portfolioStore.loading.dashboard}
                />
              </Suspense>
            </CardContent>
          </Card>
        </ScrollRevealAnimation>

        <ScrollRevealAnimation animation="fadeRight">
          <Card data-tour="top-performers" className="modern-card h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-h4 font-semibold text-foreground flex items-center gap-2">
                <div className="w-2 h-8 bg-gradient-to-b from-primary-green-500 to-primary-green-600 rounded-full"></div>
                Top Performers
              </CardTitle>
              <p className="text-body-sm text-muted-foreground mt-1">
                Your best performing investments
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Suspense fallback={<LoadingSpinner />}>
                <TopPerformers
                  topPerformers={portfolioStore.topPerformers}
                  loading={portfolioStore.loading.dashboard}
                />
              </Suspense>
            </CardContent>
          </Card>
        </ScrollRevealAnimation>
      </div>
    </div>
  );
});
