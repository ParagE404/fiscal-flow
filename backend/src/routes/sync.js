const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const { secureCredentialEndpoint } = require('../middleware/httpsOnly');
const syncController = require('../controllers/syncController');

const router = express.Router();

/**
 * Rate limiter for manual sync operations
 * More restrictive to prevent abuse of sync operations
 */
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 sync requests per 15 minutes
  message: {
    error: 'Too many sync requests',
    message: 'Too many sync requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for credential operations
 * Very restrictive for security
 */
const credentialLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 credential operations per hour
  message: {
    error: 'Too many credential requests',
    message: 'Too many credential operations from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for configuration operations
 * Moderate restrictions
 */
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 config requests per 15 minutes
  message: {
    error: 'Too many configuration requests',
    message: 'Too many configuration requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication to all sync routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Manual Sync API Endpoints

/**
 * Trigger manual sync for a specific investment type
 * POST /api/sync/:type
 * 
 * Supported types: mutual_funds, epf, stocks
 * Body: { force?: boolean, dryRun?: boolean, source?: string }
 */
router.post('/:type', syncLimiter, async (req, res) => {
  await syncController.triggerManualSync(req, res);
});

/**
 * Get sync status and history for a specific investment type
 * GET /api/sync/:type/status
 * 
 * Returns current sync status, configuration, statistics, and recent history
 */
router.get('/:type/status', async (req, res) => {
  await syncController.getSyncStatus(req, res);
});

// Sync Configuration API Endpoints

/**
 * Get sync configuration for all investment types
 * GET /api/sync/config
 * 
 * Returns user's sync preferences for all investment types
 */
router.get('/config', configLimiter, async (req, res) => {
  await syncController.getSyncConfiguration(req, res);
});

/**
 * Update sync configuration
 * PUT /api/sync/config
 * 
 * Body: {
 *   configurations: {
 *     [investmentType]: {
 *       isEnabled: boolean,
 *       syncFrequency: string,
 *       preferredSource?: string,
 *       fallbackSource?: string,
 *       customSchedule?: string,
 *       notifyOnSuccess: boolean,
 *       notifyOnFailure: boolean
 *     }
 *   }
 * }
 */
router.put('/config', configLimiter, async (req, res) => {
  await syncController.updateSyncConfiguration(req, res);
});

// Credential Management API Endpoints

/**
 * Check if credentials exist for a service
 * GET /api/sync/credentials/:service/status
 */
router.get('/credentials/:service/status', async (req, res) => {
  await syncController.getCredentialStatus(req, res);
});

/**
 * Store encrypted credentials for a service
 * POST /api/sync/credentials/:service
 * 
 * Supported services: epfo, yahoo_finance, nse, alpha_vantage
 * Body: { credentials: { [key]: value } }
 * 
 * Credentials format by service:
 * - epfo: { uan: string, password: string }
 * - yahoo_finance: { apiKey?: string }
 * - nse: { apiKey?: string }
 * - alpha_vantage: { apiKey: string }
 */
router.post('/credentials/:service', ...secureCredentialEndpoint, credentialLimiter, async (req, res) => {
  await syncController.storeCredentials(req, res);
});

/**
 * Remove stored credentials for a service
 * DELETE /api/sync/credentials/:service
 */
router.delete('/credentials/:service', ...secureCredentialEndpoint, credentialLimiter, async (req, res) => {
  await syncController.removeCredentials(req, res);
});

// Manual Intervention API Endpoints

/**
 * Get pending manual interventions for the user
 * GET /api/sync/interventions
 * 
 * Returns pending interventions that require user attention
 */
router.get('/interventions', async (req, res) => {
  await syncController.getPendingInterventions(req, res);
});

/**
 * Resolve a manual intervention
 * POST /api/sync/interventions/:interventionId/resolve
 * 
 * Body: { resolution?: string, action?: { type: string, investmentType?: string } }
 */
router.post('/interventions/:interventionId/resolve', async (req, res) => {
  await syncController.resolveIntervention(req, res);
});

/**
 * Clear all interventions for the user
 * DELETE /api/sync/interventions
 */
router.delete('/interventions', async (req, res) => {
  await syncController.clearInterventions(req, res);
});

// Data Source Health API Endpoints

/**
 * Get data source health status
 * GET /api/sync/sources/health
 * 
 * Returns health status for all data sources and circuit breaker states
 */
router.get('/sources/health', async (req, res) => {
  await syncController.getDataSourceHealth(req, res);
});

/**
 * Manually override data source health status
 * POST /api/sync/sources/:source/health
 * 
 * Body: { isHealthy: boolean, reason?: string }
 */
router.post('/sources/:source/health', async (req, res) => {
  await syncController.setDataSourceHealth(req, res);
});

/**
 * Reset circuit breaker for a data source
 * POST /api/sync/sources/:source/reset
 */
router.post('/sources/:source/reset', async (req, res) => {
  await syncController.resetCircuitBreaker(req, res);
});

// Error Recovery Statistics

/**
 * Get error recovery statistics
 * GET /api/sync/recovery/stats
 * 
 * Returns statistics about error recovery operations
 */
router.get('/recovery/stats', async (req, res) => {
  await syncController.getRecoveryStatistics(req, res);
});

// Health check endpoint for sync services
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      success: true,
      message: 'Sync service is healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        sync_services: 'available'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Sync service is unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;