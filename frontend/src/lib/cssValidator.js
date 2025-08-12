/**
 * CSS Validation and Cross-Browser Compatibility Utilities
 * Provides tools for validating CSS properties and ensuring cross-browser compatibility
 */

/**
 * CSS Property Validation
 */
export const CSSValidator = {
  // Validate CSS property support
  validateProperty: (property, value) => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      return CSS.supports(property, value);
    }
    
    // Fallback for older browsers
    const testElement = document.createElement('div');
    const originalValue = testElement.style[property];
    
    try {
      testElement.style[property] = value;
      return testElement.style[property] !== originalValue;
    } catch (e) {
      return false;
    }
  },

  // Validate multiple CSS properties
  validateProperties: (properties) => {
    const results = {};
    
    Object.entries(properties).forEach(([property, value]) => {
      results[property] = CSSValidator.validateProperty(property, value);
    });
    
    return results;
  },

  // Check for vendor prefix requirements
  needsVendorPrefix: (property) => {
    const prefixMap = {
      'transform': ['-webkit-', '-moz-', '-ms-'],
      'transition': ['-webkit-', '-moz-', '-o-'],
      'animation': ['-webkit-', '-moz-'],
      'box-shadow': ['-webkit-', '-moz-'],
      'border-radius': ['-webkit-', '-moz-'],
      'background-clip': ['-webkit-'],
      'user-select': ['-webkit-', '-moz-', '-ms-'],
      'appearance': ['-webkit-', '-moz-'],
      'backdrop-filter': ['-webkit-'],
      'clip-path': ['-webkit-']
    };
    
    return prefixMap[property] || [];
  },

  // Generate vendor-prefixed CSS
  generatePrefixedCSS: (property, value) => {
    const prefixes = CSSValidator.needsVendorPrefix(property);
    const css = [];
    
    // Add vendor prefixes
    prefixes.forEach(prefix => {
      css.push(`${prefix}${property}: ${value};`);
    });
    
    // Add standard property
    css.push(`${property}: ${value};`);
    
    return css.join('\n');
  }
};

/**
 * Browser-Specific CSS Fixes
 */
export const BrowserFixes = {
  // Safari-specific fixes
  safari: {
    // Fix for Safari's handling of flexbox
    flexboxFix: `
      /* Safari flexbox fix */
      .flex-safari-fix {
        display: -webkit-box;
        display: -webkit-flex;
        display: flex;
      }
      
      .flex-safari-fix > * {
        -webkit-flex-shrink: 0;
        flex-shrink: 0;
      }
    `,
    
    // Fix for Safari's backdrop-filter
    backdropFilterFix: `
      /* Safari backdrop-filter fix */
      .backdrop-blur-safari {
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
      }
    `,
    
    // Fix for Safari's smooth scrolling
    smoothScrollFix: `
      /* Safari smooth scroll fix */
      html {
        -webkit-overflow-scrolling: touch;
      }
    `
  },

  // Firefox-specific fixes
  firefox: {
    // Fix for Firefox's handling of CSS Grid
    gridFix: `
      /* Firefox grid fix */
      @-moz-document url-prefix() {
        .grid-firefox-fix {
          display: -ms-grid;
          display: grid;
        }
      }
    `,
    
    // Fix for Firefox's button styling
    buttonFix: `
      /* Firefox button fix */
      button::-moz-focus-inner {
        border: 0;
        padding: 0;
      }
    `
  },

  // Edge-specific fixes
  edge: {
    // Fix for Edge's CSS Grid implementation
    gridFix: `
      /* Edge grid fix */
      @supports (-ms-grid-row: 1) {
        .grid-edge-fix {
          display: -ms-grid;
        }
      }
    `,
    
    // Fix for Edge's flexbox implementation
    flexboxFix: `
      /* Edge flexbox fix */
      .flex-edge-fix {
        display: -ms-flexbox;
        display: flex;
      }
    `
  },

  // Internet Explorer fixes (if needed)
  ie: {
    // Basic IE11 support
    basicFix: `
      /* IE11 basic fixes */
      .ie-flex-fix {
        display: -ms-flexbox;
        display: flex;
      }
      
      .ie-grid-fallback {
        display: table;
        width: 100%;
      }
      
      .ie-grid-fallback > * {
        display: table-cell;
        vertical-align: top;
      }
    `
  }
};

/**
 * CSS Animation Compatibility
 */
export const AnimationCompatibility = {
  // Check if animations are supported
  supportsAnimations: () => {
    return CSSValidator.validateProperty('animation', 'test 1s');
  },

  // Check if transforms are supported
  supportsTransforms: () => {
    return CSSValidator.validateProperty('transform', 'translateX(1px)');
  },

  // Check if transitions are supported
  supportsTransitions: () => {
    return CSSValidator.validateProperty('transition', 'all 1s');
  },

  // Generate fallback for animations
  generateAnimationFallback: (animationName, fallbackStyles) => {
    if (!AnimationCompatibility.supportsAnimations()) {
      return fallbackStyles;
    }
    return `animation: ${animationName};`;
  },

  // Generate transform fallback
  generateTransformFallback: (transform, fallbackStyles) => {
    if (!AnimationCompatibility.supportsTransforms()) {
      return fallbackStyles;
    }
    return CSSValidator.generatePrefixedCSS('transform', transform);
  }
};

/**
 * Responsive Design Validation
 */
