/**
 * Accessibility Testing and Compliance Utilities
 * Automated testing for WCAG compliance and accessibility best practices
 */

import { colorContrastValidator } from './colorContrast'
import { focusManager } from './focusManagement'

class AccessibilityTester {
  constructor() {
    this.testResults = []
    this.violations = []
    this.warnings = []
    this.passes = []
  }

  /**
   * Run comprehensive accessibility audit
   */
  async runFullAudit(container = document) {
    console.group('🔍 Running Accessibility Audit')
    
    this.testResults = []
    this.violations = []
    this.warnings = []
    this.passes = []

    // Run all tests
    await this.testColorContrast(container)
    await this.testKeyboardNavigation(container)
    await this.testScreenReaderSupport(container)
    await this.testFormAccessibility(container)
    await this.testImageAccessibility(container)
    await this.testHeadingStructure(container)
    await this.testLandmarkRoles(container)
    await this.testFocusManagement(container)
    await this.testReducedMotion(container)

    const report = this.generateReport()
    this.logReport(report)
    
    console.groupEnd()
    return report
  }

  /**
   * Test color contrast compliance
   */
  async testColorContrast(container) {
    const test = { name: 'Color Contrast', violations: [], warnings: [], passes: [] }
    
    // Get all text elements
    const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, li')
    
    for (const element of textElements) {
      if (!element.textContent.trim()) continue
      
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Skip if no background color is set
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        continue
      }

      try {
        const contrast = this.calculateContrastFromStyles(color, backgroundColor)
        const fontSize = parseFloat(styles.fontSize)
        const fontWeight = styles.fontWeight
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
        
        const threshold = isLargeText ? 3.0 : 4.5
        
        if (contrast < threshold) {
          test.violations.push({
            element: element.tagName.toLowerCase(),
            text: element.textContent.slice(0, 50) + '...',
            contrast: contrast.toFixed(2),
            required: threshold,
            color,
            backgroundColor
          })
        } else {
          test.passes.push({
            element: element.tagName.toLowerCase(),
            contrast: contrast.toFixed(2)
          })
        }
      } catch (error) {
        test.warnings.push({
          element: element.tagName.toLowerCase(),
          message: 'Could not calculate contrast ratio',
          error: error.message
        })
      }
    }

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(container) {
    const test = { name: 'Keyboard Navigation', violations: [], warnings: [], passes: [] }
    
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]')
    
