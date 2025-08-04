#!/usr/bin/env node

/**
 * Cross-Browser Testing Script
 * Automated testing for browser compatibility and design consistency
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BROWSERS = ['chrome', 'firefox', 'safari', 'edge'];
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

const TEST_PAGES = [
  '/',
  '/dashboard',
  '/stocks',
  '/mutual-funds',
  '/fixed-deposits',
  '/settings',
  '/browser-compatibility-test'
];

/**
 * Generate test configuration
 */
function generateTestConfig() {
  const config = {
    testSuites: [],
    timestamp: new Date().toISOString(),
    browsers: BROWSERS,
    viewports: VIEWPORTS,
    pages: TEST_PAGES
  };

  BROWSERS.forEach(browser => {
    VIEWPORTS.forEach(viewport => {
      TEST_PAGES.forEach(page => {
        config.testSuites.push({
          id: `${browser}-${viewport.name}-${page.replace('/', 'home')}`,
          browser,
          viewport,
          page,
          tests: [
            'layout-consistency',
            'animation-performance',
            'responsive-behavior',
            'color-accuracy',
            'font-rendering',
            'interaction-feedback'
          ]
        });
      });
    });
  });

  return config;
}

/**
 * CSS Analysis Functions
 */
function analyzeCSSCompatibility() {
  console.log('🔍 Analyzing CSS compatibility...');
  
  const cssFiles = [
    'src/index.css'
  ];

  const analysis = {
    files: [],
    issues: [],
    recommendations: []
  };

  cssFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileAnalysis = analyzeCSSFile(content, file);
      analysis.files.push(fileAnalysis);
      analysis.issues.push(...fileAnalysis.issues);
      analysis.recommendations.push(...fileAnalysis.recommendations);
    }
  });

  return analysis;
}

function analyzeCSSFile(content, filename) {
  const analysis = {
    filename,
    size: content.length,
    issues: [],
    recommendations: [],
    features: {
      customProperties: (content.match(/--[\w-]+\s*:/g) || []).length,
      animations: (content.match(/@keyframes/g) || []).length,
      transforms: (content.match(/transform\s*:/g) || []).length,
      transitions: (content.match(/transition\s*:/g) || []).length,
      gradients: (content.match(/linear-gradient|radial-gradient/g) || []).length,
      flexbox: (content.match(/display\s*:\s*flex/g) || []).length,
      grid: (content.match(/display\s*:\s*grid/g) || []).length
    }
  };

  // Check for potential browser compatibility issues
  checkBrowserCompatibility(content, analysis);
  
  // Check for performance issues
  checkPerformanceIssues(content, analysis);
  
  // Check for accessibility issues
  checkAccessibilityIssues(content, analysis);

  return analysis;
}

function checkBrowserCompatibility(content, analysis) {
  // Check for vendor prefixes
  const needsPrefixes = [
    { property: 'transform', regex: /transform\s*:(?![^}]*-webkit-transform)/ },
    { property: 'transition', regex: /transition\s*:(?![^}]*-webkit-transition)/ },
    { property: 'animation', regex: /animation\s*:(?![^}]*-webkit-animation)/ },
    { property: 'backdrop-filter', regex: /backdrop-filter\s*:(?![^}]*-webkit-backdrop-filter)/ }
  ];

  needsPrefixes.forEach(({ property, regex }) => {
    if (regex.test(content)) {
      analysis.issues.push({
        type: 'compatibility',
        severity: 'medium',
        message: `${property} may need vendor prefixes for older browsers`,
        property
      });
    }
  });

  // Check for modern CSS features that might need fallbacks
  const modernFeatures = [
    { feature: 'CSS Grid', regex: /display\s*:\s*grid/, fallback: 'flexbox or float layouts' },
    { feature: 'CSS Custom Properties', regex: /var\(--/, fallback: 'Sass variables' },
    { feature: 'backdrop-filter', regex: /backdrop-filter\s*:/, fallback: 'solid background colors' },
    { feature: 'clip-path', regex: /clip-path\s*:/, fallback: 'border-radius or images' }
  ];

  modernFeatures.forEach(({ feature, regex, fallback }) => {
    if (regex.test(content)) {
      analysis.recommendations.push({
        type: 'fallback',
        message: `Consider providing fallbacks for ${feature} (suggestion: ${fallback})`,
        feature
      });
    }
  });
}

function checkPerformanceIssues(content, analysis) {
  // Check for expensive properties in animations
  const expensiveInAnimations = [
    'width', 'height', 'top', 'left', 'right', 'bottom',
    'margin', 'padding', 'border-width'
  ];

  expensiveInAnimations.forEach(property => {
    const regex = new RegExp(`@keyframes[^}]*${property}\\s*:`, 'gi');
    if (regex.test(content)) {
      analysis.issues.push({
        type: 'performance',
        severity: 'high',
        message: `Animating ${property} may cause layout thrashing`,
        property,
        suggestion: 'Use transform or opacity instead'
      });
    }
  });

  // Check for excessive box-shadows
  const boxShadowCount = (content.match(/box-shadow\s*:/g) || []).length;
  if (boxShadowCount > 20) {
    analysis.issues.push({
      type: 'performance',
      severity: 'medium',
      message: `High usage of box-shadow (${boxShadowCount} instances) may impact performance`,
      suggestion: 'Consider using fewer shadows or CSS-only alternatives'
    });
  }

  // Check for will-change overuse
  const willChangeCount = (content.match(/will-change\s*:/g) || []).length;
  if (willChangeCount > 5) {
    analysis.issues.push({
      type: 'performance',
      severity: 'medium',
      message: `High usage of will-change (${willChangeCount} instances) may impact memory`,
      suggestion: 'Only use will-change on elements that will actually change'
    });
  }
}

