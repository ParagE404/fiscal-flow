
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
