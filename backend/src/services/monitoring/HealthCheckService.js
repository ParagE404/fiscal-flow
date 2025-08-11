/**
 * Health Check Service for Auto-Sync Integration
 * Monitors system health and provides health check endpoints
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const metricsCollector = require('./MetricsCollector');

class HealthCheckService {
  constructor() {
    this.prisma = new PrismaClient();
    this.healthChecks = new Map();
    this.lastHealthCheck = null;
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.initializeHealthChecks();
    this.startPeriodicHealthChecks();
  }

  initializeHealthChecks() {
    // Database health check
    this.healthChecks.set('database', {
      name: 'Database',
      check: this.checkDatabase.bind(this),
      timeout: 5000,
      critical: true
    });

    // Redis health check (if using Redis for caching)
    this.healthChecks.set('redis', {
      name: 'Redis Cache',
      check: this.checkRedis.bind(this),
      timeout: 3000,
      critical: false
    });

    // External API health checks
    this.healthChecks.set('amfi', {
      name: 'AMFI API',
      check: () => this.checkExternalAPI('https://www.amfiindia.com/spages/NAVAll.txt', 'AMFI'),
      timeout: 10000,
      critical: false
    });

    this.healthChecks.set('epfo', {
      name: 'EPFO Portal',
      check: () => this.checkExternalAPI('https://passbook.epfindia.gov.in', 'EPFO'),
      timeout: 15000,
      critical: false
    });

    this.healthChecks.set('yahoo_finance', {
      name: 'Yahoo Finance API',
      check: () => this.checkYahooFinanceAPI(),
      timeout: 10000,
      critical: false
    });

    // System resource checks
    this.healthChecks.set('memory', {
      name: 'Memory Usage',
      check: this.checkMemoryUsage.bind(this),
      timeout: 1000,
      critical: true
    });

    this.healthChecks.set('disk', {
      name: 'Disk Space',
      check: this.checkDiskSpace.bind(this),
      timeout: 2000,
      critical: true
    });

    // Sync job health check
    this.healthChecks.set('sync_jobs', {
      name: 'Sync Jobs',
      check: this.checkSyncJobs.bind(this),
      timeout: 5000,
      critical: true
    });
  }

  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: `Database connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkRedis() {
    // This would be implemented if Redis is used
    // For now, return healthy as Redis is optional
    return { status: 'healthy', message: 'Redis not configured' };
  }

  async checkExternalAPI(url, provider) {
    try {
      const response = await axios.head(url, { 
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept 4xx as healthy
      });
      
      metricsCollector.updateApiAvailability(provider.toLowerCase(), true);
      
      return { 
        status: 'healthy', 
        message: `${provider} API is accessible`,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error) {
      metricsCollector.updateApiAvailability(provider.toLowerCase(), false);
      
      return { 
        status: 'unhealthy', 
        message: `${provider} API is not accessible: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkYahooFinanceAPI() {
    try {
      // Check if Yahoo Finance API key is configured
      if (!process.env.YAHOO_FINANCE_API_KEY) {
        return { 
          status: 'warning', 
          message: 'Yahoo Finance API key not configured' 
        };
      }

      // Simple health check - try to get a basic quote
      const response = await axios.get('https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/AAPL', {
        headers: {
          'X-RapidAPI-Key': process.env.YAHOO_FINANCE_API_KEY,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        },
        timeout: 10000
      });

      metricsCollector.updateApiAvailability('yahoo_finance', true);
      
      return { 
        status: 'healthy', 
        message: 'Yahoo Finance API is accessible' 
      };
    } catch (error) {
      metricsCollector.updateApiAvailability('yahoo_finance', false);
      
      if (error.response?.status === 429) {
        return { 
          status: 'warning', 
          message: 'Yahoo Finance API rate limit reached' 
        };
      }
      
      return { 
        status: 'unhealthy', 
        message: `Yahoo Finance API error: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    if (memoryUsagePercent > 90) {
      return { 
        status: 'unhealthy', 
        message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        details: { usedMemory, totalMemory, percentage: memoryUsagePercent }
      };
    } else if (memoryUsagePercent > 75) {
      return { 
        status: 'warning', 
        message: `Elevated memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        details: { usedMemory, totalMemory, percentage: memoryUsagePercent }
      };
    }

    return { 
      status: 'healthy', 
      message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      details: { usedMemory, totalMemory, percentage: memoryUsagePercent }
    };
  }

  async checkDiskSpace() {
    const fs = require('fs').promises;
    
    try {
      const stats = await fs.statfs('.');
      const totalSpace = stats.blocks * stats.blksize;
      const freeSpace = stats.bavail * stats.blksize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;

      if (usagePercent > 90) {
        return { 
          status: 'unhealthy', 
          message: `Low disk space: ${usagePercent.toFixed(2)}% used`,
          details: { totalSpace, freeSpace, usedSpace, percentage: usagePercent }
        };
      } else if (usagePercent > 80) {
        return { 
          status: 'warning', 
          message: `High disk usage: ${usagePercent.toFixed(2)}% used`,
          details: { totalSpace, freeSpace, usedSpace, percentage: usagePercent }
        };
      }

      return { 
        status: 'healthy', 
        message: `Disk usage: ${usagePercent.toFixed(2)}% used`,
        details: { totalSpace, freeSpace, usedSpace, percentage: usagePercent }
      };
    } catch (error) {
      return { 
        status: 'warning', 
        message: `Could not check disk space: ${error.message}` 
      };
    }
  }

  async checkSyncJobs() {
    try {
      // Check for stuck sync jobs (running for more than 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const stuckJobs = await this.prisma.syncMetadata.findMany({
        where: {
          syncStatus: 'in_progress',
          updatedAt: {
            lt: twoHoursAgo
          }
        }
      });

      if (stuckJobs.length > 0) {
        return { 
          status: 'unhealthy', 
          message: `${stuckJobs.length} sync jobs appear to be stuck`,
          details: { stuckJobsCount: stuckJobs.length }
        };
      }

      // Check recent sync failures
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentFailures = await this.prisma.syncMetadata.findMany({
        where: {
          syncStatus: 'failed',
          updatedAt: {
            gte: oneHourAgo
          }
        }
      });

      if (recentFailures.length > 10) {
        return { 
          status: 'warning', 
          message: `High number of sync failures in the last hour: ${recentFailures.length}`,
          details: { recentFailuresCount: recentFailures.length }
        };
      }

      return { 
        status: 'healthy', 
        message: 'Sync jobs are running normally',
        details: { 
          stuckJobsCount: 0, 
          recentFailuresCount: recentFailures.length 
        }
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: `Could not check sync jobs: ${error.message}`,
        error: error.message
      };
    }
  }

  async runHealthCheck(checkName = null) {
    const results = {};
    const checksToRun = checkName ? 
      [checkName] : 
      Array.from(this.healthChecks.keys());

    for (const name of checksToRun) {
      const healthCheck = this.healthChecks.get(name);
      if (!healthCheck) continue;

      try {
        const result = await Promise.race([
          healthCheck.check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
          )
        ]);

        results[name] = {
          ...result,
          name: healthCheck.name,
          critical: healthCheck.critical,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          name: healthCheck.name,
          critical: healthCheck.critical,
          message: `Health check failed: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return results;
  }

  async getOverallHealth() {
    const healthResults = await this.runHealthCheck();
    
    let overallStatus = 'healthy';
    const criticalIssues = [];
    const warnings = [];
    
    for (const [name, result] of Object.entries(healthResults)) {
      if (result.status === 'unhealthy') {
        if (result.critical) {
          overallStatus = 'unhealthy';
          criticalIssues.push(`${result.name}: ${result.message}`);
        } else {
          if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        }
      } else if (result.status === 'warning') {
        warnings.push(`${result.name}: ${result.message}`);
        if (overallStatus === 'healthy') {
          overallStatus = 'warning';
        }
      }
    }

    this.lastHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthResults,
      summary: {
        criticalIssues,
        warnings,
        totalChecks: Object.keys(healthResults).length,
        healthyChecks: Object.values(healthResults).filter(r => r.status === 'healthy').length
      }
    };

    return this.lastHealthCheck;
  }

  startPeriodicHealthChecks() {
    setInterval(async () => {
      try {
        await this.getOverallHealth();
        
        // Update business metrics
        const activeUsersCount = await this.getActiveUsersCount();
        const credentialsExpiringCount = await this.getCredentialsExpiringCount();
        
        metricsCollector.updateActiveUsersCount(activeUsersCount);
        metricsCollector.updateCredentialsExpiringCount(credentialsExpiringCount);
        
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, this.healthCheckInterval);
  }

  async getActiveUsersCount() {
    try {
      const count = await this.prisma.syncConfiguration.count({
        where: { isEnabled: true },
        distinct: ['userId']
      });
      return count;
    } catch (error) {
      console.error('Failed to get active users count:', error);
      return 0;
    }
  }

  async getCredentialsExpiringCount() {
    try {
      // Check for credentials that might be expiring soon
      // This is a placeholder - actual implementation would depend on credential expiration logic
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      // For now, return 0 as we don't have expiration tracking implemented
      return 0;
    } catch (error) {
      console.error('Failed to get credentials expiring count:', error);
      return 0;
    }
  }

  getLastHealthCheck() {
    return this.lastHealthCheck;
  }
}

module.exports = new HealthCheckService();