import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Button } from './button'

export const EnhancedSelect = ({ 
  options = [], 
  value, 
  onValueChange, 
  placeholder = "Select option...",
  allowCustom = false,
  customPlaceholder = "Enter custom value...",
  className,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setIsOpen(false)
        setIsCustomMode(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue)
    setIsOpen(false)
    setIsCustomMode(false)
    setSearchTerm('')
  }

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onValueChange(customValue.trim())
      setIsOpen(false)
      setIsCustomMode(false)
      setCustomValue('')
      setSearchTerm('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isCustomMode) {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setIsCustomMode(false)
      setSearchTerm('')
    }
  }

  return (
    <div className="relative" {...props}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden rounded-md border bg-white shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-10 pr-3 text-sm outline-none hover:bg-gray-50 focus:bg-accent-teal-50 focus:text-accent-teal-900 transition-colors duration-150",
                    value === option && "bg-accent-teal-50 text-accent-teal-900"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  {value === option && (
                    <span className="absolute left-2 flex h-5 w-5 items-center justify-center">
                      <div className="h-4 w-4 rounded-full bg-accent-teal-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white font-bold" />
                      </div>
                    </span>
                  )}
                  <span className="font-medium truncate">{option}</span>
                </button>
              ))
            ) : searchTerm ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found for "{searchTerm}"
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options available
              </div>
            )}

            {/* Custom Option */}
            {allowCustom && (
              <>
                <div className="my-2 border-t" />
                {!isCustomMode ? (
                  <button
                    type="button"
                    className="relative flex w-full cursor-default select-none items-center rounded-md py-2.5 pl-10 pr-3 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 focus:text-blue-900 transition-colors duration-150 text-blue-600"
                    onClick={() => setIsCustomMode(true)}
                  >
                    <span className="absolute left-2 flex h-5 w-5 items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="font-medium">Add custom bank...</span>
                  </button>
                ) : (
                  <div className="p-2 space-y-2">
                    <Input
                      placeholder={customPlaceholder}
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCustomSubmit}
                        disabled={!customValue.trim()}
                        className="h-7 px-3 text-xs"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCustomMode(false)
                          setCustomValue('')
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}