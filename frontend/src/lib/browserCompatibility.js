/**
 * Browser Compatibility Testing Utilities
 * Provides utilities for testing cross-browser compatibility and feature detection
 */

/**
 * Browser detection utilities
 */
export const BrowserDetection = {
  // User agent detection
  getUserAgent: () => navigator.userAgent,
  
  // Browser type detection
  isChrome: () => /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
  isFirefox: () => /Firefox/.test(navigator.userAgent),
  isSafari: () => /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor),
  isEdge: () => /Edg/.test(navigator.userAgent),
  isIE: () => /MSIE|Trident/.test(navigator.userAgent),
  
  // Mobile detection
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: () => /Android/.test(navigator.userAgent),
  
  // Get browser name
  getBrowserName: () => {
    if (BrowserDetection.isChrome()) return 'Chrome';
    if (BrowserDetection.isFirefox()) return 'Firefox';
    if (BrowserDetection.isSafari()) return 'Safari';
    if (BrowserDetection.isEdge()) return 'Edge';
    if (BrowserDetection.isIE()) return 'Internet Explorer';
    return 'Unknown';
  },
  
  // Get browser version
  getBrowserVersion: () => {
    const ua = navigator.userAgent;
    let version = 'Unknown';
    
    if (BrowserDetection.isChrome()) {
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (BrowserDetection.isFirefox()) {
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (BrowserDetection.isSafari()) {
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (BrowserDetection.isEdge()) {
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    
    return version;
  }
};

/**
 * CSS Feature Detection
 */
export const CSSFeatureDetection = {
  // CSS Grid support
  supportsGrid: () => CSS.supports('display', 'grid'),
  
  // CSS Flexbox support
  supportsFlexbox: () => CSS.supports('display', 'flex'),
  
  // CSS Custom Properties (CSS Variables) support
  supportsCustomProperties: () => CSS.supports('--test', 'value'),
  
  // CSS Transforms support
  supportsTransforms: () => CSS.supports('transform', 'translateX(1px)'),
  
  // CSS Transitions support
  supportsTransitions: () => CSS.supports('transition', 'all 1s'),
  
  // CSS Animations support
  supportsAnimations: () => CSS.supports('animation', 'test 1s'),
  
  // CSS Backdrop Filter support
  supportsBackdropFilter: () => CSS.supports('backdrop-filter', 'blur(1px)'),
  
  // CSS Clip Path support
  supportsClipPath: () => CSS.supports('clip-path', 'circle(50%)'),
  
  // CSS Object Fit support
  supportsObjectFit: () => CSS.supports('object-fit', 'cover'),
  
  // CSS Aspect Ratio support
  supportsAspectRatio: () => CSS.supports('aspect-ratio', '16/9'),
  
  // CSS Container Queries support
  supportsContainerQueries: () => CSS.supports('container-type', 'inline-size'),
  
  // CSS Scroll Behavior support
  supportsScrollBehavior: () => CSS.supports('scroll-behavior', 'smooth'),
  
  // CSS Gap support (for flexbox)
  supportsGap: () => CSS.supports('gap', '1rem'),
  
  // Get all feature support status
  getAllFeatureSupport: () => ({
    grid: CSSFeatureDetection.supportsGrid(),
    flexbox: CSSFeatureDetection.supportsFlexbox(),
    customProperties: CSSFeatureDetection.supportsCustomProperties(),
    transforms: CSSFeatureDetection.supportsTransforms(),
    transitions: CSSFeatureDetection.supportsTransitions(),
    animations: CSSFeatureDetection.supportsAnimations(),
    backdropFilter: CSSFeatureDetection.supportsBackdropFilter(),
    clipPath: CSSFeatureDetection.supportsClipPath(),
    objectFit: CSSFeatureDetection.supportsObjectFit(),
    aspectRatio: CSSFeatureDetection.supportsAspectRatio(),
    containerQueries: CSSFeatureDetection.supportsContainerQueries(),
    scrollBehavior: CSSFeatureDetection.supportsScrollBehavior(),
    gap: CSSFeatureDetection.supportsGap()
  })
};

/**
 * JavaScript Feature Detection
 */
export const JSFeatureDetection = {
  // ES6+ features
  supportsArrowFunctions: () => {
    try {
      // Check if arrow functions are supported by testing function constructor
      return typeof (() => {}) === 'function';
    } catch (e) {
      return false;
    }
  },
  
  supportsAsyncAwait: () => {
    try {
      // Check if async/await is supported by testing async function constructor
      return typeof (async function() {}) === 'function';
    } catch (e) {
      return false;
    }
  },
  
  supportsModules: () => 'noModule' in HTMLScriptElement.prototype,
  
  // Web APIs
  supportsIntersectionObserver: () => 'IntersectionObserver' in window,
  supportsResizeObserver: () => 'ResizeObserver' in window,
  supportsMutationObserver: () => 'MutationObserver' in window,
  supportsWebAnimations: () => 'animate' in document.createElement('div'),
  supportsServiceWorker: () => 'serviceWorker' in navigator,
  supportsWebGL: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  },
  
  // Storage APIs
  supportsLocalStorage: () => {
    try {
      return 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  },
  
  supportsSessionStorage: () => {
    try {
      return 'sessionStorage' in window && window.sessionStorage !== null;
    } catch (e) {
      return false;
    }
  },
  
  supportsIndexedDB: () => 'indexedDB' in window,
  
  // Touch and pointer events
  supportsTouchEvents: () => 'ontouchstart' in window,
  supportsPointerEvents: () => 'onpointerdown' in window,
  
  // Get all feature support status
  getAllFeatureSupport: () => ({
    arrowFunctions: JSFeatureDetection.supportsArrowFunctions(),
    asyncAwait: JSFeatureDetection.supportsAsyncAwait(),
    modules: JSFeatureDetection.supportsModules(),
    intersectionObserver: JSFeatureDetection.supportsIntersectionObserver(),
    resizeObserver: JSFeatureDetection.supportsResizeObserver(),
    mutationObserver: JSFeatureDetection.supportsMutationObserver(),
    webAnimations: JSFeatureDetection.supportsWebAnimations(),
    serviceWorker: JSFeatureDetection.supportsServiceWorker(),
    webGL: JSFeatureDetection.supportsWebGL(),
    localStorage: JSFeatureDetection.supportsLocalStorage(),
    sessionStorage: JSFeatureDetection.supportsSessionStorage(),
    indexedDB: JSFeatureDetection.supportsIndexedDB(),
    touchEvents: JSFeatureDetection.supportsTouchEvents(),
    pointerEvents: JSFeatureDetection.supportsPointerEvents()
  })
};

/**
 * Performance Testing Utilities
 */
export const PerformanceTesting = {
  // Measure animation frame rate
  measureFPS: (duration = 1000) => {
    return new Promise((resolve) => {
      let frames = 0;
      let startTime = performance.now();
      
      function countFrames() {
        frames++;
        const currentTime = performance.now();
        
        if (currentTime - startTime < duration) {
          requestAnimationFrame(countFrames);
        } else {
          const fps = Math.round((frames * 1000) / (currentTime - startTime));
          resolve(fps);
        }
      }
      
      requestAnimationFrame(countFrames);
    });
  },
  
  // Measure paint timing
  measurePaintTiming: () => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const result = {};
      
      paintEntries.forEach(entry => {
        result[entry.name] = entry.startTime;
      });
      
      return result;
    }
    return null;
  },
  
  // Measure memory usage (Chrome only)
  measureMemoryUsage: () => {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },
  
  // Test animation performance
  testAnimationPerformance: async (element, animationClass, duration = 1000) => {
    const startTime = performance.now();
    let frameCount = 0;
    let droppedFrames = 0;
    let lastFrameTime = startTime;
    
    element.classList.add(animationClass);
    
    return new Promise((resolve) => {
      function measureFrame() {
        const currentTime = performance.now();
        frameCount++;
        
        // Check for dropped frames (>16.67ms between frames for 60fps)
        if (currentTime - lastFrameTime > 16.67) {
          droppedFrames++;
        }
        
        lastFrameTime = currentTime;
        
        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          element.classList.remove(animationClass);
          
          const totalTime = currentTime - startTime;
          const fps = Math.round((frameCount * 1000) / totalTime);
          const dropRate = (droppedFrames / frameCount) * 100;
          
          resolve({
            fps,
            frameCount,
            droppedFrames,
            dropRate: Math.round(dropRate * 100) / 100,
            duration: totalTime
          });
        }
      }
      
      requestAnimationFrame(measureFrame);
    });
  }
};

