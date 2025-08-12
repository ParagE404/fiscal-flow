/**
 * Focus Management Utilities
 * Ensures proper keyboard navigation and focus handling
 */

class FocusManager {
  constructor() {
    this.focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'details > summary'
    ].join(', ')
    
    this.focusHistory = []
    this.trapStack = []
    this.isKeyboardUser = false
    
    this.init()
  }

  /**
   * Initialize focus management
   */
  init() {
    if (typeof window === 'undefined') return

    // Detect keyboard usage
    this.setupKeyboardDetection()
    
    // Setup global focus management
    this.setupGlobalFocusHandling()
    
    // Setup escape key handling
    this.setupEscapeKeyHandling()
  }

  /**
   * Detect when user is navigating with keyboard
   */
  setupKeyboardDetection() {
    // Track keyboard usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.isKeyboardUser = true
        document.body.classList.add('keyboard-navigation')
      }
    })

    // Track mouse usage
    document.addEventListener('mousedown', () => {
      this.isKeyboardUser = false
      document.body.classList.remove('keyboard-navigation')
    })

    // Track touch usage
    document.addEventListener('touchstart', () => {
      this.isKeyboardUser = false
      document.body.classList.remove('keyboard-navigation')
    })
  }

  /**
   * Setup global focus handling
   */
  setupGlobalFocusHandling() {
    // Track focus changes
    document.addEventListener('focusin', (e) => {
      this.focusHistory.push({
        element: e.target,
        timestamp: Date.now()
      })
      
      // Keep history manageable
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift()
      }
    })

    // Handle focus visibility
    document.addEventListener('focusin', (e) => {
      if (this.isKeyboardUser) {
        e.target.classList.add('keyboard-focused')
      }
    })

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('keyboard-focused')
    })
  }

  /**
   * Setup escape key handling for modals and overlays
   */
  setupEscapeKeyHandling() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.trapStack.length > 0) {
        const currentTrap = this.trapStack[this.trapStack.length - 1]
        if (currentTrap.onEscape) {
          currentTrap.onEscape()
        }
      }
    })
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container = document) {
    return Array.from(container.querySelectorAll(this.focusableSelectors))
      .filter(element => this.isVisible(element) && !this.isDisabled(element))
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element)
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0
  }

  /**
   * Check if element is disabled
   */
  isDisabled(element) {
    return element.disabled || 
           element.getAttribute('aria-disabled') === 'true' ||
           element.getAttribute('tabindex') === '-1'
  }

  /**
   * Focus the first focusable element in a container
   */
  focusFirst(container = document) {
    const focusableElements = this.getFocusableElements(container)
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
      return focusableElements[0]
    }
    return null
  }

  /**
   * Focus the last focusable element in a container
   */
  focusLast(container = document) {
    const focusableElements = this.getFocusableElements(container)
    if (focusableElements.length > 0) {
      const lastElement = focusableElements[focusableElements.length - 1]
      lastElement.focus()
      return lastElement
    }
    return null
  }

  /**
   * Create a focus trap within a container
   */
  trapFocus(container, options = {}) {
    const {
      initialFocus = null,
      returnFocus = true,
      onEscape = null
    } = options

    const focusableElements = this.getFocusableElements(container)
    
    if (focusableElements.length === 0) {
      console.warn('Focus trap created on container with no focusable elements')
      return null
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const previouslyFocused = document.activeElement

    // Focus initial element
    if (initialFocus && focusableElements.includes(initialFocus)) {
      initialFocus.focus()
    } else {
      firstElement.focus()
    }

    // Handle tab navigation
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)

    const trap = {
      container,
      release: () => {
        container.removeEventListener('keydown', handleTabKey)
        
        // Remove from trap stack
        const index = this.trapStack.indexOf(trap)
        if (index > -1) {
          this.trapStack.splice(index, 1)
        }

        // Return focus if requested
        if (returnFocus && previouslyFocused && this.isVisible(previouslyFocused)) {
          previouslyFocused.focus()
        }
      },
      onEscape
    }

    // Add to trap stack
    this.trapStack.push(trap)

    return trap
  }

  /**
   * Release the most recent focus trap
   */
  releaseFocusTrap() {
    if (this.trapStack.length > 0) {
      const trap = this.trapStack.pop()
      trap.release()
    }
  }

  /**
   * Release all focus traps
   */
  releaseAllFocusTraps() {
    while (this.trapStack.length > 0) {
      this.releaseFocusTrap()
    }
  }

  /**
   * Announce text to screen readers
   */
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message

    document.body.appendChild(announcer)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }

  /**
   * Create skip links for better navigation
   */
  createSkipLinks(targets = []) {
    const defaultTargets = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#footer', text: 'Skip to footer' }
    ]

    const skipTargets = targets.length > 0 ? targets : defaultTargets
    const skipContainer = document.createElement('div')
    skipContainer.className = 'skip-links'
    skipContainer.setAttribute('aria-label', 'Skip links')

    skipTargets.forEach(target => {
      const link = document.createElement('a')
      link.href = target.href
      link.textContent = target.text
      link.className = 'skip-link'
      
      // Show on focus
      link.addEventListener('focus', () => {
        link.classList.add('skip-link-focused')
      })
      
      link.addEventListener('blur', () => {
        link.classList.remove('skip-link-focused')
      })

      skipContainer.appendChild(link)
    })

    // Insert at the beginning of body
    document.body.insertBefore(skipContainer, document.body.firstChild)

    return skipContainer
  }

  /**
   * Manage focus for single-page app navigation
   */
  handleRouteChange(newPageTitle, mainContentSelector = '#main-content') {
    // Update page title
    document.title = newPageTitle

    // Announce page change
    this.announce(`Navigated to ${newPageTitle}`)

    // Focus main content
    const mainContent = document.querySelector(mainContentSelector)
    if (mainContent) {
      // Make main content focusable if it isn't already
      if (!mainContent.hasAttribute('tabindex')) {
        mainContent.setAttribute('tabindex', '-1')
      }
      
      mainContent.focus()
      
      // Remove tabindex after focus to prevent it from being in tab order
      setTimeout(() => {
        if (mainContent.getAttribute('tabindex') === '-1') {
          mainContent.removeAttribute('tabindex')
        }
      }, 100)
    }
  }

  /**
   * Get focus management statistics
   */
  getStatistics() {
    return {
      isKeyboardUser: this.isKeyboardUser,
      activeFocusTraps: this.trapStack.length,
      focusHistoryLength: this.focusHistory.length,
      currentlyFocused: document.activeElement?.tagName || 'none'
    }
  }
}

