const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const syncController = require('../controllers/syncController-fixed');

const router = express.Router();

/**
 * Rate limiter for sync operations
 */
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per 15 minutes
  message: {
    error: 'Too many sync requests',
    message: 'Too many sync requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply authentication to all sync routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// Sync Configuration API Endpoints
router.get('/config', syncLimiter, async (req, res) => {
  await syncController.getSyncConfiguration(req, res);
});

router.put('/config', syncLimiter, async (req, res) => {
  await syncController.updateSyncConfiguration(req, res);
});

// Sync Status API Endpoints
router.get('/status', async (req, res) => {
  await syncController.getAllSyncStatus(req, res);
});

// Credential Management API Endpoints
router.get('/credentials/status', async (req, res) => {
  await syncController.getAllCredentialStatus(req, res);
});

router.post('/credentials/:service', syncLimiter, async (req, res) => {
  await syncController.storeCredentials(req, res);
});

// Manual Sync API Endpoints
router.post('/:type', syncLimiter, async (req, res) => {
  await syncController.triggerManualSync(req, res);
});

router.get('/:type/status', async (req, res) => {
  await syncController.getSyncStatus(req, res);
});

// Health check endpoint
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Sync service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;