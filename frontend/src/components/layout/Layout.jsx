import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { EmailVerificationBanner } from '../common/EmailVerificationBanner'
import { AnimatedPageTransition } from '../common/PageTransition'
import { useSession } from '../../hooks/useSession'
import { useSmoothScroll, useScrollReveal } from '../../hooks/useSmoothScroll'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  
  // Initialize session management
  useSession()
  
  // Initialize smooth scroll and reveal animations
  useSmoothScroll()
  useScrollReveal()
  
  const currentPage = pageTitles[location.pathname] || { 
    title: 'FiscalFlow', 
    subtitle: 'Personal Finance Dashboard' 
  }

  const toggleSidebar = () => {
    // Only allow toggling on mobile/tablet (< 1024px)
    if (window.innerWidth < 1024) {
      setSidebarOpen(!sidebarOpen)
    }
  }

  return (
    <div className="min-h-screen bg-background smooth-scroll flex overflow-x-hidden">
      {/* Skip to main content link */}
      {/* <a 
        href="#main-content" 
        className="skip-link sr-only-focusable"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        Skip to main content
      </a> */}
      
      {/* Sidebar Navigation */}
      <nav 
        role="navigation" 
        aria-label="Main navigation"
        className="lg:block flex-shrink-0"
      >
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      </nav>
      
      {/* Main content */}
      <div className="flex-1 min-h-screen flex flex-col min-w-0">
        {/* Email verification banner */}
        <div role="banner" aria-live="polite">
          <EmailVerificationBanner />
        </div>
        
        {/* Header */}
        <header role="banner">
          <Header 
            onMenuToggle={toggleSidebar}
            title={currentPage.title}
            subtitle={currentPage.subtitle}
          />
        </header>
        
        {/* Page content with mobile-first responsive padding */}
        <main 
          id="main-content"
          role="main"
          className="flex-1 mobile-padding overflow-x-hidden"
          tabIndex="-1"
          aria-label={`${currentPage.title} - ${currentPage.subtitle}`}
        >
          <AnimatedPageTransition>
            <Outlet />
          </AnimatedPageTransition>
        </main>
      </div>
      
      {/* Live region for announcements */}
      <div 
        id="announcements" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      ></div>
    </div>
  )
}