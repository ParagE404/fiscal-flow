/**
 * Color Contrast Validation Utilities
 * Ensures WCAG AA compliance for color combinations
 */

class ColorContrastValidator {
  constructor() {
    this.wcagAAThreshold = 4.5 // WCAG AA standard for normal text
    this.wcagAALargeThreshold = 3.0 // WCAG AA standard for large text
    this.wcagAAAThreshold = 7.0 // WCAG AAA standard
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Convert HSL to RGB
   */
  hslToRgb(h, s, l) {
    h /= 360
    s /= 100
    l /= 100

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    let r, g, b
    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    }
  }

  /**
   * Calculate relative luminance of a color
   */
  getRelativeLuminance(rgb) {
    const { r, g, b } = rgb
    
    const sRGB = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1, color2) {
    const lum1 = this.getRelativeLuminance(color1)
    const lum2 = this.getRelativeLuminance(color2)
    
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }

  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA(foreground, background, isLargeText = false) {
    const ratio = this.getContrastRatio(foreground, background)
    const threshold = isLargeText ? this.wcagAALargeThreshold : this.wcagAAThreshold
    
    return {
      ratio: ratio,
      passes: ratio >= threshold,
      level: ratio >= this.wcagAAAThreshold ? 'AAA' : ratio >= threshold ? 'AA' : 'Fail',
      threshold: threshold
    }
  }

  /**
   * Validate all color combinations in the design system
   */
  validateDesignSystemColors() {
    const colorPairs = [
      // Primary combinations
      { name: 'Primary Blue on White', fg: '#2563eb', bg: '#ffffff' },
      { name: 'Primary Blue on Light Gray', fg: '#2563eb', bg: '#f9fafb' },
      { name: 'White on Primary Blue', fg: '#ffffff', bg: '#2563eb' },
      
      // Success combinations
      { name: 'Success Green on White', fg: '#10b981', bg: '#ffffff' },
      { name: 'White on Success Green', fg: '#ffffff', bg: '#10b981' },
      
      // Warning combinations
      { name: 'Warning Orange on White', fg: '#f59e0b', bg: '#ffffff' },
      { name: 'White on Warning Orange', fg: '#ffffff', bg: '#f59e0b' },
      
      // Error combinations
      { name: 'Error Red on White', fg: '#ef4444', bg: '#ffffff' },
      { name: 'White on Error Red', fg: '#ffffff', bg: '#ef4444' },
      
      // Text combinations
      { name: 'Dark Text on White', fg: '#111827', bg: '#ffffff' },
      { name: 'Medium Text on White', fg: '#6b7280', bg: '#ffffff' },
      { name: 'Light Text on Dark', fg: '#f9fafb', bg: '#111827' },
      
      // Card combinations
      { name: 'Dark Text on Card', fg: '#111827', bg: '#ffffff' },
      { name: 'Medium Text on Card', fg: '#6b7280', bg: '#ffffff' },
    ]

    const results = colorPairs.map(pair => {
      const fgRgb = this.hexToRgb(pair.fg)
      const bgRgb = this.hexToRgb(pair.bg)
      
      if (!fgRgb || !bgRgb) {
        return { ...pair, error: 'Invalid color format' }
      }

      const normalText = this.meetsWCAGAA(fgRgb, bgRgb, false)
      const largeText = this.meetsWCAGAA(fgRgb, bgRgb, true)

      return {
        ...pair,
        normalText,
        largeText,
        recommendation: this.getRecommendation(normalText, largeText)
      }
    })

    return results
  }

  /**
   * Get accessibility recommendation for a color pair
   */
  getRecommendation(normalText, largeText) {
    if (normalText.passes && largeText.passes) {
      return { status: 'excellent', message: 'Passes WCAG AA for all text sizes' }
    } else if (largeText.passes) {
      return { status: 'warning', message: 'Only suitable for large text (18px+ or 14px+ bold)' }
    } else {
      return { status: 'error', message: 'Does not meet WCAG AA standards. Consider adjusting colors.' }
    }
  }

  /**
   * Suggest accessible color alternatives
   */
  suggestAccessibleColor(foreground, background, targetRatio = 4.5) {
    const fgRgb = typeof foreground === 'string' ? this.hexToRgb(foreground) : foreground
    const bgRgb = typeof background === 'string' ? this.hexToRgb(background) : background
    
    if (!fgRgb || !bgRgb) return null

    const currentRatio = this.getContrastRatio(fgRgb, bgRgb)
    
    if (currentRatio >= targetRatio) {
      return { original: foreground, suggested: foreground, ratio: currentRatio }
    }

    // Try darkening or lightening the foreground color
    const suggestions = []
    
    // Try different luminance adjustments
    for (let adjustment = 0.1; adjustment <= 0.9; adjustment += 0.1) {
      const adjustedColor = this.adjustColorLuminance(fgRgb, adjustment)
      const ratio = this.getContrastRatio(adjustedColor, bgRgb)
      
      if (ratio >= targetRatio) {
        suggestions.push({
          color: adjustedColor,
          ratio: ratio,
          hex: this.rgbToHex(adjustedColor)
        })
      }
    }

    return suggestions.length > 0 ? suggestions[0] : null
  }

  /**
   * Adjust color luminance
   */
  adjustColorLuminance(rgb, factor) {
    return {
      r: Math.round(Math.min(255, Math.max(0, rgb.r * factor))),
      g: Math.round(Math.min(255, Math.max(0, rgb.g * factor))),
      b: Math.round(Math.min(255, Math.max(0, rgb.b * factor)))
    }
  }

  /**
   * Convert RGB to hex
   */
  rgbToHex(rgb) {
    const componentToHex = (c) => {
      const hex = c.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    
    return `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`
  }

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport() {
    const colorValidation = this.validateDesignSystemColors()
    const failedCombinations = colorValidation.filter(result => 
      !result.normalText?.passes || result.error
    )
    
    return {
      totalCombinations: colorValidation.length,
      passedCombinations: colorValidation.length - failedCombinations.length,
      failedCombinations: failedCombinations.length,
      complianceRate: Math.round(((colorValidation.length - failedCombinations.length) / colorValidation.length) * 100),
      details: colorValidation,
      recommendations: failedCombinations.map(combo => ({
        combination: combo.name,
        issue: combo.recommendation?.message || combo.error,
        suggestion: combo.error ? 'Fix color format' : 'Adjust color values for better contrast'
      }))
    }
  }
}

// Global instance
export const colorContrastValidator = new ColorContrastValidator()

// Development tools
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Add to global scope for debugging
  window.__COLOR_CONTRAST_VALIDATOR__ = colorContrastValidator
  
  // Generate and log accessibility report
  setTimeout(() => {
    const report = colorContrastValidator.generateAccessibilityReport()
    
    console.group('🎨 Color Accessibility Report')
    console.log(`Compliance Rate: ${report.complianceRate}%`)
    console.log(`Passed: ${report.passedCombinations}/${report.totalCombinations}`)
    
    if (report.failedCombinations > 0) {
      console.warn('Failed combinations:')
      report.recommendations.forEach(rec => {
        console.warn(`- ${rec.combination}: ${rec.issue}`)
      })
    }
    console.groupEnd()
  }, 1000)
}

export default colorContrastValidator