/**
 * Responsive Design Testing
 */
export const ResponsiveDesignTesting = {
  // Get current viewport dimensions
  getViewportDimensions: () => ({
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1
  }),
  
  // Get screen dimensions
  getScreenDimensions: () => ({
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight
  }),
  
  // Test breakpoint detection
  getCurrentBreakpoint: () => {
    const width = window.innerWidth;
    
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  },
  
  // Test orientation
  getOrientation: () => {
    if (screen.orientation) {
      return screen.orientation.type;
    }
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },
  
  // Test media query support
  testMediaQuery: (query) => {
    if (window.matchMedia) {
      return window.matchMedia(query).matches;
    }
    return false;
  },
  
  // Get comprehensive responsive info
  getResponsiveInfo: () => ({
    viewport: ResponsiveDesignTesting.getViewportDimensions(),
    screen: ResponsiveDesignTesting.getScreenDimensions(),
    breakpoint: ResponsiveDesignTesting.getCurrentBreakpoint(),
    orientation: ResponsiveDesignTesting.getOrientation(),
    isMobile: BrowserDetection.isMobile(),
    isTouch: JSFeatureDetection.supportsTouchEvents(),
    prefersReducedMotion: ResponsiveDesignTesting.testMediaQuery('(prefers-reduced-motion: reduce)'),
    prefersDarkMode: ResponsiveDesignTesting.testMediaQuery('(prefers-color-scheme: dark)')
  })
};

