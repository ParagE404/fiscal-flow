import { useEffect, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import { toast } from 'sonner'

/**
 * Custom hook for session management
 * Handles automatic logout on token expiry and session warnings
 */
export const useSession = () => {
  const { 
    isAuthenticated, 
    user, 
    logout, 
    refreshToken,
    isAuthReady 
  } = useUser()

  // Handle session expiry warning
  const handleSessionWarning = useCallback(() => {
    if (!isAuthenticated) return

    toast.warning('Your session will expire soon', {
      description: 'Please save your work. You will be logged out automatically.',
      duration: 10000,
    })
  }, [isAuthenticated])

  // Handle automatic logout on session expiry
  const handleSessionExpiry = useCallback(async () => {
    if (!isAuthenticated) return

    toast.error('Session expired', {
      description: 'You have been logged out due to inactivity.',
      duration: 5000,
    })

    await logout()
  }, [isAuthenticated, logout])

  // Monitor user activity for session management
  useEffect(() => {
    if (!isAuthenticated || !isAuthReady) return

    let warningTimer
    let logoutTimer
    let lastActivity = Date.now()

    // Session timeout settings (in milliseconds)
    const SESSION_WARNING_TIME = 25 * 60 * 1000 // 25 minutes
    const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

    const resetTimers = () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      
      lastActivity = Date.now()
      
      // Set warning timer
      warningTimer = setTimeout(handleSessionWarning, SESSION_WARNING_TIME)
      
      // Set logout timer
      logoutTimer = setTimeout(handleSessionExpiry, SESSION_TIMEOUT)
    }

    // Activity events to monitor
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Throttled activity handler to avoid excessive timer resets
    let throttleTimer
    const handleActivity = () => {
      if (throttleTimer) return
      
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        const now = Date.now()
        
        // Only reset if significant time has passed since last activity
        if (now - lastActivity > 60000) { // 1 minute
          resetTimers()
        }
      }, 1000)
    }

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Initialize timers
    resetTimers()

    // Cleanup
    return () => {
      clearTimeout(warningTimer)
      clearTimeout(logoutTimer)
      clearTimeout(throttleTimer)
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [isAuthenticated, isAuthReady, handleSessionWarning, handleSessionExpiry])

  // Extend session manually
  const extendSession = useCallback(async () => {
    try {
      await refreshToken()
      toast.success('Session extended successfully')
    } catch (error) {
      console.error('Failed to extend session:', error)
      toast.error('Failed to extend session')
    }
  }, [refreshToken])

  return {
    isAuthenticated,
    user,
    extendSession,
    logout
  }
}

/**
 * Hook for checking if user has required permissions
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useUser()

  const hasPermission = useCallback((permission) => {
    if (!isAuthenticated || !user) return false

    // For now, all authenticated users have all permissions
    // This can be extended later with role-based permissions
    switch (permission) {
      case 'view_dashboard':
      case 'manage_investments':
      case 'export_data':
      case 'manage_profile':
        return user.isEmailVerified
      default:
        return false
    }
  }, [isAuthenticated, user])

  const requiresEmailVerification = useCallback((permission) => {
    const emailRequiredPermissions = [
      'view_dashboard',
      'manage_investments',
      'export_data'
    ]
    return emailRequiredPermissions.includes(permission)
  }, [])

  return {
    hasPermission,
    requiresEmailVerification,
    isEmailVerified: user?.isEmailVerified || false
  }
}