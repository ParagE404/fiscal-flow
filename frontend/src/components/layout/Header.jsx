import React from 'react'
import { observer } from 'mobx-react-lite'
import { Menu, Bell, User, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/StoreContext'

export const Header = observer(({ onMenuToggle, title, subtitle }) => {
  const authStore = useAuthStore()
  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Page title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Live data indicator */}
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live data</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

          {/* User profile with verification status */}
          <div className="flex items-center space-x-2">
            {authStore.isAuthenticated && (
              <div className="hidden sm:flex items-center space-x-2">
                {authStore.isEmailVerified ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">Unverified</span>
                  </div>
                )}
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="relative">
              <User className="w-5 h-5" />
              {authStore.needsEmailVerification && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
})