    interactiveElements.forEach(element => {
      // Check if element is focusable
      const tabIndex = element.getAttribute('tabindex')
      const isNativelyFocusable = ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())
      
      if (tabIndex === '-1' && !isNativelyFocusable) {
        test.violations.push({
          element: element.tagName.toLowerCase(),
          message: 'Interactive element is not keyboard accessible',
          selector: this.getElementSelector(element)
        })
      } else {
        test.passes.push({
          element: element.tagName.toLowerCase(),
          message: 'Element is keyboard accessible'
        })
      }

      // Check for focus indicators
      const styles = window.getComputedStyle(element, ':focus')
      if (styles.outline === 'none' && styles.boxShadow === 'none') {
        test.warnings.push({
          element: element.tagName.toLowerCase(),
          message: 'Element may lack visible focus indicator',
          selector: this.getElementSelector(element)
        })
      }
    })

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test screen reader support
   */
  async testScreenReaderSupport(container) {
    const test = { name: 'Screen Reader Support', violations: [], warnings: [], passes: [] }
    
    // Check for alt text on images
    const images = container.querySelectorAll('img')
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        test.violations.push({
          element: 'img',
          message: 'Image missing alt attribute',
          src: img.src,
          selector: this.getElementSelector(img)
        })
      } else if (img.getAttribute('alt') === '') {
        // Empty alt is okay for decorative images
        test.passes.push({
          element: 'img',
          message: 'Decorative image with empty alt text'
        })
      } else {
        test.passes.push({
          element: 'img',
          message: 'Image has descriptive alt text'
        })
      }
    })

    // Check for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let previousLevel = 0
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (level > previousLevel + 1) {
        test.violations.push({
          element: heading.tagName.toLowerCase(),
          message: `Heading level skipped (h${previousLevel} to h${level})`,
          text: heading.textContent.slice(0, 50),
          selector: this.getElementSelector(heading)
        })
      } else {
        test.passes.push({
          element: heading.tagName.toLowerCase(),
          message: 'Proper heading hierarchy'
        })
      }
      
      previousLevel = level
    })

    // Check for ARIA labels and descriptions
    const elementsNeedingLabels = container.querySelectorAll('input, select, textarea, button[type="submit"], [role="button"]')
    elementsNeedingLabels.forEach(element => {
      const hasLabel = element.hasAttribute('aria-label') || 
                      element.hasAttribute('aria-labelledby') ||
                      container.querySelector(`label[for="${element.id}"]`)
      
      if (!hasLabel && element.tagName.toLowerCase() !== 'button') {
        test.violations.push({
          element: element.tagName.toLowerCase(),
          message: 'Form element missing accessible label',
          selector: this.getElementSelector(element)
        })
      } else {
        test.passes.push({
          element: element.tagName.toLowerCase(),
          message: 'Element has accessible label'
        })
      }
    })

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test form accessibility
   */
  async testFormAccessibility(container) {
    const test = { name: 'Form Accessibility', violations: [], warnings: [], passes: [] }
    
    const forms = container.querySelectorAll('form')
    
    forms.forEach(form => {
      // Check for form labels
      const inputs = form.querySelectorAll('input, select, textarea')
      
      inputs.forEach(input => {
        const label = form.querySelector(`label[for="${input.id}"]`)
        const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby')
        
        if (!label && !hasAriaLabel) {
          test.violations.push({
            element: input.tagName.toLowerCase(),
            message: 'Form input missing label',
            type: input.type,
            selector: this.getElementSelector(input)
          })
        } else {
          test.passes.push({
            element: input.tagName.toLowerCase(),
            message: 'Form input has proper label'
          })
        }

        // Check for required field indicators
        if (input.required && !input.hasAttribute('aria-required')) {
          test.warnings.push({
            element: input.tagName.toLowerCase(),
            message: 'Required field missing aria-required attribute',
            selector: this.getElementSelector(input)
          })
        }
      })

      // Check for fieldsets and legends
      const fieldsets = form.querySelectorAll('fieldset')
      fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend')
        if (!legend) {
          test.violations.push({
            element: 'fieldset',
            message: 'Fieldset missing legend',
            selector: this.getElementSelector(fieldset)
          })
        } else {
          test.passes.push({
            element: 'fieldset',
            message: 'Fieldset has proper legend'
          })
        }
      })
    })

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test image accessibility
   */
  async testImageAccessibility(container) {
    const test = { name: 'Image Accessibility', violations: [], warnings: [], passes: [] }
    
    const images = container.querySelectorAll('img, svg, [role="img"]')
    
    images.forEach(img => {
      if (img.tagName.toLowerCase() === 'img') {
        if (!img.hasAttribute('alt')) {
          test.violations.push({
            element: 'img',
            message: 'Image missing alt attribute',
            src: img.src,
            selector: this.getElementSelector(img)
          })
        } else {
          const altText = img.getAttribute('alt')
          if (altText.length > 125) {
            test.warnings.push({
              element: 'img',
              message: 'Alt text may be too long (>125 characters)',
              altLength: altText.length,
              selector: this.getElementSelector(img)
            })
          } else {
            test.passes.push({
              element: 'img',
              message: 'Image has appropriate alt text'
            })
          }
        }
      } else if (img.tagName.toLowerCase() === 'svg') {
        const hasTitle = img.querySelector('title')
        const hasAriaLabel = img.hasAttribute('aria-label') || img.hasAttribute('aria-labelledby')
        
        if (!hasTitle && !hasAriaLabel) {
          test.violations.push({
            element: 'svg',
            message: 'SVG missing accessible name',
            selector: this.getElementSelector(img)
          })
        } else {
          test.passes.push({
            element: 'svg',
            message: 'SVG has accessible name'
          })
        }
      }
    })

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test heading structure
   */
  async testHeadingStructure(container) {
    const test = { name: 'Heading Structure', violations: [], warnings: [], passes: [] }
    
    const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    
    if (headings.length === 0) {
      test.warnings.push({
        message: 'No headings found in content'
      })
      this.testResults.push(test)
      return
    }

    // Check for h1
    const h1Count = headings.filter(h => h.tagName === 'H1').length
    if (h1Count === 0) {
      test.violations.push({
        message: 'Page missing h1 heading'
      })
    } else if (h1Count > 1) {
      test.warnings.push({
        message: 'Multiple h1 headings found',
        count: h1Count
      })
    } else {
      test.passes.push({
        message: 'Page has single h1 heading'
      })
    }

    // Check heading sequence
    let previousLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1))
      
      if (index === 0 && level !== 1) {
        test.warnings.push({
          element: heading.tagName.toLowerCase(),
          message: 'First heading is not h1',
          text: heading.textContent.slice(0, 50)
        })
      }
      
      if (level > previousLevel + 1) {
        test.violations.push({
          element: heading.tagName.toLowerCase(),
          message: `Heading level skipped (h${previousLevel} to h${level})`,
          text: heading.textContent.slice(0, 50)
        })
      }
      
      previousLevel = level
    })

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test landmark roles
   */
  async testLandmarkRoles(container) {
    const test = { name: 'Landmark Roles', violations: [], warnings: [], passes: [] }
    
    const landmarks = {
      main: container.querySelectorAll('main, [role="main"]'),
      navigation: container.querySelectorAll('nav, [role="navigation"]'),
      banner: container.querySelectorAll('header, [role="banner"]'),
      contentinfo: container.querySelectorAll('footer, [role="contentinfo"]'),
      complementary: container.querySelectorAll('aside, [role="complementary"]')
    }

    // Check for main landmark
    if (landmarks.main.length === 0) {
      test.violations.push({
        message: 'Page missing main landmark'
      })
    } else if (landmarks.main.length > 1) {
      test.warnings.push({
        message: 'Multiple main landmarks found',
        count: landmarks.main.length
      })
    } else {
      test.passes.push({
        message: 'Page has single main landmark'
      })
    }

    // Check for navigation
    if (landmarks.navigation.length > 0) {
      test.passes.push({
        message: 'Navigation landmarks present',
        count: landmarks.navigation.length
      })
    } else {
      test.warnings.push({
        message: 'No navigation landmarks found'
      })
    }

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test focus management
   */
  async testFocusManagement(container) {
    const test = { name: 'Focus Management', violations: [], warnings: [], passes: [] }
    
    const focusableElements = focusManager.getFocusableElements(container)
    
    if (focusableElements.length === 0) {
      test.warnings.push({
        message: 'No focusable elements found'
      })
    } else {
      test.passes.push({
        message: 'Focusable elements present',
        count: focusableElements.length
      })
    }

    // Check for skip links
    const skipLinks = container.querySelectorAll('.skip-link, [href^="#"]')
    if (skipLinks.length > 0) {
      test.passes.push({
        message: 'Skip links present',
        count: skipLinks.length
      })
    } else {
      test.warnings.push({
        message: 'No skip links found'
      })
    }

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Test reduced motion support
   */
  async testReducedMotion(container) {
    const test = { name: 'Reduced Motion Support', violations: [], warnings: [], passes: [] }
    
    // Check for prefers-reduced-motion media query support
    const hasReducedMotionCSS = Array.from(document.styleSheets).some(sheet => {
      try {
        return Array.from(sheet.cssRules || []).some(rule => 
          rule.media && rule.media.mediaText.includes('prefers-reduced-motion')
        )
      } catch (e) {
        return false
      }
    })

    if (hasReducedMotionCSS) {
      test.passes.push({
        message: 'Reduced motion media queries found in CSS'
      })
    } else {
      test.violations.push({
        message: 'No reduced motion support found in CSS'
      })
    }

    // Check for animations that might not respect reduced motion
    const animatedElements = container.querySelectorAll('[class*="animate"], [class*="transition"]')
    if (animatedElements.length > 0) {
      test.warnings.push({
        message: 'Animated elements found - ensure they respect reduced motion preferences',
        count: animatedElements.length
      })
    }

    this.testResults.push(test)
    this.violations.push(...test.violations.map(v => ({ test: test.name, ...v })))
    this.warnings.push(...test.warnings.map(w => ({ test: test.name, ...w })))
    this.passes.push(...test.passes.map(p => ({ test: test.name, ...p })))
  }

  /**
   * Calculate contrast ratio from computed styles
   */
  calculateContrastFromStyles(color, backgroundColor) {
    // This is a simplified version - in a real implementation,
    // you'd need to parse CSS color values properly
    const colorRgb = this.parseColor(color)
    const bgRgb = this.parseColor(backgroundColor)
    
    return colorContrastValidator.getContrastRatio(colorRgb, bgRgb)
  }

  /**
   * Parse CSS color to RGB (simplified)
   */
  parseColor(color) {
    // This is a basic implementation - would need enhancement for all CSS color formats
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgb) {
      return {
        r: parseInt(rgb[1]),
        g: parseInt(rgb[2]),
        b: parseInt(rgb[3])
      }
    }
    
    // Fallback for hex colors
    if (color.startsWith('#')) {
      return colorContrastValidator.hexToRgb(color)
    }
    
    // Default fallback
    return { r: 0, g: 0, b: 0 }
  }

  /**
   * Get CSS selector for an element
   */
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`
    }
    
    return element.tagName.toLowerCase()
  }

  /**
   * Generate comprehensive accessibility report
   */
  generateReport() {
    const totalTests = this.testResults.length
    const totalViolations = this.violations.length
    const totalWarnings = this.warnings.length
    const totalPasses = this.passes.length
    
    const score = totalPasses / (totalPasses + totalViolations + totalWarnings) * 100
    
    return {
      summary: {
        score: Math.round(score),
        totalTests,
        violations: totalViolations,
        warnings: totalWarnings,
        passes: totalPasses
      },
      details: this.testResults,
      violations: this.violations,
      warnings: this.warnings,
      passes: this.passes,
      recommendations: this.generateRecommendations()
    }
  }

  /**
   * Generate accessibility recommendations
   */
  generateRecommendations() {
    const recommendations = []
    
    if (this.violations.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'violations',
        message: `Fix ${this.violations.length} accessibility violations`,
        details: this.violations.slice(0, 5) // Top 5 violations
      })
    }
    
    if (this.warnings.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'warnings',
        message: `Address ${this.warnings.length} accessibility warnings`,
        details: this.warnings.slice(0, 3) // Top 3 warnings
      })
    }
    
    return recommendations
  }

  /**
   * Log accessibility report to console
   */
  logReport(report) {
    console.log(`Accessibility Score: ${report.summary.score}%`)
    console.log(`Violations: ${report.summary.violations}`)
    console.log(`Warnings: ${report.summary.warnings}`)
    console.log(`Passes: ${report.summary.passes}`)
    
    if (report.violations.length > 0) {
      console.group('❌ Violations')
      report.violations.forEach(violation => {
        console.error(`${violation.test}: ${violation.message}`)
      })
      console.groupEnd()
    }
    
    if (report.warnings.length > 0) {
      console.group('⚠️ Warnings')
      report.warnings.forEach(warning => {
        console.warn(`${warning.test}: ${warning.message}`)
      })
      console.groupEnd()
    }
  }
}

// Global instance
export const accessibilityTester = new AccessibilityTester()

// Development tools
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__ACCESSIBILITY_TESTER__ = accessibilityTester
  
  // Run audit on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      accessibilityTester.runFullAudit()
    }, 2000)
  })
}

export default accessibilityTester