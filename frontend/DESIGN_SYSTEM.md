# Modern UI Design System Documentation

## Overview

This design system provides a comprehensive set of design tokens, components, and patterns for building modern, accessible, and performant user interfaces. It draws inspiration from successful fintech platforms like Groww and Zerodha, while incorporating Apple's design language principles.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Color System](#color-system)
4. [Spacing System](#spacing-system)
5. [Animation System](#animation-system)
6. [Component Library](#component-library)
7. [Usage Guidelines](#usage-guidelines)
8. [Browser Compatibility](#browser-compatibility)
9. [Performance Guidelines](#performance-guidelines)
10. [Accessibility Guidelines](#accessibility-guidelines)

## Design Tokens

### CSS Custom Properties

All design tokens are implemented as CSS custom properties for consistency and maintainability:

```css
:root {
  /* Colors */
  --primary-blue-500: 59 130 246;
  --primary-green-500: 16 185 129;
  --primary-purple-500: 139 92 246;
  
  /* Typography */
  --font-display: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --: "SF Mono", "JetBrains Mono", "Fira Code", monospace;
  
  /* Spacing */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-4: 1rem;    /* 16px */
  
  /* Animation */
  --duration-150: 150ms;
  --duration-300: 300ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

## Typography

### Font Stack

**Primary Font Stack (Display & Body)**
- SF Pro Display/Text (Apple devices)
- -apple-system (macOS/iOS system font)
- BlinkMacSystemFont (macOS Chrome)
- Segoe UI (Windows)
- sans-serif (fallback)

**Monospace Font Stack**
- SF Mono (Apple devices)
- JetBrains Mono
- Fira Code
- monospace (fallback)

### Type Scale

| Class | Size | Line Height | Weight | Usage |
|-------|------|-------------|---------|-------|
| `.text-display` | 36px/48px | 40px/52px | 700 | Hero sections |
| `.text-h1` | 30px/36px | 36px/40px | 600 | Page titles |
| `.text-h2` | 24px/30px | 32px/36px | 600 | Section headers |
| `.text-h3` | 20px/24px | 28px/32px | 600 | Card titles |
| `.text-h4` | 18px/20px | 24px/28px | 600 | Subsections |
| `.text-body-lg` | 16px/18px | 24px/28px | 400 | Important content |
| `.text-body` | 14px/16px | 20px/24px | 400 | Regular content |
| `.text-body-sm` | 12px/14px | 16px/20px | 400 | Secondary content |
| `.text-caption` | 12px | 16px | 500 | Labels, metadata |

### Financial Typography

```css
.text-financial {
  font-family: var(--);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.text-financial-lg {
  font-family: var(--);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-2xl);
  letter-spacing: -0.02em;
}
```

## Color System

### Primary Colors

**Blue (Trust & Stability)**
```css
--primary-blue-50: 239 246 255;
--primary-blue-500: 59 130 246;  /* Base */
--primary-blue-600: 37 99 235;   /* Hover */
--primary-blue-900: 30 58 138;   /* Dark */
```

**Green (Growth & Success)**
```css
--primary-green-50: 236 253 245;
--primary-green-500: 16 185 129;  /* Base */
--primary-green-600: 5 150 105;   /* Hover */
--primary-green-900: 6 78 59;     /* Dark */
```

**Purple (Premium & Innovation)**
```css
--primary-purple-50: 245 243 255;
--primary-purple-500: 139 92 246;  /* Base */
--primary-purple-600: 124 58 237;  /* Hover */
--primary-purple-900: 76 29 149;   /* Dark */
```

### Secondary Colors

**Orange (Attention & Highlights)**
```css
--accent-orange-500: 245 158 11;
--accent-orange-600: 217 119 6;
```

**Teal (Balance & Harmony)**
```css
--accent-teal-500: 20 184 166;
--accent-teal-600: 13 148 136;
```

**Pink (Energy & Engagement)**
```css
--accent-pink-500: 236 72 153;
--accent-pink-600: 219 39 119;
```

### Semantic Colors

```css
--success-500: 34 197 94;    /* Profits, achievements */
--warning-500: 245 158 11;   /* Caution, alerts */
--error-500: 239 68 68;      /* Losses, errors */
--info-500: 59 130 246;      /* Information, neutrality */
```

### Usage Examples

```css
/* Text colors */
.text-primary-blue { color: hsl(var(--primary-blue-600)); }
.text-success { color: hsl(var(--success-500)); }

/* Background colors */
.bg-primary-blue { background-color: hsl(var(--primary-blue-600)); }
.bg-success { background-color: hsl(var(--success-500)); }

/* Border colors */
.border-primary-blue { border-color: hsl(var(--primary-blue-600)); }
```

## Spacing System

### Scale

```css
--space-px: 1px;
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
--space-32: 8rem;    /* 128px */
```

### Usage Guidelines

- Use multiples of 4px for consistency
- Prefer spacing tokens over arbitrary values
- Use larger spacing for section separation
- Use smaller spacing for related elements

## Animation System

### Duration Tokens

```css
--duration-75: 75ms;     /* Instant feedback */
--duration-150: 150ms;   /* Fast transitions */
--duration-300: 300ms;   /* Normal transitions */
--duration-500: 500ms;   /* Slow transitions */
--duration-700: 700ms;   /* Page transitions */
```

### Easing Functions

```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Animation Classes

#### Transitions

```css
.transition-fast {
  transition-duration: var(--duration-150);
  transition-timing-function: var(--ease-out);
  transform: translateZ(0);
  will-change: transform, opacity;
}

.transition-normal {
  transition-duration: var(--duration-300);
  transition-timing-function: var(--ease-in-out);
  transform: translateZ(0);
  will-change: transform, opacity;
}
```

#### Interactive States

```css
.interactive {
  transition: all var(--duration-200) var(--ease-out);
  cursor: pointer;
  transform: translateZ(0);
  will-change: transform;
}

.interactive:hover {
  transform: translateY(-1px) translateZ(0);
}

.interactive:active {
  transform: translateY(0) translateZ(0);
  transition-duration: var(--duration-75);
}
```

#### Card Animations

```css
.card-hover {
  transition: all var(--duration-300) var(--ease-out);
  transform: translateZ(0);
  will-change: transform, box-shadow;
}

.card-hover:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-lg);
}
```

## Component Library

### Buttons

#### Primary Button

```css
.btn-primary {
  background: linear-gradient(135deg, hsl(var(--primary-blue-500)) 0%, hsl(var(--primary-blue-600)) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-6);
  font-weight: 600;
  transition: all var(--duration-200) var(--ease-out);
  transform: translateZ(0);
  will-change: transform, box-shadow;
}

.btn-primary:hover {
  transform: translateY(-1px) translateZ(0);
  box-shadow: var(--shadow-md);
  background: linear-gradient(135deg, hsl(var(--primary-blue-600)) 0%, hsl(var(--primary-blue-700)) 100%);
}
```

#### Modern Button Animations

```css
.btn-modern {
  position: relative;
  overflow: hidden;
  transition: all var(--duration-200) var(--ease-out);
  transform-origin: center;
  transform: translateZ(0);
  will-change: transform, box-shadow;
}

.btn-modern:hover {
  transform: translateY(-2px) scale(1.02) translateZ(0);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.btn-modern:active {
  transform: translateY(0) scale(0.98) translateZ(0);
  transition-duration: var(--duration-75);
}
```

### Cards

#### Modern Card

```css
.modern-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: var(--radius-2xl);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 4px 6px rgba(0, 0, 0, 0.02);
  transition: all var(--duration-300) var(--ease-out);
  transform: translateZ(0);
  will-change: transform, box-shadow;
}

.modern-card:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 10px 15px rgba(0, 0, 0, 0.05);
  border-color: rgba(59, 130, 246, 0.3);
}
```

### Form Elements

#### Enhanced Input

```css
.enhanced-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-xl);
  background: hsl(var(--background));
  font-size: var(--font-size-base);
  transition: all var(--duration-200) var(--ease-out);
}

.enhanced-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}
```

## Usage Guidelines

### Component Composition

1. **Start with base components**: Use the provided base components as building blocks
2. **Apply consistent spacing**: Use spacing tokens for margins and padding
3. **Follow the color system**: Use semantic colors for consistent meaning
4. **Implement proper animations**: Use the animation classes for smooth interactions

### Example Usage

```jsx
// Good: Using design system classes
<div className="modern-card p-6 space-y-4">
  <h3 className="text-h3 text-primary-blue">Portfolio Summary</h3>
  <p className="text-body text-muted-foreground">Your investment overview</p>
  <button className="btn-primary btn-modern">
    View Details
  </button>
</div>

// Avoid: Custom styles that don't follow the system
<div style={{ 
  background: '#f0f0f0', 
  padding: '15px', 
  borderRadius: '8px' 
}}>
  <h3 style={{ color: '#333', fontSize: '18px' }}>Portfolio Summary</h3>
</div>
```

### Responsive Design

Use the responsive typography and spacing classes:

```css
/* Responsive typography */
.text-responsive-base {
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

@media (min-width: 640px) {
  .text-responsive-base {
    font-size: var(--font-size-lg);
    line-height: var(--line-height-lg);
  }
}
```

## Browser Compatibility

### Supported Browsers

- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

### Fallbacks

The design system includes automatic fallbacks for:

- CSS Custom Properties → Sass variables
- CSS Grid → Flexbox layouts
- Modern CSS features → Progressive enhancement

### Browser-Specific Fixes

Browser-specific CSS files are available:

- `src/styles/browser-fixes-safari.css`
- `src/styles/browser-fixes-firefox.css`
- `src/styles/browser-fixes-edge.css`
- `src/styles/browser-fixes-ie11.css`

## Performance Guidelines

### Animation Performance

1. **Use transform and opacity**: These properties are GPU-accelerated
2. **Avoid animating layout properties**: width, height, margin, padding cause reflow
3. **Use will-change sparingly**: Only on elements that will actually change
4. **Prefer CSS animations over JavaScript**: Better performance and battery life

### CSS Optimization

1. **Use CSS custom properties**: Better caching and maintainability
2. **Minimize box-shadow usage**: Can impact performance with many instances
3. **Use hardware acceleration**: `transform: translateZ(0)` for smooth animations
4. **Optimize critical CSS**: Load above-the-fold styles first

### Example: Optimized Animation

```css
/* Good: GPU-accelerated animation */
.optimized-animation {
  transform: translateZ(0);
  will-change: transform, opacity;
  transition: transform var(--duration-300) var(--ease-out);
}

.optimized-animation:hover {
  transform: translateY(-2px) translateZ(0);
}

/* Avoid: Layout-triggering animation */
.layout-animation {
  transition: margin-top var(--duration-300);
}

.layout-animation:hover {
  margin-top: -2px; /* Causes layout reflow */
}
```

## Accessibility Guidelines

### Color Contrast

All color combinations meet WCAG AA standards (4.5:1 contrast ratio):

- Primary text on background: 7.2:1
- Secondary text on background: 4.8:1
- Interactive elements: 4.5:1+

### Focus Management

```css
/* Visible focus indicators */
.focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.5);
}

/* High contrast focus for better accessibility */
@media (prefers-contrast: high) {
  .focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }
}
```

### Reduced Motion

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch Targets

```css
/* Minimum 44px touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}

.touch-target-large {
  min-height: 48px;
  min-width: 48px;
}
```

## Testing and Validation

### Cross-Browser Testing

Use the built-in browser compatibility test page:

```
/browser-compatibility-test
```

This page provides:
- Feature detection results
- Animation performance testing
- Responsive design validation
- Accessibility compliance checks

### CSS Validation

Run the CSS compatibility analysis:

```bash
npm run test:css-compatibility
```

### Performance Testing

Monitor animation performance:

```javascript
import { PerformanceTesting } from '@/lib/browserCompatibility';

// Test animation FPS
const fps = await PerformanceTesting.measureFPS(1000);
console.log(`Animation running at ${fps} FPS`);
```

## Migration Guide

### From Old System

1. **Replace custom colors** with design system tokens
2. **Update typography classes** to use the new scale
3. **Replace custom animations** with system classes
4. **Update spacing** to use consistent tokens

### Example Migration

```css
/* Before */
.old-card {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.old-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* After */
.new-card {
  @apply modern-card p-5;
}

/* Or using classes directly */
<div className="modern-card p-5 card-hover">
```

## Contributing

### Adding New Components

1. Follow the established patterns
2. Use design tokens consistently
3. Include hover and focus states
4. Test across browsers
5. Document usage examples

### Updating Tokens

1. Update CSS custom properties in `src/index.css`
2. Update documentation
3. Test for breaking changes
4. Run compatibility tests

## Resources

- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Animation Performance](https://web.dev/animations-guide/)
- [Browser Compatibility Testing](./src/pages/BrowserCompatibilityTest.jsx)

---

*This design system is continuously evolving. For questions or contributions, please refer to the project documentation or create an issue.*