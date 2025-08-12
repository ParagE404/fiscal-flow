// Accessibility utilities index
export { colorContrastValidator } from './colorContrast'
export { focusManager, screenReaderSupport } from './focusManagement'
export { accessibilityTester } from './accessibilityTester'

// Initialize accessibility features
export const initializeAccessibility = () => {
  if (typeof window === 'undefined') return

  // Initialize focus management
  import('./focusManagement').then(({ focusManager }) => {
    // Focus manager auto-initializes
  })



  // Run accessibility tests in development
  if (import.meta.env.DEV) {
    import('./accessibilityTester').then(({ accessibilityTester }) => {
      // Accessibility tester auto-runs
    })
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initializeAccessibility)
}