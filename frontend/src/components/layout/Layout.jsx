import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

// Page titles mapping
const pageTitles = {
  '/': { title: 'Dashboard', subtitle: 'Portfolio overview and performance' },
  '/mutual-funds': { title: 'Mutual Funds', subtitle: 'Track your mutual fund investments and SIPs' },
  '/fixed-deposits': { title: 'Fixed Deposits', subtitle: 'Monitor your FD investments and maturity dates' },
  '/epf': { title: 'EPF Accounts', subtitle: 'Employee Provident Fund contributions and balance' },
  '/stocks': { title: 'Stock Portfolio', subtitle: 'Equity investments and P&L tracking' },
  '/settings': { title: 'Settings', subtitle: 'App preferences and data export options' },
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  
  const currentPage = pageTitles[location.pathname] || { 
    title: 'FiscalFlow', 
    subtitle: 'Personal Finance Dashboard' 
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <Header 
          onMenuToggle={toggleSidebar}
          title={currentPage.title}
          subtitle={currentPage.subtitle}
        />
        
        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}