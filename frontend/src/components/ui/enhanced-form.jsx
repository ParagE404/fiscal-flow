import * as React from "react"
import { Controller, useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"
import { EnhancedInput, EnhancedPasswordInput, EnhancedTextarea } from "./enhanced-input"

// Enhanced Form Field that integrates with react-hook-form
const EnhancedFormField = ({ 
  name, 
  label, 
  type = "text",
  placeholder,
  helperText,
  required = false,
  disabled = false,
  className,
  component = "input",
  validate,
  ...props 
}) => {
  const { control, formState: { errors, touchedFields }, watch } = useFormContext()
  const fieldValue = watch(name)
  const error = errors[name]?.message
  const isTouched = touchedFields[name]
  
  // Real-time validation for enhanced feedback
  const [validationState, setValidationState] = React.useState(null)
  
  React.useEffect(() => {
    if (validate && fieldValue && isTouched) {
      const result = validate(fieldValue)
      if (result === true) {
        setValidationState('success')
      } else if (typeof result === 'string') {
        setValidationState('error')
      } else {
        setValidationState(null)
      }
    } else if (!fieldValue || !isTouched) {
      setValidationState(null)
    }
  }, [fieldValue, validate, isTouched])

  const getComponent = () => {
    switch (component) {
      case 'password':
        return EnhancedPasswordInput
      case 'textarea':
        return EnhancedTextarea
      default:
        return EnhancedInput
    }
  }

  const Component = getComponent()

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Component
          {...field}
          type={type}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          required={required}
          disabled={disabled}
          error={fieldState.error?.message}
          success={validationState === 'success' && !fieldState.error ? 'Looks good!' : null}
          className={className}
          {...props}
        />
      )}
    />
  )
}

// Enhanced Form Group for related fields
const EnhancedFormGroup = ({ 
  children, 
  title, 
  description, 
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        "space-y-6 p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:border-border hover:bg-card/80 hover:shadow-sm",
        className
      )}
      {...props}
    >
      {title && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

// Enhanced Form Section with visual separation
const EnhancedFormSection = ({ 
  children, 
  title, 
  subtitle,
  icon: Icon,
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        "space-y-6",
        className
      )}
      {...props}
    >
      {title && (
        <div className="flex items-center space-x-3 pb-4 border-b border-border/50">
          {Icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

// Enhanced Form Layout with responsive grid
const EnhancedFormLayout = ({ 
  children, 
  columns = 1,
  className,
  ...props 
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  }

  return (
    <div 
      className={cn(
        "grid gap-6",
        gridCols[columns] || gridCols[1],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Validation helpers for common patterns
export const validationHelpers = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) || "Please enter a valid email address"
  },
  
  password: (value) => {
    if (value.length < 8) return "Password must be at least 8 characters"
    if (!/(?=.*[a-z])/.test(value)) return "Password must contain at least one lowercase letter"
    if (!/(?=.*[A-Z])/.test(value)) return "Password must contain at least one uppercase letter"
    if (!/(?=.*\d)/.test(value)) return "Password must contain at least one number"
    return true
  },
  
  phone: (value) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(value.replace(/\s/g, '')) || "Please enter a valid phone number"
  },
  
  required: (value) => {
    return (value && value.trim().length > 0) || "This field is required"
  },
  
  minLength: (min) => (value) => {
    return value.length >= min || `Must be at least ${min} characters`
  },
  
  maxLength: (max) => (value) => {
    return value.length <= max || `Must be no more than ${max} characters`
  },
  
  numeric: (value) => {
    return !isNaN(value) || "Please enter a valid number"
  },
  
  positiveNumber: (value) => {
    return (parseFloat(value) > 0) || "Please enter a positive number"
  }
}

export { 
  EnhancedFormField, 
  EnhancedFormGroup, 
  EnhancedFormSection, 
  EnhancedFormLayout 
}