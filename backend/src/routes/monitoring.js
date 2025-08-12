/**
 * Monitoring Routes for Auto-Sync Integration
 * Exposes metrics and health check endpoints
 */

const express = require('express');
const router = express.Router();
const metricsCollector = require('../services/monitoring/MetricsCollector');
const healthCheckService = require('../services/monitoring/HealthCheckService');
const { auth } = require('../middleware/auth');

/**
 * GET /metrics - Prometheus metrics endpoint
 * This endpoint should be accessible without authentication for Prometheus scraping
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    res.send(await metricsCollector.getMetrics());
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).send('Failed to get metrics');
  }
});

/**
 * GET /sync-metrics - Custom sync metrics endpoint
 * Additional metrics specific to sync operations
 */
router.get('/sync-metrics', async (req, res) => {
  try {
    const customMetrics = await metricsCollector.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(customMetrics);
  } catch (error) {
    console.error('Failed to get sync metrics:', error);
    res.status(500).send('Failed to get sync metrics');
  }
});

/**
 * GET /health - Basic health check endpoint
 * Returns overall system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheckService.getOverallHealth();
    
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'warning' ? 200 :
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/detailed - Detailed health check endpoint
 * Requires authentication and returns detailed health information
 */
router.get('/health/detailed', auth, async (req, res) => {
  try {
    const health = await healthCheckService.getOverallHealth();
    res.json(health);
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/:check - Individual health check endpoint
 * Check specific component health
 */
router.get('/health/:check', auth, async (req, res) => {
  try {
    const checkName = req.params.check;
    const result = await healthCheckService.runHealthCheck(checkName);
    
    if (!result[checkName]) {
      return res.status(404).json({
        error: 'Health check not found',
        availableChecks: Array.from(healthCheckService.healthChecks.keys())
      });
    }
    
    const statusCode = result[checkName].status === 'healthy' ? 200 :
                      result[checkName].status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(result[checkName]);
  } catch (error) {
    console.error(`Health check for ${req.params.check} failed:`, error);
    res.status(500).json({
      status: 'error',
      message: `Health check for ${req.params.check} failed`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /monitoring/dashboard - Monitoring dashboard data
 * Returns aggregated monitoring data for dashboard display
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const health = await healthCheckService.getOverallHealth();
    const lastHealthCheck = healthCheckService.getLastHealthCheck();
    
    // Get recent metrics summary (this would typically come from a time-series database)
    const dashboardData = {
      systemHealth: {
        status: health.status,
        lastCheck: health.timestamp,
        criticalIssues: health.summary.criticalIssues.length,
        warnings: health.summary.warnings.length,
        healthyChecks: health.summary.healthyChecks,
        totalChecks: health.summary.totalChecks
      },
      
      syncStatus: {
        // These would be calculated from metrics
        activeJobs: 0, // Would be retrieved from metrics
        successRate: 0.95, // Would be calculated from metrics
        avgDuration: 45, // Would be calculated from metrics
        lastSync: new Date().toISOString()
      },
      
      externalApis: Object.entries(health.checks)
        .filter(([key]) => ['amfi', 'epfo', 'yahoo_finance'].includes(key))
        .map(([key, check]) => ({
          name: check.name,
          status: check.status,
          lastCheck: check.timestamp,
          message: check.message
        })),
      
      systemResources: {
        memory: health.checks.memory || { status: 'unknown' },
        disk: health.checks.disk || { status: 'unknown' },
        database: health.checks.database || { status: 'unknown' }
      },
      
      alerts: [
        ...health.summary.criticalIssues.map(issue => ({
          severity: 'critical',
          message: issue,
          timestamp: new Date().toISOString()
        })),
        ...health.summary.warnings.map(warning => ({
          severity: 'warning',
          message: warning,
          timestamp: new Date().toISOString()
        }))
      ]
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error.message
    });
  }
});

/**
 * POST /monitoring/test-alert - Test alert endpoint
 * Triggers a test alert for monitoring system validation
 */
router.post('/test-alert', auth, async (req, res) => {
  try {
    const { alertType = 'test', severity = 'warning' } = req.body;
    
    // Record a test metric that would trigger an alert
    metricsCollector.recordSyncJobFailure('test', req.user.id, 1, alertType);
    
    res.json({
      message: 'Test alert triggered',
      alertType,
      severity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to trigger test alert:', error);
    res.status(500).json({
      error: 'Failed to trigger test alert',
      message: error.message
    });
  }
});

/**
 * GET /monitoring/stats - System statistics endpoint
 * Returns various system statistics for monitoring
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Failed to get system stats:', error);
    res.status(500).json({
      error: 'Failed to get system stats',
      message: error.message
    });
  }
});

module.exports = router;