export const ResponsiveValidator = {
  // Test media query support
  supportsMediaQueries: () => {
    if (window.matchMedia) {
      return window.matchMedia('(min-width: 1px)').matches;
    }
    return false;
  },

  // Test container query support
  supportsContainerQueries: () => {
    return CSSValidator.validateProperty('container-type', 'inline-size');
  },

  // Validate breakpoint consistency
  validateBreakpoints: () => {
    const breakpoints = {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    };

    const results = {};
    
    Object.entries(breakpoints).forEach(([name, width]) => {
      if (window.matchMedia) {
        results[name] = {
          width,
          matches: window.matchMedia(`(min-width: ${width})`).matches
        };
      }
    });

    return results;
  },

  // Test viewport units support
  supportsViewportUnits: () => {
    const units = ['vw', 'vh', 'vmin', 'vmax'];
    const results = {};
    
    units.forEach(unit => {
      results[unit] = CSSValidator.validateProperty('width', `100${unit}`);
    });
    
    return results;
  }
};

/**
 * Color and Theme Validation
 */
export const ColorValidator = {
  // Test CSS custom properties support
  supportsCustomProperties: () => {
    return CSSValidator.validateProperty('--test', 'value');
  },

  // Test color function support
  supportsColorFunctions: () => {
    const functions = {
      'hsl': 'hsl(0, 0%, 0%)',
      'hsla': 'hsla(0, 0%, 0%, 1)',
      'rgb': 'rgb(0, 0, 0)',
      'rgba': 'rgba(0, 0, 0, 1)'
    };

    const results = {};
    
    Object.entries(functions).forEach(([name, value]) => {
      results[name] = CSSValidator.validateProperty('color', value);
    });

    return results;
  },

  // Validate color contrast (basic implementation)
  calculateContrast: (color1, color2) => {
    // This is a simplified implementation
    // In a real application, you'd want a more robust color contrast calculation
    const getLuminance = (color) => {
      // Convert hex to RGB and calculate luminance
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },

  // Check WCAG compliance
  checkWCAGCompliance: (foreground, background) => {
    const contrast = ColorValidator.calculateContrast(foreground, background);
    
    return {
      contrast: contrast.toFixed(2),
      aa: contrast >= 4.5,
      aaa: contrast >= 7,
      aaLarge: contrast >= 3,
      aaaLarge: contrast >= 4.5
    };
  }
};

/**
 * Performance Validation
 */
export const PerformanceValidator = {
  // Check for expensive CSS properties
  checkExpensiveProperties: (cssText) => {
    const expensiveProperties = [
      'box-shadow',
      'border-radius',
      'opacity',
      'transform',
      'filter',
      'backdrop-filter'
    ];

    const warnings = [];
    
    expensiveProperties.forEach(property => {
      const regex = new RegExp(`${property}\\s*:`, 'gi');
      const matches = cssText.match(regex);
      
      if (matches && matches.length > 10) {
        warnings.push(`High usage of ${property} (${matches.length} instances) may impact performance`);
      }
    });

    return warnings;
  },

  // Check for will-change usage
  checkWillChangeUsage: (cssText) => {
    const willChangeRegex = /will-change\s*:/gi;
    const matches = cssText.match(willChangeRegex);
    
    if (matches && matches.length > 5) {
      return {
        warning: `High usage of will-change (${matches.length} instances) may impact memory usage`,
        count: matches.length
      };
    }

    return { count: matches ? matches.length : 0 };
  },

  // Validate animation performance
  validateAnimationPerformance: (cssText) => {
    const issues = [];
    
    // Check for animating expensive properties
    const expensiveAnimations = [
      'width', 'height', 'top', 'left', 'right', 'bottom',
      'margin', 'padding', 'border-width'
    ];

    expensiveAnimations.forEach(property => {
      const regex = new RegExp(`@keyframes[^}]*${property}\\s*:`, 'gi');
      if (regex.test(cssText)) {
        issues.push(`Animating ${property} may cause layout thrashing`);
      }
    });

    // Check for missing transform3d for hardware acceleration
    const transformRegex = /transform\s*:[^;]*(?!translate3d|translateZ)/gi;
    const transforms = cssText.match(transformRegex);
    
    if (transforms && transforms.length > 0) {
      issues.push('Consider using transform3d() or translateZ(0) for hardware acceleration');
    }

    return issues;
  }
};

/**
 * Generate comprehensive CSS compatibility report
 */
export const generateCSSCompatibilityReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    browser: {
      name: navigator.userAgent,
      supportsCSS: typeof CSS !== 'undefined'
    },
    features: {
      customProperties: ColorValidator.supportsCustomProperties(),
      animations: AnimationCompatibility.supportsAnimations(),
      transforms: AnimationCompatibility.supportsTransforms(),
      transitions: AnimationCompatibility.supportsTransitions(),
      mediaQueries: ResponsiveValidator.supportsMediaQueries(),
      containerQueries: ResponsiveValidator.supportsContainerQueries(),
      viewportUnits: ResponsiveValidator.supportsViewportUnits(),
      colorFunctions: ColorValidator.supportsColorFunctions()
    },
    breakpoints: ResponsiveValidator.validateBreakpoints(),
    recommendations: []
  };

  // Add recommendations based on feature support
  if (!report.features.customProperties) {
    report.recommendations.push('CSS Custom Properties not supported - consider using Sass variables');
  }

  if (!report.features.animations) {
    report.recommendations.push('CSS Animations not supported - provide JavaScript fallbacks');
  }

  if (!report.features.containerQueries) {
    report.recommendations.push('Container Queries not supported - use media queries instead');
  }

  return report;
};

/**
 * Export CSS compatibility utilities
 */
export default {
  CSSValidator,
  BrowserFixes,
  AnimationCompatibility,
  ResponsiveValidator,
  ColorValidator,
  PerformanceValidator,
  generateCSSCompatibilityReport
};