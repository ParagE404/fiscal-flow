import React from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { cn } from '@/lib/utils'

// Modern Error State Component with gentle presentation
export const ErrorState = ({
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  type = "error", // error, warning, info, network
  showIcon = true,
  actions = [],
  className,
  children,
  ...props
}) => {
  const getErrorConfig = (type) => {
    const configs = {
      error: {
        icon: AlertTriangle,
        bgColor: "bg-error-50 dark:bg-error-900/20",
        borderColor: "border-error-200 dark:border-error-800/50",
        iconColor: "text-error-500",
        titleColor: "text-error-900 dark:text-error-100",
        messageColor: "text-error-700 dark:text-error-300"
      },
      warning: {
        icon: AlertTriangle,
        bgColor: "bg-warning-50 dark:bg-warning-900/20",
        borderColor: "border-warning-200 dark:border-warning-800/50",
        iconColor: "text-warning-500",
        titleColor: "text-warning-900 dark:text-warning-100",
        messageColor: "text-warning-700 dark:text-warning-300"
      },
      info: {
        icon: AlertTriangle,
        bgColor: "bg-info-50 dark:bg-info-900/20",
        borderColor: "border-info-200 dark:border-info-800/50",
        iconColor: "text-info-500",
        titleColor: "text-info-900 dark:text-info-100",
        messageColor: "text-info-700 dark:text-info-300"
      },
      network: {
        icon: RefreshCw,
        bgColor: "bg-gray-50 dark:bg-gray-900/20",
        borderColor: "border-gray-200 dark:border-gray-800/50",
        iconColor: "text-gray-500",
        titleColor: "text-gray-900 dark:text-gray-100",
        messageColor: "text-gray-700 dark:text-gray-300"
      }
    }
    return configs[type] || configs.error
  }

  const config = getErrorConfig(type)
  const IconComponent = config.icon

  return (
    <Card 
      className={cn(
        "border-2 transition-all duration-300 ease-out",
        config.bgColor,
        config.borderColor,
        "hover:shadow-md",
        className
      )}
      {...props}
    >
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          {showIcon && (
            <div className={cn(
              "p-3 rounded-full transition-all duration-300 ease-out",
              config.bgColor,
              "animate-fade-in"
            )}>
              <IconComponent className={cn("h-8 w-8", config.iconColor)} />
            </div>
          )}
          
          <div className="space-y-2 max-w-md">
            <h3 className={cn(
              "text-h4 font-semibold",
              config.titleColor
            )}>
              {title}
            </h3>
            
            <p className={cn(
              "text-body text-center",
              config.messageColor
            )}>
              {message}
            </p>
          </div>

          {children && (
            <div className="mt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {children}
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || (index === 0 ? "default" : "outline")}
                  size={action.size || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="min-w-[120px]"
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Inline Error Message Component
export const InlineError = ({
  message,
  className,
  showIcon = true,
  variant = "error", // error, warning, info
  ...props
}) => {
  const getVariantConfig = (variant) => {
    const configs = {
      error: {
        icon: AlertTriangle,
        bgColor: "bg-error-50 dark:bg-error-900/20",
        borderColor: "border-error-200 dark:border-error-800/50",
        iconColor: "text-error-500",
        textColor: "text-error-700 dark:text-error-300"
      },
      warning: {
        icon: AlertTriangle,
        bgColor: "bg-warning-50 dark:bg-warning-900/20",
        borderColor: "border-warning-200 dark:border-warning-800/50",
        iconColor: "text-warning-500",
        textColor: "text-warning-700 dark:text-warning-300"
      },
      info: {
        icon: AlertTriangle,
        bgColor: "bg-info-50 dark:bg-info-900/20",
        borderColor: "border-info-200 dark:border-info-800/50",
        iconColor: "text-info-500",
        textColor: "text-info-700 dark:text-info-300"
      }
    }
    return configs[variant] || configs.error
  }

  const config = getVariantConfig(variant)
  const IconComponent = config.icon

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ease-out",
        config.bgColor,
        config.borderColor,
        "animate-fade-in-down",
        className
      )}
      {...props}
    >
      {showIcon && (
        <IconComponent className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
      )}
      <p className={cn("text-sm leading-relaxed", config.textColor)}>
        {message}
      </p>
    </div>
  )
}

// Form Field Error Component
export const FieldError = ({
  message,
  className,
  ...props
}) => {
  if (!message) return null

  return (
    <div 
      className={cn(
        "flex items-center gap-2 mt-2 text-sm text-error-600 dark:text-error-400",
        "animate-fade-in-down",
        className
      )}
      {...props}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// Error Boundary Fallback Component
export const ErrorBoundaryFallback = ({
  error,
  resetError,
  className
}) => {
  return (
    <div className={cn("min-h-[400px] flex items-center justify-center p-8", className)}>
      <ErrorState
        title="Application Error"
        message="Something went wrong in the application. This error has been logged and we're working to fix it."
        type="error"
        actions={[
          {
            label: "Try Again",
            onClick: resetError,
            icon: RefreshCw,
            variant: "default"
          },
          {
            label: "Go Home",
            onClick: () => window.location.href = '/',
            icon: Home,
            variant: "outline"
          }
        ]}
      >
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left max-w-lg">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">
              {error?.stack || error?.message || 'Unknown error'}
            </pre>
          </details>
        )}
      </ErrorState>
    </div>
  )
}

// Network Error Component
export const NetworkError = ({
  onRetry,
  className,
  ...props
}) => {
  return (
    <ErrorState
      title="Connection Problem"
      message="Unable to connect to our servers. Please check your internet connection and try again."
      type="network"
      className={className}
      actions={[
        {
          label: "Retry",
          onClick: onRetry,
          icon: RefreshCw,
          variant: "default"
        }
      ]}
      {...props}
    />
  )
}

// 404 Error Component
export const NotFoundError = ({
  onGoBack,
  onGoHome,
  className,
  ...props
}) => {
  return (
    <ErrorState
      title="Page Not Found"
      message="The page you're looking for doesn't exist or has been moved."
      type="info"
      className={className}
      actions={[
        {
          label: "Go Back",
          onClick: onGoBack || (() => window.history.back()),
          icon: ArrowLeft,
          variant: "outline"
        },
        {
          label: "Go Home",
          onClick: onGoHome || (() => window.location.href = '/'),
          icon: Home,
          variant: "default"
        }
      ]}
      {...props}
    />
  )
}

// Empty State Component (for when there's no data)
export const EmptyState = ({
  title = "No data available",
  message = "There's nothing to show here yet.",
  icon: IconComponent,
  actions = [],
  className,
  children,
  ...props
}) => {
  return (
    <Card className={cn("border-dashed border-2 border-gray-200 dark:border-gray-700", className)} {...props}>
      <CardContent className="p-12 text-center">
        <div className="flex flex-col items-center space-y-4">
          {IconComponent && (
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
              <IconComponent className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          <div className="space-y-2 max-w-md">
            <h3 className="text-h4 font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            
            <p className="text-body text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>

          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  size={action.size || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}