/**
 * Comprehensive Browser Compatibility Report
 */
export const generateCompatibilityReport = () => {
  const browser = {
    name: BrowserDetection.getBrowserName(),
    version: BrowserDetection.getBrowserVersion(),
    userAgent: BrowserDetection.getUserAgent(),
    isMobile: BrowserDetection.isMobile(),
    isIOS: BrowserDetection.isIOS(),
    isAndroid: BrowserDetection.isAndroid()
  };
  
  const cssFeatures = CSSFeatureDetection.getAllFeatureSupport();
  const jsFeatures = JSFeatureDetection.getAllFeatureSupport();
  const responsive = ResponsiveDesignTesting.getResponsiveInfo();
  const paintTiming = PerformanceTesting.measurePaintTiming();
  const memoryUsage = PerformanceTesting.measureMemoryUsage();
  
  return {
    timestamp: new Date().toISOString(),
    browser,
    cssFeatures,
    jsFeatures,
    responsive,
    performance: {
      paintTiming,
      memoryUsage
    }
  };
};

/**
 * Log compatibility report to console
 */
export const logCompatibilityReport = () => {
  const report = generateCompatibilityReport();
  
  console.group('🔍 Browser Compatibility Report');
  console.log('📊 Browser Info:', report.browser);
  console.log('🎨 CSS Features:', report.cssFeatures);
  console.log('⚡ JavaScript Features:', report.jsFeatures);
  console.log('📱 Responsive Info:', report.responsive);
  console.log('⚡ Performance:', report.performance);
  console.groupEnd();
  
  return report;
};

/**
 * Test specific animation performance across browsers
 */
export const testCrosseBrowserAnimations = async () => {
  const testElement = document.createElement('div');
  testElement.style.cssText = `
    position: fixed;
    top: -100px;
    left: -100px;
    width: 50px;
    height: 50px;
    background: red;
    z-index: -1;
  `;
  document.body.appendChild(testElement);
  
  const animations = [
    'transition-fast',
    'transition-normal',
    'transition-slow',
    'card-hover',
    'btn-animate',
    'hover-lift'
  ];
  
  const results = {};
  
  for (const animation of animations) {
    try {
      const result = await PerformanceTesting.testAnimationPerformance(
        testElement, 
        animation, 
        500
      );
      results[animation] = result;
    } catch (error) {
      results[animation] = { error: error.message };
    }
  }
  
  document.body.removeChild(testElement);
  
  return results;
};