/**
 * Screen Reader Utilities
 */
export class ScreenReaderSupport {
  constructor() {
    this.liveRegions = new Map()
  }

  /**
   * Create or update a live region for announcements
   */
  createLiveRegion(id, priority = 'polite') {
    let region = this.liveRegions.get(id)
    
    if (!region) {
      region = document.createElement('div')
      region.id = id
      region.setAttribute('aria-live', priority)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
      
      this.liveRegions.set(id, region)
    }

    return region
  }

  /**
   * Announce message via live region
   */
  announce(message, regionId = 'default-announcer', priority = 'polite') {
    const region = this.createLiveRegion(regionId, priority)
    
    // Clear previous message
    region.textContent = ''
    
    // Add new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      region.textContent = message
    }, 100)
  }

  /**
   * Add screen reader only text
   */
  addScreenReaderText(element, text) {
    const srText = document.createElement('span')
    srText.className = 'sr-only'
    srText.textContent = text
    element.appendChild(srText)
    return srText
  }

  /**
   * Enhance form accessibility
   */
  enhanceFormAccessibility(form) {
    const inputs = form.querySelectorAll('input, select, textarea')
    
    inputs.forEach(input => {
      // Ensure proper labeling
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const label = form.querySelector(`label[for="${input.id}"]`)
        if (label) {
          input.setAttribute('aria-labelledby', label.id || `label-${input.id}`)
          if (!label.id) {
            label.id = `label-${input.id}`
          }
        }
      }

      // Add required indicators
      if (input.required) {
        input.setAttribute('aria-required', 'true')
        
        // Add visual indicator if not present
        const label = form.querySelector(`label[for="${input.id}"]`)
        if (label && !label.querySelector('.required-indicator')) {
          const indicator = document.createElement('span')
          indicator.className = 'required-indicator'
          indicator.setAttribute('aria-hidden', 'true')
          indicator.textContent = ' *'
          label.appendChild(indicator)
        }
      }

      // Enhance error handling
      input.addEventListener('invalid', (e) => {
        const errorId = `error-${input.id}`
        let errorElement = document.getElementById(errorId)
        
        if (!errorElement) {
          errorElement = document.createElement('div')
          errorElement.id = errorId
          errorElement.className = 'error-message'
          errorElement.setAttribute('role', 'alert')
          input.parentNode.insertBefore(errorElement, input.nextSibling)
        }
        
        errorElement.textContent = input.validationMessage
        input.setAttribute('aria-describedby', errorId)
        input.setAttribute('aria-invalid', 'true')
      })

      // Clear errors on valid input
      input.addEventListener('input', () => {
        if (input.validity.valid) {
          input.removeAttribute('aria-invalid')
          const errorElement = document.getElementById(`error-${input.id}`)
          if (errorElement) {
            errorElement.textContent = ''
          }
        }
      })
    })
  }
}

// Global instances
export const focusManager = new FocusManager()
export const screenReaderSupport = new ScreenReaderSupport()

// Development tools
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__FOCUS_MANAGER__ = focusManager
  window.__SCREEN_READER_SUPPORT__ = screenReaderSupport
  
  // Log focus management statistics
  setInterval(() => {
    const stats = focusManager.getStatistics()
    if (stats.isKeyboardUser) {
      console.log('Focus Management Stats:', stats)
    }
  }, 10000) // Every 10 seconds
}

export default {
  focusManager,
  screenReaderSupport
}