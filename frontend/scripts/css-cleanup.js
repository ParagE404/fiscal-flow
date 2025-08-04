#!/usr/bin/env node

/**
 * CSS Cleanup and Optimization Script
 * Removes deprecated styles and optimizes CSS architecture
 */

import fs from 'fs';
import path from 'path';

/**
 * Deprecated CSS patterns to remove or replace
 */
const DEPRECATED_PATTERNS = [
  // Old color values that should use CSS custom properties
  {
    pattern: /#[0-9a-fA-F]{6}(?![^}]*var\()/g,
    description: 'Direct hex colors (should use CSS custom properties)',
    severity: 'warning'
  },
  
  // Hardcoded pixel values that should use spacing tokens
  {
    pattern: /(?:margin|padding|gap):\s*\d+px/g,
    description: 'Hardcoded pixel spacing (should use spacing tokens)',
    severity: 'warning'
  },
  
  // Old transition syntax
  {
    pattern: /transition:\s*all\s+\d+ms\s+ease(?!-)/g,
    description: 'Old transition syntax (should use custom properties)',
    severity: 'info'
  },
  
  // Vendor prefixes that are no longer needed
  {
    pattern: /-webkit-transform:/g,
    description: 'Unnecessary -webkit-transform prefix',
    severity: 'info'
  },
  
  // Old flexbox syntax
  {
    pattern: /display:\s*-webkit-box/g,
    description: 'Old flexbox syntax',
    severity: 'warning'
  }
];

/**
 * CSS optimization rules
 */
const OPTIMIZATION_RULES = [
  {
    name: 'Remove duplicate properties',
    pattern: /^(\s*)([\w-]+):\s*([^;]+);[\s\S]*?\1\2:\s*([^;]+);/gm,
    replacement: '$1$2: $4;',
    description: 'Remove duplicate CSS properties'
  },
  
  {
    name: 'Optimize zero values',
    pattern: /\b0px\b/g,
    replacement: '0',
    description: 'Replace 0px with 0'
  },
  
  {
    name: 'Remove unnecessary semicolons',
    pattern: /;(\s*})/g,
    replacement: '$1',
    description: 'Remove semicolons before closing braces'
  },
  
  {
    name: 'Optimize color values',
    pattern: /#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g,
    replacement: '#$1$2$3',
    description: 'Shorten hex colors where possible'
  }
];

/**
 * Unused CSS detection patterns
 */
const UNUSED_PATTERNS = [
  // Classes that might be unused
  {
    pattern: /\.[\w-]+(?=\s*{[^}]*})/g,
    type: 'class',
    description: 'CSS class selectors'
  },
  
  // IDs that might be unused
  {
    pattern: /#[\w-]+(?=\s*{[^}]*})/g,
    type: 'id',
    description: 'CSS ID selectors'
  }
];

/**
 * Analyze CSS file for issues and optimizations
 */
function analyzeCSSFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = {
    file: filePath,
    size: content.length,
    lines: content.split('\n').length,
    issues: [],
    optimizations: [],
    unused: [],
    stats: {
      customProperties: (content.match(/--[\w-]+:/g) || []).length,
      classes: (content.match(/\.[\w-]+/g) || []).length,
      ids: (content.match(/#[\w-]+/g) || []).length,
      mediaQueries: (content.match(/@media/g) || []).length,
      keyframes: (content.match(/@keyframes/g) || []).length
    }
  };

  // Check for deprecated patterns
  DEPRECATED_PATTERNS.forEach(({ pattern, description, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      analysis.issues.push({
        type: 'deprecated',
        severity,
        description,
        count: matches.length,
        examples: matches.slice(0, 3) // Show first 3 examples
      });
    }
  });

  // Check for optimization opportunities
  OPTIMIZATION_RULES.forEach(({ name, pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      analysis.optimizations.push({
        name,
        description,
        count: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });

  return analysis;
}

/**
 * Apply CSS optimizations
 */
function optimizeCSS(content) {
  let optimizedContent = content;
  const appliedOptimizations = [];

  OPTIMIZATION_RULES.forEach(({ name, pattern, replacement, description }) => {
    const beforeLength = optimizedContent.length;
    optimizedContent = optimizedContent.replace(pattern, replacement);
    const afterLength = optimizedContent.length;
    
    if (beforeLength !== afterLength) {
      appliedOptimizations.push({
        name,
        description,
        savedBytes: beforeLength - afterLength
      });
    }
  });

  return {
    content: optimizedContent,
    optimizations: appliedOptimizations
  };
}

/**
 * Remove unused CSS (basic implementation)
 */
function removeUnusedCSS(cssContent, jsFiles) {
  // This is a simplified implementation
  // In a real project, you'd want to use tools like PurgeCSS
  
  const usedClasses = new Set();
  const usedIds = new Set();

  // Scan JavaScript files for class and ID usage
  jsFiles.forEach(jsFile => {
    if (fs.existsSync(jsFile)) {
      const jsContent = fs.readFileSync(jsFile, 'utf8');
      
      // Find className usage
      const classMatches = jsContent.match(/className\s*=\s*["'`]([^"'`]+)["'`]/g);
      if (classMatches) {
        classMatches.forEach(match => {
          const classes = match.match(/["'`]([^"'`]+)["'`]/)[1].split(/\s+/);
          classes.forEach(cls => usedClasses.add(cls));
        });
      }
      
      // Find id usage
      const idMatches = jsContent.match(/id\s*=\s*["'`]([^"'`]+)["'`]/g);
      if (idMatches) {
        idMatches.forEach(match => {
          const id = match.match(/["'`]([^"'`]+)["'`]/)[1];
          usedIds.add(id);
        });
      }
    }
  });

  // Remove unused CSS rules (simplified)
  let cleanedCSS = cssContent;
  
  // This is a very basic implementation - in practice, you'd want more sophisticated parsing
  const cssRules = cssContent.match(/[.#][\w-]+\s*{[^}]*}/g) || [];
  let removedRules = 0;
  
  cssRules.forEach(rule => {
    const selector = rule.match(/([.#][\w-]+)/)[1];
    const isClass = selector.startsWith('.');
    const isId = selector.startsWith('#');
    
    if (isClass) {
      const className = selector.substring(1);
      if (!usedClasses.has(className) && !className.includes(':')) {
        // Don't remove if it has pseudo-classes or is a utility class
        if (!className.match(/^(hover|focus|active|disabled|sm|md|lg|xl)/) && 
            !className.match(/(transition|animation|gradient|shadow)/) &&
            className.length > 3) {
          cleanedCSS = cleanedCSS.replace(rule, '');
          removedRules++;
        }
      }
    } else if (isId) {
      const idName = selector.substring(1);
      if (!usedIds.has(idName)) {
        cleanedCSS = cleanedCSS.replace(rule, '');
        removedRules++;
      }
    }
  });

  return {
    content: cleanedCSS,
    removedRules
  };
}

/**
 * Generate CSS architecture report
 */
function generateArchitectureReport(cssFiles) {
  const report = {
    timestamp: new Date().toISOString(),
    files: [],
    summary: {
      totalSize: 0,
      totalLines: 0,
      totalIssues: 0,
      totalOptimizations: 0
    },
    recommendations: []
  };

  cssFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const analysis = analyzeCSSFile(file);
      report.files.push(analysis);
      
      report.summary.totalSize += analysis.size;
      report.summary.totalLines += analysis.lines;
      report.summary.totalIssues += analysis.issues.length;
      report.summary.totalOptimizations += analysis.optimizations.length;
    }
  });

  // Generate recommendations
  if (report.summary.totalIssues > 0) {
    report.recommendations.push({
      type: 'cleanup',
      priority: 'high',
      message: `Found ${report.summary.totalIssues} CSS issues that should be addressed`
    });
  }

  if (report.summary.totalOptimizations > 0) {
    report.recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: `Found ${report.summary.totalOptimizations} optimization opportunities`
    });
  }

  if (report.summary.totalSize > 100000) {
    report.recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: 'CSS bundle is large (>100KB). Consider code splitting or unused CSS removal'
    });
  }

  return report;
}

/**
 * Create optimized CSS file
 */
function createOptimizedCSS(inputFile, outputFile) {
  const content = fs.readFileSync(inputFile, 'utf8');
  const { content: optimizedContent, optimizations } = optimizeCSS(content);
  
  // Add header comment
  const header = `/*
 * Optimized CSS - Generated on ${new Date().toISOString()}
 * Original size: ${content.length} bytes
 * Optimized size: ${optimizedContent.length} bytes
 * Savings: ${content.length - optimizedContent.length} bytes (${Math.round((1 - optimizedContent.length / content.length) * 100)}%)
 */

`;

  fs.writeFileSync(outputFile, header + optimizedContent);
  
  return {
    originalSize: content.length,
    optimizedSize: optimizedContent.length,
    savings: content.length - optimizedContent.length,
    optimizations
  };
}

/**
 * Main cleanup function
 */
function main() {
  console.log('🧹 Starting CSS cleanup and optimization...\n');

  const cssFiles = [
    'src/index.css',
    'src/styles/responsive-test.css'
  ];

  const jsFiles = [
    'src/App.jsx',
    'src/components',
    'src/pages',
    'src/lib'
  ].flatMap(dir => {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return getAllJSFiles(dir);
    } else if (fs.existsSync(dir)) {
      return [dir];
    }
    return [];
  });

  try {
    // Generate architecture report
    console.log('📊 Analyzing CSS architecture...');
    const report = generateArchitectureReport(cssFiles);
    fs.writeFileSync('css-architecture-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Generated CSS architecture report');

    // Optimize main CSS file
    console.log('⚡ Optimizing CSS...');
    const mainCSSFile = 'src/index.css';
    if (fs.existsSync(mainCSSFile)) {
      const optimization = createOptimizedCSS(mainCSSFile, 'src/index.optimized.css');
      console.log(`✅ Created optimized CSS file`);
      console.log(`   Original: ${optimization.originalSize} bytes`);
      console.log(`   Optimized: ${optimization.optimizedSize} bytes`);
      console.log(`   Savings: ${optimization.savings} bytes (${Math.round((1 - optimization.optimizedSize / optimization.originalSize) * 100)}%)`);
    }

    // Clean up unused CSS (basic implementation)
    console.log('🗑️  Removing unused CSS...');
    if (fs.existsSync(mainCSSFile)) {
      const content = fs.readFileSync(mainCSSFile, 'utf8');
      const { content: cleanedContent, removedRules } = removeUnusedCSS(content, jsFiles);
      
      if (removedRules > 0) {
        fs.writeFileSync('src/index.cleaned.css', cleanedContent);
        console.log(`✅ Removed ${removedRules} potentially unused CSS rules`);
      } else {
        console.log('ℹ️  No unused CSS rules detected');
      }
    }

    // Summary
    console.log('\n📋 Cleanup Summary:');
    console.log(`   • Analyzed ${report.files.length} CSS files`);
    console.log(`   • Total size: ${Math.round(report.summary.totalSize / 1024)}KB`);
    console.log(`   • Found ${report.summary.totalIssues} issues`);
    console.log(`   • Found ${report.summary.totalOptimizations} optimization opportunities`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec.priority.toUpperCase()}: ${rec.message}`);
      });
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Review the CSS architecture report');
    console.log('   2. Consider using the optimized CSS file');
    console.log('   3. Test the cleaned CSS file');
    console.log('   4. Update build process to include optimizations');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

/**
 * Helper function to get all JS files recursively
 */
function getAllJSFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeCSSFile, optimizeCSS, generateArchitectureReport };