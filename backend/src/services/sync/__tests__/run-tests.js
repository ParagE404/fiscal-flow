#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test runner configuration
const testConfig = {
  unit: {
    name: 'Unit Tests',
    pattern: '**/*.test.js',
    ignore: ['integration/**', 'performance/**'],
    timeout: 10000,
    coverage: true
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'integration/**/*.test.js',
    timeout: 60000,
    coverage: false,
    sequential: true
  },
  performance: {
    name: 'Performance Tests',
    pattern: 'performance/**/*.test.js',
    timeout: 120000,
    coverage: false,
    sequential: true,
    maxWorkers: 1
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const verbose = args.includes('--verbose') || args.includes('-v');
const watch = args.includes('--watch') || args.includes('-w');
const coverage = args.includes('--coverage') || args.includes('-c');

// Validate test type
if (!['all', 'unit', 'integration', 'performance'].includes(testType)) {
  console.error('Invalid test type. Use: all, unit, integration, or performance');
  process.exit(1);
}

// Helper function to run Jest with specific configuration
function runJest(config, options = {}) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      '--config', path.join(__dirname, 'jest.config.js'),
      '--testPathPattern', config.pattern
    ];

    if (config.ignore) {
      config.ignore.forEach(pattern => {
        jestArgs.push('--testPathIgnorePatterns', pattern);
      });
    }

    if (config.timeout) {
      jestArgs.push('--testTimeout', config.timeout.toString());
    }

    if (config.coverage || coverage) {
      jestArgs.push('--coverage');
    }

    if (config.maxWorkers) {
      jestArgs.push('--maxWorkers', config.maxWorkers.toString());
    }

    if (config.sequential) {
      jestArgs.push('--runInBand');
    }

    if (verbose) {
      jestArgs.push('--verbose');
    }

    if (watch) {
      jestArgs.push('--watch');
    }

    if (options.detectOpenHandles) {
      jestArgs.push('--detectOpenHandles');
    }

    console.log(`\n🧪 Running ${config.name}...`);
    console.log(`Command: npx jest ${jestArgs.join(' ')}\n`);

    const jest = spawn('npx', ['jest', ...jestArgs], {
      stdio: 'inherit',
      cwd: __dirname
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${config.name} completed successfully\n`);
        resolve(code);
      } else {
        console.log(`❌ ${config.name} failed with code ${code}\n`);
        reject(new Error(`${config.name} failed`));
      }
    });

    jest.on('error', (error) => {
      console.error(`Error running ${config.name}:`, error);
      reject(error);
    });
  });
}

// Helper function to check if database is available
async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/finvista_test'
        }
      }
    });
    
    await prisma.$connect();
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.warn('⚠️  Test database not available. Integration tests will be skipped.');
    console.warn('   To run integration tests, ensure PostgreSQL is running and TEST_DATABASE_URL is set.');
    return false;
  }
}

// Helper function to generate test report
function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };

  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Test report saved to: ${reportPath}`);

  return report;
}

// Main test runner function
async function runTests() {
  console.log('🚀 Starting Sync Services Test Suite\n');
  
  const startTime = Date.now();
  const results = [];

  try {
    // Check prerequisites
    if ((testType === 'all' || testType === 'integration') && !(await checkDatabase())) {
      if (testType === 'integration') {
        console.error('❌ Cannot run integration tests without database');
        process.exit(1);
      }
    }

    // Run tests based on type
    if (testType === 'all') {
      // Run all test types in sequence
      for (const [type, config] of Object.entries(testConfig)) {
        if (type === 'integration' && !(await checkDatabase())) {
          console.log(`⏭️  Skipping ${config.name} (database not available)\n`);
          continue;
        }

        try {
          await runJest(config, { detectOpenHandles: type === 'integration' });
          results.push({ type, name: config.name, success: true });
        } catch (error) {
          results.push({ type, name: config.name, success: false, error: error.message });
        }
      }
    } else {
      // Run specific test type
      const config = testConfig[testType];
      if (!config) {
        throw new Error(`Unknown test type: ${testType}`);
      }

      if (testType === 'integration' && !(await checkDatabase())) {
        console.error('❌ Cannot run integration tests without database');
        process.exit(1);
      }

      try {
        await runJest(config, { detectOpenHandles: testType === 'integration' });
        results.push({ type: testType, name: config.name, success: true });
      } catch (error) {
        results.push({ type: testType, name: config.name, success: false, error: error.message });
      }
    }

    // Generate summary
    const endTime = Date.now();
    const duration = endTime - startTime;
    const report = generateTestReport(results);

    console.log('\n📋 Test Summary:');
    console.log('================');
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Total Suites: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Test Suites:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }

  } catch (error) {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⏹️  Test run interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test run terminated');
  process.exit(143);
});

// Show usage information
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Sync Services Test Runner

Usage: node run-tests.js [type] [options]

Test Types:
  all           Run all test suites (default)
  unit          Run unit tests only
  integration   Run integration tests only
  performance   Run performance tests only

Options:
  --verbose, -v     Verbose output
  --watch, -w       Watch mode
  --coverage, -c    Generate coverage report
  --help, -h        Show this help

Examples:
  node run-tests.js                    # Run all tests
  node run-tests.js unit               # Run unit tests only
  node run-tests.js integration -v     # Run integration tests with verbose output
  node run-tests.js performance        # Run performance tests only
  node run-tests.js unit --coverage    # Run unit tests with coverage
`);
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});