function checkAccessibilityIssues(content, analysis) {
  // Check for missing focus styles
  const focusStyles = content.match(/:focus[^{]*{/g) || [];
  const interactiveElements = content.match(/button|input|select|textarea|\.btn/g) || [];
  
  if (interactiveElements.length > focusStyles.length) {
    analysis.issues.push({
      type: 'accessibility',
      severity: 'high',
      message: 'Some interactive elements may be missing focus styles',
      suggestion: 'Ensure all interactive elements have visible focus indicators'
    });
  }

  // Check for potential color contrast issues (basic check)
  const colorDeclarations = content.match(/color\s*:\s*[^;]+/g) || [];
  const backgroundDeclarations = content.match(/background(?:-color)?\s*:\s*[^;]+/g) || [];
  
  if (colorDeclarations.length > 0 && backgroundDeclarations.length > 0) {
    analysis.recommendations.push({
      type: 'accessibility',
      message: 'Verify color contrast ratios meet WCAG AA standards (4.5:1 for normal text)',
      suggestion: 'Use automated tools to check color contrast'
    });
  }
}

/**
 * Generate browser-specific CSS
 */
function generateBrowserSpecificCSS() {
  console.log('🎨 Generating browser-specific CSS fixes...');

  const browserFixes = {
    safari: `
/* Safari-specific fixes */
@media not all and (min-resolution:.001dpcm) {
  @supports (-webkit-appearance:none) {
    /* Safari flexbox fixes */
    .flex {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
    }
    
    /* Safari backdrop-filter fix */
    .backdrop-blur {
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
    }
    
    /* Safari smooth scrolling */
    html {
      -webkit-overflow-scrolling: touch;
    }
  }
}`,

    firefox: `
/* Firefox-specific fixes */
@-moz-document url-prefix() {
  /* Firefox button fixes */
  button::-moz-focus-inner {
    border: 0;
    padding: 0;
  }
  
  /* Firefox grid fixes */
  .grid {
    display: -moz-grid;
    display: grid;
  }
}`,

    edge: `
/* Edge-specific fixes */
@supports (-ms-ime-align:auto) {
  /* Edge flexbox fixes */
  .flex {
    display: -ms-flexbox;
    display: flex;
  }
  
  /* Edge grid fixes */
  .grid {
    display: -ms-grid;
    display: grid;
  }
}`,

    ie11: `
/* IE11 fallbacks */
@media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
  /* IE11 flexbox fallback */
  .flex {
    display: -ms-flexbox;
    display: flex;
  }
  
  /* IE11 grid fallback */
  .grid {
    display: table;
    width: 100%;
  }
  
  .grid > * {
    display: table-cell;
    vertical-align: top;
  }
}`
  };

  // Write browser-specific CSS files
  Object.entries(browserFixes).forEach(([browser, css]) => {
    const filename = `src/styles/browser-fixes-${browser}.css`;
    const dir = path.dirname(filename);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, css);
    console.log(`✅ Generated ${filename}`);
  });
}

/**
 * Generate responsive testing utilities
 */
function generateResponsiveTestUtils() {
  console.log('📱 Generating responsive testing utilities...');

  const responsiveTestCSS = `
/* Responsive Testing Utilities */

/* Breakpoint indicators (visible in development) */
.breakpoint-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  pointer-events: none;
}

.breakpoint-indicator::before {
  content: 'xs';
}

@media (min-width: 640px) {
  .breakpoint-indicator::before {
    content: 'sm';
  }
}

@media (min-width: 768px) {
  .breakpoint-indicator::before {
    content: 'md';
  }
}

@media (min-width: 1024px) {
  .breakpoint-indicator::before {
    content: 'lg';
  }
}

@media (min-width: 1280px) {
  .breakpoint-indicator::before {
    content: 'xl';
  }
}

@media (min-width: 1536px) {
  .breakpoint-indicator::before {
    content: '2xl';
  }
}

/* Grid overlay for layout testing */
.grid-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9998;
  background-image: 
    linear-gradient(rgba(255, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.grid-overlay.active {
  opacity: 1;
}

/* Touch target testing */
.touch-target-test {
  position: relative;
}

.touch-target-test::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  border: 2px dashed rgba(255, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.touch-target-test.show-targets::after {
  opacity: 1;
}

/* Animation performance testing */
.perf-test-element {
  width: 50px;
  height: 50px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border-radius: 50%;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
}

.perf-test-transform {
  animation: perfTestTransform 1s ease-in-out infinite alternate;
}

.perf-test-layout {
  animation: perfTestLayout 1s ease-in-out infinite alternate;
}

@keyframes perfTestTransform {
  from { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  to { transform: translate(-50%, -50%) scale(1.2) rotate(180deg); }
}

@keyframes perfTestLayout {
  from { 
    width: 50px; 
    height: 50px; 
    margin-top: 0; 
  }
  to { 
    width: 60px; 
    height: 60px; 
    margin-top: -5px; 
  }
}
`;

  const responsiveTestJS = `
/**
 * Responsive Testing Utilities
 */
export class ResponsiveTestUtils {
  constructor() {
    this.breakpointIndicator = null;
    this.gridOverlay = null;
    this.init();
  }

  init() {
    this.createBreakpointIndicator();
    this.createGridOverlay();
    this.bindKeyboardShortcuts();
  }

  createBreakpointIndicator() {
    this.breakpointIndicator = document.createElement('div');
    this.breakpointIndicator.className = 'breakpoint-indicator';
    document.body.appendChild(this.breakpointIndicator);
  }

  createGridOverlay() {
    this.gridOverlay = document.createElement('div');
    this.gridOverlay.className = 'grid-overlay';
    document.body.appendChild(this.gridOverlay);
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + G: Toggle grid overlay
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        this.toggleGridOverlay();
      }

      // Ctrl/Cmd + B: Toggle breakpoint indicator
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleBreakpointIndicator();
      }

      // Ctrl/Cmd + T: Toggle touch targets
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        this.toggleTouchTargets();
      }
    });
  }

  toggleGridOverlay() {
    this.gridOverlay.classList.toggle('active');
  }

  toggleBreakpointIndicator() {
    this.breakpointIndicator.style.display = 
      this.breakpointIndicator.style.display === 'none' ? 'block' : 'none';
  }

  toggleTouchTargets() {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]'
    );
    
    interactiveElements.forEach(el => {
      el.classList.toggle('touch-target-test');
      el.classList.toggle('show-targets');
    });
  }

  testAnimationPerformance() {
    const testElement = document.createElement('div');
    testElement.className = 'perf-test-element';
    document.body.appendChild(testElement);

    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = performance.now();

      const countFrames = () => {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime - startTime < 1000) {
          requestAnimationFrame(countFrames);
        } else {
          const fps = Math.round((frameCount * 1000) / (currentTime - startTime));
          document.body.removeChild(testElement);
          resolve(fps);
        }
      };

      testElement.classList.add('perf-test-transform');
      requestAnimationFrame(countFrames);
    });
  }

  generateReport() {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    const breakpoint = this.getCurrentBreakpoint();
    const orientation = this.getOrientation();
    const touchSupport = 'ontouchstart' in window;

    return {
      timestamp: new Date().toISOString(),
      viewport,
      breakpoint,
      orientation,
      touchSupport,
      userAgent: navigator.userAgent
    };
  }

  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  }

  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  new ResponsiveTestUtils();
}
`;

  // Write files
  fs.writeFileSync('src/styles/responsive-test.css', responsiveTestCSS);
  fs.writeFileSync('src/lib/responsiveTestUtils.js', responsiveTestJS);
  
  console.log('✅ Generated responsive testing utilities');
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting cross-browser testing setup...\n');

  try {
    // Generate test configuration
    const config = generateTestConfig();
    fs.writeFileSync('cross-browser-test-config.json', JSON.stringify(config, null, 2));
    console.log('✅ Generated test configuration');

    // Analyze CSS compatibility
    const cssAnalysis = analyzeCSSCompatibility();
    fs.writeFileSync('css-compatibility-report.json', JSON.stringify(cssAnalysis, null, 2));
    console.log('✅ Generated CSS compatibility report');

    // Generate browser-specific fixes
    generateBrowserSpecificCSS();

    // Generate responsive testing utilities
    generateResponsiveTestUtils();

    // Summary
    console.log('\n📊 Cross-Browser Testing Setup Complete!');
    console.log(`\n📋 Summary:`);
    console.log(`   • ${config.testSuites.length} test suites configured`);
    console.log(`   • ${cssAnalysis.issues.length} CSS issues found`);
    console.log(`   • ${cssAnalysis.recommendations.length} recommendations generated`);
    console.log(`   • Browser-specific fixes created`);
    console.log(`   • Responsive testing utilities generated`);

    if (cssAnalysis.issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      cssAnalysis.issues.forEach(issue => {
        console.log(`   • ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }

    if (cssAnalysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      cssAnalysis.recommendations.forEach(rec => {
        console.log(`   • ${rec.message}`);
      });
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Review the CSS compatibility report');
    console.log('   2. Test the application in different browsers');
    console.log('   3. Use the responsive testing utilities (Ctrl+G for grid, Ctrl+B for breakpoints)');
    console.log('   4. Visit /browser-compatibility-test for interactive testing');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateTestConfig, analyzeCSSCompatibility, generateBrowserSpecificCSS };