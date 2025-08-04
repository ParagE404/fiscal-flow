import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  TrendingUp, 
  Landmark, 
  Shield, 
  BarChart3, 
  Settings,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Mutual Funds',
    href: '/mutual-funds',
    icon: TrendingUp,
  },
  {
    name: 'Fixed Deposits',
    href: '/fixed-deposits',
    icon: Landmark,
  },
  {
    name: 'EPF',
    href: '/epf',
    icon: Shield,
  },
  {
    name: 'Stocks',
    href: '/stocks',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar({ isOpen, onToggle }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div 
        data-tour="sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 transform bg-card border-r border-border transition-transform duration-300 ease-in-out flex flex-col",
          // Desktop: always visible and static
          "lg:translate-x-0 lg:static lg:z-0 lg:transition-none",
          // Mobile/Tablet: slide in/out based on isOpen state
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">FiscalFlow</span>
          </div>
          
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                data-tour={item.name === 'Settings' ? 'settings-nav' : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent"
                  )
                }
                onClick={() => {
                  // Close mobile sidebar when navigating
                  if (window.innerWidth < 1024) {
                    onToggle()
                  }
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="text-xs text-muted-foreground text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>Live prices</span>
            </div>
            <p>Personal Finance Dashboard</p>
          </div>
        </div>
      </div>
    </>
  )
}