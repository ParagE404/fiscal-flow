import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const EnhancedInput = React.forwardRef(({ 
  className, 
  type = "text", 
  label,
  placeholder,
  error,
  success,
  helperText,
  disabled,
  required,
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(false)
  const inputRef = React.useRef(null)

  // Combine refs
  React.useImperativeHandle(ref, () => inputRef.current)

  // Check if input has value
  React.useEffect(() => {
    const input = inputRef.current
    if (input) {
      setHasValue(input.value.length > 0)
    }
  }, [props.value, props.defaultValue])

  const handleFocus = (e) => {
    setIsFocused(true)
    props.onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    setHasValue(e.target.value.length > 0)
    props.onBlur?.(e)
  }

  const handleChange = (e) => {
    setHasValue(e.target.value.length > 0)
    props.onChange?.(e)
  }

  const isFloating = isFocused || hasValue
  const hasError = !!error
  const hasSuccess = !!success && !hasError

  return (
    <div className="relative">
      {/* Input Container */}
      <div className="relative">
        <input
          type={type}
          ref={inputRef}
          className={cn(
            // Base styles with mobile-first touch targets
            "flex h-12 sm:h-11 w-full rounded-xl border bg-transparent px-4 pt-6 pb-2 text-base sm:text-sm transition-all duration-300 ease-out touch-target",
            "placeholder:text-transparent focus:placeholder:text-muted-foreground",
            "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            
            // Default state
            "border-input shadow-sm",
            "hover:border-primary/30 hover:shadow-md",
            
            // Focus state with glow
            "focus:border-primary focus:shadow-lg focus:shadow-primary/20",
            "focus:ring-1 focus:ring-primary/20",
            
            // Error state
            hasError && [
              "border-destructive/60 bg-destructive/5",
              "focus:border-destructive focus:shadow-destructive/20",
              "focus:ring-destructive/20"
            ],
            
            // Success state
            hasSuccess && [
              "border-success/60 bg-success/5",
              "focus:border-success focus:shadow-success/20",
              "focus:ring-success/20"
            ],
            
            // Disabled state
            disabled && "bg-muted/50 border-muted",
            
            className
          )}
          placeholder={isFloating ? placeholder : ""}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Floating Label */}
        {label && (
          <Label
            className={cn(
              "absolute left-4 transition-all duration-300 ease-out pointer-events-none",
              "text-muted-foreground font-medium",
              
              // Floating position
              isFloating ? [
                "top-2 text-xs font-semibold",
                isFocused && "text-primary",
                hasError && "text-destructive",
                hasSuccess && "text-success"
              ] : [
                "top-1/2 -translate-y-1/2 text-base"
              ],
              
              // Required indicator
              required && "after:content-['*'] after:ml-1 after:text-destructive"
            )}
          >
            {label}
          </Label>
        )}

        {/* Focus Ring Enhancement */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl transition-all duration-300 ease-out pointer-events-none",
            "ring-0 ring-primary/0",
            isFocused && !hasError && !disabled && "ring-2 ring-primary/10",
            hasError && isFocused && "ring-2 ring-destructive/10",
            hasSuccess && isFocused && "ring-2 ring-success/10"
          )}
        />
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <div
          className={cn(
            "mt-2 text-sm transition-all duration-200 ease-out",
            hasError ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </div>
      )}

      {/* Success Message */}
      {success && !error && (
        <div className="mt-2 text-sm text-success transition-all duration-200 ease-out">
          {success}
        </div>
      )}
    </div>
  )
})

EnhancedInput.displayName = "EnhancedInput"

// Enhanced Password Input with show/hide toggle
const EnhancedPasswordInput = React.forwardRef(({ 
  className,
  label = "Password",
  showToggle = true,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative">
      <EnhancedInput
        ref={ref}
        type={showPassword ? "text" : "password"}
        label={label}
        className={cn("pr-12", className)}
        {...props}
      />
      
      {showToggle && (
        <button
          type="button"
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 z-10",
            "p-1 rounded-md transition-all duration-200 ease-out",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted/50 focus:bg-muted/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
})

EnhancedPasswordInput.displayName = "EnhancedPasswordInput"

// Enhanced Textarea with floating label
const EnhancedTextarea = React.forwardRef(({ 
  className, 
  label,
  placeholder,
  error,
  success,
  helperText,
  disabled,
  required,
  rows = 4,
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(false)
  const textareaRef = React.useRef(null)

  // Combine refs
  React.useImperativeHandle(ref, () => textareaRef.current)

  // Check if textarea has value
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      setHasValue(textarea.value.length > 0)
    }
  }, [props.value, props.defaultValue])

  const handleFocus = (e) => {
    setIsFocused(true)
    props.onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    setHasValue(e.target.value.length > 0)
    props.onBlur?.(e)
  }

  const handleChange = (e) => {
    setHasValue(e.target.value.length > 0)
    props.onChange?.(e)
  }

  const isFloating = isFocused || hasValue
  const hasError = !!error
  const hasSuccess = !!success && !hasError

  return (
    <div className="relative">
      {/* Textarea Container */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={rows}
          className={cn(
            // Base styles
            "flex w-full rounded-xl border bg-transparent px-4 pt-6 pb-2 text-base transition-all duration-300 ease-out resize-none",
            "placeholder:text-transparent focus:placeholder:text-muted-foreground",
            "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            
            // Default state
            "border-input shadow-sm",
            "hover:border-primary/30 hover:shadow-md",
            
            // Focus state with glow
            "focus:border-primary focus:shadow-lg focus:shadow-primary/20",
            "focus:ring-1 focus:ring-primary/20",
            
            // Error state
            hasError && [
              "border-destructive/60 bg-destructive/5",
              "focus:border-destructive focus:shadow-destructive/20",
              "focus:ring-destructive/20"
            ],
            
            // Success state
            hasSuccess && [
              "border-success/60 bg-success/5",
              "focus:border-success focus:shadow-success/20",
              "focus:ring-success/20"
            ],
            
            // Disabled state
            disabled && "bg-muted/50 border-muted",
            
            className
          )}
          placeholder={isFloating ? placeholder : ""}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Floating Label */}
        {label && (
          <Label
            className={cn(
              "absolute left-4 transition-all duration-300 ease-out pointer-events-none",
              "text-muted-foreground font-medium",
              
              // Floating position
              isFloating ? [
                "top-2 text-xs font-semibold",
                isFocused && "text-primary",
                hasError && "text-destructive",
                hasSuccess && "text-success"
              ] : [
                "top-6 text-base"
              ],
              
              // Required indicator
              required && "after:content-['*'] after:ml-1 after:text-destructive"
            )}
          >
            {label}
          </Label>
        )}

        {/* Focus Ring Enhancement */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl transition-all duration-300 ease-out pointer-events-none",
            "ring-0 ring-primary/0",
            isFocused && !hasError && !disabled && "ring-2 ring-primary/10",
            hasError && isFocused && "ring-2 ring-destructive/10",
            hasSuccess && isFocused && "ring-2 ring-success/10"
          )}
        />
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <div
          className={cn(
            "mt-2 text-sm transition-all duration-200 ease-out",
            hasError ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error || helperText}
        </div>
      )}

      {/* Success Message */}
      {success && !error && (
        <div className="mt-2 text-sm text-success transition-all duration-200 ease-out">
          {success}
        </div>
      )}
    </div>
  )
})

EnhancedTextarea.displayName = "EnhancedTextarea"

export { EnhancedInput, EnhancedPasswordInput, EnhancedTextarea }