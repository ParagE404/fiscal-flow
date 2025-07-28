import React from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const ASSET_COLORS = {
  mutualFunds: '#3b82f6', // blue-500
  stocks: '#10b981', // emerald-500
  fixedDeposits: '#f59e0b', // amber-500
  epf: '#8b5cf6', // violet-500
}

const ASSET_LABELS = {
  mutualFunds: 'Mutual Funds',
  stocks: 'Stocks',
  fixedDeposits: 'Fixed Deposits',
  epf: 'EPF',
}

export const AssetAllocationChart = ({ assetAllocation, loading = false }) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/5"></div>
        </div>
      </div>
    )
  }

  // Convert asset allocation data to chart format
  const chartData = Object.entries(assetAllocation)
    .filter(([_, data]) => data.value > 0)
    .map(([key, data]) => ({
      name: ASSET_LABELS[key],
      value: data.value,
      percentage: data.percentage,
      color: ASSET_COLORS[key],
    }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No investments found</div>
          <div className="text-sm">Add some investments to see allocation</div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Value: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis 
            type="number" 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Bar 
            dataKey="percentage" 
            radius={[0, 4, 4, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <Legend content={<CustomLegend />} />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Detailed breakdown */}
      <div className="mt-4 space-y-3">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}