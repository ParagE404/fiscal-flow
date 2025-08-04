import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Legend, PieChart, Pie, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const ASSET_COLORS = {
  mutualFunds: '#2563eb', // Enhanced blue
  stocks: '#10b981', // Enhanced emerald
  fixedDeposits: '#f59e0b', // Enhanced amber
  epf: '#8b5cf6', // Enhanced violet
}

const ASSET_GRADIENTS = {
  mutualFunds: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  stocks: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
  fixedDeposits: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  epf: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
}

const ASSET_LABELS = {
  mutualFunds: 'Mutual Funds',
  stocks: 'Stocks',
  fixedDeposits: 'Fixed Deposits',
  epf: 'EPF',
}

const ASSET_ICONS = {
  mutualFunds: '📈',
  stocks: '📊',
  fixedDeposits: '🏦',
  epf: '🏛️',
}

export const AssetAllocationChart = ({ assetAllocation, loading = false }) => {
  const [animationComplete, setAnimationComplete] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="chart-container h-80">
        <div className="chart-loading">
          <div className="chart-loading-spinner"></div>
        </div>
        <div className="animate-pulse space-y-4 w-full p-4">
          <div className="h-6 bg-gray-200 rounded w-3/4 shimmer"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 shimmer"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 shimmer"></div>
          <div className="h-4 bg-gray-200 rounded w-3/5 shimmer"></div>
        </div>
      </div>
    )
  }

  // Convert asset allocation data to chart format
  const chartData = Object.entries(assetAllocation)
    .filter(([_, data]) => data.value > 0)
    .map(([key, data], index) => ({
      name: ASSET_LABELS[key],
      value: data.value,
      percentage: data.percentage,
      color: ASSET_COLORS[key],
      icon: ASSET_ICONS[key],
      key: key,
      index: index,
    }))

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-50">📊</div>
          <div className="text-lg font-medium">No investments found</div>
          <div className="text-sm">Add some investments to see allocation</div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="custom-tooltip">
          <div className="tooltip-title flex items-center gap-2">
            <span>{data.icon}</span>
            {data.name}
          </div>
          <div className="tooltip-value">
            {formatCurrency(data.value)}
          </div>
          <div className="tooltip-percentage">
            {data.percentage.toFixed(1)}% of portfolio
          </div>
        </div>
      )
    }
    return null
  }

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="custom-tooltip">
          <div className="tooltip-title flex items-center gap-2">
            <span>{data.icon}</span>
            {data.name}
          </div>
          <div className="tooltip-value">
            {formatCurrency(data.value)}
          </div>
          <div className="tooltip-percentage">
            {data.percentage.toFixed(1)}% of portfolio
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }) => {
    return (
      <div className="chart-legend">
        {payload.map((entry, index) => (
          <div 
            key={index} 
            className={`legend-item ${hoveredIndex === index ? 'bg-muted' : ''}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div 
              className="legend-color" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Enhanced Pie Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="percentage"
              animationBegin={0}
              animationDuration={1000}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke={hoveredIndex === index ? entry.color : 'transparent'}
                  strokeWidth={hoveredIndex === index ? 3 : 0}
                  style={{
                    filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
                    transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                    transformOrigin: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {chartData.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Asset Types
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Asset Breakdown */}
      <div className="asset-breakdown">
        {chartData.map((item, index) => (
          <div 
            key={index} 
            className={`asset-item ${hoveredIndex === index ? 'border-primary-blue-300' : ''}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="asset-item-left">
              <div className="flex items-center gap-2">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-2xl">{item.icon}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {item.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.percentage.toFixed(1)}% of portfolio
                </div>
              </div>
            </div>
            <div className="asset-item-right">
              <div className="asset-value text-foreground">
                {formatCurrency(item.value)}
              </div>
              <div className="asset-percentage">
                {((item.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Legend */}
      <CustomLegend payload={chartData.map(item => ({ 
        value: item.name, 
        color: item.color 
      }))} />
    </div>
  )
}